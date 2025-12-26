import { Request, Response } from "express";
import httpStatus from "http-status";
import { UserService } from "./user.services";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import pick from "../../helper/pick";
import { userFilterableFields } from "./user.constant";

const registerUser = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.registerUser(req.body, req);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "User registered successfully",
    data: result,
  });
});

const getAllUsers = catchAsync(async (req: Request, res: Response) => {
    const filters = pick(req.query, userFilterableFields) // searching , filtering
    const options = pick(req.query, ["page", "limit", "sortBy", "sortOrder"]) // pagination and sorting

    const result = await UserService.getAllUsers(filters, options);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "User retrive successfully!",
        meta: result.meta,
        data: result.data
    })
})
const getUserProfile = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  // IMPORTANT: We do NOT use req.user here. 
  // This allows guests (unlogged users) to fetch the data.
  const result = await UserService.getUserProfile(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User profile retrieved successfully",
    data: result,
  });
});

const updateUserProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.updateUserProfile(req.params.id, req);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Profile updated successfully",
    data: result,
  });
});

const createAdmin = catchAsync(async (req: Request, res: Response) => {

    const result = await UserService.createAdmin(req);
    sendResponse(res, {
        statusCode: 201,
        success: true,
        message: "Admin Created successfuly!",
        data: result
    })
});

const getTopRatedTravelers = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.getTopRatedTravelers();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Top rated travelers retrieved successfully",
    data: result,
  });
});
const getRecentlyActiveUsers = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.getRecentlyActiveUsers();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Recently active users retrieved",
    data: result,
  });
});
const getAdminDashboardStats = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.getAdminDashboardStats();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Admin statistics retrieved",
    data: result,
  });
});

const getRegionStats = catchAsync(async (req: Request, res: Response) => {
  const result = await UserService.getRegionTravelerStats();
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Region stats retrieved",
    data: result,
  });
});
export const UserController = {
  registerUser,
  getUserProfile,
  updateUserProfile,
  getAllUsers,
  createAdmin,
  getTopRatedTravelers,
  getAdminDashboardStats,
  getRecentlyActiveUsers,
  getRegionStats,
};
