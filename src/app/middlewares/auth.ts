// backend/src/middlewares/auth.ts
import { NextFunction, Request, Response } from "express";
import { jwtHelper } from "../helper/jwtHelper";
import config from "../config";
import { Secret } from "jsonwebtoken";
import ApiError from "./ApiError";
import httpStatus from "http-status";

const auth = (...roles: string[]) => {
  return async (req: Request & { user?: any }, res: Response, next: NextFunction) => {
    try {
      let token = req.headers.authorization;
      
      if (token && token.startsWith("Bearer ")) {
        token = token.split(" ")[1];
      } else {
        token = req.cookies?.accessToken;
      }

      if (!token) {
        throw new ApiError(httpStatus.UNAUTHORIZED, "You are not authorized! Token missing.");
      }

      const verifyUser = jwtHelper.verifyToken(token, config.jwt.access_secret as Secret);
      req.user = verifyUser;

      if (roles.length && !roles.includes(verifyUser.role)) {
        throw new ApiError(403, "Forbidden");
      }
      next();
    } catch (err) {
      next(err);
    }
  };
};

export default auth;