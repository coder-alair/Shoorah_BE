'use strict';

const Mongoose = require('mongoose');

const beforeSleepSchema = new Mongoose.Schema(
  {
    user_id: {
      type: Mongoose.SchemaTypes.ObjectId,
      ref: 'Users',
      required: true
    },
    anxious: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    calm: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    sad: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    happy: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    noisy: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    quiet: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    cold: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    warm: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    agitated: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    peaceful: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    uneasy: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    settled: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    worried: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    at_ease: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    overwhelmed: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    in_control: {
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

beforeSleepSchema.index({ user_id: 1 });
beforeSleepSchema.index({ deletedAt: 1 });

const BeforeSleep = Mongoose.model('before_sleep', beforeSleepSchema);
module.exports = BeforeSleep;
