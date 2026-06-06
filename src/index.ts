export { VivaCloudTerminalClient } from "./client.js";
export { CloudTerminalConfig } from "./config.js";
export type { VivaCloudTerminalOptions } from "./config.js";
export { HttpClient } from "./http.js";
export type { JsonObject } from "./http.js";

export { VivaError, ApiError, AuthenticationError } from "./errors.js";

export {
  Environment,
  EcrEventId,
  ecrEventIdFrom,
  ecrEventLabel,
  isInProgress,
  isTerminalEvent,
  isSuccessfulEvent,
} from "./enums.js";

export { DevicesResource } from "./resources/devices.js";
export { TransactionsResource } from "./resources/transactions.js";
export { SessionsResource } from "./resources/sessions.js";

export { generateUuid } from "./uuid.js";

export type {
  ApiResponse,
  TransactionResult,
  DeviceSearchParams,
  Device,
  TransactionCommonParams,
  SaleParams,
  CapturePreauthParams,
  RefundParams,
  StandaloneRefundParams,
  CreateActionParams,
  ListSessionsParams,
  PollOptions,
  Session,
} from "./types/index.js";
