import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import httpStatus from "http-status";
import { TravelPlanService } from "./travelPlan.services";
import pick from "../../helper/pick";
import { travelPlanFilterableFields } from "./travelPlan.constant";
import { fileUploader } from "../../helper/fileUploader";
import { Request, Response } from "express";
import ApiError from "../../middlewares/ApiError";

const createTravelPlan = catchAsync(
  async (req: Request & { user?: any }, res: Response) => {
    if (!req.user?.id) {
      throw new ApiError(401, "Authentication required");
    }

    const payload = {
        ...req.body,
        budget: req.body.budget ? Number(req.body.budget) : 0,
        visibility: req.body.visibility === 'true'
    };

    const result = await TravelPlanService.createTravelPlan(
      payload,
      req.user.id,
      req.file
    );

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Travel plan created successfully",
      data: result,
    });
  }
);

const getAllTravelPlans = catchAsync(async (req, res) => {
  const filters = pick(req.query, travelPlanFilterableFields);
  const options = pick(req.query, ["page", "limit", "sortBy", "sortOrder"]);

  const result = await TravelPlanService.getAllTravelPlans(filters, options);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Travel plans retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getSingleTravelPlan = catchAsync(async (req, res) => {
  const result = await TravelPlanService.getSingleTravelPlan(req.params.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Travel plan retrieved",
    data: result,
  });
});

const updateTravelPlan = catchAsync(async (req: any, res) => {
  const result = await TravelPlanService.updateTravelPlan(
    req.params.id,
    req.user.id,
    req.body,
    req.file 
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Travel plan updated successfully",
    data: result,
  });
});

const getRecommendedTravelersController = catchAsync(async (req: Request & { user?: any }, res) => {
  const userId = req.user?.id;
  const recommended = await TravelPlanService.getRecommendedTravelers(userId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Recommended travelers fetched successfully',
    data: recommended,
  });
});


const deleteTravelPlan = catchAsync(async (req: any, res) => {
  const result = await TravelPlanService.deleteTravelPlan(
    req.params.id,
    req.user.id
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Travel plan deleted",
    data: result,
  });
});
const matchTravelPlans = catchAsync(async (req, res) => {
  const result = await TravelPlanService.matchTravelPlans(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Matched travel plans retrieved successfully",
    data: result,
  });
});

const getAISuggestions = catchAsync(async (req: Request, res: Response) => {
  const result = await TravelPlanService.getAISuggestions(req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "AI suggestions fetched successfully",
    data: result,
  });
});
const getMyTravelPlans = catchAsync(
  async (req: Request & { user?: any }, res: Response) => {
    // auth middleware attaches the JWT payload to req.user
    const userId = req.user?.id; 

    if (!userId) {
      throw new ApiError(401, "User ID not found in token");
    }

    const result = await TravelPlanService.getMyTravelPlans(userId);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "My travel plans retrieved",
      data: result,
    });
  }
);
export const TravelPlanController = {
  createTravelPlan,
  getAllTravelPlans,
  getSingleTravelPlan,
  updateTravelPlan,
  deleteTravelPlan,
  getAISuggestions,
  matchTravelPlans,
  getRecommendedTravelersController,
  getMyTravelPlans,
};
