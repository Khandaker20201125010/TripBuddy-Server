"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = void 0;
const express_1 = __importDefault(require("express"));
const auth_controller_1 = require("./auth.controller");
const router = express_1.default.Router();
router.post("/login", auth_controller_1.AuthController.login);
// ✅ NEW Route
router.post("/login/google", auth_controller_1.AuthController.loginWithGoogle);
router.post('/refresh-token', auth_controller_1.AuthController.refreshToken);
exports.authRoutes = router;
