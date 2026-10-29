# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.2] - 2026-10-29

### Changed (dev tooling)

- `vitest` / `@vitest/coverage-v8` 3.2 → 5.0, `tsup` 8.5 → 9.0, `eslint` 10.13,
  `typescript-eslint` 8.72; transitive refresh. Closes the dev-only advisories
  (tinypool, vite, postcss, nanoid, brace-expansion): `pnpm audit` 28 → 0.
- `typescript` stays on 6.0: TypeScript 7 ships no compiler API, which tsup's
  declaration build (rollup-plugin-dts) requires.
- No runtime dependency, no API change.

## [1.0.1] - 2026-06-06

### Changed (CI)

- Align the `release.yml` **build** job and `tests.yml` standalone job to **Node 24**
  (consistency with the `publish` job — npm OIDC Trusted Publishing requires npm 11.5+ / Node 24).
  No runtime/API changes.

## [1.0.0] - 2026-06-06

### Added — Initial release

TypeScript SDK for the Viva Wallet **Cloud Terminal API** (merchant `/ecr/v1/`
variant). Isomorphic core (Node 18+, browser, Deno, edge, React Native) with no
runtime dependencies (native `fetch`).

- **`VivaCloudTerminalClient`** entry point with readonly resource properties
  (`devices`, `transactions`, `sessions`), plus `getConfig()`,
  `invalidateToken()` and a `pollUntilComplete()` shortcut.
- **Auth**: OAuth2 `client_credentials` → Bearer token, cached in-memory and
  refreshed automatically (handled by `HttpClient`, `fetch` injectable for tests).
- **`DevicesResource`**: `search()` — `POST /ecr/v1/devices:search`.
- **`TransactionsResource`**:
  - `sale()` — `POST /ecr/v1/transactions:sale`
  - `capturePreauth()` — `POST /ecr/v1/transactions:preauth-completion`
  - `refund()` — `POST /ecr/v1/transactions:refund`
  - `unreferencedRefund()` — `POST /ecr/v1/transactions:unreferenced-refund`
  - `fastRefund()` — `POST /ecr/v1/transactions:fast-refund`
  - `rebate()` — `POST /ecr/v1/transactions:rebate`
  - `createAction()` — `POST /ecr/v1/actions`
  - `getAction()` — `GET /ecr/v1/actions/{actionId}`
- **`SessionsResource`**: `get()`, `listByDate()`, `abort()` (`DELETE`), and
  `pollUntilComplete()` (driven by the `EcrEventId` constants).
- **`EcrEventId`** constants + helpers (`ecrEventIdFrom`, `isInProgress`,
  `isTerminalEvent`, `isSuccessfulEvent`, `ecrEventLabel`).
- **`Environment`** (`demo` / `production`) and **`CloudTerminalConfig`**.
- **Errors**: `VivaError` → `ApiError`, `AuthenticationError`.
- **`generateUuid()`** helper for transaction session ids.
- Dual ESM + CJS build with type declarations (tsup).
- Full unit test suite (one test per public method) using an injectable `fetch`
  mock — 40 tests.
- Documentation: `README.md`, `CLAUDE.md`, `AGENTS.md`, `llms.txt`.
