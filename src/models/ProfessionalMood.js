'use strict';

const Mongoose = require('mongoose');

const professionalMoodSchema = new Mongoose.Schema(
  {
    user_id: {
      type: Mongoose.SchemaTypes.ObjectId,
      ref: 'Users',
      required: true
    },
    dissatisfied: {
      type: Number,
      min: -5,
      max: 5,
      default: 0
    },
    very_satisfied: {
      type: Number,
      min: -5,
      max: 5,
      default: 0
    },
    unpleasant: {
      type: Number,
      min: -5,
      max: 5,
      default: 0
    },
    positive: {
      type: Number,
      min: -5,
      max: 5,
      default: 0
    },
    overwhelming: {
      type: Number,
      min: -5,
      max: 5,
      default: 0
    },
    comfortable: {
      type: Number,
      min: -5,
      max: 5,
      default: 0
    },
    poor: {
      type: Number,
      min: -5,
      max: 5,
      default: 0
    },
    supportive: {
      type: Number,
      min: -5,
      max: 5,
      default: 0
    },
    unmanageable: {
      type: Number,
      min: -5,
      max: 5,
      default: 0
    },
    manageable: {
      type: Number,
      min: -5,
      max: 5,
      default: 0
    },
    lacking: {
      type: Number,
      min: -5,
      max: 5,
      default: 0
    },
    excellent: {
      type: Number,
      min: -5,
      max: 5,
      default: 0
    },
    negative: {
      type: Number,
      min: -5,
      max: 5,
      default: 0
    },
    inclusive: {
      type: Number,
      min: -5,
      max: 5,
      default: 0
    },
    unsupported: {
      type: Number,
      min: -5,
      max: 5,
      default: 0
    },
    highly_supported: {
      type: Number,
      min: -5,
      max: 5,
      default: 0
    },
    insufficient: {
      type: Number,
      min: -5,
      max: 5,
      default: 0
    },
    well_equipped: {
      type: Number,
      min: -5,
      max: 5,
      default: 0
    },
    inadequate: {
      type: Number,
      min: -5,
      max: 5,
      default: 0
    },
    comprehensive: {
      type: Number,
      min: -5,
      max: 5,
      default: 0
    },
    positivity: {
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

professionalMoodSchema.index({ user_id: 1 });
professionalMoodSchema.index({ deletedAt: 1 });

const ProfessionalMood = Mongoose.model('professional_mood', professionalMoodSchema);
module.exports = ProfessionalMood;
