const Mongoose = require('mongoose');
const { STATUS } = require('../services/Constant');

const appSurveyCategorySchema = new Mongoose.Schema(
  {
    category_name: {
      type: String,
      default: null,
      required: true
    },
    company_id: {
        type: Mongoose.SchemaTypes.ObjectId,
        default: null,
        ref: 'Company'
    },
    status: {
      type: Number,
      enum: [STATUS.ACTIVE,STATUS.INACTIVE,STATUS.DELETED],
      default: STATUS.ACTIVE
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

const AppSurveyCategory = Mongoose.model('app_survey_category', appSurveyCategorySchema);
module.exports = AppSurveyCategory;
