'use strict';

const Mongoose = require('mongoose');
const { SPECIALISATION_TYPE } = require('@services/Constant');

const specialisationSchema = new Mongoose.Schema(
  {
    category_id: {
      type: Mongoose.SchemaTypes.ObjectId,
      required: true
    },
    spec_label: {
      type: String,
      required: true
    },
    spec_value: {
      type: String,
      required: true
    },
    is_visible: {
      type: Boolean,
      default: false
    },
    type: {
      type: String,
      required: true,
      enum: Object.values(SPECIALISATION_TYPE)
    }
  },
  { timestamps: true }
);

specialisationSchema.index({ category_id: 1 });

const Specialisation = Mongoose.model('specialisations', specialisationSchema);
module.exports = Specialisation;
