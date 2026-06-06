/**
 * Base error for every failure raised by the Viva Cloud Terminal SDK.
 */
export class VivaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VivaError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Raised when the Cloud Terminal API returns a non-2xx HTTP response.
 *
 * Exposes the HTTP status and the decoded response body so callers can inspect
 * the Viva error fields (`ErrorText`, `ErrorCode`, ...).
 */
export class ApiError extends VivaError {
  constructor(
    message: string,
    public readonly httpStatus: number,
    public readonly responseBody: Record<string, unknown> | null = null,
    public override readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }

  /**
   * Viva error text from the response body, when present.
   */
  getErrorText(): string | null {
    const text = this.responseBody?.["ErrorText"];
    return typeof text === "string" ? text : null;
  }

  /**
   * Viva error code from the response body, when present.
   */
  getErrorCode(): number | null {
    const code = this.responseBody?.["ErrorCode"];
    return typeof code === "number" ? code : null;
  }
}

/**
 * Raised when the OAuth2 client_credentials handshake fails (invalid client id
 * / secret, or a non-200 token response).
 */
export class AuthenticationError extends VivaError {
  constructor(
    message: string,
    public override readonly cause?: unknown,
  ) {
    super(message);
    this.name = "AuthenticationError";
  }
}
