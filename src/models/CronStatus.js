'use strict';

const Mongoose = require('mongoose');
const { CRON_TYPE } = require('@services/Constant');

const cronStatusSchema = new Mongoose.Schema({
  cron_type: {
    type: Number,
    enum: Object.values(CRON_TYPE),
    required: true
  },
  cron_status: {
    type: Boolean,
    required: true
  }
});

const CronStatus = Mongoose.model('cron_status', cronStatusSchema);
module.exports = CronStatus;
