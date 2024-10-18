'use strict';

const Mongoose = require('mongoose');
const { ACCOUNT_TYPE } = require('@services/Constant');

const companySchema = new Mongoose.Schema(
  {
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
      type: String,
      required: true
    },
    salesman: {
      type: String
    },
    company_email: {
      type: String,
      required: true,
      unique: true
    },
    contact_person: {
      type: String,
      required: true
    },
    role: {
      type: String,
      default: 'Director'
    },
    contact_number: {
      type: String,
      default: null,
      unique: false
    },
    no_of_seat_bought: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'gbp'
    },
    seat_price: {
      type: Number,
      required: true
    },
    vat_tax: {
      type: Boolean,
      default: false
    },
    discount: {
      type: Number,
      default: 0
    },
    company_subscription: {
      type: Number,
      enum: Object.values(ACCOUNT_TYPE),
      default: 1
    },
    seat_active: {
      type: Boolean,
      default: false
    },
    contract_start_date: {
      type: Date,
      default: null
    },
    contract_end_date: {
      type: Date,
      default: null
    },
    contract_progress: {
      type: Boolean,
      default: false
    },
    b2b_interest_via: {
      type: String,
      default: null
    },
    terms_agreed: {
      type: Boolean,
      default: false
    },
    contract_sent: {
      type: Boolean,
      default: false
    },
    contract_signed: {
      type: Boolean,
      default: false
    },
    invoice_raised: {
      type: Boolean,
      default: false
    },
    payment_complete: {
      type: Boolean,
      default: false
    },
    restrict_company: {
      type: Boolean,
      default: false
    },
    auto_renew: {
      type: Boolean,
      default: false
    },
    transaction_id: {
      type: String,
      default: null
    },
    plan: {
      type: String,
      default: 'Monthly'
    },
    company_type: {
      type: String,
      default: null
    },
    shuru_usage: {
      type: Boolean,
      default: true
    },
    peap_usage: {
      type: Boolean,
      default: true
    },
    is_charity: {
      type: Boolean
    },
    deletedAt: {
      type: Date,
      default: null
    },
    introduce_by: {
      type: Mongoose.SchemaTypes.ObjectId,
      default: null,
      ref: 'Users'
    }
  },
  {
    timestamps: true
  }
);

const Company = Mongoose.model('Company', companySchema);
module.exports = Company;
