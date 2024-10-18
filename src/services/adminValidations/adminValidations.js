'use strict';

const Joi = require('joi');
const { validationMessageKey } = require('@services/Helper');
const { validationErrorResponseData } = require('@services/Response');
const {
  USER_TYPE,
  ACCOUNT_STATUS,
  IMAGE_MIMETYPE,
  DISPOSABLE_EMAIL_DOMAINS,
  NODE_ENVIRONMENT
} = require('@services/Constant');
const email = Joi.string()
  .max(50)
  .required()
  .email()
  .trim()
  .pattern(/^[^+]+$/)
  .custom((value, helper) => {
    if (
      DISPOSABLE_EMAIL_DOMAINS.includes(value.split('@')[1]) &&
      process.env.NODE_ENV === NODE_ENVIRONMENT.PRODUCTION
    ) {
      return validationErrorResponseData(
        helper,
        helper.__(validationMessageKey('addEditAdminValidation', helper))
      );
    } else {
      return true;
    }
  });
const id = Joi.string()
  .required()
  .regex(/^[0-9a-fA-F]{24}$/);

module.exports = {
  email,
  id,
  addEditAdminValidation: (req, res, callback) => {
    const schema = Joi.object({
      userId: id.allow(null, ''),
      name: Joi.string().max(50).required().trim(),
      email,
      userType: Joi.number().required().valid(USER_TYPE.SUPER_ADMIN, USER_TYPE.SUB_ADMIN),
      accountStatus: Joi.number().required().valid(ACCOUNT_STATUS.ACTIVE, ACCOUNT_STATUS.INACTIVE),
      moduleAccess: Joi.object().keys({
        earning_module_access: Joi.boolean().required()
      }),
      profile: Joi.string()
        .optional()
        .allow(null, '')
        .valid(...IMAGE_MIMETYPE.map((x) => x))
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('addEditAdminValidation', error))
      );
    }
    return callback(true);
  },
  adminsListValidation: (req, res, callback) => {
    const schema = Joi.object({
      searchKey: Joi.string()
        .optional()
        .allow(null, '')
        .regex(/^[^*$\\]+$/),
      page: Joi.number().optional().allow('', null),
      perPage: Joi.number().optional().allow(null, ''),
      userType: Joi.number().optional().valid(USER_TYPE.SUPER_ADMIN, USER_TYPE.SUB_ADMIN),
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
  deleteAdminValidation: (req, res, callback) => {
    const schema = Joi.object({
      userId: id
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('deleteAdminValidation', error))
      );
    }
    return callback(true);
  },
  adminNameListValidation: (req, res, callback) => {
    const schema = Joi.object({
      searchKey: Joi.string()
        .optional()
        .allow(null, '')
        .regex(/^[^*$\\]+$/)
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('adminNameListValidation', error))
      );
    }
    return callback(true);
  }
};
