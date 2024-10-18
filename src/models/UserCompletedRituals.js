'use strict';

const Mongoose = require('mongoose');

const userCompletedRitualsSchema = new Mongoose.Schema(
  {
    user_id: {
      type: Mongoose.SchemaTypes.ObjectId,
      required: true
    },
    ritual_id: {
      type: Mongoose.SchemaTypes.ObjectId,
      required: true
    },
    consecutive_count: {
      type: Number,
      default: 0,
      required: true
    },
    is_completed: {
      type: Boolean,
      required: true,
      default: false
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

userCompletedRitualsSchema.index({ user_id: 1 });
userCompletedRitualsSchema.index({ ritual_id: 1 });
userCompletedRitualsSchema.index({ deletedAt: 1 });

const UserCompletedRituals = Mongoose.model('user_completed_rituals', userCompletedRitualsSchema);
module.exports = UserCompletedRituals;
