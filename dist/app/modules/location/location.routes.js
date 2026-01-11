"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocationRoutes = void 0;
// backend/src/modules/location/location.routes.ts
const express_1 = __importDefault(require("express"));
const location_controller_1 = require("./location.controller");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const client_1 = require("@prisma/client");
const router = express_1.default.Router();
// Auto-detect location (call this after login/register)
router.post("/:id/detect", (0, auth_1.default)(client_1.Role.USER, client_1.Role.ADMIN), location_controller_1.LocationController.detectLocation);
// Update location manually (from browser geolocation)
router.post("/:id/update", (0, auth_1.default)(client_1.Role.USER, client_1.Role.ADMIN), location_controller_1.LocationController.updateLocation);
// Set manual location (user enters city/country)
router.post("/:id/manual", (0, auth_1.default)(client_1.Role.USER, client_1.Role.ADMIN), location_controller_1.LocationController.setManualLocation);
// Get user location
router.get("/:id", (0, auth_1.default)(client_1.Role.USER, client_1.Role.ADMIN), location_controller_1.LocationController.getUserLocation);
// Get or create location
router.get("/:id/auto", (0, auth_1.default)(client_1.Role.USER, client_1.Role.ADMIN), location_controller_1.LocationController.getOrCreateLocation);
exports.LocationRoutes = router;
