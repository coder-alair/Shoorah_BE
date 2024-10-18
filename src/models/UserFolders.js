'use strict';

const Mongoose = require('mongoose');
const { FOLDER_TYPES } = require('../services/Constant');

const userFolderSchema = new Mongoose.Schema(
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
    folder_type:{
        type:Number,
        enum: Object.values(FOLDER_TYPES),
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

userFolderSchema.index({ deletedAt: 1 });
userFolderSchema.index({ user_id: 1 });

const UserFolders = Mongoose.model('user_folders', userFolderSchema);
module.exports = UserFolders;
