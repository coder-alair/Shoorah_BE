'use strict';

const Mongoose = require('mongoose');

const usageSchema = new Mongoose.Schema(
  {
    user_id: {
      type: Mongoose.SchemaTypes.ObjectId,
      required: true,
      ref: 'Users'
    },
    app_durations: {
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

const Usage = Mongoose.model('usage', usageSchema);
module.exports = Usage;
