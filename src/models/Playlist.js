'use strict';

const Mongoose = require('mongoose');

const playlistSchema = new Mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },
    description: {
      type: String
    },
    created_by: {
      type: Mongoose.SchemaTypes.ObjectId,
      ref: 'Users',
      required: true
    },
    total_duration: {
      type: Number,
      default: 0
    },
    audios: [
      {
        index: { type: Number, required: true, default: 0 },
        audioType: {
          type: String,
          required: true,
          enum: ['breathwork', 'meditation', 'shoorah_pod', 'sound']
        },
        audioId: { type: Mongoose.SchemaTypes.ObjectId, required: true }
      }
    ]
  },
  { timestamps: true }
);

playlistSchema.pre('save', async function (next) {
  try {
    if (this.isModified('audios')) {
      let totalDuration = 0;

      for (const audioRef of this.audios) {
        let modelName;
        switch (audioRef.audioType) {
          case 'breathwork': {
            modelName = 'Breathwork';
            break;
          }
          case 'meditation': {
            modelName = 'Meditation';
            break;
          }
          case 'shoorah_pod': {
            modelName = 'Shoorah_pods';
            break;
          }
          case 'sound': {
            modelName = 'Sound';
            break;
          }
        }

        const AudioModel = Mongoose.model(modelName);
        const audio = await AudioModel.findById(audioRef.audioId).exec();
        if (audio && audio.duration) {
          let len = audio.duration.split(':');
          totalDuration += parseInt(len[0]) * 60 + parseInt(len[1]);
        }
      }

      this.total_duration = totalDuration;
    }
    next();
  } catch (err) {
    next(err);
  }
});

playlistSchema.index({ name: 1 });
playlistSchema.index({ created_by: 1 });

const Playlist = Mongoose.model('Playlist', playlistSchema);
module.exports = Playlist;
