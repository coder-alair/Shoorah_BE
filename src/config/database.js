'use strict';

const Mongoose = require('mongoose');
const result = require('dotenv').config();
const { NODE_ENVIRONMENT } = require('@services/Constant');

if (result.error) {
  throw result.error;
}

module.exports = {
  dbConnection: () =>
    new Promise((res, rej) => {
      if (Mongoose.connection.readyState === 0) {
        let DB_AUTH_URL;
        switch (process.env.NODE_ENV) {
          case NODE_ENVIRONMENT.PRODUCTION:
            DB_AUTH_URL = process.env.DB_AUTH_PRODUCTION_URL;
            break;
          case NODE_ENVIRONMENT.STAGING:
            DB_AUTH_URL = process.env.DB_AUTH_STAGING_URL;
            break;
          case NODE_ENVIRONMENT.DEVELOPMENT:
            DB_AUTH_URL = process.env.DB_AUTH_LOCAL_URL;
            break;
          default:
            console.log('No db found');
            break;
        }
        console.log('Connecting to MongoDB...');
        Mongoose.set('strictQuery', true);
        Mongoose.connect(DB_AUTH_URL).catch(rej);
        Mongoose.connection.on('error', rej);
        Mongoose.connection.on('connected', () => {
          console.log(`⚡ MongoDB Connected ⚡ - ${process.env.NODE_ENV}`);
          res(Mongoose);
        });
      }
    }),
  Mongoose
};
