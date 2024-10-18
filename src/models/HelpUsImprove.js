'use strict';

const Mongoose = require('mongoose');
const { CONTENT_TYPE, HELP_US_IMPROVE } = require('../services/Constant');

const helpUsImproveSchema = new Mongoose.Schema(
    {
    user_id: { 
        type: Mongoose.SchemaTypes.ObjectId,
        ref: 'Users',
        required: true
    },
    content_id: {
      type: Mongoose.SchemaTypes.ObjectId,
      required: true
    },
    content_type: {
      type: Number,
      enum: Object.values(CONTENT_TYPE),
      required: true
    },
    feedback: { 
      type: String, 
      enum: Object.values(HELP_US_IMPROVE),
      required: true 
    },
    deleted_at: { 
      type: Date, 
      default: null 
    }
  },
  {
    timestamps: true
  }
); 
  
  const HelpUsImprove = Mongoose.model('help_us_improve', helpUsImproveSchema);
  
  module.exports = HelpUsImprove;