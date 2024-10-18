'use strict';

const Mongoose = require('mongoose');
const { CONTENT_TYPE } = require('@services/Constant');

const ratingSchema = new Mongoose.Schema(
  {
    user_id: {
      type: Mongoose.SchemaTypes.ObjectId,
      ref: 'Users',
      required: true
    },
    content_type: {
      type: Number,
      enum: [CONTENT_TYPE.SHOORAH_PODS, CONTENT_TYPE.MEDITATION, CONTENT_TYPE.SOUND],
      required: true
    },
    content_id: {
      type: Mongoose.SchemaTypes.ObjectId,
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

const Ratings = Mongoose.model('ratings', ratingSchema);
module.exports = Ratings;
