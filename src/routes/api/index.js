'use strict';

const router = require('express').Router();
const v1 = require('./v1');
const { maintenance } = require('@root/src/middleware/maintenance');
const pubSubV1 = require('./pubsub_v1');

router.use('/v1', maintenance, v1);
router.use('/pubsub/v1', pubSubV1);

module.exports = router;
