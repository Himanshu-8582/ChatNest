import express from 'express';
import protectedRoute from '../middlewares/auth.middleware.js';
import { checkAuth } from '../controllers/auth.controller.js';

const router = express.Router();

router.get('/check', protectedRoute, checkAuth);


export default router;