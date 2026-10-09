import { Router } from 'express';
import {
  completePasswordReset,
  currentSession,
  requireAuth,
  requestPasswordReset,
  signIn,
  signOut,
  signUp,
  updatePassword
} from '../controllers/auth-controller.js';

const router = Router();

router.post('/login', signIn);
router.post('/register', signUp);
router.post('/password-reset-request', requestPasswordReset);
router.post('/password-reset', completePasswordReset);
router.get('/session', requireAuth, currentSession);
router.post('/logout', requireAuth, signOut);
router.post('/change-password', requireAuth, updatePassword);

export default router;
