import { Environment } from "./enums.js";

/**
 * Options accepted by {@link VivaCloudTerminalClient}.
 */
export interface VivaCloudTerminalOptions {
  /** OAuth client id (client_credentials grant). */
  clientId: string;
  /** OAuth client secret (client_credentials grant). */
  clientSecret: string;
  /** Target environment. Defaults to `"demo"` (sandbox). */
  environment?: Environment;
  /** Request timeout in milliseconds. Defaults to 30000. */
  timeoutMs?: number;
  /** Custom `fetch` implementation (polyfill / mock). Defaults to global `fetch`. */
  fetch?: typeof fetch;
}

const ACCOUNTS_URLS: Record<Environment, string> = {
  [Environment.DEMO]: "https://demo-accounts.vivapayments.com",
  [Environment.PRODUCTION]: "https://accounts.vivapayments.com",
};

const API_URLS: Record<Environment, string> = {
  [Environment.DEMO]: "https://demo-api.vivapayments.com",
  [Environment.PRODUCTION]: "https://api.vivapayments.com",
};

/**
 * Cloud Terminal configuration — holds the OAuth client credentials and the
 * resolved environment hosts.
 *
 * The merchant Cloud Terminal API (`/ecr/v1/`) uses a single auth mode: OAuth2
 * client_credentials → Bearer token. The token is fetched from
 * `accounts.vivapayments.com/connect/token` and used against
 * `api.vivapayments.com/ecr/v1/...` (demo hosts in sandbox).
 */
export class CloudTerminalConfig {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly environment: Environment;
  readonly timeoutMs: number;
  readonly fetch: typeof fetch;

  constructor(options: VivaCloudTerminalOptions) {
    if (!options.clientId) {
      throw new TypeError("VivaCloudTerminalClient: clientId is required");
    }
    if (!options.clientSecret) {
      throw new TypeError("VivaCloudTerminalClient: clientSecret is required");
    }

    this.clientId = options.clientId;
    this.clientSecret = options.clientSecret;
    this.environment = options.environment ?? Environment.DEMO;
    this.timeoutMs = options.timeoutMs ?? 30_000;

    const resolvedFetch = options.fetch ?? globalThis.fetch;
    if (typeof resolvedFetch !== "function") {
      throw new TypeError(
        "VivaCloudTerminalClient: global fetch is unavailable; pass a `fetch` implementation in the options",
      );
    }
    this.fetch = resolvedFetch;
  }

  /** OAuth token host (POST /connect/token only). */
  accountsUrl(): string {
    return ACCOUNTS_URLS[this.environment];
  }

  /** API host for all `/ecr/v1/` calls. */
  apiUrl(): string {
    return API_URLS[this.environment];
  }

  /** Returns true when configured for the production environment. */
  isProduction(): boolean {
    return this.environment === Environment.PRODUCTION;
  }

  /** Returns true when configured for the sandbox (demo) environment. */
  isSandbox(): boolean {
    return this.environment === Environment.DEMO;
  }
}
