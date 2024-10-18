'use strict';

const Mongoose = require('mongoose');

const breathworkInterestSchema = new Mongoose.Schema(
    {
        user_id: {
            type: Mongoose.SchemaTypes.ObjectId,
            ref: 'Users',
            required: true
        },
        goals_interest: [
            {
                type: String,
                default: null
            }
        ],
        breathwork_exp: {
            type: String,
            default: null
        },
        max_hold: {
            type: String,
            default: 0
        },
        max_exhale: {
            type: String,
            default: 0
        },
        max_breathwork_streak: {
            type: Number,
            default: 0
        },
        breathwork_streak: {
            type: Number,
            default: 0
        },
        streak_updated_at: {
            type: Date,
            default: null
        },
        sessions: {
            type: Number,
            default: 0
        },
        sessions_durations: {
            type: Number,
            default: 0
        },
        basic_status:{
            type:Boolean,
            default:false
        },
        basic_list:[
            {
              type: Mongoose.SchemaTypes.ObjectId,
              ref: 'breathworks',
              default: null
            }
          ],
    },
    {
        timestamps: true
    }
);

breathworkInterestSchema.index({ user_id: 1 });

const BreathworkInterest = Mongoose.model('breathwork_interest', breathworkInterestSchema);
module.exports = BreathworkInterest;
