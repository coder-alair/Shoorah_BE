'use strict';

const Mongoose = require('mongoose');

const companyUserSchema = new Mongoose.Schema(
  {
    name: {
      type: String,
      required: false
    },
    date_of_birth: {
      type: Date,
      default: null
    },
    marital_status: {
      type: String,
      default: null
    },
    date_of_marriage: {
      type: Date,
      default: null
    },
    contact_number: {
      type: String,
      default: null
    },
    employee_id: {
      type: String,
      required: false
    },
    email_address: {
      type: String,
      required: true,
      unique: true
    },
    department: {
      type: String,
      default: null
    },
    designation: {
      type: String,
      default: false
    },
    city: {
      type: String,
      default: null
    },
    state: {
      type: String,
      default: null
    },
    country: {
      type: String,
      default: null
    },
    company_id: {
      type: Mongoose.SchemaTypes.ObjectId,
      default: null,
      ref: 'Company'
    },
    user_id: {
      type: Mongoose.SchemaTypes.ObjectId,
      default: null,
      ref: 'Users'
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

companyUserSchema.index({ email_address: 1 }, { unique: true });
companyUserSchema.index({ company_id: 1 });
companyUserSchema.index({ employee_id: 1 });

const CompanyUsers = Mongoose.model('CompanyUsers', companyUserSchema);
module.exports = CompanyUsers;
