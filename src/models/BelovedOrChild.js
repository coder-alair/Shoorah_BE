'use strict';

const Mongoose = require('mongoose');

const BelovedOrChildSchema = new Mongoose.Schema(
    {
    user_id: { 
        type: Mongoose.SchemaTypes.ObjectId,
        ref: 'Users',
        required: true
    },
    name: {
        type: String,
        required: true
      },
      date_of_birth: {
        type: Date,
        required: true
      },
      gender: {
        type: String,
        enum: ['male', 'female', 'other'],
        required: true
      },
      affirmation_focus_ids: [
        {
          type: Mongoose.SchemaTypes.ObjectId,
          ref: 'Focus',
          default: null
        }
      ],
      family_type: {
        type: String,
        enum: ['child', 'beloved','all'],
        required: true
      },
      my_family_delete: {
        type: Boolean,
        default: false
      },
      deleted_at: {
        type: Date,
        default: null
      }, 
  },
  {
    timestamps: true 
  } 
); 
  
  const BelovedChild = Mongoose.model('beloved_child', BelovedOrChildSchema);
  
  module.exports = BelovedChild;