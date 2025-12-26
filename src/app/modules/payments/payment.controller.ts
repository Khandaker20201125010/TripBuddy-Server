import { Request, Response } from "express"; // CRITICAL: Must be from express
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { PaymentService } from "./payment.service";
import ApiError from "../../middlewares/ApiError";

export const PaymentController = {
  createIntent: catchAsync(async (req: Request, res: Response) => {
    const user = (req as any).user; // Safely access user injected by auth middleware

    if (!user || !user.id) {
      throw new ApiError(httpStatus.UNAUTHORIZED, "User is not authenticated.");
    }

    const result = await PaymentService.createPaymentIntent(user.id, req.body);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Payment intent created successfully",
      data: result,
    });
  }),

  confirmPayment: catchAsync(async (req: Request, res: Response) => {
    const { transactionId } = req.body;

    if (!transactionId) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Transaction ID is required");
    }

    const result = await PaymentService.confirmPayment(transactionId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Payment confirmed successfully",
      data: result,
    });
  }),
};