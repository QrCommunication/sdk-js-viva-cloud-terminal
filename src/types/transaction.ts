import type { ApiResponse } from "./common.js";

/**
 * Common optional fields shared by every transaction request.
 *
 * - Amounts are always in cents (integer): 1170 = 11.70 EUR.
 * - `currencyCode` is the ISO 4217 numeric code as a string ('978' = EUR).
 * - `sessionId` is auto-generated (UUID v4) when omitted.
 * - `extra` is merged as-is for additional API fields (e.g. `fiscalisationData`).
 */
export interface TransactionCommonParams {
  /** Free-text merchant reference (defaults to a generated `SDK-...` value). */
  merchantReference?: string;
  /** ISO 4217 numeric code as a string. Defaults to `'978'` (EUR). */
  currencyCode?: string;
  /** Free-text customer reference. */
  customerTrns?: string;
  /** Show the transaction result on the terminal. */
  showTransactionResult?: boolean;
  /** Show the receipt + result on the terminal. */
  showReceipt?: boolean;
  /** Session UUID (auto-generated when omitted). */
  sessionId?: string;
  /** Additional API fields passed through as-is. */
  extra?: ApiResponse;
}

/**
 * Parameters for {@link TransactionsResource.sale}.
 */
export interface SaleParams extends TransactionCommonParams {
  /** Target terminal ID (e.g. '16000010'). */
  terminalId: string | number;
  /** Amount to authorize, in cents. */
  amount: number;
  /** Cash register identification (set by the merchant). */
  cashRegisterId: string;
  /** Desired tip amount in cents (not compatible with preauth). */
  tipAmount?: number;
  /** Pre-authorization flag (requires Viva enablement). */
  preauth?: boolean;
  /** Default payment method displayed (e.g. 'CardPresent'). */
  paymentMethod?: string;
  /** Disable surcharge for this transaction. */
  skipSurcharge?: boolean;
}

/**
 * Parameters for {@link TransactionsResource.capturePreauth}.
 */
export interface CapturePreauthParams extends TransactionCommonParams {
  /** Session UUID of the original pre-auth to capture. */
  parentSessionId: string;
  /** Target terminal ID. */
  terminalId: string | number;
  /** Amount to capture, in cents. */
  amount: number;
  /** Cash register identification. */
  cashRegisterId: string;
}

/**
 * Parameters for {@link TransactionsResource.refund} — referenced refund.
 */
export interface RefundParams extends TransactionCommonParams {
  /** Session UUID of the original sale to refund. */
  parentSessionId: string;
  /** Target terminal ID. */
  terminalId: string | number;
  /** Amount to refund, in cents. */
  amount: number;
  /** Cash register identification. */
  cashRegisterId: string;
}

/**
 * Parameters for the standalone (unreferenced) money-movement operations:
 * {@link TransactionsResource.unreferencedRefund},
 * {@link TransactionsResource.fastRefund} and
 * {@link TransactionsResource.rebate}.
 */
export interface StandaloneRefundParams extends TransactionCommonParams {
  /** Target terminal ID. */
  terminalId: string | number;
  /** Amount, in cents. */
  amount: number;
  /** Cash register identification. */
  cashRegisterId: string;
}

/**
 * Parameters for {@link TransactionsResource.createAction}.
 *
 * Passed through as-is (camelCase); must include `terminalId`, `cashRegisterId`,
 * `actionType` and `request`.
 */
export type CreateActionParams = ApiResponse;
