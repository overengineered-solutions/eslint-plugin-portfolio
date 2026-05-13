import { ESLintUtils, TSESTree } from "@typescript-eslint/utils";

type MessageIds = "untypedResponse" | "untypedResponseAssignment";

/**
 * Walks an expression tree looking for an `await x.json()` or `await x.text()`
 * call. We check `as` casts and typed assignments anchored on such calls, since
 * those are the exact shapes that silently mask a misassumed response shape.
 *
 * Layer 1 of the observability doctrine (see CLAUDE.md / AGENTS.md in any
 * portfolio repo): Zod-parse every external response. A `parse` or `safeParse`
 * call within the same expression chain is the escape hatch.
 */
function containsAwaitedResponseRead(node: TSESTree.Node | null): boolean {
  if (!node) return false;
  if (node.type === "AwaitExpression") {
    return containsAwaitedResponseRead(node.argument);
  }
  if (node.type === "CallExpression") {
    const callee = node.callee;
    if (
      callee.type === "MemberExpression" &&
      callee.property.type === "Identifier"
    ) {
      const methodName = callee.property.name;
      if (methodName === "json" || methodName === "text") {
        return true;
      }
      // Zod parse / safeParse short-circuits — the response has been validated.
      if (methodName === "parse" || methodName === "safeParse") {
        return false;
      }
    }
  }
  if (node.type === "TSAsExpression" || node.type === "TSTypeAssertion") {
    return containsAwaitedResponseRead(node.expression);
  }
  if (node.type === "TSNonNullExpression") {
    return containsAwaitedResponseRead(node.expression);
  }
  return false;
}

export const noUntypedExternalResponse = ESLintUtils.RuleCreator.withoutDocs<
  [],
  MessageIds
>({
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow type casts or typed assignments on the result of `await response.json()` / `.text()` without a Zod parse — silent-zero is the failure mode this prevents.",
    },
    messages: {
      untypedResponse:
        "Casting the result of `await {{ method }}()` to a type without Zod parsing is the silent-zero failure mode. Pipe through `Schema.parse(...)` or `Schema.safeParse(...)` so a shape mismatch fails loudly. See the Observability doctrine in CLAUDE.md/AGENTS.md.",
      untypedResponseAssignment:
        "Assigning the result of `await {{ method }}()` to a typed declaration without Zod parsing is the silent-zero failure mode. Pipe through `Schema.parse(...)` or `Schema.safeParse(...)`. See the Observability doctrine in CLAUDE.md/AGENTS.md.",
    },
    schema: [],
  },
  name: "no-untyped-external-response",
  defaultOptions: [],
  create(context) {
    function describeMethod(node: TSESTree.Node | null): string {
      if (!node) return "json";
      if (node.type === "AwaitExpression") return describeMethod(node.argument);
      if (
        node.type === "CallExpression" &&
        node.callee.type === "MemberExpression" &&
        node.callee.property.type === "Identifier"
      ) {
        return node.callee.property.name;
      }
      if (node.type === "TSAsExpression" || node.type === "TSTypeAssertion") {
        return describeMethod(node.expression);
      }
      if (node.type === "TSNonNullExpression") {
        return describeMethod(node.expression);
      }
      return "json";
    }

    return {
      TSAsExpression(node) {
        if (containsAwaitedResponseRead(node.expression)) {
          context.report({
            node,
            messageId: "untypedResponse",
            data: { method: describeMethod(node.expression) },
          });
        }
      },
      TSTypeAssertion(node) {
        if (containsAwaitedResponseRead(node.expression)) {
          context.report({
            node,
            messageId: "untypedResponse",
            data: { method: describeMethod(node.expression) },
          });
        }
      },
      VariableDeclarator(node) {
        if (
          node.id.type === "Identifier" &&
          node.id.typeAnnotation &&
          node.init &&
          containsAwaitedResponseRead(node.init)
        ) {
          context.report({
            node,
            messageId: "untypedResponseAssignment",
            data: { method: describeMethod(node.init) },
          });
        }
      },
    };
  },
});
