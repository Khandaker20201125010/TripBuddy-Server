"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentController = void 0;
const http_status_1 = __importDefault(require("http-status"));
const catchAsync_1 = __importDefault(require("../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../shared/sendResponse"));
const payment_service_1 = require("./payment.service");
const ApiError_1 = __importDefault(require("../../middlewares/ApiError"));
exports.PaymentController = {
    createIntent: (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
        const user = req.user; // Safely access user injected by auth middleware
        if (!user || !user.id) {
            throw new ApiError_1.default(http_status_1.default.UNAUTHORIZED, "User is not authenticated.");
        }
        const result = yield payment_service_1.PaymentService.createPaymentIntent(user.id, req.body);
        (0, sendResponse_1.default)(res, {
            statusCode: http_status_1.default.OK,
            success: true,
            message: "Payment intent created successfully",
            data: result,
        });
    })),
    confirmPayment: (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
        const { transactionId } = req.body;
        if (!transactionId) {
            throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Transaction ID is required");
        }
        const result = yield payment_service_1.PaymentService.confirmPayment(transactionId);
        (0, sendResponse_1.default)(res, {
            statusCode: http_status_1.default.OK,
            success: true,
            message: "Payment confirmed successfully",
            data: result,
        });
    })),
};
