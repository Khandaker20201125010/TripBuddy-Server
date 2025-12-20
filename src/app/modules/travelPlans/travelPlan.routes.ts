import express from "express";
import { TravelPlanController } from "./travelPlan.controller";
import validateRequest from "../../middlewares/validateRequest";
import { TravelPlanValidation } from "./travelPlan.validation";
import auth from "../../middlewares/auth";
import { Role } from "@prisma/client";
import { fileUploader } from "../../helper/fileUploader";

const router = express.Router();

// CREATE TRAVEL PLAN
router.post(
  "/",
  auth(Role.USER, Role.ADMIN),
  fileUploader.upload.single("file"),
  validateRequest(TravelPlanValidation.create),
  TravelPlanController.createTravelPlan
);

router.get(
  "/my-plans",
  auth(Role.USER, Role.ADMIN),
  TravelPlanController.getMyTravelPlans
);

router.get("/match", TravelPlanController.matchTravelPlans);

router.get("/recommended", auth(Role.USER, Role.ADMIN), TravelPlanController.getRecommendedTravelersController);

router.post("/suggestion", TravelPlanController.getAISuggestions);

router.post(
    "/request/:id",
    auth(Role.USER, Role.ADMIN),
    TravelPlanController.requestJoinTrip
);

// GET ALL
router.get("/", TravelPlanController.getAllTravelPlans);

// GET SINGLE
router.get("/:id", TravelPlanController.getSingleTravelPlan);

router.patch(
    "/request-status/:buddyId",
    auth(Role.USER, Role.ADMIN),
    TravelPlanController.updateJoinRequestStatus
);

// UPDATE
router.patch(
  "/:id",
  auth(Role.USER, Role.ADMIN),
  fileUploader.upload.single("file"),
  validateRequest(TravelPlanValidation.update),
  TravelPlanController.updateTravelPlan
);

// DELETE
router.delete(
  "/:id",
  auth(Role.USER, Role.ADMIN),
  TravelPlanController.deleteTravelPlan
);

export const TravelPlanRoutes = router;
