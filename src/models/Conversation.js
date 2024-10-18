'use strict';

const Mongoose = require('mongoose');
// const { CONTENT_TYPE, CONTENT_STATUS } = require('@services/Constant');

const conversationSchema = new Mongoose.Schema(
  {
    userId: {
      type: String,
      required: true
    },
    moodId: {
      type: String
      // required: true
    },
    message: {
      type: String
      // required: true
    },
    to: {
      type: String
      // required: true
    },
    isSessionStart: {
      type: Boolean
      // required:true
    },
    positivity: {
      type: Boolean,
      default: false
    },
    feedback_type: {
      type: Number,
      default: null
    },
    feedback_value: {
      type: Number,
      default: null
    },
    sentiments: {
      type: Object,
      default: null
    }
  },
  {
    timestamps: true
  }
);

const Conversation = Mongoose.model('conversation', conversationSchema);
module.exports = Conversation;
