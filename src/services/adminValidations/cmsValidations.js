'use strict';

const Joi = require('joi');
const { validationMessageKey } = require('@services/Helper');
const { validationErrorResponseData } = require('@services/Response');
const { id } = require('@services/adminValidations/adminValidations');

module.exports = {
  addEditCMSValidation: (req, res, callback) => {
    const schema = Joi.object({
      cmsId: id.optional(),
      description: Joi.string().optional().trim(),
      alias: Joi.string().required().trim(),
      title: Joi.string().required().trim()
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('addEditCMSValidation', error))
      );
    }
    return callback(true);
  },
  cmsListValidation: (req, res, callback) => {
    const schema = Joi.object({
      searchKey: Joi.string()
        .optional()
        .allow(null, '')
        .regex(/^[^*$\\]+$/),
      page: Joi.number().optional(),
      perPage: Joi.number().optional()
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('cmsListValidation', error))
      );
    }
    return callback(true);
  },
  deleteCmsValidation: (req, res, callback) => {
    const schema = Joi.object({
      cmsId: id
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('deleteCmsValidation', error))
      );
    }
    return callback(true);
  }
};
