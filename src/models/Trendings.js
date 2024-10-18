'use strict';

const Mongoose = require('mongoose');
const { CONTENT_TYPE } = require('@services/Constant');

const trendingsSchema = new Mongoose.Schema(
  {
    user_id: {
      type: Mongoose.SchemaTypes.ObjectId,
      required: true
    },
    content_id: {
      type: Mongoose.SchemaTypes.ObjectId,
      required: true
    },
    content_type: {
      type: Number,
      required: true,
      enum: [
        CONTENT_TYPE.SHOORAH_PODS,
        CONTENT_TYPE.MEDITATION,
        CONTENT_TYPE.SOUND,
        CONTENT_TYPE.AFFIRMATION,
        CONTENT_TYPE.RITUALS,
        CONTENT_TYPE.BREATHWORK,
      ]
    },
    duration: {
      type: Number,
      required: true
    },
    views: {
      type: Number,
      required: true
    },
    trending_date: {
      type: Date,
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

trendingsSchema.index({ user_id: 1 });
trendingsSchema.index({ content_id: 1 });

const Trending = Mongoose.model('trendings', trendingsSchema);
module.exports = Trending;
