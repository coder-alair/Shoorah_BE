'use strict';

const { number, string } = require('joi');
const Mongoose = require('mongoose');

const reportSchema = new Mongoose.Schema(
  {
    company_id: {
      type: Mongoose.SchemaTypes.ObjectId,
      default: null,
      ref: 'Company'
    },
    pdf_data: {
      type: 'Buffer',
      default: null
    },
    graph_name: {
      type: 'String',
      default: null
    },
    department: {
      type: 'String',
      default: null
    },
    deletedAt: {
      type: 'Date',
      default: null
    }
  },
  {
    timestamps: true
  }
);

const reports = Mongoose.model('reports', reportSchema);
module.exports = reports;
