'use strict';

const Mongoose = require('mongoose');

const solutionSchema = new Mongoose.Schema(
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
    solution_data: {
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

const solution = Mongoose.model('solution', solutionSchema);
module.exports = solution;
