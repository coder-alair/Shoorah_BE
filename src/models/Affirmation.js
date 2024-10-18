'use strcit';

const Mongoose = require('mongoose');
const { AFFIRMATION_TYPE, STATUS } = require('@services/Constant');

const affirmationSchema = new Mongoose.Schema(
  {
    display_name: {
      type: String
    },
    description: {
      type: String,
      default: null
    },
    affirmation_type: {
      type: Number,
      enum: [AFFIRMATION_TYPE.CSV, AFFIRMATION_TYPE.MANUAL]
    },
    status: {
      type: Number,
      enum: [STATUS.INACTIVE, STATUS.ACTIVE, STATUS.DELETED],
      default: STATUS.ACTIVE
    },
    focus_ids: [
      {
        type: Mongoose.SchemaTypes.ObjectId,
        ref: 'Focus'
      }
    ],
    created_by: {
      type: Mongoose.SchemaTypes.ObjectId,
      ref: 'Users'
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
    deletedAt: {
      type: Date,
      default: null
    },
    parentId: {
      type: Mongoose.SchemaTypes.ObjectId,
      default: null
    },
    affirmation_mode: {
      type: String,
      enum : ['child','adult'],
      default: null
    },
    is_draft: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

affirmationSchema.virtual('contentApproval', {
  ref: 'Content_approval',
  localField: '_id',
  foreignField: 'content_type_id',
  justOne: true
});

affirmationSchema.index({ status: 1 });
affirmationSchema.index({ approved_by: 1 });
affirmationSchema.index({ focus_ids: 1 });
affirmationSchema.index({ deletedAt: 1 });

affirmationSchema.set('toObject', { virtuals: true });
affirmationSchema.set('toJSON', { virtuals: true });

const Affirmation = Mongoose.model('Affirmation', affirmationSchema);
module.exports = Affirmation;
