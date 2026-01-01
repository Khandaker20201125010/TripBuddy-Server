import express, { Application, Request, Response } from "express";
import cors from "cors";
import notFound from "./app/middlewares/notFound";
import globalErrorHandler from "./app/middlewares/globalErrorHandler";
import config from "./app/config";
import router from "./app/routes";
import cookieParser from "cookie-parser";
import { webhookHandler } from "./app/modules/payments/payment.webhook";

const app: Application = express();


app.use(
  cors({
    origin: [
      "http://localhost:3000",
      process.env.FRONTEND_URL as string, 
    ],
    credentials: true,
  })
);


app.post("/webhook", express.raw({ type: "application/json" }), webhookHandler);


app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));


app.use("/api/v1", router);


app.get("/", (req: Request, res: Response) => {
  res.send({
    message: "Server is running..",
    environment: config.node_env,
    uptime: process.uptime().toFixed(2) + " sec",
    timeStamp: new Date().toISOString(),
  });
});

// Error Handlers
app.use(globalErrorHandler);
app.use(notFound);

export default app;
