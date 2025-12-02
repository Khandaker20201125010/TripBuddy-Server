"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRoutes = void 0;
const express_1 = __importDefault(require("express"));
const user_validation_1 = require("./user.validation");
const user_controller_1 = require("./user.controller");
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const fileUploader_1 = require("../../helper/fileUploader");
const router = express_1.default.Router();
// REGISTER (supports file)
router.post("/register", fileUploader_1.fileUploader.upload.single("file"), (0, validateRequest_1.default)(user_validation_1.createUserValidation), user_controller_1.UserController.registerUser);
// PROFILE
router.get("/:id", user_controller_1.UserController.getUserProfile);
// UPDATE
router.patch("/:id", (0, validateRequest_1.default)(user_validation_1.updateUserValidation), user_controller_1.UserController.updateUserProfile);
exports.UserRoutes = router;
