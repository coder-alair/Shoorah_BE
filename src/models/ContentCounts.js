'use strict';

const Mongoose = require('mongoose');

const contentCountSchema = new Mongoose.Schema(
  {
    user_id: {
      type: Mongoose.SchemaTypes.ObjectId,
      default: null,
      ref: 'Users'
    },
    shuru_mood: {
      type: Number,
      default: 0
    },
    gratitudes: {
      type: Number,
      default: 0
    },
    goals: {
      type: Number,
      default: 0
    },
    cleanse: {
      type: Number,
      default: 0
    },
    notes: {
      type: Number,
      default: 0
    },
    affirmations: {
      type: Number,
      default: 0
    },
    shuru_mood_count: {
      type: Number,
      default: 0
    },
    shuru_time: {
      type: Number,
      default: 0
    },
    rituals: {
      type: Number,
      default: 0
    },
    rituals_complete_days: {
      type: Number,
      default: 0
    },
    meditation: {
      type: Number,
      default: 0
    },
    sleeps: {
      type: Number,
      default: 0
    },
    pods: {
      type: Number,
      default: 0
    },
    notifications: {
      type: Number,
      default: 0
    },
    consistency: {
      type: Number,
      default: 0
    },
    app_durations: {
      type: Number,
      default: 0
    },
    listen_durations: {
      type: Number,
      default: 0
    },
    days_used: {
      type: Number,
      default: 0
    },
    streak: {
      type: Number,
      default: 0
    },
    streak_updated_at: {
      type: Date,
      default: null
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

const ContentCounts = Mongoose.model('content_counts', contentCountSchema);
module.exports = ContentCounts;
