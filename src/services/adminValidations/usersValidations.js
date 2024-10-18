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
const { id } = require('@services/adminValidations/adminValidations');
const { USER_TYPE } = require('../Constant');

module.exports = {
  usersListValidation: (req, res, callback) => {
    const schema = Joi.object({
      page: Joi.number().optional().allow('', null),
      perPage: Joi.number().optional().allow('', null),
      role: Joi.string().optional().allow('', null),
      jobRole: Joi.string().optional().allow('', null),
      searchKey: Joi.string()
        .optional()
        .allow(null, '')
        .regex(/^[^*$\\]+$/),
      accountType: Joi.number()
        .optional()
        .valid(...Object.values(ACCOUNT_TYPE).map((x) => x)),
      accountStatus: Joi.number().optional().valid(ACCOUNT_STATUS.ACTIVE, ACCOUNT_STATUS.INACTIVE),
      sortBy: Joi.string().optional().allow(null, ''),
      sortOrder: Joi.number().valid(1, -1).optional().allow(null, ''),
      id: id.optional().allow(null, ''),
      company: Joi.string().optional().allow(null, ''),
      loginPlatform: Joi.number().optional(),
      addedBy: Joi.string().optional().allow(null, '')
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('usersListValidation', error))
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
  },
  userMoodReportValidation: (req, res, callback) => {
    const schema = Joi.object({
      userId: id,
      reportType: Joi.number()
        .valid(REPORT_TYPE.DAILY, REPORT_TYPE.WEEKLY, REPORT_TYPE.MONTHLY, REPORT_TYPE.YEARLY)
        .required()
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('userMoodReportValidation', error))
      );
    }
    return callback(true);
  },
  overallMoodReportValidation: (req, res, callback) => {
    const schema = Joi.object({
      reportType: Joi.number()
        .valid(REPORT_TYPE.DAILY, REPORT_TYPE.WEEKLY, REPORT_TYPE.MONTHLY, REPORT_TYPE.YEARLY)
        .required()
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('userMoodReportValidation', error))
      );
    }
    return callback(true);
  },
  userPerformanceDataValidation: (req, res, callback) => {
    const schema = Joi.object({
      userId: id,
      contentType: Joi.number()
        .valid(...Object.values(PERFORMANCE_CONTENT_TYPE).map((x) => x))
        .required(),
      page: Joi.number().optional(),
      perPage: Joi.number().optional()
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('userPerformanceDataValidation', error))
      );
    }
    return callback(true);
  },
  userBadgeCountValidation: (req, res, callback) => {
    const schema = Joi.object({
      userId: id
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('userBadgeCountValidation', error))
      );
    }
    return callback(true);
  },
  userBadgeDetailsValidation: (req, res, callback) => {
    const schema = Joi.object({
      userId: id,
      badgeType: Joi.number()
        .required()
        .valid(...Object.values(BADGE_TYPE).map((x) => x))
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('userBadgeDetailsValidation', error))
      );
    }
    return callback(true);
  }
};
