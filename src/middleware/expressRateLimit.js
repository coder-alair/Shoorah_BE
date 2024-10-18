'use strict';

const expressRateLimiter = require('express-rate-limit');
const { MAX_API_REQUEST_LIMIT, WINDOW_MS } = require('@services/Constant');
const { errorResponseWithoutData } = require('@services/Response');
const allowList = process.env.ALLOW_IP_LIST.split(',');

const apiLimiter = expressRateLimiter({
  windowMs: WINDOW_MS,
  max: MAX_API_REQUEST_LIMIT,
  standardHeaders: false,
  legacyHeaders: false,
  skip: (req, response) => allowList.includes(req.ip),
  handler: (req, res, next, options) => {
    errorResponseWithoutData(res, options.message, options.statusCode);
  }
});

module.exports = apiLimiter;
