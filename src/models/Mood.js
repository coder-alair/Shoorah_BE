'use strict';

const Mongoose = require('mongoose');

const moodSchema = new Mongoose.Schema(
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
    need_support: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    demotivated: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    motivated: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    low: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    content: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    angry: {
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
    i_can_manage: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    helpless: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    i_am_in_control: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    tired: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    stressed: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    balanced: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    energised: {
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
    relaxed: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    great: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    not_good: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    positivity: {
      type: Boolean,
      default: false
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

moodSchema.index({ user_id: 1 });
moodSchema.index({ deletedAt: 1 });

const Mood = Mongoose.model('Mood', moodSchema);
module.exports = Mood;
