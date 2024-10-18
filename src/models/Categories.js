'use strict';

const Mongoose = require('mongoose');
const { STATUS } = require('@services/Constant');
const { CONTENT_TYPE } = require('../services/Constant');

const categorySchema = new Mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },
    status: {
      type: Number,
      enum: [STATUS.INACTIVE, STATUS.ACTIVE, STATUS.DELETED],
      default: STATUS.ACTIVE
    },
    focuses: [
      {
        type: Mongoose.SchemaTypes.ObjectId,
        ref: 'Focus' // Reference to the Focus model
      }
    ],
    contentType: {
      type: Number,
      enum: [
        CONTENT_TYPE.AFFIRMATION,
        CONTENT_TYPE.SOUND,
        CONTENT_TYPE.MEDITATION,
        CONTENT_TYPE.SHOORAH_PODS,
        CONTENT_TYPE.RITUALS
      ],
      default: CONTENT_TYPE.MEDITATION
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

categorySchema.index({ status: 1 });
categorySchema.index({ deletedAt: 1 });
categorySchema.index({ contentType: 1 });

const Category = Mongoose.model('Category', categorySchema);
module.exports = Category;
