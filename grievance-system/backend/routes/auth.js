const express = require('express');
const router = express.Router();
const { sendOTP, register, login, getMe, adminLogin } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/send-otp', sendOTP);
router.post('/register', register);
router.post('/login', login);
router.post('/admin-login', adminLogin);
router.get('/me', protect, getMe);

module.exports = router;
