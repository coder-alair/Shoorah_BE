'use strcit';

const Mongoose = require('mongoose');

const cleanseSchema = new Mongoose.Schema(
  {
    user_id: {
      type: Mongoose.SchemaTypes.ObjectId,
      ref: 'Users',
      required: true
    },
    title: {
      type: String,
      required: true
    },
    description: {
      type: String
    },
    image_url: {
      type: String,
      default: null
    },
    is_saved: {
      type: Boolean,
      required: true,
      default: false
    },
    positivity: {
      type: Boolean,
      default: false
    },
    sentiments: {
      type: Object,
      default: null
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

cleanseSchema.index({ deletedAt: 1 });

const Cleanse = Mongoose.model('Cleanse', cleanseSchema);
module.exports = Cleanse;
