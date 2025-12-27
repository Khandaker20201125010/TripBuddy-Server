
import express from 'express';
import { ConnectionController } from './connection.controller';
import auth from '../../middlewares/auth';
import { Role } from '@prisma/client';

const router = express.Router();

router.post(
  '/request',
  auth(Role.USER, Role.ADMIN),
  ConnectionController.sendRequest
);
router.get(
  '/incoming',
  auth(Role.USER, Role.ADMIN),
  ConnectionController.getIncomingRequests
);
router.patch(
  '/respond/:connectionId',
  auth(Role.USER, Role.ADMIN),
  ConnectionController.updateStatus
);

export const ConnectionRoutes = router;