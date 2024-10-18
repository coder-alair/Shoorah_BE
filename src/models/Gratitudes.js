'use strict';

const Mongoose = require('mongoose');
const { GRATITUDE_TYPE, STATUS } = require('@services/Constant');

const gratitudeSchema = new Mongoose.Schema(
  {
    display_name: {
      type: String,
      required: true
    },
    gratitude_url: {
      type: String,
      default: null
    },
    duration: {
      type: String,
      default: null
    },
    thumbnail: {
      type: String,
      default: null
    },
    gratitude_type: {
      type: Number,
      enum: [GRATITUDE_TYPE.IMAGE, GRATITUDE_TYPE.VIDEO, GRATITUDE_TYPE.TEXT],
      required: true
    },
    status: {
      type: Number,
      enum: [STATUS.INACTIVE, STATUS.ACTIVE, STATUS.DELETED],
      default: STATUS.INACTIVE,
      required: true
    },
    focus_ids: [
      {
        type: Mongoose.SchemaTypes.ObjectId,
        ref: 'Focus',
        required: true
      }
    ],
    created_by: {
      type: Mongoose.SchemaTypes.ObjectId,
      required: true,
      ref: 'Users'
    },
    approved_by: {
      type: Mongoose.SchemaTypes.ObjectId,
      ref: 'Users',
      default: null
    },
    approved_on: {
      type: Date,
      default: null
    },
    deletedAt: {
      type: Date,
      default: null
    },
    parentId: {
      type: Mongoose.SchemaTypes.ObjectId,
      default: null
    }
  },
  {
    timestamps: true
  }
);

gratitudeSchema.index({ deletedAt: 1 });

const Gratitude = Mongoose.model('Gratitude', gratitudeSchema);
module.exports = Gratitude;
