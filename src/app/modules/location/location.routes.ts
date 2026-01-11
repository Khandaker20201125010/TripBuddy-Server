// backend/src/modules/location/location.routes.ts
import express from "express";
import { LocationController } from "./location.controller";
import auth from "../../middlewares/auth";
import { Role } from "@prisma/client";

const router = express.Router();

// Auto-detect location (call this after login/register)
router.post(
  "/:id/detect",
  auth(Role.USER, Role.ADMIN),
  LocationController.detectLocation
);

// Update location manually (from browser geolocation)
router.post(
  "/:id/update",
  auth(Role.USER, Role.ADMIN),
  LocationController.updateLocation
);

// Set manual location (user enters city/country)
router.post(
  "/:id/manual",
  auth(Role.USER, Role.ADMIN),
  LocationController.setManualLocation
);

// Get user location
router.get(
  "/:id",
  auth(Role.USER, Role.ADMIN),
  LocationController.getUserLocation
);

// Get or create location
router.get(
  "/:id/auto",
  auth(Role.USER, Role.ADMIN),
  LocationController.getOrCreateLocation
);

export const LocationRoutes = router;