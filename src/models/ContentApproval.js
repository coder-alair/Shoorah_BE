'use strict';

const Mongoose = require('mongoose');
const { CONTENT_TYPE, CONTENT_STATUS } = require('@services/Constant');

const contentSchema = new Mongoose.Schema(
  {
    company_id: {
      type: Mongoose.SchemaTypes.ObjectId,
      default: null
    },
    content_type_id: {
      type: Mongoose.SchemaTypes.ObjectId,
      required: true
    },
    content_type: {
      type: Number,
      enum: Object.values(CONTENT_TYPE),
      required: true
    },
    display_name: {
      type: String
    },
    focus_ids: [
      {
        type: Mongoose.SchemaTypes.ObjectId,
        ref: 'Focus',
        default: null
      }
    ],
    content_status: {
      type: Number,
      enum: [
        CONTENT_STATUS.DRAFT,
        CONTENT_STATUS.APPROVED,
        CONTENT_STATUS.REJECTED,
        CONTENT_STATUS.NEED_APPROVAL
      ],
      default: CONTENT_STATUS.DRAFT,
      required: true
    },
    comments: [
      {
        comment: {
          type: String,
          default: null
        },
        commented_by: {
          type: Mongoose.SchemaTypes.ObjectId,
          ref: 'Users'
        },
        commented_on: Date,
        content_status: {
          type: Number,
          enum: [CONTENT_STATUS.DRAFT, CONTENT_STATUS.APPROVED, CONTENT_STATUS.REJECTED],
          default: CONTENT_STATUS.DRAFT,
          required: true
        }
      },
      {
        default: null
      }
    ],
    created_by: {
      type: Mongoose.SchemaTypes.ObjectId,
      required: true,
      ref: 'Users'
    },
    updated_by: {
      type: Mongoose.SchemaTypes.ObjectId,
      ref: 'Users',
      default: null
    },
    updated_on: {
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
    }
  },
  {
    timestamps: true
  }
);

contentSchema.index({ deletedAt: 1 });
contentSchema.index({ focus_ids: 1 });
contentSchema.index({ content_type_id: 1 });

const ContentApproval = Mongoose.model('Content_approval', contentSchema);
module.exports = ContentApproval;
