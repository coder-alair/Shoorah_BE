'use strict';

const Mongoose = require('mongoose');
const { STATUS } = require('../services/Constant');

const expertFocusSchema = new Mongoose.Schema(
  {
    display_name: {
      type: String,
      required: true
    },
    status: {
      type: Number,
      enum: [STATUS.INACTIVE, STATUS.ACTIVE, STATUS.DELETED],
      default: STATUS.ACTIVE,
      required: true
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

expertFocusSchema.index({ status: 1 });
expertFocusSchema.index({ deletedAt: 1 });

const ExpertFocus = Mongoose.model('expert_focus', expertFocusSchema);
module.exports = ExpertFocus;
