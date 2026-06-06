# Viva Wallet Cloud Terminal SDK (TypeScript)

TypeScript SDK for the **Viva Wallet Cloud Terminal API** — the merchant
(`/ecr/v1/`) variant of Viva's EFT POS solution. It lets your back-office
(ECR / cash register / web app) drive a physical card terminal over Viva's
REST API: initiate sales, capture pre-auths, refund, and poll session results.

Isomorphic: works in Node 18+, the browser, Deno, edge runtimes and React
Native — it depends only on the platform `fetch`.

> For the **ISV / Partner** variant (`/ecr/isv/v1/`, connected merchants,
> composite auth), use a separate SDK instead. This package only covers the
> merchant `/ecr/v1/` endpoints.

- **Package**: `@qrcommunication/viva-cloud-terminal-sdk`
- **Auth**: OAuth2 `client_credentials` → Bearer token
- **Amounts**: always in **cents** (number) — `1170` = 11.70 EUR
- **Node**: 18.17+ · **Runtime deps**: none (uses native `fetch`)

---

## Installation

```bash
npm install @qrcommunication/viva-cloud-terminal-sdk
# or
pnpm add @qrcommunication/viva-cloud-terminal-sdk
# or
yarn add @qrcommunication/viva-cloud-terminal-sdk
```

---

## Quickstart

```ts
import { VivaCloudTerminalClient } from "@qrcommunication/viva-cloud-terminal-sdk";

const viva = new VivaCloudTerminalClient({
  clientId: "your-client-id",
  clientSecret: "your-client-secret",
  environment: "demo", // "demo" (sandbox) or "production"
});

// 1. (recommended) confirm the terminal is Live before transacting
const devices = await viva.devices.search({ statusId: 1 });

// 2. initiate a sale on the terminal (amount in cents)
const sale = await viva.transactions.sale({
  terminalId: "16000010",
  amount: 1170, // 11.70 EUR
  cashRegisterId: "CR-01",
  merchantReference: "order-42",
});

// 3. poll until the customer completes (or declines) on the device
const result = await viva.pollUntilComplete(sale.sessionId);

if (result.success === true) {
  // result.transactionId, result.amount, ...
}
```

---

## Authentication

The Cloud Terminal API uses a **single** auth mode:

| Step      | Host                                                                | Auth                                                              |
| --------- | ------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Token     | `accounts.vivapayments.com/connect/token` (demo: `demo-accounts...`) | Basic `client_id:client_secret`, `grant_type=client_credentials` |
| API calls | `api.vivapayments.com/ecr/v1/...` (demo: `demo-api...`)              | `Authorization: Bearer {token}`                                  |

The SDK fetches and caches the Bearer token automatically (refreshed 60s before
expiry). Call `viva.invalidateToken()` to force a fresh handshake.

All `/ecr/v1/` payloads use **camelCase** keys.

> **Security**: never ship your `clientSecret` to a browser/public bundle. Run
> the SDK on a server (or edge) you control and proxy requests from the client.

---

## Resources & methods

### `viva.devices`

| Method                        | Endpoint                      | Description                            |
| ----------------------------- | ----------------------------- | -------------------------------------- |
| `search(params?)`             | `POST /ecr/v1/devices:search` | Discover POS devices and their status  |

### `viva.transactions`

| Method                       | Endpoint                                         | Description                                   |
| ---------------------------- | ------------------------------------------------ | --------------------------------------------- |
| `sale(params)`               | `POST /ecr/v1/transactions:sale`                 | Initiate a card sale                          |
| `capturePreauth(params)`     | `POST /ecr/v1/transactions:preauth-completion`   | Capture a pre-authorized transaction          |
| `refund(params)`             | `POST /ecr/v1/transactions:refund`               | Referenced refund of an original sale         |
| `unreferencedRefund(params)` | `POST /ecr/v1/transactions:unreferenced-refund`  | Standalone refund (no parent sale)            |
| `fastRefund(params)`         | `POST /ecr/v1/transactions:fast-refund`          | Swift refund (Visa/MC/Maestro)                |
| `rebate(params)`             | `POST /ecr/v1/transactions:rebate`               | Rebate to a card                              |
| `createAction(payload)`      | `POST /ecr/v1/actions`                           | Create a device action (e.g. `aade-fim-control`) |
| `getAction(actionId)`        | `GET /ecr/v1/actions/{actionId}`                 | Fetch an action result (202 while processing) |

### `viva.sessions`

| Method                                  | Endpoint                                  | Description                  |
| --------------------------------------- | ----------------------------------------- | ---------------------------- |
| `get(sessionId)`                        | `GET /ecr/v1/sessions/{sessionId}`        | Retrieve one session         |
| `listByDate(params)`                    | `GET /ecr/v1/sessions?date=...`           | List sessions for a date     |
| `abort(sessionId, cashRegisterId)`      | `DELETE /ecr/v1/sessions/{sessionId}`     | Abort an active session      |
| `pollUntilComplete(sessionId, options?)` | repeated `GET`                            | Poll until terminal state    |

`pollUntilComplete()` is also available as a shortcut on the client:
`viva.pollUntilComplete(sessionId)`.

Every `transactions.*` method returns a `TransactionResult`:

```ts
interface TransactionResult {
  sessionId: string; // poll this for the outcome
  response: Record<string, unknown>; // raw API body (usually empty on success)
}
```

---

## Examples

### Sale + polling

```ts
const sale = await viva.transactions.sale({
  terminalId: "16000010",
  amount: 2599, // 25.99 EUR
  cashRegisterId: "CR-01",
  customerTrns: "Table 12",
  showReceipt: true,
});

const final = await viva.pollUntilComplete(sale.sessionId, { timeoutSeconds: 90 });
```

### Pre-auth then capture

```ts
// Pre-authorize (requires preauth enabled on your Viva account)
const preauth = await viva.transactions.sale({
  terminalId: "16000010",
  amount: 5000,
  cashRegisterId: "CR-01",
  preauth: true,
});
await viva.pollUntilComplete(preauth.sessionId);

// Later, capture the final amount (can be less than authorized)
const capture = await viva.transactions.capturePreauth({
  parentSessionId: preauth.sessionId,
  terminalId: "16000010",
  amount: 4200,
  cashRegisterId: "CR-01",
});
await viva.pollUntilComplete(capture.sessionId);
```

### Refund a sale

```ts
const refund = await viva.transactions.refund({
  parentSessionId: sale.sessionId,
  terminalId: "16000010",
  amount: 1170,
  cashRegisterId: "CR-01",
});
await viva.pollUntilComplete(refund.sessionId);
```

### Abort a stuck session

```ts
await viva.sessions.abort(sale.sessionId, "CR-01");
```

### Advanced fields (fiscalisation, etc.)

Pass any additional API field via `extra` (merged into the payload as-is,
camelCase):

```ts
await viva.transactions.sale({
  terminalId: "16000010",
  amount: 1170,
  cashRegisterId: "CR-01",
  extra: {
    fiscalisationData: {
      /* ... */
    },
    aadeProviderId: "999",
  },
});
```

---

## Test card (demo environment)

| Field        | Value                |
| ------------ | -------------------- |
| Card number  | `4111111111111111`   |
| CVV          | `111`                |
| 3DS password | `Secret!33`          |

Common decline test amounts: `9951` (insufficient funds), `9954` (expired card),
`9920` (stolen card), `9957` (not permitted), `9961` (withdrawal limit).

---

## Error handling

```ts
import {
  ApiError,
  AuthenticationError,
  VivaError,
} from "@qrcommunication/viva-cloud-terminal-sdk";

try {
  await viva.transactions.sale({
    terminalId: "16000010",
    amount: 1170,
    cashRegisterId: "CR-01",
  });
} catch (error) {
  if (error instanceof AuthenticationError) {
    // OAuth handshake failed (bad client id/secret)
  } else if (error instanceof ApiError) {
    error.httpStatus; // e.g. 409
    error.getErrorText(); // human-readable Viva error text
    error.getErrorCode(); // Viva error code, if any
  } else if (error instanceof VivaError) {
    // base class for all SDK errors
  }
}
```

---

## Event IDs (`EcrEventId`)

The session poll response returns an `eventId`. Use the `EcrEventId` constants
and helpers to interpret it:

```ts
import {
  EcrEventId,
  ecrEventIdFrom,
  isSuccessfulEvent,
  isInProgress,
  ecrEventLabel,
} from "@qrcommunication/viva-cloud-terminal-sdk";

const event = ecrEventIdFrom(result.eventId);
if (event !== null) {
  isSuccessfulEvent(event); // true on success
  isInProgress(event); // true while IN_PROGRESS (1100)
  ecrEventLabel(event); // human-readable label
}
```

| eventId | Constant             | Meaning                          |
| ------- | -------------------- | -------------------------------- |
| 0       | `SUCCESS`            | Transaction successful           |
| 1003    | `TERMINAL_TIMEOUT`   | Terminal timed out               |
| 1006    | `DECLINED`           | Declined                         |
| 1016    | `ABORTED`            | Aborted                          |
| 1020    | `INSUFFICIENT_FUNDS` | Insufficient funds               |
| 1099    | `GENERIC_ERROR`      | Generic error                    |
| 1100    | `IN_PROGRESS`        | Still processing (keep polling)  |
| 6000    | `BAD_PARAMS`         | Bad parameters                   |

---

## Gotchas

1. **Empty body on success**: `transactions:sale` (and friends) reply with HTTP
   200 and **no body**. Don't treat that as a failure — it's the success of the
   _dispatch_ to the terminal. The payment outcome is obtained by polling the
   session.
2. **`getAction()` returns 202** (empty body → `{}`) while the action is still
   processing.
3. **Polling**: `eventId === 1100` means keep going; any other id is a terminal
   state. `pollUntilComplete()` also stops on an unknown id (fail-safe).
4. **camelCase** on every `/ecr/v1/` payload.
5. **Abort uses `DELETE`** in this merchant variant.

---

## Development

```bash
pnpm install
pnpm typecheck       # tsc --noEmit
pnpm test            # vitest run
pnpm build           # tsup (ESM + CJS + d.ts)
pnpm format:check    # prettier
```

---

## License

MIT © QrCommunication. See [LICENSE](LICENSE).
