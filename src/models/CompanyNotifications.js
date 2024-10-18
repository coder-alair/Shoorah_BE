'use strict';

const Mongoose = require('mongoose');
const { SENT_TO_USER_TYPE, NOTIFICATION_TYPE, CONTENT_TYPE } = require('@services/Constant');

const companyNotificationSchema = new Mongoose.Schema(
  {
    title: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    sent_to_user_type: {
      type: Number,
      enum: Object.values(SENT_TO_USER_TYPE),
      default: SENT_TO_USER_TYPE.ALL,
      required: true
    },
    from_user_id: {
      type: Mongoose.SchemaTypes.ObjectId,
      required: true
    },
    to_user_ids: [
      {
        type: Mongoose.SchemaTypes.ObjectId,
        ref: 'Users',
        default: null
      }
    ],
    type: {
      type: Number,
      enum: Object.values(NOTIFICATION_TYPE),
      default: NOTIFICATION_TYPE.CONTENT_APPROVAL_STATUS,
      required: true
    },
    is_read_by: [
      {
        type: Mongoose.SchemaTypes.ObjectId,
        ref: 'Users',
        default: null
      }
    ],
    deleted_by: [
      {
        type: Mongoose.SchemaTypes.ObjectId,
        ref: 'Users',
        default: null
      }
    ],
    deletedAt: {
      type: Date,
      default: null
    },
    content_id: {
      type: String
    },
    content_type: {
      type: Number,
      enum: Object.values(CONTENT_TYPE)
    },
    sent_on_date: {
      type: Date,
      default: null
    },
    cron_sent: {
      type: Boolean,
      default: false
    },
    department: {
      type: String,
      default: null
    },
    company_id: {
      type: Mongoose.SchemaTypes.ObjectId,
      default: null,
      ref: 'Company'
    }
  },
  {
    timestamps: true
  }
);

companyNotificationSchema.virtual('fromUser', {
  ref: 'Users',
  localField: 'from_user_id',
  foreignField: '_id',
  justOne: true
});

companyNotificationSchema.index({ sent_to_user_type: 1 });
companyNotificationSchema.index({ from_user_id: 1 });
companyNotificationSchema.index({ to_user_ids: 1 });
companyNotificationSchema.index({ company_id: 1 });

companyNotificationSchema.index({ type: 1 });
companyNotificationSchema.index({ sent_on_date: 1 });
companyNotificationSchema.index({ deletedAt: 1 });

companyNotificationSchema.set('toObject', { virtuals: true });
companyNotificationSchema.set('toJSON', { virtuals: true });

const CompanyNotification = Mongoose.model('Company_notification', companyNotificationSchema);
module.exports = CompanyNotification;
