import { stripe } from "../../helper/stripe";
import { prisma } from "../../shared/prisma";
import ApiError from "../../middlewares/ApiError";
import httpStatus from "http-status";

export const PaymentService = {
  createPaymentIntent: async (userId: string, payload: any) => {
    const { subscriptionType } = payload;

    const amount = subscriptionType === "MONTHLY" ? 1000 : 10000; 
    // example: 1000 = 10 USD, 10000 = 100 USD

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      metadata: {
        userId,
        subscriptionType,
      },
    });

    await prisma.payment.create({
      data: {
        userId,
        amount: amount / 100,
        status: "PENDING",
        subscriptionType,
        transactionId: paymentIntent.id,
      },
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentId: paymentIntent.id,
    };
  },

  confirmPayment: async (transactionId: string) => {
    const paymentIntent = await stripe.paymentIntents.retrieve(transactionId);

    if (paymentIntent.status !== "succeeded") {
      throw new ApiError(httpStatus.BAD_REQUEST, "Payment not completed");
    }

    const metadata = paymentIntent.metadata;
    const userId = metadata.userId;
    const subscriptionType = metadata.subscriptionType;

    // Update payment entry
    await prisma.payment.update({
      where: { transactionId },
      data: { status: "SUCCESS" },
    });

    // Update user subscription
    const expireDate =
      subscriptionType === "MONTHLY"
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: userId },
      data: {
        premium: true,
        subscriptionExpiresAt: expireDate,
      },
    });

    return { message: "Subscription activated successfully" };
  },
};
