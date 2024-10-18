'use strict';

const Mongoose = require('mongoose');
const { INTRODUCED_COMPANY_PAYMENT_STATUS } = require('@services/Constant');

const introduceSchema = new Mongoose.Schema(
  {
    introduce_by: {
      type: Mongoose.SchemaTypes.ObjectId,
      default: null,
      ref: 'Users'
    },
    company_logo: {
      type: String,
      default: null
    },
    company_name: {
      type: String,
      required: true,
      unique: true
    },
    company_address: {
      type: String
    },
    company_email: {
      type: String,
      required: true
    },
    contact_person: {
      type: String,
      required: true
    },
    contact_number: {
      type: String,
      default: null
    },
    email_intro_made: {
      type: Boolean,
      default: false
    },
    company_type: {
      type: String,
      default: null
    },
    deletedAt: {
      type: Date,
      default: null
    },
    payment_status: {
      type: Number,
      enum: [INTRODUCED_COMPANY_PAYMENT_STATUS.NOT_PAID, INTRODUCED_COMPANY_PAYMENT_STATUS.PAID],
      default: INTRODUCED_COMPANY_PAYMENT_STATUS.NOT_PAID,
      required: true
    },
    payment_amount: {
      type: Number
    },
    payment_receipt: {
      type: String,
      default: null
    },
    payment_comment: {
      type: String
    },
    payment_date: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

const IntroduceCompany = Mongoose.model('introduce_company', introduceSchema);
module.exports = IntroduceCompany;
