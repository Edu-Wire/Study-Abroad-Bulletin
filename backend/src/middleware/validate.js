/**
 * Centralized Zod Request Validation Middleware for Express.
 *
 * Validates req.body, req.query, and/or req.params against provided Zod schemas.
 * Returns HTTP 400 with structured field-level error messages before route handlers execute.
 */

export function validateRequest(schemas = {}) {
  return (req, res, next) => {
    const errors = [];

    // 1. Validate req.params
    if (schemas.params) {
      const result = schemas.params.safeParse(req.params);
      if (!result.success) {
        for (const issue of result.error.issues) {
          errors.push({
            location: "params",
            field: issue.path.join(".") || "params",
            message: issue.message,
          });
        }
      } else {
        req.params = result.data;
      }
    }

    // 2. Validate req.query
    if (schemas.query) {
      const result = schemas.query.safeParse(req.query);
      if (!result.success) {
        for (const issue of result.error.issues) {
          errors.push({
            location: "query",
            field: issue.path.join(".") || "query",
            message: issue.message,
          });
        }
      } else {
        req.query = result.data;
      }
    }

    // 3. Validate req.body
    if (schemas.body) {
      const result = schemas.body.safeParse(req.body);
      if (!result.success) {
        for (const issue of result.error.issues) {
          errors.push({
            location: "body",
            field: issue.path.join(".") || "body",
            message: issue.message,
          });
        }
      } else {
        req.body = result.data;
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    next();
  };
}
