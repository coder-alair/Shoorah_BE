'use strict';

require('module-alias/register');
require('dotenv').config();

const main = async () => {
  await require('@config/database').dbConnection();

  const Express = require('express');
  const swagger = require('./swagger');
  const Morgan = require('morgan');
  const cors = require('cors');
  const Path = require('path');
  const I18n = require('@root/src/i18n/i18n');
  const rotatingFileStream = require('rotating-file-stream');

  const app = Express();
  swagger(app);
  const port = process.env.PORT || 3000;

  app.use(Express.json());
  app.use(Express.urlencoded({ extended: true }));
  app.set('view engine', 'pug');
  app.set('views', Path.join(__dirname, '/src/views'));
  app.use('/.well-known', Express.static(Path.join(__dirname, '.well-known')));
  app.set('trust proxy', true);
  app.use(I18n);
  app.use(Morgan(':method :url :status :res[content-length] - :response-time ms'));

  const accessLogStream = rotatingFileStream.createStream('access.log', {
    interval: '1d',
    path: Path.join(__dirname, 'logs'),
    initialRotation: true,
    intervalBoundary: true,
    maxFiles: 7
  });
  app.use(Morgan('combined', { stream: accessLogStream }));
  app.use(cors());

  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    next();
  });

  const IndexRoute = require('@root/src/routes/index');
  const apiLimiter = require('./src/middleware/expressRateLimit');
  app.use(apiLimiter);
  require('@crons/index');
  app.use('/', IndexRoute);

  const { successResponseWithoutData } = require('@services/Response.js');
  const { FAIL } = require('@services/Constant.js');
  const { stripeWebhook } = require('./src/controllers/api/v1/subscriptionController');
  // const deeplink = require('node-deeplink');

  app.use((err, req, res, next) => {
    if (err) {
      return successResponseWithoutData(res, err.message, FAIL);
    }
  });

  app.post('/stripe-webhook', stripeWebhook);

  app.listen(port, () => {
    console.log(`Server is Running on port ${port}`);
  });
};

main().catch(console.error);
