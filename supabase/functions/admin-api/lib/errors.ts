export class AppError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(message: string, code = "BAD_REQUEST", status = 400, details?: unknown) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}
