'use strict';

const Mongoose = require('mongoose');

const afterSleepSchema = new Mongoose.Schema(
  {
    user_id: {
      type: Mongoose.SchemaTypes.ObjectId,
      ref: 'Users',
      required: true
    },
    tossing_and_turning: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    sleep_soundly: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    light_sleep: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    deep_sleep: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    nightmare: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    lovely_dream: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    restless: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    still: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    sweaty: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    cool: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    sleepwalking: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    staying_put: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    snoring: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    silent: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    need_more_sleep: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    rested: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    nocturnal_eating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    no_midnight_snacks: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },

    deletedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

afterSleepSchema.index({ user_id: 1 });
afterSleepSchema.index({ deletedAt: 1 });

const AfterSleep = Mongoose.model('after_sleep', afterSleepSchema);
module.exports = AfterSleep;
