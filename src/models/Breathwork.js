'use strict';

const Mongoose = require('mongoose');
const { BREATHWORK_TYPE, AUTHOR_BY, STATUS } = require('@services/Constant');

const breathworkSchema = new Mongoose.Schema(
  {
    display_name: {
      type: String
    },
    breathwork_url: {
      type: String
    },
    breathwork_srt: {
      type: String,
      default: null
    },
    is_srt_available: {
      type: Boolean,
      default: false
    },
    breathwork_type: {
      type: Number,
      enum: [BREATHWORK_TYPE.AUDIO, BREATHWORK_TYPE.VIDEO]
    },
    breathwork_image: {
      type: String,
      default: null
    },
    description: {
      type: String
    },
    duration: {
      type: String
    },
    breathwork_by: {
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
    breathwork_category: {
      type: Number,
      default: 1
    },
    breathwork_lottie: {
      type: Number,
      default: 1
    },
    rating: {
      type: Number,
      default: 0
    },
    is_draft: {
      type: Boolean,
      default: false
    },
    is_basic: {
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

breathworkSchema.virtual('contentApproval', {
  ref: 'Content_approval',
  localField: '_id',
  foreignField: 'content_type_id',
  justOne: true
});

breathworkSchema.index({ status: 1 });
breathworkSchema.index({ approved_by: 1 });
breathworkSchema.index({ deletedAt: 1 });
breathworkSchema.index({ expert_id: 1 });

breathworkSchema.set('toObject', { virtuals: true });
breathworkSchema.set('toJSON', { virtuals: true });

function expertDetails() {
  if (this.breathwork_by === AUTHOR_BY.EXPERT) {
    return true;
  } else {
    return false;
  }
}

const Breathwork = Mongoose.model('Breathwork', breathworkSchema);
module.exports = Breathwork;
