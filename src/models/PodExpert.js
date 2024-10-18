'use strict';

const Mongoose = require('mongoose');

const podExpertSchema = new Mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },
    description: {
      type: String
    },
    image: {
      type: String
    },
    createdBy: {
      type: Mongoose.SchemaTypes.ObjectId,
      ref: 'Users',
      required: true
    },
    monthlyListeners: {
      type: Number,
      default: 0
    },
    isActive: {
      type: Boolean,
      default: true
    },
    isDelete: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

podExpertSchema.index({ name: 1 });

const PodExpert = Mongoose.model('pod_experts', podExpertSchema);
module.exports = PodExpert;
