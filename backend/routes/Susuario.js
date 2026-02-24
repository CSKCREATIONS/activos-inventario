// ...existing code...
const express = require('express');
const router = express.Router();
const controller = require('../controllers/SusuarioController');

router.post('/', controller.crear);

module.exports = router;
// ...existing code...