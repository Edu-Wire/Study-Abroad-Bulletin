import { Router } from "express";
import { createUniversitiesController } from "./universities.controller.js";

export function createUniversitiesRouter(options) {
  const router = Router();
  const controller = createUniversitiesController(options);

  router.get("/", controller.list);
  router.get("/:slug", controller.detail);

  return router;
}

export default createUniversitiesRouter();
