'use strict';

const Mongoose = require('mongoose');
const {  CONTENT_STATUS } = require('@services/Constant');

const surveyApprovalSchema = new Mongoose.Schema(
  {
    survey_id: {
      type: Mongoose.SchemaTypes.ObjectId,
      required: true
    },
    company_id: {
      type: Mongoose.SchemaTypes.ObjectId,
      required: true
    },
    display_name: {
      type: String
    },
    survey_status: {
      type: Number,
      enum: [CONTENT_STATUS.DRAFT, CONTENT_STATUS.APPROVED, CONTENT_STATUS.REJECTED],
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
        survey_status: {
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

surveyApprovalSchema.index({ deletedAt: 1 });
surveyApprovalSchema.index({ survey_id: 1 });


const SurveyApproval = Mongoose.model('survey_approval', surveyApprovalSchema);
module.exports = SurveyApproval;
