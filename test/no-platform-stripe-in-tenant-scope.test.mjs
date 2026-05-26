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

const opts = {
  banned: { module: "**/billing/stripe", name: "getStripe" },
  allowedFiles: [
    "**/lib/billing/stripe.ts",
    "**/lib/billing/stripe-for-workspace.ts",
    "**/lib/billing/workspace-stripe.ts",
    "**/platform-admin/diag/diag-actions.ts",
    "**/infra/scripts/stripe-sync.ts",
  ],
  message: "Use getStripeForWorkspace(workspaceId).",
};

ruleTester.run(
  "no-platform-stripe-in-tenant-scope",
  plugin.rules["no-platform-stripe-in-tenant-scope"],
  {
    valid: [
      // File outside the banned-module-importing zone — nothing to flag.
      {
        code: `import { syncTier } from './tier-stripe-sync';\nsyncTier();`,
        filename: "/repo/apps/web/app/admin/tiers/actions.ts",
        options: [opts],
      },
      // Allowed file CAN import + call getStripe.
      {
        code: `import { getStripe } from './stripe';\nconst s = getStripe();`,
        filename: "/repo/apps/web/lib/billing/stripe-for-workspace.ts",
        options: [opts],
      },
      // Allowed file via different relative path also works (** glob).
      {
        code: `import { getStripe } from '../../lib/billing/stripe';\ngetStripe();`,
        filename: "/repo/apps/web/app/platform-admin/diag/diag-actions.ts",
        options: [opts],
      },
      // Different module — not the banned one.
      {
        code: `import { getStripe } from './unrelated';\ngetStripe();`,
        filename: "/repo/apps/web/app/admin/tiers/actions.ts",
        options: [opts],
      },
      // Importing a different name from the banned module is fine.
      {
        code: `import { createStripeClient } from './billing/stripe';\ncreateStripeClient('sk_test');`,
        filename: "/repo/apps/web/app/admin/tiers/actions.ts",
        options: [opts],
      },
    ],
    invalid: [
      // The canonical bad shape — tenant-scoped file importing + calling getStripe.
      {
        code: `import { getStripe } from '../../../../lib/billing/stripe';\nconst s = getStripe();`,
        filename: "/repo/apps/web/app/admin/tiers/actions.ts",
        options: [opts],
        errors: [{ messageId: "bannedImport" }, { messageId: "bannedCall" }],
      },
      // Same with a rename — the local binding gets flagged on call too.
      {
        code: `import { getStripe as gs } from './billing/stripe';\nconst s = gs();`,
        filename: "/repo/apps/web/app/admin/tiers/actions.ts",
        options: [opts],
        errors: [{ messageId: "bannedImport" }, { messageId: "bannedCall" }],
      },
      // Reconciler is not on the allowlist.
      {
        code: `import { getStripe } from './stripe';\ngetStripe();`,
        filename: "/repo/apps/web/lib/billing/tier-stripe-reconciler.ts",
        options: [opts],
        errors: [{ messageId: "bannedImport" }, { messageId: "bannedCall" }],
      },
    ],
  },
);
