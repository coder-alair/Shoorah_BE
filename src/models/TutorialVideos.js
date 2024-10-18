'use strict';

const Mongoose = require('mongoose');
const { TUTORIAL_CONTENT_TYPE } = require('@services/Constant');

const tutorialVideosSchema = new Mongoose.Schema(
  {
    video_url: {
      type: String,
      default: null
    },
    thumbnail: {
      type: String,
      default: null
    },
    duration: {
      type: String,
      default: null
    },
    content_type: {
      type: Number,
      enum: Object.values(TUTORIAL_CONTENT_TYPE),
      required: true
    },
    heading: {
      type: String,
      default: null
    },
    sub_heading: {
      type: String,
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

const TutorialVideos = Mongoose.model('Tutorial_videos', tutorialVideosSchema);
module.exports = TutorialVideos;
