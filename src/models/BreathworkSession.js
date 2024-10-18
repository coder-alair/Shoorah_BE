'use strict';

const Mongoose = require('mongoose');

const breathworkSessionSchema = new Mongoose.Schema(
    {
        user_id: {
            type: Mongoose.SchemaTypes.ObjectId,
            ref: 'Users',
            required: true
        },
        breathwork_id: {
            type: Mongoose.SchemaTypes.ObjectId,
            ref: 'Breathwork',
            required: true
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

const BreathworkSession = Mongoose.model('breathwork_session', breathworkSessionSchema);
module.exports = BreathworkSession;
