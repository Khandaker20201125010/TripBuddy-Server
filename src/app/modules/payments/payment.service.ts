import { SubscriptionType, PaymentStatus } from "@prisma/client";
import { stripe } from "../../helper/stripe";
import { prisma } from "../../shared/prisma";
import ApiError from "../../middlewares/ApiError";
import httpStatus from "http-status";

export const PaymentService = {
  createPaymentIntent: async (userId: string, payload: { subscriptionType: string }) => {
    const { subscriptionType } = payload;
    const priceMap: Record<string, number> = {
      EXPLORER: 500,
      MONTHLY: 1200,
      YEARLY: 9900,
    };

    const amount = priceMap[subscriptionType];
    if (!amount) throw new ApiError(httpStatus.BAD_REQUEST, "Invalid subscription type");

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      metadata: { userId, subscriptionType },
      automatic_payment_methods: { enabled: true },
    });

    await prisma.payment.create({
      data: {
        userId,
        amount: amount / 100,
        status: PaymentStatus.PENDING,
        subscriptionType: subscriptionType as SubscriptionType,
        transactionId: paymentIntent.id,
      },
    });

    return { clientSecret: paymentIntent.client_secret, paymentId: paymentIntent.id };
  },

  confirmPayment: async (transactionId: string) => {
    const paymentIntent = await stripe.paymentIntents.retrieve(transactionId);
    if (paymentIntent.status !== "succeeded") {
      throw new ApiError(httpStatus.BAD_REQUEST, "Payment not verified");
    }

    const { userId, subscriptionType } = paymentIntent.metadata;

    const result = await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { transactionId },
        data: { status: PaymentStatus.SUCCESS },
      });

      let expireDate = new Date();
      if (subscriptionType === "YEARLY") expireDate.setFullYear(expireDate.getFullYear() + 1);
      else if (subscriptionType === "MONTHLY") expireDate.setMonth(expireDate.getMonth() + 1);
      else if (subscriptionType === "EXPLORER") expireDate.setDate(expireDate.getDate() + 7);

      return await tx.user.update({
        where: { id: userId },
        data: { 
          premium: true, 
          subscriptionType: subscriptionType as SubscriptionType, 
          subscriptionExpiresAt: expireDate 
        },
      });
    });

    return { success: true, user: result };
  },
};