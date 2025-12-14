import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { PaymentService } from "./payment.service";
import httpStatus from "http-status";

export const PaymentController = {
  createIntent: catchAsync(async (req: any, res) => {
    const result = await PaymentService.createPaymentIntent(req.user.id, req.body);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Payment intent created successfully",
      data: result,
    });
  }),

  confirmPayment: catchAsync(async (req, res) => {
    const { transactionId } = req.body;

    const result = await PaymentService.confirmPayment(transactionId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Payment confirmed",
      data: result,
    });
  }),
};
