/**
 * Cloud Terminal environment.
 *
 * `demo` targets the Viva sandbox hosts, `production` the live hosts.
 */
export const Environment = {
  DEMO: "demo",
  PRODUCTION: "production",
} as const;

export type Environment = (typeof Environment)[keyof typeof Environment];

/**
 * Cloud Terminal API event IDs.
 *
 * Returned in the session poll response as `eventId`. Used to determine whether
 * a terminal transaction is still in progress (keep polling) or has reached a
 * terminal state (success / decline / abort / error).
 */
export const EcrEventId = {
  /** Transaction successful. */
  SUCCESS: 0,
  /** Terminal timed out. */
  TERMINAL_TIMEOUT: 1003,
  /** Transaction declined. */
  DECLINED: 1006,
  /** Transaction aborted. */
  ABORTED: 1016,
  /** Insufficient funds. */
  INSUFFICIENT_FUNDS: 1020,
  /** Generic error. */
  GENERIC_ERROR: 1099,
  /** In progress — the session must keep being polled. */
  IN_PROGRESS: 1100,
  /** Bad parameters. */
  BAD_PARAMS: 6000,
} as const;

export type EcrEventId = (typeof EcrEventId)[keyof typeof EcrEventId];

const ECR_EVENT_LABELS: Record<EcrEventId, string> = {
  [EcrEventId.SUCCESS]: "Transaction successful",
  [EcrEventId.TERMINAL_TIMEOUT]: "Terminal timed out",
  [EcrEventId.DECLINED]: "Transaction declined",
  [EcrEventId.ABORTED]: "Transaction aborted",
  [EcrEventId.INSUFFICIENT_FUNDS]: "Insufficient funds",
  [EcrEventId.GENERIC_ERROR]: "Generic error",
  [EcrEventId.IN_PROGRESS]: "In progress",
  [EcrEventId.BAD_PARAMS]: "Bad parameters",
};

/**
 * Returns the known {@link EcrEventId} for a numeric value, or `null` when the
 * value is not a recognised event id.
 */
export function ecrEventIdFrom(value: number | null | undefined): EcrEventId | null {
  if (value === null || value === undefined) {
    return null;
  }
  return Object.values(EcrEventId).includes(value as EcrEventId) ? (value as EcrEventId) : null;
}

/**
 * True while the session is still being processed and must keep being polled.
 */
export function isInProgress(eventId: EcrEventId): boolean {
  return eventId === EcrEventId.IN_PROGRESS;
}

/**
 * True when the transaction has reached a final state (no longer processing).
 */
export function isTerminalEvent(eventId: EcrEventId): boolean {
  return eventId !== EcrEventId.IN_PROGRESS;
}

/**
 * True when the transaction completed successfully.
 */
export function isSuccessfulEvent(eventId: EcrEventId): boolean {
  return eventId === EcrEventId.SUCCESS;
}

/**
 * Human-readable label for an event id.
 */
export function ecrEventLabel(eventId: EcrEventId): string {
  return ECR_EVENT_LABELS[eventId];
}
