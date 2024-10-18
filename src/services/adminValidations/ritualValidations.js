'use strict';

const Joi = require('joi');
const { validationMessageKey } = require('@services/Helper');
const { validationErrorResponseData } = require('@services/Response');
const { STATUS, CONTENT_STATUS } = require('@services/Constant');
const { focusIds } = require('@services/adminValidations/affirmationValidations');
const { id } = require('@services/adminValidations/adminValidations');

module.exports = {
  addEditRitualsValidation: (req, res, callback) => {
    const schema = Joi.object({
      ritualId: id.allow(null, ''),
      ritualName: Joi.string().required().trim().max(100),
      focusIds,
      isDraft: Joi.boolean().optional(),
      ritualStatus: Joi.number().required().valid(STATUS.INACTIVE, STATUS.ACTIVE),
      approvalStatus: Joi.number()
        .strict()
        .when('ritualId', {
          is: Joi.equal(null, ''),
          then: Joi.optional().valid(null, ''),
          otherwise: Joi.required().valid(...Object.values(CONTENT_STATUS).map((x) => x))
        })
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('addEditRitualsValidation', error))
      );
    }
    return callback(true);
  },
  ritualsDetailedListValidation: (req, res, callback) => {
    const schema = Joi.object({
      page: Joi.number().optional().allow('', null),
      perPage: Joi.number().optional().allow('', null),
      searchKey: Joi.string()
        .optional()
        .allow(null, '')
        .regex(/^[^*$\\]+$/),
      sortBy: Joi.string().optional().allow(null, ''),
      sortOrder: Joi.number().valid(1, -1).optional().allow(null, ''),
      approvalStatus: Joi.number()
        .optional()
        .valid(...Object.values(CONTENT_STATUS).map((x) => x)),
      createdBy: id.optional().allow(null, ''),
      approvedBy: id.optional().allow(null, ''),
      ritualStatus: Joi.number().optional().valid(STATUS.INACTIVE, STATUS.ACTIVE).allow(null, ''),
      id: id.optional().allow(null, '')
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('ritualsDetailedListValidation', error))
      );
    }
    return callback(true);
  },
  deleteRitualsValidation: (req, res, callback) => {
    const schema = Joi.object({
      ritualId: id
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('deleteRitualsValidation', error))
      );
    }
    return callback(true);
  },
  getRitualValidation: (req, res, callback) => {
    const schema = Joi.object({
      id
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('getRitualValidation', error))
      );
    }
    return callback(true);
  },
  addEditDraftRitualsValidation: (req, res, callback) => {
    const focusIds = Joi.array()
      .items(Joi.string().regex(/^[0-9a-fA-F]{24}$/))
      .unique()
      .optional();

    const schema = Joi.object({
      ritualId: id.allow(null, ''),
      ritualName: Joi.string().optional().trim().max(100),
      focusIds,
      isDraft: Joi.boolean().optional(),
      ritualStatus: Joi.number().optional(),
      approvalStatus: Joi.number().optional()
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('addEditDraftRitualsValidation', error))
      );
    }
    return callback(true);
  },
  ritualsDraftDetailedListValidation: (req, res, callback) => {
    const schema = Joi.object({
      page: Joi.number().optional().allow('', null),
      perPage: Joi.number().optional().allow('', null),
      searchKey: Joi.string()
        .optional()
        .allow(null, '')
        .regex(/^[^*$\\]+$/),
      sortBy: Joi.string().optional().allow(null, ''),
      sortOrder: Joi.number().valid(1, -1).optional().allow(null, ''),
      approvalStatus: Joi.number()
        .optional()
        .valid(...Object.values(CONTENT_STATUS).map((x) => x)),
      createdBy: id.optional().allow(null, ''),
      approvedBy: id.optional().allow(null, ''),
      ritualStatus: Joi.number().optional().valid(STATUS.INACTIVE, STATUS.ACTIVE).allow(null, ''),
      id: id.optional().allow(null, '')
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('ritualsDraftDetailedListValidation', error))
      );
    }
    return callback(true);
  }
};
