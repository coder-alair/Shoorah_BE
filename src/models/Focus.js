'use strict';

const Mongoose = require('mongoose');
const { FOCUS_TYPE, STATUS } = require('@services/Constant');

const focusSchema = new Mongoose.Schema(
  {
    display_name: {
      type: String,
      required: true
    },
    focus_type: {
      type: Number,
      enum: [FOCUS_TYPE.MAIN, FOCUS_TYPE.AFFIRMATION,FOCUS_TYPE.EXPERT,FOCUS_TYPE.JOURNAL],
      required: true
    },
    status: {
      type: Number,
      enum: [STATUS.INACTIVE, STATUS.ACTIVE, STATUS.DELETED],
      default: STATUS.INACTIVE,
      required: true
    },
    created_by: {
      type: Mongoose.SchemaTypes.ObjectId,
      required: true,
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

focusSchema.virtual('contentApproval', {
  ref: 'Content_approval',
  localField: '_id',
  foreignField: 'content_type_id',
  justOne: true
});

focusSchema.index({ status: 1 });
focusSchema.index({ approved_by: 1 });
focusSchema.index({ deletedAt: 1 });

focusSchema.set('toObject', { virtuals: true });
focusSchema.set('toJSON', { virtuals: true });

const Focus = Mongoose.model('Focus', focusSchema);
module.exports = Focus;
