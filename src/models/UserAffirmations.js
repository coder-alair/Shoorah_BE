'use strcit';

const Mongoose = require('mongoose');

const userAffirmationSchema = new Mongoose.Schema(
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
    positivity: {
      type: Boolean,
      default: false
    },
    sentiments: {
      type: Object,
      default: null
    },
    is_saved: {
      type: Boolean,
      required: true,
      default: false
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

userAffirmationSchema.index({ deletedAt: 1 });

const UserAffirmation = Mongoose.model('User_Affirmation', userAffirmationSchema);
module.exports = UserAffirmation;
