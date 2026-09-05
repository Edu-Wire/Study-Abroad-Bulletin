import { Router } from "express";
import { createCountriesController } from "./countries.controller.js";
import { requireEditor, requireAdmin } from "../../middleware/auth.js";
import { adminMutationLimiter } from "../../middleware/rateLimiter.js";
import { validateRequest } from "../../middleware/validate.js";
import {
  CountryIdParamSchema,
  CountryCreateSchema,
  CountryUpdateSchema,
} from "../../validators/index.js";

/** Admin CRUD, mounted at /api/admin/countries. */
export function createAdminCountriesRouter(options) {
  const router = Router();
  const controller = createCountriesController(options);

  router.get("/", ...requireEditor, controller.adminList);
  router.get("/:id", ...requireEditor, validateRequest({ params: CountryIdParamSchema }), controller.adminDetail);
  router.post(
    "/",
    ...requireAdmin,
    adminMutationLimiter,
    validateRequest({ body: CountryCreateSchema }),
    controller.adminCreate
  );
  router.put(
    "/:id",
    ...requireAdmin,
    adminMutationLimiter,
    validateRequest({ params: CountryIdParamSchema, body: CountryUpdateSchema }),
    controller.adminUpdate
  );
  router.delete(
    "/:id",
    ...requireAdmin,
    adminMutationLimiter,
    validateRequest({ params: CountryIdParamSchema }),
    controller.adminDelete
  );

  return router;
}
