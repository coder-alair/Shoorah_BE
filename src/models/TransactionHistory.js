'use strict';

const Mongoose = require('mongoose');
const { DEVICE_TYPE } = require('@services/Constant');

const transactionHistorySchema = new Mongoose.Schema(
  {
    user_id: {
      type: Mongoose.SchemaTypes.ObjectId,
      required: true
    },
    original_transaction_id: {
      type: String,
      required: true
    },
    transaction_id: {
      type: String,
      required: true
    },
    product_id: {
      type: String,
      required: true
    },
    original_purchase_date: {
      type: Date,
      default: null
    },
    purchase_date: {
      type: Date,
      default: null
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
    deletedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

transactionHistorySchema.index({ user_id: 1 });
transactionHistorySchema.index({ original_transaction_id: 1 });
transactionHistorySchema.index({ deletedAt: 1 });

const TransactionHistory = Mongoose.model('transaction_history', transactionHistorySchema);
module.exports = TransactionHistory;
