export interface AppError {
  /** HTTP status code; 0 means network/connection failure */
  status: number;
  /** API error code from response body or 'UNKNOWN' if unavailable */
  code: string;
  /** Human-readable message safe to display to end users */
  message: string;
  /** Which API produced this error (matches API_SOURCE context token value) */
  source: string;
  /** ISO 8601 timestamp for logging and diagnostics */
  timestamp: string;
}
