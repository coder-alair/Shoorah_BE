'use strict';

const Mongoose = require('mongoose');
const { SHOORAH_PODS_TYPE, AUTHOR_BY, STATUS } = require('@services/Constant');

const shoorahPodsSchema = new Mongoose.Schema(
  {
    display_name: {
      type: String
    },
    pods_url: {
      type: String
    },
    pods_srt: {
      type: String,
      default: null
    },
    is_srt_available: {
      type: Boolean,
      default: false
    },
    pods_type: {
      type: Number,
      enum: Object.values(SHOORAH_PODS_TYPE)
    },
    pods_image: {
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
    pods_by: {
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

shoorahPodsSchema.virtual('contentApproval', {
  ref: 'Content_approval',
  localField: '_id',
  foreignField: 'content_type_id',
  justOne: true
});

shoorahPodsSchema.index({ status: 1 });
shoorahPodsSchema.index({ approved_by: 1 });
shoorahPodsSchema.index({ focus_ids: 1 });
shoorahPodsSchema.index({ deletedAt: 1 });
shoorahPodsSchema.index({ expert_id: 1 });

shoorahPodsSchema.set('toObject', { virtuals: true });
shoorahPodsSchema.set('toJSON', { virtuals: true });

function expertDetails() {
  if (this.pods_by === AUTHOR_BY.EXPERT) {
    return true;
  } else {
    return false;
  }
}

const ShoorahPods = Mongoose.model('Shoorah_pods', shoorahPodsSchema);
module.exports = ShoorahPods;
