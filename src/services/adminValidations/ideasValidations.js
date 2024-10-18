'use strict';

const Joi = require('joi');
const { validationMessageKey } = require('@services/Helper');
const { validationErrorResponseData } = require('@services/Response');
const { STATUS, CONTENT_STATUS } = require('@services/Constant');
const { id } = require('@services/adminValidations/adminValidations');

module.exports = {
  addEditIdeasValidation: (req, res, callback) => {
    const schema = Joi.object({
      ideaId: Joi.string().max(50).optional().trim(),
      ideaName: Joi.string().required().trim().max(100),
      isDraft: Joi.boolean().optional(),
      ideaStatus: Joi.number().required().valid(STATUS.INACTIVE, STATUS.ACTIVE),
      approvalStatus: Joi.number()
        .strict()
        .when('ideaId', {
          is: Joi.equal(null, ''),
          then: Joi.optional().valid(null, ''),
          otherwise: Joi.required().valid(...Object.values(CONTENT_STATUS).map((x) => x))
        })
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('addEditIdeaValidation', error))
      );
    }
    return callback(true);
  },
  deleteIdeasValidation: (req, res, callback) => {
    const schema = Joi.object({
      ideaId: id
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('deleteIdeasValidation', error))
      );
    }
    return callback(true);
  },
  ideasDetailedListValidation: (req, res, callback) => {
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
      ideaStatus: Joi.number().optional().valid(STATUS.INACTIVE, STATUS.ACTIVE).allow(null, ''),
      id: id.optional().allow(null, '')
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('ideasDetailedListValidation', error))
      );
    }
    return callback(true);
  },
  getIdeaValidation: (req, res, callback) => {
    const schema = Joi.object({
      id
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('getIdeasValidation', error))
      );
    }
    return callback(true);
  },
  addEditDraftIdeasValidation: (req, res, callback) => {
    const schema = Joi.object({
      ideaId: id.allow(null, ''),
      ideaName: Joi.string().optional().trim().max(100),
      isDraft: Joi.boolean().optional(),
      ideaStatus: Joi.number().optional(),
      approvalStatus: Joi.number().optional()
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('addEditDraftIdeasValidation', error))
      );
    }
    return callback(true);
  },
  ideasDraftDetailedListValidation: (req, res, callback) => {
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
        res.__(validationMessageKey('ideasDraftDetailedListValidation', error))
      );
    }
    return callback(true);
  }
};
