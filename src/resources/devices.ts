import type { HttpClient, JsonObject } from "../http.js";
import type { DeviceSearchParams } from "../types/device.js";

/**
 * Devices resource — discover POS (EFT POS) devices and their status.
 *
 * Recommended as a pre-flight step before initiating any transaction,
 * especially over WAN connections, to confirm the terminal is `Live`
 * (statusId 1).
 *
 * Endpoint: `POST /ecr/v1/devices:search` (Bearer auth, camelCase).
 */
export class DevicesResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Search POS devices, optionally filtering by status and/or source code.
   *
   * Each device entry contains: `terminalId` (string), `statusId` (int),
   * `sourceCode` (string), `virtualTerminalId` (string).
   *
   * @returns The raw decoded API body (a list of devices).
   */
  async search(params: DeviceSearchParams = {}): Promise<JsonObject> {
    const body: JsonObject = {};
    if (params.statusId !== undefined) {
      body["statusId"] = params.statusId;
    }
    if (params.sourceCode !== undefined) {
      body["sourceCode"] = params.sourceCode;
    }
    return this.http.post("/ecr/v1/devices:search", body);
  }
}
