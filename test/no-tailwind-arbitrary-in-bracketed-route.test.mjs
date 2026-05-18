import { RuleTester } from "@typescript-eslint/rule-tester";
import parser from "@typescript-eslint/parser";
import { test } from "node:test";
import plugin from "../dist/index.js";

RuleTester.afterAll = () => {};
RuleTester.it = test;
RuleTester.itOnly = test;
RuleTester.describe = (_name, fn) => fn();

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      ecmaFeatures: { jsx: true },
    },
  },
});

const BRACKETED_FILE = "/repo/src/app/[id]/page.tsx";
const NON_BRACKETED_FILE = "/repo/src/components/Card.tsx";

ruleTester.run(
  "no-tailwind-arbitrary-in-bracketed-route",
  plugin.rules["no-tailwind-arbitrary-in-bracketed-route"],
  {
    valid: [
      // Bracketed-route file with no arbitrary values → fine.
      {
        code: `export default function Page(){return <div className="grid grid-cols-2 text-sm" />}`,
        filename: BRACKETED_FILE,
      },
      // Bracketed-route file using raw CSS class names → fine.
      {
        code: `export default function Page(){return <div className="workspace-grid ws-text-10" />}`,
        filename: BRACKETED_FILE,
      },
      // Non-bracketed-route file with arbitrary values → rule does not enforce here.
      {
        code: `export default function C(){return <div className="text-[10px] aspect-video lg:grid-cols-[1fr_2fr]" />}`,
        filename: NON_BRACKETED_FILE,
      },
      // Template-literal containing a JS object-index expression slot
      // (the [status] in ${MAP[status]}) — NOT a Tailwind arbitrary value,
      // must NOT report.
      {
        code: `const MAP={ok:"bg-green-100"};export default function P({status}){return <span className={\`rounded px-1 \${MAP[status]}\`}>{status}</span>}`,
        filename: BRACKETED_FILE,
      },
    ],
    invalid: [
      // Plain string literal with one offender.
      {
        code: `export default function P(){return <div className="text-[10px]" />}`,
        filename: BRACKETED_FILE,
        errors: [{ messageId: "arbitraryClass" }],
      },
      // Template literal: only the real Tailwind arbitrary value reports,
      // not the ${MAP[status]} object-index slot.
      {
        code: `const MAP={ok:"bg-green-100"};export default function P({status}){return <span className={\`rounded text-[11px] \${MAP[status]}\`}>{status}</span>}`,
        filename: BRACKETED_FILE,
        errors: [{ messageId: "arbitraryClass" }],
      },
      // aspect-video — non-arbitrary utility, also empirically dropped.
      {
        code: `export default function P(){return <section className="aspect-video w-full" />}`,
        filename: BRACKETED_FILE,
        errors: [{ messageId: "arbitraryClass" }],
      },
      // Multiple offenders in one className.
      {
        code: `export default function P(){return <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] text-[10px]" />}`,
        filename: BRACKETED_FILE,
        errors: [
          { messageId: "arbitraryClass" },
          { messageId: "arbitraryClass" },
        ],
      },
    ],
  },
);
