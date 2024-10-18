'use strict';

const Joi = require('joi');
const { validationMessageKey } = require('@services/Helper');
const { validationErrorResponseData } = require('@services/Response');
const { CONTENT_STATUS, CONTENT_TYPE } = require('@services/Constant');
const contentStatusArray = Object.values(CONTENT_STATUS);
const { id } = require('@services/adminValidations/adminValidations');

module.exports = {
  contentApprovalListValidation: (req, res, callback) => {
    const schema = Joi.object({
      page: Joi.number().optional().allow('', null),
      perPage: Joi.number().optional().allow('', null),
      searchKey: Joi.string()
        .optional()
        .allow(null, '')
        .regex(/^[^*$\\]+$/),
      id: id.optional().allow(null, ''),
      companyId: id.optional().allow(null, ''),
      sortBy: Joi.string().optional().allow(null, ''),
      sortOrder: Joi.number().valid(1, -1).optional().allow(null, ''),
      contentStatus: Joi.number()
        .optional()
        .valid(...contentStatusArray.map((x) => x))
        .allow(null, ''),
      contentType: Joi.number()
        .optional()
        .valid(...Object.values(CONTENT_TYPE).map((x) => x))
        .allow(null, ''),
      createdBy: id.optional().allow(null, ''),
      updatedBy: id.optional().allow(null, '')
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('contentApprovalListValidation', error))
      );
    }
    return callback(true);
  },
  contentApprovalValidation: (req, res, callback) => {
    const schema = Joi.object({
      id,
      contentStatus: Joi.number()
        .required()
        .valid(CONTENT_STATUS.DRAFT, CONTENT_STATUS.APPROVED, CONTENT_STATUS.REJECTED),
      comment: Joi.string().optional().allow(null, '').trim()
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('contentApprovalValidation', error))
      );
    }
    return callback(true);
  },
  getContentDetailsValidation: (req, res, callback) => {
    const schema = Joi.object({
      contentId: id,
      contentType: Joi.number()
        .required()
        .valid(...Object.values(CONTENT_TYPE).map((x) => x))
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('getContentDetailsValidation', error))
      );
    }
    return callback(true);
  }
};
