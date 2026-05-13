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
    },
  },
});

ruleTester.run(
  "no-untyped-external-response",
  plugin.rules["no-untyped-external-response"],
  {
    valid: [
      // Zod-parsed — fine
      {
        code: `
          async function fetchUser() {
            const res = await fetch("/u");
            const parsed = UserSchema.parse(await res.json());
            return parsed;
          }
        `,
      },
      {
        code: `
          async function fetchUser() {
            const res = await fetch("/u");
            const parsed = UserSchema.safeParse(await res.json());
            return parsed;
          }
        `,
      },
      // Untyped — fine (no claim being made)
      {
        code: `
          async function fetchUser() {
            const res = await fetch("/u");
            const data = await res.json();
            return data;
          }
        `,
      },
      // Cast unrelated to a response read — fine
      {
        code: `
          const x = (someFn() as MyType);
        `,
      },
      // Returning from a function — implicit return type is not the same shape
      {
        code: `
          async function raw(res) {
            return await res.json();
          }
        `,
      },
    ],
    invalid: [
      // The canonical bad shape — caused 4 PRs on 2026-05-12
      {
        code: `
          async function fetchUser() {
            const res = await fetch("/u");
            const data = (await res.json()) as UserShape;
            return data;
          }
        `,
        errors: [{ messageId: "untypedResponse" }],
      },
      // Sibling: .text() cast
      {
        code: `
          async function fetchHtml(res) {
            const html = (await res.text()) as string;
            return html;
          }
        `,
        errors: [{ messageId: "untypedResponse" }],
      },
      // Typed assignment without intermediate cast
      {
        code: `
          async function fetchUser(res) {
            const data: UserShape = await res.json();
            return data;
          }
        `,
        errors: [{ messageId: "untypedResponseAssignment" }],
      },
      // Old-style TS type assertion
      {
        code: `
          async function fetchUser(res) {
            const data = <UserShape>await res.json();
            return data;
          }
        `,
        errors: [{ messageId: "untypedResponse" }],
      },
      // Non-null assertion in between still flagged
      {
        code: `
          async function fetchUser(res) {
            const data = (await res.json())! as UserShape;
            return data;
          }
        `,
        errors: [{ messageId: "untypedResponse" }],
      },
    ],
  },
);
