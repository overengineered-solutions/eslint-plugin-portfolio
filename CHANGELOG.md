# Changelog

## 0.3.0 — 2026-05-18

Adds rule `no-tailwind-arbitrary-in-bracketed-route` (Tailwind v4 prod CSS-drop guard).

- **New rule**: `portfolio/no-tailwind-arbitrary-in-bracketed-route` flags any Tailwind arbitrary-value class (e.g. `text-[10px]`, `lg:grid-cols-[minmax(420px,40%)_1fr]`) inside JSX `className` attributes in files under Next.js `[bracketed]/` dynamic-route directories. Also flags `aspect-video` / `aspect-square` (empirically dropped from prod bundles too). Tailwind v4's content scanner non-deterministically drops these classes from production CSS — verified 2026-05-17 against `oesolutions` prod build SHA `238e712`, where the workspace IDE rendered single-column with a hidden iframe because `lg:grid-cols-[minmax(420px,40%)_minmax(0,1fr)]` and `aspect-video` were missing from the bundle. Adding `@source` is NOT sufficient.
- **Fix**: define affected classes as raw CSS in your `globals.css`, reference by class name from the bracketed-route file. Escape hatch: `// eslint-disable-next-line portfolio/no-tailwind-arbitrary-in-bracketed-route -- <reason>`.
- 8 unit tests via `@typescript-eslint/rule-tester`.

## 0.2.0 — 2026-05-17

Registry migration: GHCR → npmjs.org with Sigstore provenance attestation.

- **Registry**: now publishes to **npmjs.org** (public, MIT-licensed) instead of GitHub Container Registry. Consumers install with zero auth via `pnpm add -D @overengineered-solutions/eslint-plugin-portfolio`; no `.npmrc` registry override needed.
- **Provenance**: every published artifact carries a Sigstore-backed attestation linking it to the exact GitHub Actions workflow run + commit that built it. Verifiable via `npm audit signatures`.
- **License**: `UNLICENSED` (placeholder) → `MIT`.
- No API changes from 0.1.1.

Sibling migration to `@overengineered-solutions/workspace-bridge` and `@overengineered-solutions/test-kit`, all moving from GHCR to npmjs together so consumers can drop the `@overengineered-solutions:registry=npm.pkg.github.com` line from `.npmrc`.

## 0.1.1 and earlier

Released to GitHub Container Registry. See git history for prior release notes.
