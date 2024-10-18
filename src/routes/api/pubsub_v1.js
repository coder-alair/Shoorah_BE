'use strict';

const router = require('express').Router();
const {
  applePubSubNotification,
  androidPubSubNotification
} = require('@controllers/api/v1/subscriptionController');

// Subscription pubsub
/**
 * @swagger
 * /apple:
 *   post:
 *     summary: apple push notifications
 *     tags: [Pub Sub]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Unauthorized
 */
router.post('/apple', applePubSubNotification);
router.post('/android', androidPubSubNotification);

module.exports = router;
