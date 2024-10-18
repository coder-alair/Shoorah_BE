'use strict';

const Mongoose = require('mongoose');

const userRitualsSchema = new Mongoose.Schema(
  {
    user_id: {
      type: Mongoose.SchemaTypes.ObjectId,
      required: true
    },
    ritual_ids: [
      {
        type: Mongoose.SchemaTypes.ObjectId,
        required: true,
        default: null
      }
    ],
    deletedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

userRitualsSchema.index({ deletedAt: 1 });
userRitualsSchema.index({ user_id: 1 });
userRitualsSchema.index({ ritual_ids: 1 });

const UserRituals = Mongoose.model('user_ritual', userRitualsSchema);
module.exports = UserRituals;
