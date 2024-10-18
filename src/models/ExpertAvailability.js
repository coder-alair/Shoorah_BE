'use strict';

const Mongoose = require('mongoose');

const expertAvailabilitySchema = new Mongoose.Schema(
    {
        user_id: {
            type: Mongoose.SchemaTypes.ObjectId,
            ref: 'Users',
            required: true
        },
        expert_id: {
            type: Mongoose.SchemaTypes.ObjectId,
            ref: 'expert',
            required: true
        },
        date: { type: Date, required: true },
        slots: [
            {
                startTime: { type: Date },
                endTime: { type: Date },
            },
        ],
        deletedAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

expertAvailabilitySchema.index({ deletedAt: 1 });

const ExpertAvailability = Mongoose.model('expert_availability', expertAvailabilitySchema);
module.exports = ExpertAvailability;
