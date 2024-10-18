const Mongoose = require('mongoose');

const submitsurveySchema = new Mongoose.Schema(
  {
    user_id: {
      type: Mongoose.SchemaTypes.ObjectId,
      // type: String,
      ref: 'Users',
      required: false
    },
    name: {
      type: String,
      required: false
    },
    email: {
      type: String,
      required: false
    },
    survey_id: {
      type: Mongoose.SchemaTypes.ObjectId,
      // type: String,
      ref: 'Survey',
      required: false
    },
    submitted_details: [
      {
        question: {
          type: String,
          required: true,
          default: null
        },
        question_id: {
          type: String,
          required: false
        },
        options: {
          type: String,
          required: false
        },
        options_id: {
          type: String,
          required: false
        },
        options_status: {
          type: Number,
          enum: [1, 0],
          default: 1,
          required: false
        },

        skip: {
          type: Number,
          enum: [1, 0],
          default: 1,
          required: false
        },
        attempted: {
          type: Number,
          enum: [1, 0],
          default: 1,
          required: false
        }
      }
    ],

    question_attempt: {
      type: Number,
      default: 0,
      required: false
    },
    question_skip: {
      type: Number,
      default: 0,
      required: false
    },
    total_questions: {
      type: Number,
      default: 0,
      required: false
    },
    status: {
      type: Number,
      enum: [1, 0],
      default: 1,
      required: false
    },
    final_submission: {
      type: Number,
      enum: [1, 0],
      default: 0,
      required: false
    },
    deleted_at: {
      type: Number,
      enum: [1, 0],
      default: 0,
      required: false
    }
  },
  {
    timestamps: true
  }
);

const survey = Mongoose.model('SubmitSurvey', submitsurveySchema);
module.exports = survey;
