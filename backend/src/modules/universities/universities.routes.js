import { Router } from "express";
import { createUniversitiesController } from "./universities.controller.js";
import { requireEditor, requireAdmin } from "../../middleware/auth.js";
import { adminMutationLimiter } from "../../middleware/rateLimiter.js";
import { validateRequest } from "../../middleware/validate.js";
import {
  UniversityIdParamSchema,
  UniversityCreateSchema,
  UniversityUpdateSchema,
} from "../../validators/index.js";

export function createUniversitiesRouter(options) {
  const router = Router();
  const controller = createUniversitiesController(options);

  router.get("/", controller.list);
  router.get("/:slug", controller.detail);

  return router;
}

/** Admin CRUD, mounted separately at /api/admin/universities. */
export function createAdminUniversitiesRouter(options) {
  const router = Router();
  const controller = createUniversitiesController(options);

  router.get("/", ...requireEditor, controller.adminList);
  router.get("/:id", ...requireEditor, validateRequest({ params: UniversityIdParamSchema }), controller.adminDetail);
  router.post(
    "/",
    ...requireAdmin,
    adminMutationLimiter,
    validateRequest({ body: UniversityCreateSchema }),
    controller.adminCreate
  );
  router.put(
    "/:id",
    ...requireAdmin,
    adminMutationLimiter,
    validateRequest({ params: UniversityIdParamSchema, body: UniversityUpdateSchema }),
    controller.adminUpdate
  );
  router.delete(
    "/:id",
    ...requireAdmin,
    adminMutationLimiter,
    validateRequest({ params: UniversityIdParamSchema }),
    controller.adminDelete
  );

  return router;
}

export default createUniversitiesRouter();
