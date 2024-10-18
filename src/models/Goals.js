'use strict';

const Mongoose = require('mongoose');

const goalSchema = new Mongoose.Schema(
  {
    user_id: {
      type: Mongoose.SchemaTypes.ObjectId,
      ref: 'Users',
      required: true
    },
    image_url: {
      type: String,
      default: null
    },
    title: {
      type: String,
      maxLength: 50,
      required: true
    },
    description: {
      type: String,
      maxLength: 2000,
      default: null
    },
    due_date: {
      type: Date,
      default: null
    },
    is_completed: {
      type: Boolean,
      default: false
    },
    is_saved: {
      type: Boolean,
      default: false
    },
    positivity: {
      type: Boolean,
      default: false
    },
    completed_on: {
      type: Date,
      default: null
    },
    checklist: {
      type: Array,
      default: null
    },
    sentiments: {
      type: Object,
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

goalSchema.index({ deletedAt: 1 });

const Goals = Mongoose.model('Goals', goalSchema);
module.exports = Goals;
