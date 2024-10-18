'use strict';

const Mongoose = require('mongoose');

const userEmotionSchema = new Mongoose.Schema(
    {
    user_id: { 
        type: Mongoose.SchemaTypes.ObjectId,
        ref: 'Users',
        required: true
    },
    feedback: { 
      type: String, 
      enum :['happy','sad','overjoyed','neutral','depressed'],
      required: true 
    },
    deleted_at: { 
      type: Date, 
      default: null 
    }
  },
  {
    timestamps: true
  }
); 
  
  const UserEmotion = Mongoose.model('user_emotion', userEmotionSchema);
  
  module.exports = UserEmotion;