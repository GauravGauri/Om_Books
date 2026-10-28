import express from 'express';
import { login, me, logout, getUsers, createUser } from '../controllers/authController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', login);
router.get('/me', authenticate, me);
router.post('/logout', authenticate, logout);

// User & Role Management
router.get('/users', authenticate, authorize('Super Admin', 'Business Owner', 'Store Manager'), getUsers);
router.post('/users', authenticate, authorize('Super Admin', 'Business Owner'), createUser);

export default router;
