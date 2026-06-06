/**
 * Decoded JSON object returned by the Cloud Terminal API.
 *
 * The API returns dynamically-shaped bodies (and empty bodies on success), so
 * raw responses are surfaced as index signatures. Resource methods document the
 * fields you can expect in their JSDoc.
 */
export type ApiResponse = Record<string, unknown>;

/**
 * Result envelope shared by every `transactions.*` method.
 *
 * Most `/ecr/v1/transactions:*` endpoints reply with an empty body (HTTP 200):
 * the actual payment outcome is obtained by polling the session afterwards, so
 * each method also surfaces the `sessionId` it used (generated or provided).
 */
export interface TransactionResult {
  /** The session UUID used for this transaction (poll it for the outcome). */
  sessionId: string;
  /** The raw decoded API response body (usually empty on success). */
  response: ApiResponse;
}
