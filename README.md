# @overengineered-solutions/eslint-plugin-portfolio

Portfolio-wide ESLint rules enforcing the observability doctrine documented in every portfolio repo's `CLAUDE.md` / `AGENTS.md`: **silent-zero is the failure mode**.

## Install

```sh
pnpm add -D @overengineered-solutions/eslint-plugin-portfolio
```

This package lives on GitHub Packages. Even though it's published with `--access public`, GitHub Packages still requires a valid GitHub token for download — see [`feedback_package_visibility_rule.md`](https://github.com/overengineered-solutions/) for the gotcha.

For CI workflows in the `overengineered-solutions` org, grant `permissions: packages: read` and pass `NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}` on install. For non-GitHub runners (Vercel, local dev), use a PAT with `read:packages` scope.

## Wire into `eslint.config.mjs`

```js
import portfolio from "@overengineered-solutions/eslint-plugin-portfolio";

export default [
  {
    plugins: { portfolio },
    rules: {
      "portfolio/no-untyped-external-response": "error",
    },
  },
];
```

## Rules

### `no-untyped-external-response`

Flags type casts (`as X`, `<X>`) and typed declarations (`const data: X = ...`) anchored on an `await someResponse.json()` or `await someResponse.text()` call.

The escape hatch is **Zod parsing**. Pipe the JSON read through `Schema.parse(...)` or `Schema.safeParse(...)` and the rule short-circuits.

#### Why

When wrapping an external API, the loop body assumes a response shape. If that assumption is wrong, the loop iterates 0 times and emits no logs, no errors, no signal. This produced a 4-PR debug cycle on 2026-05-12 (makeros #88 → #96) that a single Zod-validated wrapper would have collapsed into one PR.

This rule mechanically enforces Layer 1 of the observability doctrine. Layers 2 (first-call shape observability), 3 (iteration-boundary counts), and 4 (daily smoke) remain code-review responsibilities for now — those would need richer flow analysis to enforce mechanically.

#### Bad

```ts
const res = await fetch("/u");
const data = (await res.json()) as UserShape; // silent-zero waiting to happen
```

#### Good

```ts
const res = await fetch("/u");
const data = UserSchema.parse(await res.json()); // throws on shape mismatch
```

```ts
const res = await fetch("/u");
const parsed = UserSchema.safeParse(await res.json());
if (!parsed.success) {
  logSystemEvent({ kind: "api.shape_mismatch", payload: parsed.error.flatten() });
  throw parsed.error;
}
```

## Versioning

Semver. Tag `vX.Y.Z` on a commit to trigger the publish workflow (see `.github/workflows/publish.yml`). The workflow asserts that the tag matches `package.json` before publishing.

## See also

- Sister package: `@overengineered-solutions/test-kit`
- Memory (in the agent's persistent memory system): `feedback_external_api_observability_doctrine.md`
