'use strict';

const Mongoose = require('mongoose');

const companySubsSchema = new Mongoose.Schema(
    {
        company_id: {
            type: Mongoose.SchemaTypes.ObjectId,
            required: true
        },
        original_transaction_id: {
            type: String,
            required: false
        },
        product_id: {
            type: String,
            required: false
        },
        price_id: {
            type: String,
            required: false
        },
        expires_date: {
            type: Date,
            default: null
        },
        is_under_trial: {
            type: Boolean,
            default: false
        },
        trial_ends_at: {
            type: Date,
            default: null,
        },
        auto_renew: {
            type: Boolean,
            default: true
        },
        subscription: {
            type: Boolean,
            default: false
        },
        first_purchase: {
            type: Boolean,
            default: false
        },
        two_day_trial_mail_sent: {
            type: Boolean,
            default: false
        },
        one_day_trial_mail_sent: {
            type: Boolean,
            default: false
        },
        one_week_trial_mail_sent: {
            type: Boolean,
            default: false
        },
        trial_end_mail_sent: {
            type: Boolean,
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

companySubsSchema.index({ company_id: 1 });
companySubsSchema.index({ original_transaction_id: 1 });
companySubsSchema.index({ deletedAt: 1 });

const CompanySubscriptions = Mongoose.model('company_subscription', companySubsSchema);
module.exports = CompanySubscriptions;
