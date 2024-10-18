'use strict';

const Mongoose = require('mongoose');

const userRippleSchema = new Mongoose.Schema(
  {
    user_id: {
      type: String,
      default: null
    },
    anon_id: {
      type: String,
      default: null
    },
    email: {
      type: String,
      default: null
    },
    session_start: {
      type: Date,
      default: null
    },
    session_complete: {
      type: Boolean,
      default: false
    },
    trial_activated: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

const RippleUser = Mongoose.model('ripple_user', userRippleSchema);
module.exports = RippleUser;
