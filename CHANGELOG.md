# Changelog

## 0.2.0 — 2026-05-17

Registry migration: GHCR → npmjs.org with Sigstore provenance attestation.

- **Registry**: now publishes to **npmjs.org** (public, MIT-licensed) instead of GitHub Container Registry. Consumers install with zero auth via `pnpm add -D @overengineered-solutions/eslint-plugin-portfolio`; no `.npmrc` registry override needed.
- **Provenance**: every published artifact carries a Sigstore-backed attestation linking it to the exact GitHub Actions workflow run + commit that built it. Verifiable via `npm audit signatures`.
- **License**: `UNLICENSED` (placeholder) → `MIT`.
- No API changes from 0.1.1.

Sibling migration to `@overengineered-solutions/workspace-bridge` and `@overengineered-solutions/test-kit`, all moving from GHCR to npmjs together so consumers can drop the `@overengineered-solutions:registry=npm.pkg.github.com` line from `.npmrc`.

## 0.1.1 and earlier

Released to GitHub Container Registry. See git history for prior release notes.
