'use strict';

const Joi = require('joi');
const { validationMessageKey } = require('@services/Helper');
const { validationErrorResponseData } = require('@services/Response');
const { CONTENT_TYPE } = require('../Constant');

module.exports = {
  userFeedsListValidation: (req, res, callback) => {
    const schema = Joi.object({
      searchKey: Joi.string()
        .optional()
        .allow(null, '')
        .regex(/^[^*$\\]+$/),
      page: Joi.number().optional().allow('', null),
      perPage: Joi.number().optional().allow(null, ''),
      contentType: Joi.number().required().valid(CONTENT_TYPE.MEDITATION,CONTENT_TYPE.SOUND,CONTENT_TYPE.SHOORAH_PODS,CONTENT_TYPE.BREATHWORK),
      sortByFeedbackType: Joi.string().optional().allow(null, ''),
      sortOrderFeedback: Joi.number().valid(1, -1).optional().allow(null, ''),
      sortBy: Joi.string().optional().allow(null, ''),
      sortOrder: Joi.number().valid(1, -1).optional().allow(null, ''),
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('userFeedsListValidation', error))
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
