"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaRoutes = void 0;
const express_1 = __importDefault(require("express"));
const media_controller_1 = require("./media.controller");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const client_1 = require("@prisma/client");
const fileUploader_1 = require("../../helper/fileUploader");
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const media_validation_1 = require("./media.validation");
const router = express_1.default.Router();
// Create media post
router.post("/", (0, auth_1.default)(client_1.Role.USER, client_1.Role.ADMIN), fileUploader_1.fileUploader.upload.single("image"), (0, validateRequest_1.default)(media_validation_1.MediaValidation.createMediaPost), media_controller_1.MediaController.createMediaPost);
// Get all media posts
router.get("/", media_controller_1.MediaController.getAllMediaPosts);
// Get media post by ID
router.get("/:id", media_controller_1.MediaController.getMediaPost);
// Get user's media posts
router.get("/user/:userId", media_controller_1.MediaController.getUserMediaPosts);
// Toggle like
router.post("/:id/like", (0, auth_1.default)(client_1.Role.USER, client_1.Role.ADMIN), media_controller_1.MediaController.toggleLikeMediaPost);
// Add comment
router.post("/:id/comment", (0, auth_1.default)(client_1.Role.USER, client_1.Role.ADMIN), (0, validateRequest_1.default)(media_validation_1.MediaValidation.addComment), media_controller_1.MediaController.addCommentToMediaPost);
// Share post
router.post("/:id/share", (0, auth_1.default)(client_1.Role.USER, client_1.Role.ADMIN), media_controller_1.MediaController.shareMediaPost);
router.patch("/:id", (0, auth_1.default)(client_1.Role.USER, client_1.Role.ADMIN), fileUploader_1.fileUploader.upload.single("image"), (0, validateRequest_1.default)(media_validation_1.MediaValidation.updateMediaPost), media_controller_1.MediaController.updateMediaPost);
// Delete media post
router.delete("/:id", (0, auth_1.default)(client_1.Role.USER, client_1.Role.ADMIN), media_controller_1.MediaController.deleteMediaPost);
exports.MediaRoutes = router;
