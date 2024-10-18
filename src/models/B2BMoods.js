'use strict';

const Mongoose = require('mongoose');
const { B2B_ADMIN_MOOD } = require('../services/Constant');

const b2bmoodSchema = new Mongoose.Schema(
  {
    user_id: {
      type: Mongoose.SchemaTypes.ObjectId,
      ref: 'Users',
      required: true
    },
    company_id: {
      type: Mongoose.SchemaTypes.ObjectId,
      ref: 'Company'
    },
    mood_type: {
      type: Number,
      enum: [
        B2B_ADMIN_MOOD.HAPPY,
        B2B_ADMIN_MOOD.SAD,
        B2B_ADMIN_MOOD.ANGRY,
        B2B_ADMIN_MOOD.NEUTRAL
      ],
      default: B2B_ADMIN_MOOD.HAPPY
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

const B2BMoods = Mongoose.model('b2b_moods', b2bmoodSchema);

module.exports = B2BMoods;
