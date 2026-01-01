"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TravelPlanRoutes = void 0;
const express_1 = __importDefault(require("express"));
const travelPlan_controller_1 = require("./travelPlan.controller");
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const travelPlan_validation_1 = require("./travelPlan.validation");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const client_1 = require("@prisma/client");
const fileUploader_1 = require("../../helper/fileUploader");
const router = express_1.default.Router();
// CREATE TRAVEL PLAN
router.post("/", (0, auth_1.default)(client_1.Role.USER, client_1.Role.ADMIN), fileUploader_1.fileUploader.upload.single("file"), (0, validateRequest_1.default)(travelPlan_validation_1.TravelPlanValidation.create), travelPlan_controller_1.TravelPlanController.createTravelPlan);
router.get("/my-plans", (0, auth_1.default)(client_1.Role.USER, client_1.Role.ADMIN), travelPlan_controller_1.TravelPlanController.getMyTravelPlans);
router.get("/match", travelPlan_controller_1.TravelPlanController.matchTravelPlans);
router.get("/stats", travelPlan_controller_1.TravelPlanController.getCommunityStats);
router.get("/recommended", (0, auth_1.default)(client_1.Role.USER, client_1.Role.ADMIN), travelPlan_controller_1.TravelPlanController.getRecommendedTravelersController);
router.post("/suggestion", travelPlan_controller_1.TravelPlanController.getAISuggestions);
router.post("/request/:id", (0, auth_1.default)(client_1.Role.USER, client_1.Role.ADMIN), travelPlan_controller_1.TravelPlanController.requestJoinTrip);
// GET ALL
router.get("/", travelPlan_controller_1.TravelPlanController.getAllTravelPlans);
// GET SINGLE
router.get("/:id", travelPlan_controller_1.TravelPlanController.getSingleTravelPlan);
router.patch("/request-status/:buddyId", (0, auth_1.default)(client_1.Role.USER, client_1.Role.ADMIN), travelPlan_controller_1.TravelPlanController.updateJoinRequestStatus);
router.get("/my-plans/requests", (0, auth_1.default)(client_1.Role.USER, client_1.Role.ADMIN), travelPlan_controller_1.TravelPlanController.getMyTripRequests);
// UPDATE
router.patch("/:id", (0, auth_1.default)(client_1.Role.USER, client_1.Role.ADMIN), fileUploader_1.fileUploader.upload.single("file"), (0, validateRequest_1.default)(travelPlan_validation_1.TravelPlanValidation.update), travelPlan_controller_1.TravelPlanController.updateTravelPlan);
// DELETE
router.delete("/:id", (0, auth_1.default)(client_1.Role.USER, client_1.Role.ADMIN), travelPlan_controller_1.TravelPlanController.deleteTravelPlan);
exports.TravelPlanRoutes = router;
