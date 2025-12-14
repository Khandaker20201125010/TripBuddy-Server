import express from 'express'
import { AuthController } from './auth.controller';
import { UserValidation } from '../user/user.validation';
import validateRequest from '../../middlewares/validateRequest';


const router = express.Router();

router.post(
    "/login",
    AuthController.login
)

router.post(
    '/refresh-token',
    AuthController.refreshToken
)

export const authRoutes = router;