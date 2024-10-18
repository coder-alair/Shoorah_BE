'use strict';

const Mongoose = require('mongoose');

const cmsSchema = new Mongoose.Schema(
  {
    title: {
      type: String,
      required: true
    },
    alias: {
      type: String,
      required: true
    },
    description: {
      type: String,
      default: null
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

const Cms = Mongoose.model('Cms', cmsSchema);
module.exports = Cms;
