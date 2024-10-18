'use strict';

const Joi = require('joi');
const { validationMessageKey } = require('@services/Helper');
const { validationErrorResponseData } = require('@services/Response');
const { CONTENT_TYPE, STATUS } = require('@services/Constant');

module.exports = {
  addEditTopPicksValidation: (req, res, callback) => {
    const schema = Joi.object({
      pickId: Joi.string()
        .required()
        .regex(/^[0-9a-fA-F]{24}$/)
        .allow(null, ''),
      contentType: Joi.number()
        .strict()
        .required()
        .valid(...Object.values(CONTENT_TYPE).map((x) => x)),
      contentTypeId: Joi.string()
        .required()
        .regex(/^[0-9a-fA-F]{24}$/),
      position: Joi.number().strict().required()
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('addEditTopPicksValidation', error))
      );
    }
    return callback(true);
  },
  topPicksDetailsValidation: (req, res, callback) => {
    const schema = Joi.object({
      page: Joi.number().optional().allow('', null),
      perPage: Joi.number().optional().allow('', null),
      searchKey: Joi.string()
        .optional()
        .allow(null, '')
        .regex(/^[^*$\\]+$/),
      id: Joi.string()
        .optional()
        .allow(null, '')
        .regex(/^[0-9a-fA-F]{24}$/)
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('topPicksDetailsValidation', error))
      );
    }
    return callback(true);
  },
  deleteTopPicksValidation: (req, res, callback) => {
    const schema = Joi.object({
      pickId: Joi.string()
        .required()
        .regex(/^[0-9a-fA-F]{24}$/)
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('deleteTopPicksValidation', error))
      );
    }
    return callback(true);
  },
  getContentTypeListValidation: (req, res, callback) => {
    const schema = Joi.object({
      contentType: Joi.number()
        .required()
        .valid(...Object.values(CONTENT_TYPE).map((x) => x)),
      page: Joi.number().optional(),
      perPage: Joi.number().optional(),
      searchKey: Joi.string()
        .optional()
        .allow(null, '')
        .regex(/^[^*$\\]+$/)
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('getContentTypeListValidation', error))
      );
    }
    return callback(true);
  },
  bulkUpdateOperationsValidation: (req, res, callback) => {
    const schema = Joi.object({
      contentIds: Joi.array()
        .items(Joi.string().regex(/^[0-9a-fA-F]{24}$/))
        .unique()
        .required(),
      contentType: Joi.number()
        .required()
        .valid(...Object.values(CONTENT_TYPE).map((x) => x)),
      contentStatus: Joi.number()
        .strict()
        .valid(STATUS.ACTIVE, STATUS.INACTIVE, STATUS.DELETED)
        .required()
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('bulkUpdateOperationsValidation', error))
      );
    }
    return callback(true);
  }
};
