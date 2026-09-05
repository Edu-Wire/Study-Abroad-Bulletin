import { Router } from "express";
import { createScholarshipsController } from "./scholarships.controller.js";
import { requireEditor, requireAdmin } from "../../middleware/auth.js";
import { adminMutationLimiter } from "../../middleware/rateLimiter.js";
import { validateRequest } from "../../middleware/validate.js";
import {
  ScholarshipIdParamSchema,
  ScholarshipCreateSchema,
  ScholarshipUpdateSchema,
} from "../../validators/index.js";

/** Public read-only routes, mounted at /api/scholarships. */
export function createScholarshipsRouter(options) {
  const router = Router();
  const controller = createScholarshipsController(options);

  router.get("/", controller.list);
  router.get("/:slug", controller.detail);

  return router;
}

/** Admin CRUD, mounted at /api/admin/scholarships. */
export function createAdminScholarshipsRouter(options) {
  const router = Router();
  const controller = createScholarshipsController(options);

  router.get("/", ...requireEditor, controller.adminList);
  router.get("/:id", ...requireEditor, validateRequest({ params: ScholarshipIdParamSchema }), controller.adminDetail);
  router.post(
    "/",
    ...requireAdmin,
    adminMutationLimiter,
    validateRequest({ body: ScholarshipCreateSchema }),
    controller.adminCreate
  );
  router.put(
    "/:id",
    ...requireAdmin,
    adminMutationLimiter,
    validateRequest({ params: ScholarshipIdParamSchema, body: ScholarshipUpdateSchema }),
    controller.adminUpdate
  );
  router.delete(
    "/:id",
    ...requireAdmin,
    adminMutationLimiter,
    validateRequest({ params: ScholarshipIdParamSchema }),
    controller.adminDelete
  );

  return router;
}
