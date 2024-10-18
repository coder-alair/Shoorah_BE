'use strict';

const Mongoose = require('mongoose');

const thoughtSchema = new Mongoose.Schema(
  {
    name: {
      type: 'string',
      default: null
    },
    currentThought: {
      type: Boolean,
      default: false
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

const Thoughts = Mongoose.model('thoughts', thoughtSchema);
module.exports = Thoughts;
