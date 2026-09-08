import { Router } from "express";
import { createCountriesController } from "./countries.controller.js";

export function createCountriesRouter(options) {
  const router = Router();
  const controller = createCountriesController(options);

  router.get("/", controller.list);
  router.get("/:slug", controller.detail);

  return router;
}

export default createCountriesRouter();
