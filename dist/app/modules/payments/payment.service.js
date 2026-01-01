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
exports.PaymentService = void 0;
const client_1 = require("@prisma/client");
const stripe_1 = require("../../helper/stripe");
const prisma_1 = require("../../shared/prisma");
const ApiError_1 = __importDefault(require("../../middlewares/ApiError"));
const http_status_1 = __importDefault(require("http-status"));
exports.PaymentService = {
    createPaymentIntent: (userId, payload) => __awaiter(void 0, void 0, void 0, function* () {
        const { subscriptionType } = payload;
        const priceMap = {
            EXPLORER: 500,
            MONTHLY: 1200,
            YEARLY: 9900,
        };
        const amount = priceMap[subscriptionType];
        if (!amount)
            throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Invalid subscription type");
        const paymentIntent = yield stripe_1.stripe.paymentIntents.create({
            amount,
            currency: "usd",
            metadata: { userId, subscriptionType },
            automatic_payment_methods: { enabled: true },
        });
        yield prisma_1.prisma.payment.create({
            data: {
                userId,
                amount: amount / 100,
                status: client_1.PaymentStatus.PENDING,
                subscriptionType: subscriptionType,
                transactionId: paymentIntent.id,
            },
        });
        return { clientSecret: paymentIntent.client_secret, paymentId: paymentIntent.id };
    }),
    confirmPayment: (transactionId) => __awaiter(void 0, void 0, void 0, function* () {
        const paymentIntent = yield stripe_1.stripe.paymentIntents.retrieve(transactionId);
        if (paymentIntent.status !== "succeeded") {
            throw new ApiError_1.default(http_status_1.default.BAD_REQUEST, "Payment not verified");
        }
        const { userId, subscriptionType } = paymentIntent.metadata;
        const result = yield prisma_1.prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            yield tx.payment.update({
                where: { transactionId },
                data: { status: client_1.PaymentStatus.SUCCESS },
            });
            let expireDate = new Date();
            if (subscriptionType === "YEARLY")
                expireDate.setFullYear(expireDate.getFullYear() + 1);
            else if (subscriptionType === "MONTHLY")
                expireDate.setMonth(expireDate.getMonth() + 1);
            else if (subscriptionType === "EXPLORER")
                expireDate.setDate(expireDate.getDate() + 7);
            return yield tx.user.update({
                where: { id: userId },
                data: {
                    premium: true,
                    subscriptionType: subscriptionType,
                    subscriptionExpiresAt: expireDate
                },
            });
        }));
        return { success: true, user: result };
    }),
};
