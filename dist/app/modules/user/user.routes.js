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
const auth_1 = __importDefault(require("../../middlewares/auth"));
const client_1 = require("@prisma/client");
const router = express_1.default.Router();
router.get("/", (0, auth_1.default)(client_1.Role.ADMIN), user_controller_1.UserController.getAllUsers);
router.post("/create-admin", (0, auth_1.default)(client_1.Role.ADMIN), fileUploader_1.fileUploader.upload.single('file'), (req, res, next) => {
    req.body = user_validation_1.UserValidation.createAdminValidationSchema.parse(JSON.parse(req.body.data));
    return user_controller_1.UserController.createAdmin(req, res, next);
});
// REGISTER (supports file)
router.post("/register", fileUploader_1.fileUploader.upload.single("file"), (0, validateRequest_1.default)(user_validation_1.UserValidation.createUserValidation), user_controller_1.UserController.registerUser);
// PROFILE
router.get("/:id", user_controller_1.UserController.getUserProfile);
// UPDATE
router.patch("/:id", fileUploader_1.fileUploader.upload.single("profileImage"), (0, validateRequest_1.default)(user_validation_1.UserValidation.updateUserValidation), user_controller_1.UserController.updateUserProfile);
exports.UserRoutes = router;
