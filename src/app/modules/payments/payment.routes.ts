import express from "express";
import auth from "../../middlewares/auth";
import { Role } from "@prisma/client";
import { PaymentController } from "./payment.controller";

const router = express.Router();

router.post(
  "/create-intent",
  auth(Role.USER),
  PaymentController.createIntent
);

router.post(
  "/confirm",
  auth(Role.USER),
  PaymentController.confirmPayment
);

export const PaymentRoutes = router;
