import { Router } from "express";
import { createSettingsController } from "./settings.controller.js";
import { requireEditor, requireAdmin } from "../../middleware/auth.js";
import { adminMutationLimiter } from "../../middleware/rateLimiter.js";
import { validateRequest } from "../../middleware/validate.js";
import { SettingsUpdateSchema } from "../../validators/index.js";

/** Singleton settings row, mounted at /api/admin/settings. */
export function createAdminSettingsRouter(options) {
  const router = Router();
  const controller = createSettingsController(options);

  router.get("/", ...requireEditor, controller.adminGet);
  router.put(
    "/",
    ...requireAdmin,
    adminMutationLimiter,
    validateRequest({ body: SettingsUpdateSchema }),
    controller.adminUpdate
  );

  return router;
}
