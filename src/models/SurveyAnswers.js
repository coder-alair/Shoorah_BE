const Mongoose = require('mongoose');

const surveyAnswerSchema = new Mongoose.Schema(
  {
    user_id: {
      type: Mongoose.SchemaTypes.ObjectId,
      ref: 'Users'
    },
    survey_id: {
      type: Mongoose.SchemaTypes.ObjectId,
      ref: 'App_Survey'
    },
    question_id: {
      type: Mongoose.SchemaTypes.ObjectId,
      ref: 'survey_question'
    },
    option: {
      type: String,
      required: true
    },
    skipped: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

const SurveysAnswers = Mongoose.model('survey_answer', surveyAnswerSchema);
module.exports = SurveysAnswers;
