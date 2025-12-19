import express from 'express'
import { AuthController } from './auth.controller';

const router = express.Router();

router.post(
    "/login",
    AuthController.login
);

// ✅ NEW Route
router.post(
    "/login/google",
    AuthController.loginWithGoogle
);

router.post(
    '/refresh-token',
    AuthController.refreshToken
);

export const authRoutes = router;