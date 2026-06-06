import type { ApiResponse } from "./common.js";

/**
 * Parameters for {@link SessionsResource.listByDate}.
 */
export interface ListSessionsParams {
  /** Date in `YYYY-MM-DD` format. */
  date: string;
  /** Filter to AADE-autonomous sessions only (Greece). */
  aadeAutonomouslyOnly?: boolean;
}

/**
 * Options for {@link SessionsResource.pollUntilComplete}.
 */
export interface PollOptions {
  /** Maximum total wait time, in seconds. Defaults to 120. */
  timeoutSeconds?: number;
  /** Delay between poll attempts, in milliseconds. Defaults to 3000. */
  intervalMs?: number;
}

/**
 * Session state returned by `sessions.get` / poll responses.
 *
 * Surfaced as a flexible object; the most relevant fields are documented below.
 */
export interface Session extends ApiResponse {
  /** Numeric Cloud Terminal event id (see {@link EcrEventId}). */
  eventId?: number;
  /** Whether the transaction was successful. */
  success?: boolean;
  /** Viva transaction id, once the transaction completes. */
  transactionId?: string;
  /** Amount in cents. */
  amount?: number;
}
