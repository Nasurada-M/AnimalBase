const router = require('express').Router();
const {
  sendOtp,
  sendResetOtp,
  verifyOtp,
  verifyResetOtp,
  register,
  login,
  resetPassword,
  getMe,
  updateMe,
  changePassword,
  deleteMe,
} = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.post('/send-otp',         sendOtp);
router.post('/send-reset-otp',   sendResetOtp);
router.post('/verify-otp',       verifyOtp);
router.post('/verify-reset-otp', verifyResetOtp);
router.post('/register',         register);
router.post('/login',            login);
router.post('/reset-password',   resetPassword);
router.get ('/me',               authenticate, getMe);
router.put ('/me',               authenticate, updateMe);
router.put ('/change-password',  authenticate, changePassword);
router.delete('/me',             authenticate, deleteMe);

module.exports = router;
