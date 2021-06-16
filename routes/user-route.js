const express = require('express');
const router = express.Router();
const userCtrl = require('../controllers/user-controller');

router.post('/signUp', userCtrl.signUp);
router.post('/logIn', userCtrl.logIn);


module.exports = router;