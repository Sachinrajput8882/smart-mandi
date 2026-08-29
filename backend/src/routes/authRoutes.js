const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.get('/auth/status', authController.getStatus);
router.get('/status', authController.getStatus);

module.exports = router;
