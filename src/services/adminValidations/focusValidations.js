'use strict';

const Joi = require('joi');
const { validationMessageKey } = require('@services/Helper');
const { validationErrorResponseData } = require('@services/Response');
const { FOCUS_TYPE, STATUS, CONTENT_STATUS } = require('@services/Constant');
const { id } = require('@services/adminValidations/adminValidations');

module.exports = {
  addEditFocusValidation: (req, res, callback) => {
    const schema = Joi.object({
      focusId: id.optional().allow(null, ''),
      focusName: Joi.string().required().trim().max(100),
      focusType: Joi.number().required().strict().valid(FOCUS_TYPE.MAIN, FOCUS_TYPE.AFFIRMATION),
      focusStatus: Joi.number().strict().required().valid(STATUS.ACTIVE, STATUS.INACTIVE),
      isDraft: Joi.boolean().optional(),
      approvalStatus: Joi.number()
        .strict()
        .when('focusId', {
          is: Joi.equal(null, ''),
          then: Joi.optional().valid(null, ''),
          otherwise: Joi.required().valid(...Object.values(CONTENT_STATUS).map((x) => x))
        })
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('addEditFocusValidation', error))
      );
    }
    return callback(true);
  },
  focusListValidation: (req, res, callback) => {
    const schema = Joi.object({
      searchKey: Joi.string()
        .optional()
        .allow(null, '')
        .regex(/^[^*$\\]+$/),
      page: Joi.number().optional().allow('', null),
      perPage: Joi.number().optional().allow('', null),
      focusType: Joi.number()
        .optional()
        .allow(null, '')
        .valid(FOCUS_TYPE.MAIN, FOCUS_TYPE.AFFIRMATION),
      createdBy: id.optional().allow(null, ''),
      approvedBy: id.optional().allow(null, ''),
      startDate: Joi.date().iso().optional().allow(null, ''),
      endDate: Joi.date()
        .iso()
        .when('startDate', { is: Joi.exist(), then: Joi.required() })
        .allow(null, ''),
      sortBy: Joi.string().optional().allow(null, ''),
      sortOrder: Joi.number().valid(1, -1).optional().allow(null, ''),
      focusStatus: Joi.number().optional().valid(STATUS.ACTIVE, STATUS.INACTIVE).allow(null, ''),
      approvalStatus: Joi.number()
        .optional()
        .valid(...Object.values(CONTENT_STATUS).map((x) => x)),
      id: id.optional().allow(null, '')
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('focusListValidation', error))
      );
    }
    return callback(true);
  },
  deleteFocusValidation: (req, res, callback) => {
    const schema = Joi.object({
      focusId: id
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('deleteFocusValidation', error))
      );
    }
    return callback(true);
  },
  focusNameListValidation: (req, res, callback) => {
    const schema = Joi.object({
      focusType: Joi.number().required().valid(FOCUS_TYPE.MAIN, FOCUS_TYPE.AFFIRMATION)
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('focusNameListValidation', error))
      );
    }
    return callback(true);
  },
  getFocusValidation: (req, res, callback) => {
    const schema = Joi.object({
      id
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('getFocusValidation', error))
      );
    }
    return callback(true);
  },
  addEditDraftFocusValidation: (req, res, callback) => {
    const schema = Joi.object({
      focusId: id.optional().allow(null, ''),
      focusName: Joi.string().optional().trim().max(100),
      focusType: Joi.number().optional().strict().valid(FOCUS_TYPE.MAIN, FOCUS_TYPE.AFFIRMATION),
      focusStatus: Joi.number().strict().optional().valid(STATUS.ACTIVE, STATUS.INACTIVE),
      isDraft: Joi.boolean().optional(),
      approvalStatus: Joi.number()
        .strict()
        .when('focusId', {
          is: Joi.equal(null, ''),
          then: Joi.optional().valid(null, ''),
          otherwise: Joi.optional().valid(...Object.values(CONTENT_STATUS).map((x) => x))
        })
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('addEditDraftFocusValidation', error))
      );
    }
    return callback(true);
  },
  draftFocusListValidation: (req, res, callback) => {
    const schema = Joi.object({
      searchKey: Joi.string()
        .optional()
        .allow(null, '')
        .regex(/^[^*$\\]+$/),
      page: Joi.number().optional().allow('', null),
      perPage: Joi.number().optional().allow('', null),
      focusType: Joi.number()
        .optional()
        .allow(null, '')
        .valid(FOCUS_TYPE.MAIN, FOCUS_TYPE.AFFIRMATION),
      createdBy: id.optional().allow(null, ''),
      approvedBy: id.optional().allow(null, ''),
      startDate: Joi.date().iso().optional().allow(null, ''),
      endDate: Joi.date()
        .iso()
        .when('startDate', { is: Joi.exist(), then: Joi.required() })
        .allow(null, ''),
      sortBy: Joi.string().optional().allow(null, ''),
      sortOrder: Joi.number().valid(1, -1).optional().allow(null, ''),
      focusStatus: Joi.number().optional().valid(STATUS.ACTIVE, STATUS.INACTIVE).allow(null, ''),
      approvalStatus: Joi.number()
        .optional()
        .valid(...Object.values(CONTENT_STATUS).map((x) => x)),
      id: id.optional().allow(null, '')
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('draftFocusListValidation', error))
      );
    }
    return callback(true);
  }
};
