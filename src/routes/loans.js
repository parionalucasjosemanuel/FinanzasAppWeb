const r = require('express').Router();
const c = require('../controllers/loan');
const { verifyToken } = require('../middleware/auth');
r.post('/', verifyToken, c.create);
r.get('/:id/payments', verifyToken, c.payments);
module.exports = r;
