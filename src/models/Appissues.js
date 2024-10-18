'use strict';

const Mongoose = require('mongoose');
const { APP_ISSUES_TYPE, CONTENT_TYPE, STATUS } = require('@services/Constant');

const appIssueSchema = new Mongoose.Schema(
  {
    content_id: {
      type: Mongoose.SchemaTypes.ObjectId,
      default: null
    },
    content_type: {
      type: Number,
      enum: Object.values(CONTENT_TYPE),
      required: true
    },
    issue: {
      type: Number,
      enum: [
        APP_ISSUES_TYPE.SOME_CAPTION_ISSUE,
        APP_ISSUES_TYPE.ALL_CAPTION_ISSUE,
        APP_ISSUES_TYPE.CAPTION_NOT_SYNC
      ],
      required: true
    },
    description: {
      type: String,
      default: null
    },
    image: {
      type: String,
      default: null
    },
    sent_to_dev: {
      type: Boolean,
      default: false
    },
    issue_resolve: {
      type: Boolean,
      default: false
    },
    implemented: {
      type: Boolean,
      default: false
    },
    status: {
      type: Number,
      enum: [STATUS.INACTIVE, STATUS.ACTIVE, STATUS.DELETED],
      default: STATUS.ACTIVE,
      required: true
    },
    created_by: {
      type: Mongoose.SchemaTypes.ObjectId,
      default: null,
      ref: 'Users'
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

appIssueSchema.index({ status: 1 });
appIssueSchema.index({ content_id: 1 });
appIssueSchema.index({ content_type: 1 });
appIssueSchema.index({ deletedAt: 1 });

const AppIssues = Mongoose.model('app_issues', appIssueSchema);
module.exports = AppIssues;
