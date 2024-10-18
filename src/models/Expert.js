'use strict';

const Mongoose = require('mongoose');
const { USER_TYPE, EXPERT_PROFILE_STATUS } = require('../services/Constant');

const expertSchema = new Mongoose.Schema(
  {
    user_id: {
      type: Mongoose.SchemaTypes.ObjectId,
      ref: 'Users',
      required: true
    },
    agreed_rate: {
      type: Number
    },
    public_rate: {
      type: Number
    },
    title: {
      type: String
    },
    medical_no: {
      type: Number
    },
    education: {
      type: String
    },
    place_of_practice: {
      type: String
    },
    year_of_practice: {
      type: String
    },
    category: {
      type: String
    },
    specialisation: {
      type: String
    },
    status: {
      type: Boolean,
      default: false
    },
    profile_status: {
      type: Number,
      enum: [
        EXPERT_PROFILE_STATUS.PENDING,
        EXPERT_PROFILE_STATUS.APPROVED,
        EXPERT_PROFILE_STATUS.REJECTED,
        EXPERT_PROFILE_STATUS.INVITED
      ],
      required: false
    },
    reject_reason: {
      type: String,
      required: false,
      default: null
    },
    linkedln_url: {
      type: String
    },
    video_url: {
      type: String,
    },
    location: {
      type: String
    },
    bio: {
      type: String
    },
    focus_ids: [
      {
        type: Mongoose.SchemaTypes.ObjectId,
        ref: 'Focus'
      }
    ],
    dbs_check: {
      type: Boolean,
      default: false
    },
    identity: {
      type: Boolean,
      default: false
    },
    profit: {
      type: String
    },
    cv: {
      type: String
    },
    insurance: {
      type: [String]
    },
    certification: {
      type: [String]
    },
    rating: {
      type: Number
    },
    spoken_languages: {
      type: [String]
    },
    // created_by: {
    //   type: Mongoose.SchemaTypes.ObjectId,
    //   ref: 'Users',
    //   required: true
    // },
    deletedAt: {
      type: Date
    },
    industry_experience: {
      type: Array
    },
    highest_certification: {
      type: Array
    },
    qualification: {
      type: String
    },
    language: {
      type: String
    },
    current_job_titile: {
      type: String
    },
    place_of_education: {
      type: String
    },
    year_of_experience: {
      type: String
    },
    specialities: {
      type: String
    },
    availibility: {
      type: String
    },
    price_per_hour: {
      type: String
    },
    medical_no: {
      type: String
    },
    location_of_practice: {
      type: String
    },
    reason_to_join: {
      type: String
    },
    applicant_id: {
      type: String
    },
    workflow_run_id: {
      type: String
    },
    check_id: {
      type: String
    },
    professional_Sector: {
      type: Array
    }
  },
  {
    timestamps: true
  }
);

const Expert = Mongoose.model('expert', expertSchema);
module.exports = Expert;
