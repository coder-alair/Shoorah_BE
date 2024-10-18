'use strict';

const Mongoose = require('mongoose');

const visionBoardSettingSchema = new Mongoose.Schema(
  {
    user_id: {
      type: Mongoose.SchemaTypes.ObjectId,
      ref: 'Users',
      required: true
    },
    title: {
      type: String,
      required: false
    },
    bg_image: {
      type: String,
      required: false
    },
    text_color: {
      type: String,
      required: false
    },
    theme: {
      type: String,
      required: false
    },
    photo_quality: {
      type: String,
      required: false
    }
  },
  {
    timestamps: true
  }
);

visionBoardSettingSchema.index({ user_id: 1 });

const VisionBoardSetting = Mongoose.model('VisionBoardSetting', visionBoardSettingSchema);
module.exports = VisionBoardSetting;
