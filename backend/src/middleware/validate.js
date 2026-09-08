/**
 * Centralized Zod Request Validation Middleware for Express.
 *
 * Validates req.body, req.query, and/or req.params against provided Zod schemas.
 * Returns HTTP 400 with structured field-level error messages before route
 * handlers execute.
 *
 * Express 5 note: `req.query` is defined as a getter-only property, so the
 * previous implementation's `req.query = result.data` threw a TypeError at
 * runtime on any route with a query schema. Parsed output is therefore written
 * to `res.locals.validated` and handlers read it from there. `req.params` and
 * `req.body` are left untouched for the same reason — one consistent source of
 * validated data beats three subtly different ones.
 */

export function validateRequest(schemas = {}) {
  return (req, res, next) => {
    const errors = [];
    const validated = {};

    for (const location of ["params", "query", "body"]) {
      const schema = schemas[location];
      if (!schema) continue;

      const result = schema.safeParse(req[location]);

      if (result.success) {
        validated[location] = result.data;
        continue;
      }

      for (const issue of result.error.issues) {
        errors.push({
          location,
          field: issue.path.join(".") || location,
          message: issue.message,
        });
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    // Merge so multiple validate layers on one route compose rather than clash.
    res.locals.validated = { ...(res.locals.validated ?? {}), ...validated };

    next();
  };
}

/**
 * Read a validated section, falling back to the raw request value.
 *
 * The fallback keeps handlers that have no schema for a given location working
 * unchanged, so routes can be migrated one at a time.
 */
export function validatedData(req, res, location) {
  return res.locals.validated?.[location] ?? req[location];
}
