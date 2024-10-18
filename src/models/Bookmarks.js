'use strict';

const Mongoose = require('mongoose');
const { CONTENT_TYPE } = require('@services/Constant');

const bookmarkSchema = new Mongoose.Schema(
  {
    user_id: {
      type: Mongoose.SchemaTypes.ObjectId,
      ref: 'Users',
      required: true
    },
    content_type: {
      type: Number,
      enum: Object.values(CONTENT_TYPE),
      required: true
    },
    content_id: {
      type: Mongoose.SchemaTypes.ObjectId,
      required: true,
      ref: populateModel
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

function populateModel(content) {
  switch (content.content_type) {
    case 1:
      return 'Focus';
    case 2:
      return 'Affirmation';
    case 3:
      return 'Meditation';
    case 4:
      return 'Sound';
    case 6:
      return 'Gratitude';
    case 7:
      return 'Ritual';
    default:
      return null;
  }
}

bookmarkSchema.index({ content_id: 1 });
bookmarkSchema.index({ deletedAt: 1 });

const Bookmarks = Mongoose.model('Bookmarks', bookmarkSchema);
module.exports = Bookmarks;
