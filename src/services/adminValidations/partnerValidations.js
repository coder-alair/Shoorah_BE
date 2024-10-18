'use strict';

const Joi = require('joi');
const { joiPasswordExtendCore } = require('joi-password');
const JoiPassword = Joi.extend(joiPasswordExtendCore);
const { validationMessageKey } = require('@services/Helper');
const { validationErrorResponseData } = require('@services/Response');
const { GENDER, DEVICE_TYPE, ON_BOARD_STEPS } = require('@services/Constant');
const { email } = require('@services/adminValidations/adminValidations');
const { USER_TYPE, ACCOUNT_STATUS } = require('../Constant');

const id = Joi.string()
  .required()
  .regex(/^[0-9a-fA-F]{24}$/);

module.exports = {
  addPartnerValidation: (req, res, callback) => {
    const schema = Joi.object({
      userId: id.allow(null, ''),
      name: Joi.string().max(50).required().trim(),
      jobRole: Joi.string().max(100).optional().allow(null, ''),
      commission: Joi.number().optional(),
      accountStatus: Joi.number().optional().valid(ACCOUNT_STATUS.ACTIVE, ACCOUNT_STATUS.INACTIVE),
      email,
      profile: Joi.string().optional().allow(null, '').trim(),
      mobile: Joi.string().min(5).optional().allow(null, '')
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('addPartnerValidation', error))
      );
    }
    return callback(true);
  },
  partnerListValidation: (req, res, callback) => {
    const schema = Joi.object({
      searchKey: Joi.string()
        .optional()
        .allow(null, '')
        .regex(/^[^*$\\]+$/),
      page: Joi.number().optional().allow('', null),
      perPage: Joi.number().optional().allow(null, ''),
      accountStatus: Joi.number().optional().valid(ACCOUNT_STATUS.ACTIVE, ACCOUNT_STATUS.INACTIVE),
      sortBy: Joi.string().optional().allow(null, ''),
      sortOrder: Joi.number().valid(1, -1).optional().allow(null, ''),
      id: id.optional().allow(null, '')
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('adminsListValidation', error))
      );
    }
    return callback(true);
  },
  deletePartnerValidation: (req, res, callback) => {
    const schema = Joi.object({
      userId: id
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('deletePartnerValidation', error))
      );
    }
    return callback(true);
  },
  updatePaymentInfoValidation: (req, res, callback) => {
    const schema = Joi.object({
      introducedCompanyId: id,
      paymentAmount: Joi.number().required().min(1),
      paymentComment: Joi.string().optional().trim().allow(null, '')
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        validationMessageKey('updatePaymentInfoValidation', error)
      );
    }

    return callback(true);
  }
};
