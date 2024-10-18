'use strict';

const Mongoose = require('mongoose');
const { CONTENT_TYPE } = require('@services/Constant');

const topPicksSchema = new Mongoose.Schema(
  {
    content_type_id: {
      type: Mongoose.SchemaTypes.ObjectId,
      required: true,
      ref: populateModel
    },
    content_type: {
      type: Number,
      enum: Object.values(CONTENT_TYPE),
      required: true
    },
    position: {
      type: Number,
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

const TopPicks = Mongoose.model('top_picks', topPicksSchema);
module.exports = TopPicks;
