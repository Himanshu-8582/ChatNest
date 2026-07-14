import express from 'express';
import protectedRoute from '../middlewares/auth.middleware.js';
import { getConversationsForSidebar, getMessages, getUserForSidebar, sendMessage } from '../controllers/message.controller.js';
import { upload } from '../middlewares/multer.middleware.js';

const router = express.Router();

router.use(protectedRoute);
router.get('/users', getUserForSidebar);
router.get('/conversations', getConversationsForSidebar);
router.get('/:id', getMessages);
router.post('/send/:id', upload.single('media'), sendMessage);
// this media name must be same in frontend also

export default router;