const express = require('express');
const router = express.Router();

router.use('/auth', require('./auth'));
router.use('/clients', require('./clients'));
router.use('/properties', require('./properties'));
router.use('/loans', require('./loans'));
router.use('/reports', require('./reports'));

router.get('/', (req,res)=> res.json({message:'API root'}));

module.exports = router;
