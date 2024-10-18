'use strict';

const Mongoose = require('mongoose');
// const { CONTENT_TYPE, CONTENT_STATUS } = require('@services/Constant');

const conversationRippleSchema = new Mongoose.Schema(
  {
    user_id: {
      type: String,
      required: true
    },
    mood_id: {
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

const RippleConversation = Mongoose.model('ripple_conversation', conversationRippleSchema);
module.exports = RippleConversation;
