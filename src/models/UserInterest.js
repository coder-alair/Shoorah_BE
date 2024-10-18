'use strict';

const Mongoose = require('mongoose');

const userInterestSchema = new Mongoose.Schema(
  {
    user_id: {
      type: Mongoose.SchemaTypes.ObjectId,
      required: true,
      ref: 'Users'
    },
    main_focus_ids: [
      {
        type: Mongoose.SchemaTypes.ObjectId,
        ref: 'Focus',
        default: null
      }
    ],
    affirmation_focus_ids: [
      {
        type: Mongoose.SchemaTypes.ObjectId,
        ref: 'Focus',
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

userInterestSchema.index({ deletedAt: 1 });
userInterestSchema.index({ user_id: 1 });
userInterestSchema.index({ main_focus_ids: 1 });
userInterestSchema.index({ affirmation_focus_ids: 1 });

const UserInterest = Mongoose.model('user_interest', userInterestSchema);
module.exports = UserInterest;
