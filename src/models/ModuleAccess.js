'use strict';

const Mongoose = require('mongoose');

const moduleAccessSchema = new Mongoose.Schema(
  {
    user_id: {
      type: Mongoose.SchemaTypes.ObjectId,
      required: true,
      ref: 'Users'
    },
    module_access: {
      type: String,
      set: (v) => (v ? JSON.stringify(v) : null),
      get: (v) => (v ? JSON.parse(v) : null),
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

const ModuleAccess = Mongoose.model('module_access', moduleAccessSchema);
module.exports = ModuleAccess;
