'use strict';

const Mongoose = require('mongoose');
const { USER_TYPE } = require('../services/Constant');

const interviewSchedual = new Mongoose.Schema(
  {
    user_id: {
      type: Mongoose.SchemaTypes.ObjectId,
      ref: 'Users',
      required: true
    },
    schedual_date:{
        type: Date,
        required: false
    },
    time_slot:{
        type: String,
        required: false
    },
    meetLink:{
        type: String,
        required: false
    },
    invited_by:{
      type: Mongoose.SchemaTypes.ObjectId,
      ref: 'Users',
      required: true
    }
  },
  {
    timestamps: true
  }
);

const InterviewSchedual = Mongoose.model('InterviewSchedual', interviewSchedual);
module.exports = InterviewSchedual;
