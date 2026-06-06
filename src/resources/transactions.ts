import type { HttpClient, JsonObject } from "../http.js";
import type { TransactionResult, ApiResponse } from "../types/common.js";
import type {
  SaleParams,
  CapturePreauthParams,
  RefundParams,
  StandaloneRefundParams,
  CreateActionParams,
} from "../types/transaction.js";
import { generateUuid } from "../uuid.js";

const DEFAULT_CURRENCY = "978"; // EUR

/**
 * Strip `undefined`/`null` values from a payload then merge the `extra` object,
 * mirroring the PHP `array_filter(..., fn ($v) => $v !== null) + $extra` pattern.
 */
function buildPayload(payload: JsonObject, extra: ApiResponse | undefined): JsonObject {
  const cleaned: JsonObject = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined && value !== null) {
      cleaned[key] = value;
    }
  }
  return { ...cleaned, ...(extra ?? {}) };
}

/**
 * Transactions resource — Cloud Terminal merchant transaction operations.
 *
 * All endpoints under `/ecr/v1/transactions:*` plus the device actions endpoints
 * `/ecr/v1/actions[/{actionId}]`. Bearer auth, camelCase payloads.
 *
 * Conventions:
 * - Amounts are always in cents (integer): 1170 = 11.70 EUR.
 * - `currencyCode` is the ISO 4217 numeric code as a string: '978' = EUR.
 * - Every transaction carries a unique `sessionId` (UUID); if omitted it is
 *   auto-generated. The session is then polled (see {@link SessionsResource}).
 *
 * Most transaction endpoints return an empty body (HTTP 200) — the result is
 * obtained by polling the session afterwards, so each method returns a
 * {@link TransactionResult} that surfaces the `sessionId` it used.
 */
export class TransactionsResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Initiate a sale transaction on a POS terminal.
   *
   * `POST /ecr/v1/transactions:sale`.
   */
  async sale(params: SaleParams): Promise<TransactionResult> {
    const sessionId = params.sessionId ?? generateUuid();

    const payload = buildPayload(
      {
        sessionId,
        terminalId: String(params.terminalId),
        cashRegisterId: params.cashRegisterId,
        amount: params.amount,
        currencyCode: params.currencyCode ?? DEFAULT_CURRENCY,
        merchantReference: params.merchantReference ?? `SDK-${sessionId}`,
        tipAmount: params.tipAmount ?? 0,
        preauth: params.preauth,
        customerTrns: params.customerTrns,
        paymentMethod: params.paymentMethod,
        skipSurcharge: params.skipSurcharge,
        showTransactionResult: params.showTransactionResult,
        showReceipt: params.showReceipt,
      },
      params.extra,
    );

    const response = await this.http.post("/ecr/v1/transactions:sale", payload);
    return { sessionId, response };
  }

  /**
   * Capture a previously authorized pre-auth transaction.
   *
   * `POST /ecr/v1/transactions:preauth-completion`. Captures the amount held by
   * the original pre-auth identified by `parentSessionId`.
   */
  async capturePreauth(params: CapturePreauthParams): Promise<TransactionResult> {
    const sessionId = params.sessionId ?? generateUuid();

    const payload = buildPayload(
      {
        sessionId,
        parentSessionId: params.parentSessionId,
        terminalId: String(params.terminalId),
        cashRegisterId: params.cashRegisterId,
        amount: params.amount,
        currencyCode: params.currencyCode ?? DEFAULT_CURRENCY,
        merchantReference: params.merchantReference ?? `SDK-capture-${sessionId}`,
        customerTrns: params.customerTrns,
        showTransactionResult: params.showTransactionResult,
        showReceipt: params.showReceipt,
      },
      params.extra,
    );

    const response = await this.http.post("/ecr/v1/transactions:preauth-completion", payload);
    return { sessionId, response };
  }

  /**
   * Refund (cancel) a previous sale, referencing the original session.
   *
   * `POST /ecr/v1/transactions:refund`. A fresh `sessionId` is generated for the
   * refund operation itself; `parentSessionId` references the original sale.
   */
  async refund(params: RefundParams): Promise<TransactionResult> {
    const sessionId = params.sessionId ?? generateUuid();

    const payload = buildPayload(
      {
        sessionId,
        parentSessionId: params.parentSessionId,
        terminalId: String(params.terminalId),
        cashRegisterId: params.cashRegisterId,
        amount: params.amount,
        currencyCode: params.currencyCode ?? DEFAULT_CURRENCY,
        merchantReference: params.merchantReference ?? `SDK-refund-${sessionId}`,
        customerTrns: params.customerTrns,
        showTransactionResult: params.showTransactionResult,
        showReceipt: params.showReceipt,
      },
      params.extra,
    );

    const response = await this.http.post("/ecr/v1/transactions:refund", payload);
    return { sessionId, response };
  }

  /**
   * Initiate an unreferenced (standalone) refund — not tied to an original sale.
   *
   * `POST /ecr/v1/transactions:unreferenced-refund`.
   */
  async unreferencedRefund(params: StandaloneRefundParams): Promise<TransactionResult> {
    return this.standalone("/ecr/v1/transactions:unreferenced-refund", "SDK-unref-refund", params);
  }

  /**
   * Process a fast refund (swift refund on Visa/Mastercard/Maestro).
   *
   * `POST /ecr/v1/transactions:fast-refund`.
   */
  async fastRefund(params: StandaloneRefundParams): Promise<TransactionResult> {
    return this.standalone("/ecr/v1/transactions:fast-refund", "SDK-fast-refund", params);
  }

  /**
   * Process a rebate to a Visa/Mastercard/Maestro card.
   *
   * `POST /ecr/v1/transactions:rebate`.
   */
  async rebate(params: StandaloneRefundParams): Promise<TransactionResult> {
    return this.standalone("/ecr/v1/transactions:rebate", "SDK-rebate", params);
  }

  /**
   * Create an action request to be invoked on a POS device.
   *
   * `POST /ecr/v1/actions` — e.g. an `aade-fim-control` action. The payload is
   * passed through as-is (camelCase) and must include `terminalId`,
   * `cashRegisterId`, `actionType` and `request`.
   */
  async createAction(payload: CreateActionParams): Promise<JsonObject> {
    return this.http.post("/ecr/v1/actions", payload);
  }

  /**
   * Fetch the result of a previously created action.
   *
   * `GET /ecr/v1/actions/{actionId}`. Returns HTTP 202 (empty body → `{}`) while
   * the action is still processing, or the action result once completed.
   */
  async getAction(actionId: string): Promise<JsonObject> {
    return this.http.get(`/ecr/v1/actions/${encodeURIComponent(actionId)}`);
  }

  private async standalone(
    path: string,
    referencePrefix: string,
    params: StandaloneRefundParams,
  ): Promise<TransactionResult> {
    const sessionId = params.sessionId ?? generateUuid();

    const payload = buildPayload(
      {
        sessionId,
        terminalId: String(params.terminalId),
        cashRegisterId: params.cashRegisterId,
        amount: params.amount,
        currencyCode: params.currencyCode ?? DEFAULT_CURRENCY,
        merchantReference: params.merchantReference ?? `${referencePrefix}-${sessionId}`,
        customerTrns: params.customerTrns,
        showTransactionResult: params.showTransactionResult,
        showReceipt: params.showReceipt,
      },
      params.extra,
    );

    const response = await this.http.post(path, payload);
    return { sessionId, response };
  }
}
