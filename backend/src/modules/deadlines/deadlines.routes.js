import { Router } from "express";
import { createDeadlinesController } from "./deadlines.controller.js";
import { requireEditor, requireAdmin } from "../../middleware/auth.js";
import { adminMutationLimiter } from "../../middleware/rateLimiter.js";
import { validateRequest } from "../../middleware/validate.js";
import {
  DeadlineIdParamSchema,
  DeadlineCreateSchema,
  DeadlineUpdateSchema,
} from "../../validators/index.js";

/** Admin CRUD, mounted at /api/admin/deadlines. */
export function createAdminDeadlinesRouter(options) {
  const router = Router();
  const controller = createDeadlinesController(options);

  router.get("/", ...requireEditor, controller.adminList);
  router.get("/:id", ...requireEditor, validateRequest({ params: DeadlineIdParamSchema }), controller.adminDetail);
  router.post(
    "/",
    ...requireAdmin,
    adminMutationLimiter,
    validateRequest({ body: DeadlineCreateSchema }),
    controller.adminCreate
  );
  router.put(
    "/:id",
    ...requireAdmin,
    adminMutationLimiter,
    validateRequest({ params: DeadlineIdParamSchema, body: DeadlineUpdateSchema }),
    controller.adminUpdate
  );
  router.delete(
    "/:id",
    ...requireAdmin,
    adminMutationLimiter,
    validateRequest({ params: DeadlineIdParamSchema }),
    controller.adminDelete
  );

  return router;
}
