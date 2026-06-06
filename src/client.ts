import { CloudTerminalConfig, type VivaCloudTerminalOptions } from "./config.js";
import { HttpClient } from "./http.js";
import { DevicesResource } from "./resources/devices.js";
import { TransactionsResource } from "./resources/transactions.js";
import { SessionsResource } from "./resources/sessions.js";
import type { PollOptions, Session } from "./types/session.js";

/**
 * Viva Wallet Cloud Terminal SDK — main entry point (merchant `/ecr/v1/`).
 *
 * Single auth mode: OAuth2 client_credentials → Bearer token, fetched from
 * `accounts.vivapayments.com` and used against `api.vivapayments.com/ecr/v1/...`
 * (demo hosts in sandbox).
 *
 * @example
 * ```ts
 * const viva = new VivaCloudTerminalClient({
 *   clientId: "your-client-id",
 *   clientSecret: "your-client-secret",
 *   environment: "demo",
 * });
 *
 * // 1. (optional) confirm the terminal is Live
 * const devices = await viva.devices.search({ statusId: 1 });
 *
 * // 2. initiate a sale (amount in cents)
 * const sale = await viva.transactions.sale({
 *   terminalId: "16000010",
 *   amount: 1170,
 *   cashRegisterId: "CR-01",
 * });
 *
 * // 3. poll until the customer completes the payment on the device
 * const result = await viva.pollUntilComplete(sale.sessionId);
 * ```
 */
export class VivaCloudTerminalClient {
  /** Devices resource (`POST /ecr/v1/devices:search`). */
  readonly devices: DevicesResource;
  /** Transactions resource (`/ecr/v1/transactions:*` + `/ecr/v1/actions`). */
  readonly transactions: TransactionsResource;
  /** Sessions resource (`GET`/`DELETE /ecr/v1/sessions...`). */
  readonly sessions: SessionsResource;

  private readonly config: CloudTerminalConfig;
  private readonly http: HttpClient;

  constructor(options: VivaCloudTerminalOptions) {
    this.config = new CloudTerminalConfig(options);
    this.http = new HttpClient(this.config);

    this.devices = new DevicesResource(this.http);
    this.transactions = new TransactionsResource(this.http);
    this.sessions = new SessionsResource(this.http);
  }

  /** The resolved configuration (hosts, environment, timeout). */
  getConfig(): CloudTerminalConfig {
    return this.config;
  }

  /** Drop the cached OAuth token, forcing a fresh handshake on the next call. */
  invalidateToken(): void {
    this.http.invalidateToken();
  }

  /**
   * Convenience passthrough to {@link SessionsResource.pollUntilComplete}.
   */
  pollUntilComplete(sessionId: string, options?: PollOptions): Promise<Session> {
    return this.sessions.pollUntilComplete(sessionId, options);
  }
}
