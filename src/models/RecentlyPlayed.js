'use strict';

const Mongoose = require('mongoose');
const { CONTENT_TYPE } = require('@services/Constant');

const recentlyPlayedSchema = new Mongoose.Schema(
  {
    user_id: {
      type: Mongoose.SchemaTypes.ObjectId,
      ref: 'Users',
      required: true
    },
    content_type: {
      type: Number,
      enum: [CONTENT_TYPE.SHOORAH_PODS, CONTENT_TYPE.MEDITATION, CONTENT_TYPE.SOUND,CONTENT_TYPE.BREATHWORK],
      required: true
    },
    content_id: {
      type: Mongoose.SchemaTypes.ObjectId,
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

recentlyPlayedSchema.index({ user_id: 1 });
recentlyPlayedSchema.index({ content_id: 1 });
recentlyPlayedSchema.index({ content_type: 1 });
recentlyPlayedSchema.index({ deletedAt: 1 });

const RecentlyPlayed = Mongoose.model('recently_played', recentlyPlayedSchema);
module.exports = RecentlyPlayed;
