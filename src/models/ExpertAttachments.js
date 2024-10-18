'use strict';

const Mongoose = require('mongoose');
const { ATTACHMENT_TYPES } = require('../services/Constant');

const expertAttachmentSchema = new Mongoose.Schema(
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
            enum:[ATTACHMENT_TYPES.CV, ATTACHMENT_TYPES.INSURANCE, ATTACHMENT_TYPES.CERTIFICATION,ATTACHMENT_TYPES.DBS,ATTACHMENT_TYPES.ID],
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

expertAttachmentSchema.index({ deletedAt: 1 });

const ExpertAttachment = Mongoose.model('expert_attachment', expertAttachmentSchema);
module.exports = ExpertAttachment;
