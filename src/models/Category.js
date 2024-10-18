const Mongoose = require('mongoose');

const categorySchema = new Mongoose.Schema(
  {
    name: {
      type: String,
      default: null,
      required: true
    },
    status: {
      type: Number,
      enum: [1, 0],
      default: 1,
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

const category = Mongoose.model('SurveyCategory', categorySchema);
module.exports = category;
