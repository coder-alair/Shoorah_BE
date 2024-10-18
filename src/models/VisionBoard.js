'use strict';

const Mongoose = require('mongoose');

const visionBoardSchema = new Mongoose.Schema(
  {
    user_id: {
      type: Mongoose.SchemaTypes.ObjectId,
      ref: 'Users',
      required: true
    },
    idea: {
      type: Mongoose.SchemaTypes.ObjectId,
      ref: 'Idea',
      required: false
    },
    idea_title: {
      type: String,
      required: false
    },
    title: {
      type: String,
      required: true
    },
    sub_title: {
      type: String,
      required: false
    },
    tag: {
      type: [String],
      required: false
    },
    color: {
      type: String,
      required: false
    },
    theme: {
      type: String,
      required: false
    },
    text_color: {
      type: String,
      required: false
    },
    image: {
      type: String,
      required: false
    },
    reminder: {
      type: Boolean,
      default: false
    },
    reminder_time: {
      type: String,
      default: null
    },
    order_no: {
      type: Number,
      default: null
    },
    is_archive: {
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

visionBoardSchema.index({ user_id: 1 });
visionBoardSchema.index({ idea: 1 });

const Visions = Mongoose.model('Visions', visionBoardSchema);
module.exports = Visions;
