/**
 * Parameters for {@link DevicesResource.search}.
 */
export interface DeviceSearchParams {
  /**
   * Filter by device status.
   *
   * statusId values:
   *   0 = WareHouse, 1 = Live, 2 = Ready To Ship, 3 = In Stock,
   *   4 = Pending Key Injection, 5 = Lost, 6 = Broken, ...
   */
  statusId?: number;
  /** Custom merchant-assigned device code. */
  sourceCode?: string;
}

/**
 * A POS device entry returned by `devices:search`.
 */
export interface Device {
  terminalId: string;
  statusId: number;
  sourceCode: string;
  virtualTerminalId: string;
  [key: string]: unknown;
}
