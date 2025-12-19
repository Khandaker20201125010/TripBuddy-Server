import { prisma } from "../../shared/prisma";
import bcrypt from "bcryptjs";
import { Secret } from 'jsonwebtoken'
import { jwtHelper } from "../../helper/jwtHelper";
import { UserStatus } from "@prisma/client";
import config from "../../config";
import ApiError from "../../middlewares/ApiError";
import httpStatus from "http-status"; 

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
        needPasswordChange: user.needPasswordChange,
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status,
        }
    }
}

// auth.services.ts -> loginWithGoogle
const loginWithGoogle = async (payload: { email: string, name: string, image?: string }) => {
    const user = await prisma.user.upsert({
        where: { email: payload.email },
        update: { name: payload.name },
        create: {
            email: payload.email,
            name: payload.name,
            role: "USER",
            status: UserStatus.ACTIVE,
            password: await bcrypt.hash(Math.random().toString(36).slice(-8), 12),
            needPasswordChange: false,
        }
    });

    if (user.status !== UserStatus.ACTIVE) {
        throw new ApiError(httpStatus.FORBIDDEN, "Your account is not active");
    }

    // IMPORTANT: The payload here must match what your 'auth' middleware expects
    const jwtPayload = { id: user.id, email: user.email, role: user.role };

    const accessToken = jwtHelper.generateToken(jwtPayload, config.jwt.access_secret as Secret, "1h");
    const refreshToken = jwtHelper.generateToken(jwtPayload, config.jwt.refresh_secret as Secret, "90d");

    return {
        accessToken,
        refreshToken,
        needPasswordChange: user.needPasswordChange,
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status
        }
    };
};

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
        id: userData.id, 
        email: userData.email,
        role: userData.role
    },
        config.jwt.access_secret as Secret,
        "1h" 
    );

    return {
        accessToken,
        refreshToken,
        needPasswordChange: userData.needPasswordChange,
        
    };
};

export const AuthService = {
    login,
    loginWithGoogle, 
    refreshToken,
};