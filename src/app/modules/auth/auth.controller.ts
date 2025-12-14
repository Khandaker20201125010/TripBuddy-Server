import { Request, Response } from "express";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { AuthService } from "./auth.services";
import config from "../../config";

// const login = catchAsync(async (req: Request, res: Response) => {
//   const result = await AuthService.login(req.body);
//   const { accessToken, refreshToken, needPasswordChange } = result;
//   const isDev = process.env.NODE_ENV !== "production";

// res.cookie("accessToken", accessToken, {
//   httpOnly: true,
//   secure: !isDev,        // false in local, true in prod
//   sameSite: isDev ? "lax" : "none",
//   maxAge: 1000 * 60 * 60,
// });

// res.cookie("refreshToken", refreshToken, {
//   httpOnly: true,
//   secure: !isDev,
//   sameSite: isDev ? "lax" : "none",
//   maxAge: 1000 * 60 * 60 * 24 * 90,
// });

//   // res.cookie("accessToken", accessToken, {
//   //   secure: true,
//   //   httpOnly: true,
//   //   sameSite: "none",
//   //   maxAge: 1000 * 60 * 60,
//   // });
//   // res.cookie("refreshToken", refreshToken, {
//   //   secure: true,
//   //   httpOnly: true,
//   //   sameSite: "none",
//   //   maxAge: 1000 * 60 * 60 * 24 * 90,
//   // });

//   sendResponse(res, {
//     statusCode: 200,
//     success: true,
//     message: "User loggedin successfully!",
//     data: {
//       accessToken,
//       refreshToken,
//       needPasswordChange,
//     },
//   });
// });

const isProd = config.node_env === "production"; // <--- Define environment check

const login = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.login(req.body);
  const { accessToken, refreshToken, needPasswordChange } = result; // 🔑 Use secure: isProd and sameSite: isProd ? "none" : "lax"

  res.cookie("accessToken", accessToken, {
    secure: isProd, // Should be false in development (http)
    httpOnly: false,
    sameSite: isProd ? "none" : "lax", // Use "lax" for development on same host (different ports)
    maxAge: 1000 * 60 * 60,
  });
  res.cookie("refreshToken", refreshToken, {
    secure: isProd, // Should be false in development (http)
    httpOnly: false,
    sameSite: isProd ? "none" : "lax", // Use "lax" for development on same host (different ports)
    maxAge: 1000 * 60 * 60 * 24 * 90,
  });

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "User loggedin successfully!",
    data: {
      accessToken,
      refreshToken,
      needPasswordChange,
    },
  });
});

const refreshToken = catchAsync(async (req: Request, res: Response) => {
  const { refreshToken } = req.cookies;

  const result = await AuthService.refreshToken(refreshToken);
  res.cookie("accessToken", result.accessToken, {
    secure: true,
    httpOnly: true,
    sameSite: "none",
    maxAge: 1000 * 60 * 60,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Access token genereated successfully!",
    data: {
      message: "Access token genereated successfully!",
    },
  });
});

export const AuthController = {
  login,
  refreshToken,
};
