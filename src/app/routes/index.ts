import express from "express";
import { UserRoutes } from "../modules/user/user.routes";
import { authRoutes } from "../modules/auth/auth.routes";
import { TravelPlanRoutes } from "../modules/travelPlans/travelPlan.routes";
import { ReviewRoutes } from "../modules/reviews/review.routes";
import { PaymentRoutes } from "../modules/payments/payment.routes";
import { ConnectionRoutes } from "../modules/connection/connection.routes";
import { LocationRoutes } from "../modules/location/location.routes";

const router = express.Router();

const moduleRoutes = [
  {
    path: "/user",
    route: UserRoutes,
  },
  {
    path: "/auth",
    route: authRoutes,
  },
  {
    path: "/travelPlan",
    route: TravelPlanRoutes,
  },
  {
    path: "/review",
    route: ReviewRoutes,
  },
  {
    path: "/payment",
    route: PaymentRoutes,
  },
  {
    path: "/connections",
    route: ConnectionRoutes,
  },
  {
    path: "/location",
    route: LocationRoutes,
  }
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
