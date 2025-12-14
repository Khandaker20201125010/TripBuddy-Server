import { Request, Response } from "express";
import { stripe } from "../../helper/stripe";
import { prisma } from "../../shared/prisma";

export const webhookHandler = async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      (req as any).rawBody,
      sig!,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object;

    const transactionId = paymentIntent.id;

    await prisma.payment.update({
      where: { transactionId },
      data: { status: "SUCCESS" },
    });

    console.log("Payment confirmed via webhook:", transactionId);
  }

  res.send({ received: true });
};
