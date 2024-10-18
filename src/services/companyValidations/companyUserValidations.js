'use strict';

const Joi = require('joi');
const { validationMessageKey } = require('@services/Helper');
const { validationErrorResponseData } = require('@services/Response');
const {
  ACCOUNT_STATUS,
  ACCOUNT_TYPE,
  REPORT_TYPE,
  CONTENT_TYPE,
  PERFORMANCE_CONTENT_TYPE,
  BADGE_TYPE
} = require('@services/Constant');

module.exports = {
  companyUsersListValidation: (req, res, callback) => {
    const schema = Joi.object({
      page: Joi.number().optional().allow('', null),
      perPage: Joi.number().optional().allow('', null),
      searchKey: Joi.string()
        .optional()
        .allow(null, '')
        .regex(/^[^*$\\]+$/),
      sortBy: Joi.string().optional().allow(null, ''),
      sortOrder: Joi.number().valid(1, -1).optional().allow(null, ''),
      company: Joi.string().optional().allow(null, '')
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('companyUsersListValidation', error))
      );
    }
    return callback(true);
  },
  editUserValidation: (req, res, callback) => {
    const schema = Joi.object({
      userId: id,
      accountStatus: Joi.number().required().valid(ACCOUNT_STATUS.ACTIVE, ACCOUNT_STATUS.INACTIVE)
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('editUserValidation', error))
      );
    }
    return callback(true);
  },
  getUserDetailValidation: (req, res, callback) => {
    const schema = Joi.object({
      userId: id
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('getUserDetailValidation', error))
      );
    }
    return callback(true);
  },
  myDraftContentValidation: (req, res, callback) => {
    const schema = Joi.object({
      page: Joi.number().optional(),
      perPage: Joi.number().optional(),
      searchKey: Joi.string()
        .optional()
        .allow(null, '')
        .regex(/^[^*$\\]+$/),
      sortBy: Joi.string().optional().allow(null, ''),
      sortOrder: Joi.number().valid(1, -1).optional().allow(null, ''),
      contentType: Joi.number()
        .optional()
        .valid(...Object.values(CONTENT_TYPE).map((x) => x))
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('myDraftContentValidation', error))
      );
    }
    return callback(true);
  },
  bulkUserStatusUpdateValidation: (req, res, callback) => {
    const schema = Joi.object({
      userIds: Joi.array()
        .items(Joi.string().regex(/^[0-9a-fA-F]{24}$/))
        .unique()
        .required(),
      userStatus: Joi.number()
        .strict()
        .valid(ACCOUNT_STATUS.ACTIVE, ACCOUNT_STATUS.INACTIVE, ACCOUNT_STATUS.DELETED)
        .required()
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('bulkUserStatusUpdateValidation', error))
      );
    }
    return callback(true);
  }
};
