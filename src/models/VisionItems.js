'use strict';
const Mongoose = require('mongoose');
const { ITEM_TYPE } = require('@services/Constant');

const { Schema, model } = Mongoose;

const visionItem = new Schema(
  {
    user_id: { type: Mongoose.SchemaTypes.ObjectId, required: true, ref: 'Users' },
    vision_id: {
      type: Mongoose.SchemaTypes.ObjectId,
      required: true,
      ref: 'Visions'
    },
    main_text: { type: String, default: null },
    secondary_text: { type: String, default: null },
    item_type: { type: Number, required: true, enum: [ITEM_TYPE.WORD_TYPE, ITEM_TYPE.PHOTO_TYPE] },
    color_code: { type: String, default: null },
    main_text_color: {
      type: String,
      required: false
    },
    secondary_text_color: {
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
    order_number: { type: Number, required: true },
    title: { type: String, default: null },
    story: { type: String, default: null },
    image_url: { type: String, required: false },
    created_at: { type: String, required: false },
    created_by: { type: String, required: false },
    updated_at: { type: Date, default: Date.now },
    is_random_image: { type: Boolean, default: false },
    tags: [
      {
        type: String,
        required: false
      }
    ]
  },
  {
    timestamps: true
  }
);
visionItem.set('toObject', { virtuals: true });
visionItem.set('toJSON', { virtuals: true });

visionItem.virtual('vision', {
  ref: 'Visions',
  localField: 'vision_id',
  foreignField: '_id',
  justOne: true
});

const VisionItem = model('vision_items', visionItem);
module.exports = VisionItem;
