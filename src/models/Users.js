'use strict';

const Mongoose = require('mongoose');
const {
  USER_TYPE,
  ACCOUNT_STATUS,
  GENDER,
  ACCOUNT_TYPE,
  ON_BOARD_STEPS,
  SOCIAL_LOGIN_TYPE
} = require('@services/Constant');

const usersSchema = new Mongoose.Schema(
  {
    company_id: {
      type: Mongoose.SchemaTypes.ObjectId,
      default: null,
      ref: 'Company'
    },
    name: {
      type: String,
      maxLength: 60,
      required: true
    },
    address: {
      type: String,
      maxLength: 100
    },
    first_name: {
      type: String,
      maxLength: 60
    },
    last_name: {
      type: String,
      maxLength: 60
    },
    email: {
      type: String,
      maxLength: 60,
      trim: true,
      lowercase: true,
      default: null
    },
    password: {
      type: String,
      required: false
    },
    user_type: {
      type: Number,
      enum: [
        USER_TYPE.SUPER_ADMIN,
        USER_TYPE.SUB_ADMIN,
        USER_TYPE.USER,
        USER_TYPE.COMPANY_ADMIN,
        USER_TYPE.COMPANY_SUB_ADMIN,
        USER_TYPE.PARTNER,
        USER_TYPE.EXPERT
      ],
      default: USER_TYPE.USER,
      required: true
    },
    user_profile: {
      type: String,
      default: null
    },
    user_video: {
      type: String,
      default: null
    },
    account_type: {
      type: Number,
      enum: [
        ACCOUNT_TYPE.FREE,
        ACCOUNT_TYPE.IS_UNDER_TRIAL,
        ACCOUNT_TYPE.PAID,
        ACCOUNT_TYPE.EXPIRED
      ],
      default: ACCOUNT_TYPE.FREE,
      required: true
    },
    login_platform: {
      type: Number,
      enum: [
        SOCIAL_LOGIN_TYPE.GOOGLE,
        SOCIAL_LOGIN_TYPE.APPLE,
        SOCIAL_LOGIN_TYPE.FACEBOOK,
        SOCIAL_LOGIN_TYPE.SHOORAH
      ],
      default: SOCIAL_LOGIN_TYPE.SHOORAH
    },
    status: {
      type: Number,
      enum: [ACCOUNT_STATUS.INACTIVE, ACCOUNT_STATUS.ACTIVE, ACCOUNT_STATUS.DELETED],
      default: ACCOUNT_STATUS.ACTIVE
    },
    otp: {
      type: String,
      default: null
    },
    last_otp_sent: {
      type: Date,
      default: null
    },
    otp_sent_count: {
      type: Number,
      default: 0
    },
    is_email_verified: {
      type: Boolean,
      default: false,
      required: true
    },
    social_id: {
      type: String,
      default: null
    },
    dob: {
      type: String,
      default: null
    },
    country: {
      type: String,
      default: null
    },
    gender: [
      {
        type: Number,
        enum: [
          GENDER.NOT_PREFERRED,
          GENDER.MALE,
          GENDER.FEMALE,
          GENDER.NON_BINARY,
          GENDER.INTERSEX,
          GENDER.TRANSGENDER
        ],
        default: GENDER.NOT_PREFERRED
      }
    ],
    last_login: {
      type: Date,
      default: null
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    deletedAt: {
      type: Date,
      default: null
    },
    job_role: {
      type: String,
      default: null
    },
    on_board_step: {
      type: Number,
      enum: Object.values(ON_BOARD_STEPS).concat([null]),
      default: ON_BOARD_STEPS.SELECT_FOCUS
    },
    is_under_trial: {
      type: Boolean,
      default: false
    },
    trial_starts_from: {
      type: Date,
      default: null
    },
    trial_ends_at: {
      type: Date,
      default: null
    },
    country_code: {
      type: String,
      default: null
    },
    mobile: {
      type: String,
      default: null
    },
    user_added_by: {
      type: String,
      default: null
    },
    ethnicity: {
      type: String,
      default: null
    },
    commission: {
      type: Number,
      default: null
    },
    klaviyo_id: {
      type: String,
      default: null
    },
    report_sent: {
      type: Date,
      default: null
    },
    is_audio_feedback_disabled: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

usersSchema.index({ user_type: 1, status: 1, social_id: 1, deletedAt: 1, email: 1 });

usersSchema.virtual('module_access', {
  ref: 'module_access',
  localField: '_id',
  foreignField: 'user_id',
  justOne: true
});

usersSchema.virtual('deviceToken', {
  ref: 'Device_tokens',
  localField: '_id',
  foreignField: 'user_id'
});

usersSchema.set('toObject', { virtuals: true });
usersSchema.set('toJSON', { virtuals: true });

const Users = Mongoose.model('Users', usersSchema);
module.exports = Users;
