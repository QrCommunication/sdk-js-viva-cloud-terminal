import type { CloudTerminalConfig } from "./config.js";
import { ApiError, AuthenticationError } from "./errors.js";

/** Decoded JSON object returned by the API (or `{}` on empty success bodies). */
export type JsonObject = Record<string, unknown>;

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

/**
 * Low-level HTTP client for the Cloud Terminal API.
 *
 * Single auth mode: OAuth2 client_credentials → Bearer token.
 * - Token endpoint: `accounts.vivapayments.com/connect/token`
 *   (Basic Auth client_id:client_secret, `grant_type=client_credentials`)
 * - API calls:      `api.vivapayments.com/ecr/v1/...`
 *   (Authorization: Bearer {token})
 *
 * Tokens are cached in-memory and refreshed automatically 60s before expiry.
 */
export class HttpClient {
  private accessToken: string | null = null;
  private tokenExpiresAt: number | null = null;

  constructor(private readonly config: CloudTerminalConfig) {}

  /** GET `${apiUrl}${path}` with Bearer auth and an optional query string. */
  async get(path: string, query: Record<string, string | undefined> = {}): Promise<JsonObject> {
    const url = this.config.apiUrl() + path + buildQueryString(query);
    return this.requestBearer("GET", url);
  }

  /** POST `${apiUrl}${path}` with Bearer auth and a JSON body. */
  async post(path: string, body: JsonObject = {}): Promise<JsonObject> {
    return this.requestBearer("POST", this.config.apiUrl() + path, body);
  }

  /** DELETE `${apiUrl}${path}` with Bearer auth and an optional query string. */
  async delete(path: string, query: Record<string, string | undefined> = {}): Promise<JsonObject> {
    const url = this.config.apiUrl() + path + buildQueryString(query);
    return this.requestBearer("DELETE", url);
  }

  /** Drop the cached access token, forcing a fresh OAuth handshake next call. */
  invalidateToken(): void {
    this.accessToken = null;
    this.tokenExpiresAt = null;
  }

  private async requestBearer(method: string, url: string, body?: JsonObject): Promise<JsonObject> {
    await this.authenticate();

    const headers: Record<string, string> = {
      Accept: "application/json",
      Authorization: `Bearer ${this.accessToken}`,
    };

    const init: RequestInit = { method, headers };
    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(body);
    }

    const response = await this.fetchWithTimeout(url, init);
    return this.parseResponse(response);
  }

  private async parseResponse(response: Response): Promise<JsonObject> {
    const text = await response.text();
    const status = response.status;

    // Many Cloud Terminal endpoints return an empty body on success
    // (e.g. transactions:sale 200, actions GET 202 while processing).
    if (text === "" && status >= 200 && status < 300) {
      return {};
    }

    const decoded = safeJsonParse(text);

    if (status >= 400) {
      const message =
        pickString(decoded, "ErrorText") ??
        pickString(decoded, "message") ??
        pickString(decoded, "detail") ??
        pickString(decoded, "Message") ??
        `HTTP ${status}`;
      throw new ApiError(message, status, decoded);
    }

    return decoded;
  }

  private async authenticate(): Promise<void> {
    if (this.accessToken && this.tokenExpiresAt && Date.now() < this.tokenExpiresAt) {
      return;
    }

    const credentials = base64(`${this.config.clientId}:${this.config.clientSecret}`);
    const url = `${this.config.accountsUrl()}/connect/token`;

    let response: Response;
    try {
      response = await this.fetchWithTimeout(url, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
      });
    } catch (error) {
      throw new AuthenticationError(
        `Cloud Terminal token request failed: ${errorMessage(error)}`,
        error,
      );
    }

    const data = safeJsonParse(await response.text()) as TokenResponse;

    if (response.status !== 200 || !data.access_token) {
      const reason = data.error_description ?? data.error ?? `HTTP ${response.status}`;
      throw new AuthenticationError(`Cloud Terminal OAuth2 authentication failed: ${reason}`);
    }

    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + ((data.expires_in ?? 3600) - 60) * 1000;
  }

  private async fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);
    try {
      return await this.config.fetch(url, { ...init, signal: controller.signal });
    } catch (error) {
      throw new ApiError(`HTTP request failed: ${errorMessage(error)}`, 0, null, error);
    } finally {
      clearTimeout(timer);
    }
  }
}

function buildQueryString(query: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) {
      params.append(key, value);
    }
  }
  const qs = params.toString();
  return qs === "" ? "" : `?${qs}`;
}

function safeJsonParse(text: string): JsonObject {
  if (text === "") {
    return {};
  }
  try {
    const parsed = JSON.parse(text) as unknown;
    return typeof parsed === "object" && parsed !== null ? (parsed as JsonObject) : {};
  } catch {
    return {};
  }
}

function pickString(obj: JsonObject, key: string): string | null {
  const value = obj[key];
  return typeof value === "string" ? value : null;
}

function base64(value: string): string {
  if (typeof globalThis.btoa === "function") {
    return globalThis.btoa(value);
  }
  // Node fallback.
  return Buffer.from(value, "utf8").toString("base64");
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
