'use strict';

const Mongoose = require('mongoose');
const { STATUS } = require('../services/Constant');

const userCustomRitualsSchema = new Mongoose.Schema(
  {
    ritual_name: {
      type: String,
      required: true
    },
    is_saved: {
      type: Boolean,
      default: false
    },
    positivity: {
      type: Boolean,
      default: false
    },
    created_by: {
      type: Mongoose.SchemaTypes.ObjectId,
      required: true,
      ref: 'Users'
    },
    status: {
      type: Number,
      enum: [STATUS.INACTIVE, STATUS.ACTIVE, STATUS.DELETED],
      default: STATUS.ACTIVE
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

userCustomRitualsSchema.index({ deletedAt: 1 });
userCustomRitualsSchema.index({ ritual_name: 1 });
userCustomRitualsSchema.index({ created_by: 1 });
userCustomRitualsSchema.index({ is_saved: 1 });

const UserCustomRituals = Mongoose.model('user_custom_ritual', userCustomRitualsSchema);
module.exports = UserCustomRituals;
