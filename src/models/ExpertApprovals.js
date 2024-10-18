'use strict';

const Mongoose = require('mongoose');
const { ATTACHMENT_TYPES, DBS_VERIFICATION_STATUS } = require('../services/Constant');

const expertApprovalSchema = new Mongoose.Schema(
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
        file_name: {
            type: String,
            default: null
        },
        file_title: {
            type: String,
            default: null
        },
        doc_type: {
            type: String,
            enum: [ATTACHMENT_TYPES.DBS, ATTACHMENT_TYPES.ID],
            default: null
        },
        verification_status: {
            type: String,
            enum: [DBS_VERIFICATION_STATUS.PENDING,DBS_VERIFICATION_STATUS.APPROVE,DBS_VERIFICATION_STATUS.REJECT],
            default: DBS_VERIFICATION_STATUS.PENDING,
        },
        approved_by: {
            type: Mongoose.SchemaTypes.ObjectId,
            ref: 'Users',
            default: null
        },
        approved_on: {
            type: Date,
            default: null
        },
        sent_for_verification: {
            type: Boolean,
            default: true
        },
        dbs_verified: {
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

expertApprovalSchema.index({ deletedAt: 1 });
expertApprovalSchema.index({ user_id: 1 });


const ExpertApproval = Mongoose.model('expert_approvals', expertApprovalSchema);
module.exports = ExpertApproval;
