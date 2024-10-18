'use strict';

const Mongoose = require('mongoose');

const sosCallSchema = new Mongoose.Schema(
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

sosCallSchema.index({ createdAt: 1 });

const SOSCall = Mongoose.model('SOS_Call', sosCallSchema);
module.exports = SOSCall;
