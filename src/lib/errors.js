// Errors with an HTTP status that is safe to show the client.
// Anything else becomes a generic 500 so internals never leak in responses.
export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const badRequest = (message, details) => new HttpError(400, message, details);
export const unauthorized = (message = 'Unauthorized') => new HttpError(401, message);
export const notFound = (message = 'Not found') => new HttpError(404, message);
