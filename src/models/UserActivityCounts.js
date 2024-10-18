'use strict';

const Mongoose = require('mongoose');
const { FEATURE_TYPE } = require('@services/Constant');

const userActivityCountSchema = new Mongoose.Schema(
  {
    user_id: {
      type: Mongoose.SchemaTypes.ObjectId,
      required: true
    },
    feature_type: {
      type: Number,
      enum: Object.values(FEATURE_TYPE),
      required: true
    },
    count: {
      type: Number,
      require: true
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

userActivityCountSchema.index({ user_id: 1 });
userActivityCountSchema.index({ feature_type: 1 });

const UserActivityCounts = Mongoose.model('user_activity_count', userActivityCountSchema);
module.exports = UserActivityCounts;
