'use strict';

const Mongoose = require('mongoose');
const { RITUAL_TYPE, STATUS } = require('@services/Constant');

const ritualSchema = new Mongoose.Schema(
  {
    display_name: {
      type: String
    },
    status: {
      type: Number,
      enum: [STATUS.INACTIVE, STATUS.ACTIVE, STATUS.DELETED],
      default: STATUS.INACTIVE
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
    is_draft: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

ritualSchema.virtual('contentApproval', {
  ref: 'Content_approval',
  localField: '_id',
  foreignField: 'content_type_id',
  justOne: true
});

ritualSchema.index({ status: 1 });
ritualSchema.index({ approved_by: 1 });
ritualSchema.index({ focus_ids: 1 });
ritualSchema.index({ deletedAt: 1 });

ritualSchema.set('toObject', { virtuals: true });
ritualSchema.set('toJSON', { virtuals: true });

const Ritual = Mongoose.model('Ritual', ritualSchema);
module.exports = Ritual;
