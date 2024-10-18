'use strict';

const Mongoose = require('mongoose');

const userGratitudeSchema = new Mongoose.Schema(
  {
    user_id: {
      type: Mongoose.SchemaTypes.ObjectId,
      required: true
    },
    display_name: {
      type: String,
      required: true
    },
    image_url: {
      type: String,
      default: null
    },
    description: {
      type: String
    },
    is_saved: {
      type: Boolean,
      default: false
    },
    positivity: {
      type: Boolean,
      default: false
    },
    sentiments: {
      type: Object,
      default: null
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

userGratitudeSchema.index({ deletedAt: 1 });
userGratitudeSchema.index({ user_id: 1 });
userGratitudeSchema.index({ is_saved: 1 });

const UserGratitude = Mongoose.model('user_gratitude', userGratitudeSchema);
module.exports = UserGratitude;
