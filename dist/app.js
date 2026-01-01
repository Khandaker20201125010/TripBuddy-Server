"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const notFound_1 = __importDefault(require("./app/middlewares/notFound"));
const globalErrorHandler_1 = __importDefault(require("./app/middlewares/globalErrorHandler"));
const config_1 = __importDefault(require("./app/config"));
const routes_1 = __importDefault(require("./app/routes"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const payment_webhook_1 = require("./app/modules/payments/payment.webhook");
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: [
        "http://localhost:3000",
        process.env.FRONTEND_URL,
    ],
    credentials: true,
}));
app.post("/webhook", express_1.default.raw({ type: "application/json" }), payment_webhook_1.webhookHandler);
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.urlencoded({ extended: true }));
app.use("/api/v1", routes_1.default);
app.get("/", (req, res) => {
    res.send({
        message: "Server is running..",
        environment: config_1.default.node_env,
        uptime: process.uptime().toFixed(2) + " sec",
        timeStamp: new Date().toISOString(),
    });
});
// Error Handlers
app.use(globalErrorHandler_1.default);
app.use(notFound_1.default);
exports.default = app;
