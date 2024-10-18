'use strict';

const Mongoose = require('mongoose');

const userNotesSchema = new Mongoose.Schema(
  {
    user_id: {
      type: Mongoose.SchemaTypes.ObjectId,
      ref: 'Users',
      required: true
    },
    title: {
      type: String,
      required: true
    },
    description: {
      type: String
    },
    image_url: {
      type: String,
      default: null
    },
    is_saved: {
      type: Boolean,
      required: true,
      default: false
    },
    positivity: {
      type: Boolean,
      default: false
    },
    sentiments: {
      type: Object,
      default: null
    },
    folder_id: {
      type: Mongoose.SchemaTypes.ObjectId,
      ref: 'user_folders',
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

userNotesSchema.index({ deletedAt: 1 });
userNotesSchema.index({ user_id: 1 });
userNotesSchema.index({ folder_id: 1 });
userNotesSchema.index({ is_saved: 1 });

const UserNotes = Mongoose.model('user_notes', userNotesSchema);
module.exports = UserNotes;
