'use strict';

const router = require('express').Router();
const adminRoute = require('./admin');
const apiRoute = require('./api');
const companyRoute = require('./company');
// const cronRoute = require('./cron');
const partnerRoute = require('./partner');
const wordpressRoute = require('./wordpress');
const expertRoute = require('./experts');

// Health check
router.get('/', (req, res) => {
  res.status(200).json({ message: 'Server is working' });
});

// Admin routes
router.use('/admin', adminRoute);

// API routes
router.use('/api', apiRoute);

// Company routes
router.use('/company', companyRoute);

// Partner routes
router.use('/partner', partnerRoute);

// crons
// router.use('/cron', cronRoute);

// Wordpress routes
router.use('/wordpress', wordpressRoute);

// Expert routes
router.use('/expert', expertRoute);

module.exports = router;
