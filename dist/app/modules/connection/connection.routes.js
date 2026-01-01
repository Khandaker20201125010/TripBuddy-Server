"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectionRoutes = void 0;
const express_1 = __importDefault(require("express"));
const connection_controller_1 = require("./connection.controller");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const client_1 = require("@prisma/client");
const router = express_1.default.Router();
router.get('/all', (0, auth_1.default)(client_1.Role.USER, client_1.Role.ADMIN), connection_controller_1.ConnectionController.getAllConnections);
router.get('/buddies', (0, auth_1.default)(client_1.Role.USER, client_1.Role.ADMIN), connection_controller_1.ConnectionController.getBuddies);
router.post('/request', (0, auth_1.default)(client_1.Role.USER, client_1.Role.ADMIN), connection_controller_1.ConnectionController.sendRequest);
router.get('/incoming', (0, auth_1.default)(client_1.Role.USER, client_1.Role.ADMIN), connection_controller_1.ConnectionController.getIncomingRequests);
router.patch('/respond/:connectionId', (0, auth_1.default)(client_1.Role.USER, client_1.Role.ADMIN), connection_controller_1.ConnectionController.updateStatus);
router.delete('/:connectionId', (0, auth_1.default)(client_1.Role.USER, client_1.Role.ADMIN), connection_controller_1.ConnectionController.deleteConnection);
exports.ConnectionRoutes = router;
