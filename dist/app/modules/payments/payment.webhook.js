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
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhookHandler = void 0;
const stripe_1 = require("../../helper/stripe");
const prisma_1 = require("../../shared/prisma");
const webhookHandler = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const sig = req.headers["stripe-signature"];
    let event;
    try {
        event = stripe_1.stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
    }
    catch (err) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    if (event.type === "payment_intent.succeeded") {
        const paymentIntent = event.data.object;
        const transactionId = paymentIntent.id;
        yield prisma_1.prisma.payment.update({
            where: { transactionId },
            data: { status: "SUCCESS" },
        });
        console.log("Payment confirmed via webhook:", transactionId);
    }
    res.send({ received: true });
});
exports.webhookHandler = webhookHandler;
