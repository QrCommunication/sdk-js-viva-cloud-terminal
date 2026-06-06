# Viva Cloud Terminal SDK (TypeScript) — AI Instructions

> Ce fichier est automatiquement detecte par Claude Code, Cursor, Copilot et Codex.

## SDK Overview

Package npm `@qrcommunication/viva-cloud-terminal-sdk` pour la **Cloud Terminal
API variante MARCHAND** de Viva Wallet (`/ecr/v1/`). Pilote un terminal de
paiement physique (EFT POS) depuis un ECR / caisse / back-office : vente, capture
de pre-autorisation, remboursements, abort, et polling de session.

SDK **isomorphe** : aucune dependance runtime, utilise le `fetch` natif (Node
18+, browser, Deno, edge, React Native).

⚠ **Perimetre** : UNIQUEMENT les endpoints marchand `/ecr/v1/`. Les endpoints
ISV `/ecr/isv/v1/` (marchands connectes, composite auth, `isvDetails`) sont
geres par un SDK distinct. Ne JAMAIS melanger les deux.

C'est le portage TypeScript du SDK PHP `qrcommunication/viva-cloud-terminal-sdk`
(meme couverture d'endpoints, meme decoupage).

## Entry point

```ts
import {
  VivaCloudTerminalClient,
  EcrEventId,
  Environment,
  ApiError,
  AuthenticationError,
} from "@qrcommunication/viva-cloud-terminal-sdk";
```

## Architecture

```
VivaCloudTerminalClient (point d'entree, readonly properties)
+-- devices       -> DevicesResource       (POST /ecr/v1/devices:search)
+-- transactions  -> TransactionsResource  (POST /ecr/v1/transactions:* + /ecr/v1/actions)
+-- sessions      -> SessionsResource       (GET/DELETE /ecr/v1/sessions...)
+-- pollUntilComplete(sessionId)  (passthrough vers SessionsResource.pollUntilComplete)
```

## Couverture des endpoints (v1.0.0)

| Resource       | Methode                | Endpoint                                        |
| -------------- | ---------------------- | ----------------------------------------------- |
| `devices`      | `search()`             | `POST /ecr/v1/devices:search`                   |
| `transactions` | `sale()`               | `POST /ecr/v1/transactions:sale`                |
| `transactions` | `capturePreauth()`     | `POST /ecr/v1/transactions:preauth-completion`  |
| `transactions` | `refund()`             | `POST /ecr/v1/transactions:refund`              |
| `transactions` | `unreferencedRefund()` | `POST /ecr/v1/transactions:unreferenced-refund` |
| `transactions` | `fastRefund()`         | `POST /ecr/v1/transactions:fast-refund`         |
| `transactions` | `rebate()`             | `POST /ecr/v1/transactions:rebate`              |
| `transactions` | `createAction()`       | `POST /ecr/v1/actions`                          |
| `transactions` | `getAction()`          | `GET /ecr/v1/actions/{actionId}`                |
| `sessions`     | `get()`                | `GET /ecr/v1/sessions/{sessionId}`              |
| `sessions`     | `listByDate()`         | `GET /ecr/v1/sessions?date=`                    |
| `sessions`     | `abort()`              | `DELETE /ecr/v1/sessions/{sessionId}?cashRegisterId=` |
| `sessions`     | `pollUntilComplete()`  | polling repete de `get()`                       |

## Authentification (1 seul mode)

OAuth2 `client_credentials` → Bearer token.

| Host                                                       | Auth                                                        | Endpoints          |
| ---------------------------------------------------------- | ---------------------------------------------------------- | ------------------ |
| `accounts.vivapayments.com` (demo: `demo-accounts...`)     | Basic `client_id:client_secret` + `grant_type=client_credentials` | `/connect/token` |
| `api.vivapayments.com` (demo: `demo-api...`)               | `Authorization: Bearer {token}`                           | `/ecr/v1/...`      |

Le token est cache en memoire dans `HttpClient` et rafraichi 60s avant
expiration. `invalidateToken()` force un nouveau handshake.

**CRITIQUE** : tous les payloads `/ecr/v1/` sont en **camelCase**.

## Instanciation

```ts
const viva = new VivaCloudTerminalClient({
  clientId: "your-client-id",
  clientSecret: "your-client-secret",
  environment: "demo", // "demo" | "production"
  timeoutMs: 30_000, // optionnel
  fetch: customFetch, // optionnel (polyfill / mock)
});
```

## Patterns d'implementation

### Vente + polling

```ts
const sale = await viva.transactions.sale({
  terminalId: "16000010",
  amount: 1170, // centimes
  cashRegisterId: "CR-01",
});
const result = await viva.pollUntilComplete(sale.sessionId);
```

### Pre-auth puis capture

```ts
const preauth = await viva.transactions.sale({
  terminalId: "16000010",
  amount: 5000,
  cashRegisterId: "CR-01",
  preauth: true,
});
await viva.pollUntilComplete(preauth.sessionId);
const capture = await viva.transactions.capturePreauth({
  parentSessionId: preauth.sessionId,
  terminalId: "16000010",
  amount: 4200,
  cashRegisterId: "CR-01",
});
```

### Remboursement reference

```ts
await viva.transactions.refund({
  parentSessionId: sale.sessionId,
  terminalId: "16000010",
  amount: 1170,
  cashRegisterId: "CR-01",
});
```

### Abort

```ts
await viva.sessions.abort(sessionId, "CR-01");
```

## Conventions de retour

- Les methodes de `transactions` retournent `{ sessionId: string, response: object }`.
  La plupart des endpoints `/ecr/v1/transactions:*` renvoient un **body vide**
  (HTTP 200) : le resultat reel s'obtient en pollant la session via
  `sessions.get()` / `pollUntilComplete()`. Le `sessionId` retourne est l'id
  genere (ou fourni) pour cette transaction.
- `sessions.get()` / `listByDate()` retournent le body decode brut.

## Conventions de code

- TypeScript 5.8+ strict (`strict: true`, `noUncheckedIndexedAccess: true`)
- ESM-first (`"type": "module"`), build CJS parallele via tsup
- `fetch` natif (zero dependance runtime), injectable via l'option `fetch`
- Montants en **centimes** (number)
- `currencyCode` = code ISO 4217 numerique en **string** (`"978"` = EUR)
- `terminalId` accepte `string | number`, caste en string dans le payload
- Params optionnels strippes (les `undefined`/`null` ne sont pas envoyes)
- Champs API additionnels (fiscalisation, AADE, etc.) passes via `extra`
- JSDoc complet par methode publique

## EcrEventId

```ts
import { EcrEventId, ecrEventIdFrom, isInProgress, isSuccessfulEvent, ecrEventLabel } from "...";

const event = ecrEventIdFrom(result.eventId); // EcrEventId | null
isInProgress(EcrEventId.IN_PROGRESS); // true (1100)
isSuccessfulEvent(EcrEventId.SUCCESS); // true (0)
ecrEventLabel(EcrEventId.DECLINED); // "Transaction declined"
```

| eventId | Constant             | Sens                      |
| ------- | -------------------- | ------------------------- |
| 0       | `SUCCESS`            | Reussie                   |
| 1003    | `TERMINAL_TIMEOUT`   | Timeout terminal          |
| 1006    | `DECLINED`           | Refusee                   |
| 1016    | `ABORTED`            | Annulee                   |
| 1020    | `INSUFFICIENT_FUNDS` | Fonds insuffisants        |
| 1099    | `GENERIC_ERROR`      | Erreur generique          |
| 1100    | `IN_PROGRESS`        | En cours (poller)         |
| 6000    | `BAD_PARAMS`         | Parametres incorrects     |

## Erreurs

```
VivaError (Error)
+-- ApiError             -> Erreur HTTP (4xx/5xx) — httpStatus, responseBody, getErrorText(), getErrorCode()
+-- AuthenticationError  -> OAuth2 invalide
```

## Pieges CRITIQUES

1. **Body vide sur succes** : `transactions:sale` (et les autres) renvoient 200
   sans body. Ne pas conclure l'echec sur un body vide — c'est le succes du
   _dispatch_ vers le terminal. Le resultat de paiement s'obtient via le polling
   de session.
2. **`getAction()` renvoie 202 (body vide → {})** tant que l'action n'est pas finie.
3. **Polling** : `eventId === 1100` = continuer ; tout autre eventId = etat
   terminal. `pollUntilComplete()` s'arrete aussi sur un eventId inconnu (fail-safe).
4. **camelCase obligatoire** sur tous les payloads `/ecr/v1/`.
5. **Ne pas confondre avec le SDK ISV** : pas de `isvDetails`, pas de composite
   auth ici. Le marchand opere SON propre compte via OAuth Bearer.
6. **Abort utilise DELETE** (variante marchand).
7. **Ne JAMAIS exposer `clientSecret` cote client** (bundle navigateur).

## Carte de test (demo)

- Numero : `4111111111111111`, CVV : `111`, 3DS : `Secret!33`
- Montants de declin : 9951 (insufficient), 9954 (expired), 9920 (stolen),
  9957 (not permitted), 9961 (withdrawal limit)

## Tests

```bash
pnpm test          # vitest run
pnpm test:watch    # watch mode
pnpm typecheck     # tsc --noEmit
pnpm build         # tsup (ESM + CJS + d.ts)
pnpm format:check  # prettier
```

Pattern de test : `mockFetch([...])` + `tokenResponse()` dans
`tests/support/mock-fetch.ts` injecte un `fetch` factice via
`new VivaCloudTerminalClient({ clientId, clientSecret, fetch: mock.fetch })`.
Toujours queue `tokenResponse()` AVANT la reponse de l'endpoint (handshake OAuth).
1 test par methode publique. Assertions : methode HTTP, URL, body camelCase,
header `Authorization: Bearer ...`.

## Release workflow

Tag-based, npm OIDC Trusted Publishing (zero `NPM_TOKEN`).

1. Bump `version` dans `package.json`.
2. Ajouter une section a `CHANGELOG.md` sous `## [X.Y.Z] - YYYY-MM-DD`.
3. Commit : `git commit -am "chore: release vX.Y.Z"`.
4. Tag + push :
   ```bash
   git tag -a vX.Y.Z -m "Release vX.Y.Z"
   git push && git push origin vX.Y.Z
   ```
5. Le workflow `release.yml` tourne sur le tag :
   - `build` — install, typecheck, test, build (Node 24)
   - `publish` — `npm publish --access public --provenance` via OIDC Trusted
     Publishing. **Node 24 OBLIGATOIRE** (npm OIDC requiert npm >= 11.5 ; Node 22
     ships npm 10.x et echoue en 404). Aucun `NPM_TOKEN` ; configurer un trusted
     publisher sur npmjs.com une seule fois.
   - `github-release` — cree une GitHub Release avec les notes du CHANGELOG.
