'use strict';

const Mongoose = require('mongoose');

const userLegalSchema = new Mongoose.Schema(
    {
        user_id: {
            type: Mongoose.SchemaTypes.ObjectId,
            ref: 'Users',
            required: true
        },
        legals: {
            type: String,
            set: (v) => JSON.stringify(v),
            get: (v) => JSON.parse(v),
            required: true,
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

userLegalSchema.index({ user_id: 1 });

const UserLegals = Mongoose.model('user_legals', userLegalSchema);
module.exports = UserLegals;
