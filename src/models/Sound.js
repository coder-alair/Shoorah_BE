'use strict';

const Mongoose = require('mongoose');
const { STATUS, AUTHOR_BY } = require('@services/Constant');

const soundSchema = new Mongoose.Schema(
  {
    display_name: {
      type: String
    },
    description: {
      type: String
    },
    sound_url: {
      type: String
    },
    sound_srt: {
      type: String,
      default: null
    },
    is_srt_available: {
      type: Boolean,
      default: false
    },
    sound_image: {
      type: String,
      default: null
    },
    duration: {
      type: String
    },
    sound_by: {
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
    status: {
      type: Number,
      enum: [STATUS.INACTIVE, STATUS.ACTIVE, STATUS.DELETED],
      default: STATUS.ACTIVE
    },
    focus_ids: [
      {
        type: Mongoose.SchemaTypes.ObjectId,
        ref: 'Focus'
      }
    ],
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

soundSchema.virtual('contentApproval', {
  ref: 'Content_approval',
  localField: '_id',
  foreignField: 'content_type_id',
  justOne: true
});

soundSchema.index({ status: 1 });
soundSchema.index({ approved_by: 1 });
soundSchema.index({ focus_ids: 1 });
soundSchema.index({ deletedAt: 1 });
soundSchema.index({ expert_id: 1 });

soundSchema.set('toObject', { virtuals: true });
soundSchema.set('toJSON', { virtuals: true });

function expertDetails() {
  if (this.sound_by === AUTHOR_BY.EXPERT) {
    return true;
  } else {
    return false;
  }
}

const Sound = Mongoose.model('Sound', soundSchema);
module.exports = Sound;
