'use strict';

const Mongoose = require('mongoose');
const { OFFER_TYPE } = require('@services/Constant');

const offerRedeemedSchema = new Mongoose.Schema(
  {
    user_id: {
      type: Mongoose.SchemaTypes.ObjectId,
      required: true
    },
    offer_type: {
      type: String,
      enum: Object.values(OFFER_TYPE),
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
    deletedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

const OfferRedeemedHistory = Mongoose.model('offer_redeemed_history', offerRedeemedSchema);
module.exports = OfferRedeemedHistory;
