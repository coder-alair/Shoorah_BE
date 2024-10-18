'use strict';

require('module-alias/register');
require('dotenv').config();
const dbConfig = require('@config/database');
dbConfig.dbConnection();
const seeders = require('@seeders/seeder');

const promises = [];
seeders.forEach((seed) => {
  promises.push(require(`@seeders/${seed}Seeder.js`).run());
});
Promise.all(promises).then(
  () => {
    console.log('All seeders ran successfully.');
    dbConfig.Mongoose.connection.close();
  },
  (err) => {
    console.error('Seeder error', err);
    dbConfig.Mongoose.connection.close();
  }
);
