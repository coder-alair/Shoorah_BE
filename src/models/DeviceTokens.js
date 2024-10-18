'use strict';

const Mongoose = require('mongoose');
const { DEVICE_TYPE } = require('@services/Constant');

const deviceTokenSchema = new Mongoose.Schema(
  {
    user_id: {
      type: Mongoose.SchemaTypes.ObjectId,
      required: true,
      ref: 'Users'
    },
    device_token: {
      type: String,
      required: true
    },
    device_type: {
      type: Number,
      enum: [DEVICE_TYPE.ANDROID, DEVICE_TYPE.IOS, DEVICE_TYPE.WEB],
      required: true
    }
  },
  {
    timestamps: true
  }
);
const DeviceTokens = Mongoose.model('Device_tokens', deviceTokenSchema);
module.exports = DeviceTokens;
