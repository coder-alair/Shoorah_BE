const Mongoose = require('mongoose');

const surveySchema = new Mongoose.Schema(
  {
    user_id: {
      type: Mongoose.SchemaTypes.ObjectId,
      // type: String,
      ref: 'Users',
      required: false
    },
    created_by: {
      type: String,
      required: false
    },
    approved_by: {
      type: String,
      required: false
    },
    approved_status: {
      type: String,
      enum: ['Approved', 'Pending'],
      default: 'Pending'
    },
    approved_on: {
      type: String,
      default: null
    },
    survey_time: {
      type: String,
      default: null
    },
    survey_time_type: {
      type: String,
      default: null
    },
    survey_title: {
      type: String,
      default: null,
      required: true
    },
    survey_category: {
      type: String,
      ref: 'Category',
      required: false
    },
    // survey_category: {
    //     type: Mongoose.SchemaTypes.ObjectId,
    //     ref: 'Category',
    //     required: true
    // },
    logo: {
      type: String,
      default: null,
      required: false
    },
    image: {
      type: String,
      default: null,
      required: false
    },
    question_details: [
      {
        question: {
          type: String,
          required: true,
          default: null
        },
        question_type: {
          type: String,
          enum: ['mcq'],
          required: false,
          default: 'mcq'
        },
        que_options: [
          {
            options: {
              type: String,
              required: false
            },
            options_status: {
              type: Number,
              enum: [1, 0],
              default: 0,
              required: false
            }
          }
        ],
        other_as_option: {
          type: Number,
          enum: [1, 0],
          default: 0,
          required: false
        },
        nonOfTheAbove_as_option: {
          type: Number,
          enum: [1, 0],
          default: 0,
          required: false
        },
        skip: {
          type: Number,
          enum: [1, 0],
          default: 0,
          required: false
        }
      }
    ],

    draft: {
      type: Number,
      enum: [1, 0],
      default: 0,
      required: false
    },
    template: {
      type: Number,
      enum: [1, 0],
      default: 0,
      required: false
    },
    template_category: {
      type: String,
      default: '',
      required: false
    },
    bulk_answer: {
      type: Number,
      enum: [1, 0],
      default: 0,
      required: false
    },
    // audiance:[{
    all_staff: {
      type: Number,
      enum: [1, 0],
      default: 1,
      required: false
    },
    departments: [
      {
        name: {
          type: String,
          required: false
        }
      }
    ],

    // }],
    // set_time_area:[{
    time: {
      type: String,
      required: false
    },
    area: [
      {
        name: {
          type: String,
          required: false
        }
      }
    ],

    // }],
    status: {
      type: Number,
      enum: [1, 0],
      default: 1,
      required: false
    },
    is_notify: {
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

const survey = Mongoose.model('Survey', surveySchema);
module.exports = survey;
