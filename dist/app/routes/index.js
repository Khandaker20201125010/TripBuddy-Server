"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const user_routes_1 = require("../modules/user/user.routes");
const auth_routes_1 = require("../modules/auth/auth.routes");
const travelPlan_routes_1 = require("../modules/travelPlans/travelPlan.routes");
const review_routes_1 = require("../modules/reviews/review.routes");
const payment_routes_1 = require("../modules/payments/payment.routes");
const connection_routes_1 = require("../modules/connection/connection.routes");
const router = express_1.default.Router();
const moduleRoutes = [
    {
        path: "/user",
        route: user_routes_1.UserRoutes,
    },
    {
        path: "/auth",
        route: auth_routes_1.authRoutes,
    },
    {
        path: "/travelPlan",
        route: travelPlan_routes_1.TravelPlanRoutes,
    },
    {
        path: "/review",
        route: review_routes_1.ReviewRoutes,
    },
    {
        path: "/payment",
        route: payment_routes_1.PaymentRoutes,
    },
    {
        path: "/connections",
        route: connection_routes_1.ConnectionRoutes,
    }
];
moduleRoutes.forEach((route) => router.use(route.path, route.route));
exports.default = router;
