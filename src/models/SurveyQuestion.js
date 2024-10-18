const Mongoose = require('mongoose');

const surveyQuestSchema = new Mongoose.Schema(
  {
    survey_id: {
      type: Mongoose.SchemaTypes.ObjectId,
      ref: 'App_Survey'
    },
    title: {
      type: String,
      required: true
    },
    options: [
      {
        type: String,
        required: false
      }
    ],
    skipable: {
      type: Boolean,
      default: false
    },
    // skips: {
    //     type: Number,
    //     default: 0
    // },
    deletedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

const SurveysQuestion = Mongoose.model('survey_question', surveyQuestSchema);
module.exports = SurveysQuestion;
