'use strict';

const Mongoose = require('mongoose');

const expertCategory = new Mongoose.Schema(
  {
    label: {
      type: String,
      required: true
    },
    value: {
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


const ExpertCategory = Mongoose.model('expert_category', expertCategory);
module.exports = ExpertCategory;
