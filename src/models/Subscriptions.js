'use strict';

const Mongoose = require('mongoose');
const { DEVICE_TYPE } = require('@services/Constant');

const subscriptionSchema = new Mongoose.Schema(
  {
    user_id: {
      type: Mongoose.SchemaTypes.ObjectId,
      required: true
    },
    original_transaction_id: {
      type: String,
      required: true
    },
    product_id: {
      type: String,
      required: true
    },
    expires_date: {
      type: Date,
      default: null
    },
    purchased_from_device: {
      type: Number,
      enum: Object.values(DEVICE_TYPE),
      required: true
    },
    auto_renew: {
      type: Boolean,
      default: true
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

subscriptionSchema.index({ user_id: 1 });
subscriptionSchema.index({ original_transaction_id: 1 });
subscriptionSchema.index({ deletedAt: 1 });

const Subscriptions = Mongoose.model('subscription', subscriptionSchema);
module.exports = Subscriptions;
