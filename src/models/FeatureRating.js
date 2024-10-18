'use strict';

const Mongoose = require('mongoose');
const { FEATURE_RATE_TYPE } = require('@services/Constant');

const featureRatingSchema = new Mongoose.Schema(
  {
    user_id: {
      type: Mongoose.SchemaTypes.ObjectId,
      ref: 'Users',
      required: true
    },
    feature_type: {
      type: Number,
      enum: [FEATURE_RATE_TYPE.PODS, FEATURE_RATE_TYPE.RITUALS, FEATURE_RATE_TYPE.EXPLORE, FEATURE_RATE_TYPE.JOURNAL, FEATURE_RATE_TYPE.RESTORE, FEATURE_RATE_TYPE.BREATHWORK, FEATURE_RATE_TYPE.MEDITATION, FEATURE_RATE_TYPE.SLEEPS, FEATURE_RATE_TYPE.CLEANSE, FEATURE_RATE_TYPE.GOALS, FEATURE_RATE_TYPE.AFFIRMATION, FEATURE_RATE_TYPE.SHURU, FEATURE_RATE_TYPE.MOODS, FEATURE_RATE_TYPE.SLEEP_TRACKER, FEATURE_RATE_TYPE.VISION_BOARD],
      required: true
    },
    rated: {
      type: Number,
      default: 0
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

const FeatureRatings = Mongoose.model('feature_rating', featureRatingSchema);
module.exports = FeatureRatings;
