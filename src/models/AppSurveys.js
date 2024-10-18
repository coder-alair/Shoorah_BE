const Mongoose = require('mongoose');
const { SURVEY_STATUS, SURVEY_TYPE, SURVEY_TARGET, SURVEY_SCOPE } = require('@services/Constant');

const appSurveySchema = new Mongoose.Schema(
  {
    company_id: {
      type: Mongoose.SchemaTypes.ObjectId,
      default: null,
      ref: 'Company'
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
    duration: {
      type: String,
      default: null
    },
    title: {
      type: String,
      required: true
    },
    category: {
      type: Mongoose.SchemaTypes.ObjectId,
      default: null,
      ref: 'app_survey_category'
    },
    logo: {
      type: String,
      default: null
    },
    image: {
      type: String,
      default: null
    },
    questions: [
      {
        type: Mongoose.SchemaTypes.ObjectId,
        ref: 'survey_question'
      }
    ],
    survey_type: { type: Number, enum: Object.values(SURVEY_TYPE), default: SURVEY_TYPE.DRAFT },
    //Survey status
    status: {
      type: Number,
      enum: Object.values(SURVEY_STATUS),
      default: SURVEY_STATUS.INACTIVE
    },
    //Whom to send the survey
    scope: {
      type: Number,
      enum: Object.values(SURVEY_SCOPE),
      default: SURVEY_SCOPE.ALL
    },
    notify_time: {
      type: String,
      required: false
    },
    target: {
      type: [Number],
      enum: Object.values(SURVEY_TARGET),
      default: [SURVEY_TARGET.APP]
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

appSurveySchema.virtual('contentApproval', {
  ref: 'Content_approval',
  localField: '_id',
  foreignField: 'content_type_id',
  justOne: true
});

appSurveySchema.set('toObject', { virtuals: true });
appSurveySchema.set('toJSON', { virtuals: true });

const AppSurveys = Mongoose.model('App_Survey', appSurveySchema);
module.exports = AppSurveys;
