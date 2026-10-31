import { badRequest } from '../lib/errors.js';

// Validate req[source] against a zod schema and replace it with the parsed (typed, coerced) value.
// Stored on req.valid so handlers never touch unvalidated input.
export function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
      return next(badRequest('Invalid request', details));
    }
    req.valid = { ...req.valid, [source]: result.data };
    next();
  };
}
