import { Request, Response } from "express";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { ConnectionService } from "./connection.service";
import httpStatus from "http-status";
import ApiError from "../../middlewares/ApiError";

const sendRequest = catchAsync(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const body = req.body;



  if (!user || !user.id) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "User ID missing from token");
  }

  const senderId = user.id;
  const { receiverId } = body;

  if (!receiverId) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Receiver ID is missing");
  }

  const result = await ConnectionService.sendConnectionRequest(senderId, receiverId);
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Connection request sent successfully",
    data: result
  });
});

const updateStatus = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { connectionId } = req.params;
  const { status } = req.body;

  const result = await ConnectionService.respondToRequest(userId, connectionId, status);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Request ${status.toLowerCase()} successfully`,
    data: result
  });
});

export const ConnectionController = {
  sendRequest,
  updateStatus
};