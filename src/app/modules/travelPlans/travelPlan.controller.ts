import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import httpStatus from "http-status";
import { TravelPlanService } from "./travelPlan.services";
import pick from "../../helper/pick";
import { travelPlanFilterableFields } from "./travelPlan.constant";
import { fileUploader } from "../../helper/fileUploader";
import { Request, Response } from "express";
import ApiError from "../../middlewares/ApiError";
import { AuthRequest } from "./travelPlan.interface";

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

    // Service will throw an error if limit is reached
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

  const user = (req as any).user;
    const currentUserId = user?.id;
  const result = await TravelPlanService.getAllTravelPlans(filters, options,currentUserId);

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
    req.user.role,
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


const deleteTravelPlan = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const userRole = req.user?.role; // <--- Make sure your auth middleware populates this

  if (!userId) throw new ApiError(401, "You must be logged in");

  const result = await TravelPlanService.deleteTravelPlan(id, userId, userRole);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Travel plan deleted successfully",
    data: result,
  });
});
const getCommunityStats = catchAsync(async (req: Request, res: Response) => {
  const result = await TravelPlanService.getCommunityStats();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Community stats retrieved successfully",
    data: result,
  });
});
const matchTravelPlans = catchAsync(async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;

  // Extract query parameters with defaults to undefined for Prisma
  const filters = {
    searchTerm: authReq.query.searchTerm || undefined,
    destination: authReq.query.destination || undefined,
    startDate: authReq.query.startDate || undefined,
    endDate: authReq.query.endDate || undefined,
    travelType: authReq.query.travelType || undefined,
  };

  const options = {
    page: Number(authReq.query.page) || 1,
    limit: Number(authReq.query.limit) || 6,
  };

  const currentUserId = authReq.user?.id; 

  const result = await TravelPlanService.matchTravelPlans(filters, options, currentUserId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Matched travel plans retrieved successfully",
    meta: result.meta,
    data: result.data,
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
const getMyTripRequests = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const userId = req.user?.id;
  
  if (!userId) {
    throw new ApiError(401, "User ID not found in token");
  }

  console.log(`Fetching trip requests for user: ${userId}`); // Debug log
  
  const result = await TravelPlanService.getMyTripRequests(userId);
  
  console.log(`Found ${result.length} trip requests`); // Debug log
  
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Trip requests retrieved successfully",
    data: result,
  });
});
const getMyTravelPlans = catchAsync(
  async (req: Request & { user?: any }, res: Response) => {
    const userId = req.user?.id; 

    if (!userId) {
      throw new ApiError(401, "User ID not found in token");
    }

    // ✅ CHANGE THIS: Use the service that includes buddies and users
    const result = await TravelPlanService.getMyTravelPlansWithBuddies(userId);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "My travel plans with requests retrieved successfully",
      data: result,
    });
  }
);
const requestJoinTrip = catchAsync(async (req: Request & { user?: any }, res: Response) => {
    const result = await TravelPlanService.requestJoinTrip(req.params.id, req.user.id);
  
    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Join request sent successfully",
      data: result,
    });
});
const updateJoinRequestStatus = catchAsync(async (req: Request & { user?: any }, res: Response) => {
    const { buddyId } = req.params;
    const { status } = req.body;
    const hostId = req.user.id;

    const result = await TravelPlanService.updateJoinRequestStatus(buddyId, hostId, status);
  
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: `Join request ${status.toLowerCase()} successfully`,
      data: result,
    });
});

export const TravelPlanController = {
  createTravelPlan,
  getAllTravelPlans,
  getSingleTravelPlan,
  updateTravelPlan,
  deleteTravelPlan,
  getAISuggestions,
  getCommunityStats,
  matchTravelPlans,
  getRecommendedTravelersController,
  getMyTravelPlans,
  requestJoinTrip,
  updateJoinRequestStatus,
  getMyTripRequests
   
};
