'use strict';

const Mongoose = require('mongoose');
const { BADGE_TYPE, CATEGORY_TYPE } = require('@services/Constant');

const userBadgesSchema = new Mongoose.Schema(
  {
    user_id: {
      type: Mongoose.SchemaTypes.ObjectId,
      required: true
    },
    category_type: {
      type: Number,
      enum: Object.values(CATEGORY_TYPE),
      required: true
    },
    badge_type: {
      type: Number,
      enum: Object.values(BADGE_TYPE)
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

userBadgesSchema.index({ user_id: 1 });
userBadgesSchema.index({ category_type: 1 });

const UserBadges = Mongoose.model('user_badges', userBadgesSchema);
module.exports = UserBadges;
