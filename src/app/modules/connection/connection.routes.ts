import express from 'express';
import { ConnectionController } from './connection.controller';
import auth from '../../middlewares/auth';
import { Role } from '@prisma/client';

const router = express.Router();

router.get(
  '/all',
  auth(Role.USER, Role.ADMIN),
  ConnectionController.getAllConnections
);

router.get(
  '/buddies',
  auth(Role.USER, Role.ADMIN),
  ConnectionController.getBuddies
);

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

router.delete(
  '/:connectionId',
  auth(Role.USER, Role.ADMIN),
  ConnectionController.deleteConnection
);

export const ConnectionRoutes = router;