const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

const { protect } = require('../middleware/authMiddleware');

router.post('/signup',          authController.signup);
router.post('/signin',          authController.signin);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password',  authController.resetPassword);
router.post('/logout',          protect, authController.logout);
router.get('/me',               protect, authController.getMe);

module.exports = router;
