'use strict';

const Mongoose = require('mongoose');
const { REMINDER_TYPE } = require('@services/Constant');

const reminderSchema = new Mongoose.Schema(
  {
    user_id: {
      type: Mongoose.SchemaTypes.ObjectId,
      required: true
    },
    reminder: [
      {
        reminder_type: {
          type: Number,
          enum: Object.values(REMINDER_TYPE),
          required: true
        },
        reminder_period: {
          type: Number,
          min: 0,
          max: 3,
          default: 0
        },
        interval: {
          type: Number,
          min: 0,
          max: 10,
          default: 0
        },
        _id: false
      }
    ],
    deletedAt: {
      type: Date,
      default: null
    },
    offset: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

reminderSchema.index({ user_id: 1 });
reminderSchema.index({ reminder: 1 });
reminderSchema.index({ deletedAt: 1 });

const Reminder = Mongoose.model('reminders', reminderSchema);
module.exports = Reminder;
