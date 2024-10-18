'use strict';

const Mongoose = require('mongoose');

const sosSchema = new Mongoose.Schema(
  {
    user_id: {
      type: Mongoose.SchemaTypes.ObjectId,
      required: true
    }
  },
  {
    timestamps: true
  }
);

sosSchema.index({ createdAt: 1 });

const SOS = Mongoose.model('SOS', sosSchema);
module.exports = SOS;
