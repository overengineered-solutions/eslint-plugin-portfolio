import { ESLintUtils, TSESTree } from "@typescript-eslint/utils";

type MessageIds = "arbitraryClass";

/**
 * Tailwind v4's content scanner non-deterministically skips files inside
 * Next.js dynamic-route directories with square brackets in the path
 * (`/[sessionId]/`, `/[id]/`, `/[[...catchAll]]/`). Classes used in
 * those files are silently dropped from the generated CSS bundle —
 * sometimes on one build, sometimes on the next. Verified empirically
 * 2026-05-17 against oesolutions production build SHA 238e712: prod
 * CSS bundle 83b8df6c8715881f.css was missing every layout-critical
 * arbitrary-value class used inside src/app/app/ide/[sessionId]/workspace/,
 * collapsing the 16:9 two-column workspace IDE to a single column.
 * The same source on the preview deploy DID include those classes.
 *
 * Adding `@source "../**\/*.{ts,tsx,...}"` (oesolutions PR #367) was NOT
 * sufficient. The only reliable fix is to define the affected classes
 * as raw CSS in `globals.css` (which IS scanned reliably) and reference
 * them by class name from the bracketed-route file.
 *
 * This rule flags any Tailwind arbitrary-value class (`text-[10px]`,
 * `lg:grid-cols-[minmax(420px,40%)_1fr]`, etc.) inside JSX `className`
 * attributes of files whose path contains a bracketed route segment.
 * Also flags `aspect-video` / `aspect-square` — those are non-arbitrary
 * utilities but were empirically dropped from prod (same scanner blind
 * spot), so they also need raw-CSS equivalents.
 *
 * Escape hatch: `// eslint-disable-next-line portfolio/no-tailwind-arbitrary-in-bracketed-route -- <reason>`
 * with a non-empty reason.
 */

const ARBITRARY_RE = /[a-z][a-z0-9]*(?:-[a-z0-9]+)*(?::-?[a-z][a-z0-9-]*)?-\[[^\]\s]+\]/g;

const EMPIRICALLY_DROPPED_UTILITIES = new Set(["aspect-video", "aspect-square"]);

const BRACKETED_ROUTE_RE = /\/\[[^/]+\]\//;

function shouldEnforce(filename: string | undefined): boolean {
  if (!filename) return false;
  const normalized = filename.replace(/\\/g, "/");
  return BRACKETED_ROUTE_RE.test(normalized);
}

function findOffenders(text: string): string[] {
  const offenders: string[] = [];
  for (const match of text.matchAll(ARBITRARY_RE)) {
    offenders.push(match[0]);
  }
  for (const tok of text.split(/\s+/)) {
    if (EMPIRICALLY_DROPPED_UTILITIES.has(tok)) {
      offenders.push(tok);
    }
  }
  return offenders;
}

type Reporter = (node: TSESTree.Node, value: string) => void;

function inspectClassNameValue(
  node: TSESTree.Node | null,
  report: Reporter,
): void {
  if (!node) return;
  if (node.type === "Literal" && typeof node.value === "string") {
    for (const off of findOffenders(node.value)) {
      report(node, off);
    }
    return;
  }
  if (node.type === "TemplateLiteral") {
    for (const quasi of node.quasis) {
      const raw = quasi.value.raw ?? quasi.value.cooked ?? "";
      for (const off of findOffenders(raw)) {
        report(quasi, off);
      }
    }
    return;
  }
  if (node.type === "ConditionalExpression") {
    inspectClassNameValue(node.consequent, report);
    inspectClassNameValue(node.alternate, report);
    return;
  }
  if (node.type === "LogicalExpression") {
    inspectClassNameValue(node.left, report);
    inspectClassNameValue(node.right, report);
    return;
  }
  if (node.type === "CallExpression") {
    for (const arg of node.arguments) {
      inspectClassNameValue(arg as TSESTree.Node, report);
    }
    return;
  }
  if (node.type === "ArrayExpression") {
    for (const el of node.elements) {
      if (el) inspectClassNameValue(el as TSESTree.Node, report);
    }
    return;
  }
  if (node.type === "ObjectExpression") {
    for (const prop of node.properties) {
      if (
        prop.type === "Property" &&
        prop.key.type === "Literal" &&
        typeof prop.key.value === "string"
      ) {
        for (const off of findOffenders(prop.key.value)) {
          report(prop.key, off);
        }
      }
    }
    return;
  }
}

export const noTailwindArbitraryInBracketedRoute = ESLintUtils.RuleCreator.withoutDocs<
  [],
  MessageIds
>({
  meta: {
    type: "problem",
    docs: {
      description:
        "Forbid Tailwind arbitrary-value classes (and aspect-video / aspect-square) inside JSX className attributes in files under bracketed-route directories. Define raw CSS classes in your app's globals.css and reference by class name instead. Tailwind v4's content scanner non-deterministically drops these from the prod bundle (verified 2026-05-17).",
    },
    messages: {
      arbitraryClass:
        "Tailwind class `{{ value }}` will be silently dropped from the prod CSS bundle. This file is under a bracketed-route directory which Tailwind v4's scanner non-deterministically skips. Define the class as raw CSS in `globals.css` and reference by class name. To intentionally accept the risk, suppress with `// eslint-disable-next-line portfolio/no-tailwind-arbitrary-in-bracketed-route -- <reason>`.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const filename = context.filename ?? context.getFilename?.();
    if (!shouldEnforce(filename)) {
      return {};
    }
    const report: Reporter = (node, value) =>
      context.report({
        node,
        messageId: "arbitraryClass",
        data: { value },
      });
    return {
      JSXAttribute(node) {
        const name = node.name;
        if (name.type !== "JSXIdentifier") return;
        if (name.name !== "className" && name.name !== "class") return;
        const value = node.value;
        if (!value) return;
        if (value.type === "Literal" && typeof value.value === "string") {
          for (const off of findOffenders(value.value)) {
            report(value, off);
          }
          return;
        }
        if (value.type === "JSXExpressionContainer") {
          inspectClassNameValue(value.expression as TSESTree.Node, report);
        }
      },
    };
  },
});
