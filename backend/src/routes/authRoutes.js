import express from 'express';
import { login, getMe, logout, getUsers, createUser, toggleUserStatus } from '../controllers/authController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', login);
router.post('/logout', logout);
router.get('/me', authenticate, getMe);

// Admin-only user management
router.get('/users', authenticate, requireAdmin, getUsers);
router.post('/users', authenticate, requireAdmin, createUser);
router.patch('/users/:id/toggle-status', authenticate, requireAdmin, toggleUserStatus);

export default router;
