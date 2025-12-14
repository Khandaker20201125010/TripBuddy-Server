import { prisma } from "../../shared/prisma";
import bcrypt from "bcryptjs";
import { Secret } from 'jsonwebtoken'
import { jwtHelper } from "../../helper/jwtHelper";
import { UserStatus } from "@prisma/client";
import config from "../../config";
import ApiError from "../../middlewares/ApiError";

const login = async (payload: { email: string, password: string }) => {
    const user = await prisma.user.findUniqueOrThrow({
        where: {
            email: payload.email,
            status: UserStatus.ACTIVE
        }
    })

    const isCorrectPassword = await bcrypt.compare(payload.password, user.password);
    if (!isCorrectPassword) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Password is incorrect!")
    }

    const accessToken = jwtHelper.generateToken({id: user.id, email: user.email, role: user.role }, config.jwt.access_secret as Secret, "1h");

    const refreshToken = jwtHelper.generateToken({id: user.id, email: user.email, role: user.role }, config.jwt.refresh_secret as Secret, "90d");

    return {
        accessToken,
        refreshToken,
        needPasswordChange: user.needPasswordChange
    }
}

const refreshToken = async (token: string) => {
    let decodedData;
    try {
        decodedData = jwtHelper.verifyToken(token, config.jwt.refresh_secret as Secret);
    }
    catch (err) {
        throw new Error("You are not authorized!")
    }

    const userData = await prisma.user.findUniqueOrThrow({
        where: {
            email: decodedData.email,
            status: UserStatus.ACTIVE
        }
    });

    const accessToken = jwtHelper.generateToken({
        email: userData.email,
        role: userData.role
    },
        config.jwt.access_secret as Secret,
        config.jwt.refresh_secret as string
    );

    return {
        accessToken,
        needPasswordChange: userData.needPasswordChange
    };

};

export const AuthService = {
  login,
   refreshToken,
};
