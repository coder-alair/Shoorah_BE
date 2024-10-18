'use strict';

const Mongoose = require('mongoose');

const cronHistorySchema = new Mongoose.Schema(
  {
    cron_name: {
      type: String,
      required: true
    },
    action: {
      type: String,
      required: true
    },
    cron_started_at: {
      type: Date,
      required: true
    },
    cron_ended_at: {
      type: Date,
      required: true
    },
    is_success: {
      type: Boolean,
      required: true
    },
    deletedAt: {
      type: Date,
      default: null
    },
    query_type: {
      type: Number,
      default: null
    }
  },
  {
    timestamps: true
  }
);

const CronHistory = Mongoose.model('cron_history', cronHistorySchema);
module.exports = CronHistory;
