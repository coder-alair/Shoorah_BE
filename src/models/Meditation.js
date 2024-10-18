'use strict';

const Mongoose = require('mongoose');
const { MEDITATION_TYPE, AUTHOR_BY, STATUS } = require('@services/Constant');

const meditationSchema = new Mongoose.Schema(
  {
    display_name: {
      type: String
    },
    meditation_url: {
      type: String
    },
    meditation_srt: {
      type: String,
      default: null
    },
    is_srt_available: {
      type: Boolean,
      default: false
    },
    meditation_type: {
      type: Number,
      enum: [MEDITATION_TYPE.AUDIO, MEDITATION_TYPE.VIDEO]
    },
    meditation_image: {
      type: String,
      default: null
    },
    description: {
      type: String
    },
    duration: {
      type: String
    },
    focus_ids: [
      {
        type: Mongoose.SchemaTypes.ObjectId,
        ref: 'Focus'
      }
    ],
    meditation_by: {
      type: Number,
      enum: [AUTHOR_BY.SHOORAH, AUTHOR_BY.EXPERT],
      default: AUTHOR_BY.SHOORAH
    },
    expert_name: {
      type: String,
      required: expertDetails,
      default: null
    },
    expert_image: {
      type: String,
      default: null
    },
    created_by: {
      type: Mongoose.SchemaTypes.ObjectId,
      ref: 'Users'
    },
    approved_by: {
      type: Mongoose.SchemaTypes.ObjectId,
      ref: 'Users',
      default: null
    },
    approved_on: {
      type: Date,
      default: null
    },
    status: {
      type: Number,
      enum: [STATUS.INACTIVE, STATUS.ACTIVE, STATUS.DELETED],
      default: STATUS.ACTIVE
    },
    deletedAt: {
      type: Date,
      default: null
    },
    parentId: {
      type: Mongoose.SchemaTypes.ObjectId,
      default: null
    },
    rating: {
      type: Number,
      default: 0
    },
    played_counts: {
      type: Number,
      default: 0
    },
    played_time: {
      type: Number,
      default: 0
    },
    is_draft: {
      type: Boolean,
      default: false
    },
    expert_id: {
      type: Mongoose.SchemaTypes.ObjectId,
      ref: 'pod_experts'
    }
  },
  {
    timestamps: true
  }
);

meditationSchema.virtual('contentApproval', {
  ref: 'Content_approval',
  localField: '_id',
  foreignField: 'content_type_id',
  justOne: true
});

meditationSchema.index({ status: 1 });
meditationSchema.index({ approved_by: 1 });
meditationSchema.index({ focus_ids: 1 });
meditationSchema.index({ deletedAt: 1 });
meditationSchema.index({ expert_id: 1 });

meditationSchema.set('toObject', { virtuals: true });
meditationSchema.set('toJSON', { virtuals: true });

function expertDetails() {
  if (this.meditation_by === AUTHOR_BY.EXPERT) {
    return true;
  } else {
    return false;
  }
}

const Meditation = Mongoose.model('Meditation', meditationSchema);
module.exports = Meditation;
