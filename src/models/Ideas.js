'use strict';

const Mongoose = require('mongoose');
const { STATUS } = require('@services/Constant');

const ideasSchema = new Mongoose.Schema(
  {
    display_name: { type: String, reruired: true },
    created_by: {
      type: Mongoose.SchemaTypes.ObjectId,
      required: true,
      ref: 'Users'
    },

    status: {
      type: Number,
      enum: [STATUS.INACTIVE, STATUS.ACTIVE, STATUS.DELETED],
      default: STATUS.INACTIVE
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

ideasSchema.virtual('contentApproval', {
  ref: 'Content_approval',
  localField: '_id',
  foreignField: 'content_type_id',
  justOne: true
});

ideasSchema.index({ status: 1 });
ideasSchema.index({ approved_by: 1 });
ideasSchema.index({ focus_ids: 1 });
ideasSchema.index({ deletedAt: 1 });

ideasSchema.set('toObject', { virtuals: true });
ideasSchema.set('toJSON', { virtuals: true });

const Ideas = Mongoose.model('Idea', ideasSchema);
module.exports = Ideas;
