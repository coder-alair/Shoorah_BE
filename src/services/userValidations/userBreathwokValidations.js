'use strict';

const Joi = require('joi');
const { validationMessageKey } = require('@services/Helper');
const { validationErrorResponseData } = require('@services/Response');
const { IMAGE_MIMETYPE } = require('@services/Constant');

const id = Joi.string()
  .optional()
  .regex(/^[0-9a-fA-F]{24}$/);

module.exports = {
  userBreathworkDetailedListValidation: (req, res, callback) => {
    const schema = Joi.object({
      page: Joi.number().optional(),
      perPage: Joi.number().optional(),
      breathworkCategory: Joi.number().optional(),
      isBasic: Joi.boolean().optional().allow(null),
      startDate: Joi.date()
        .iso()
        .optional(),
      endDate: Joi.date()
        .iso()
        .min(Joi.ref('startDate'))
        .optional(),
      searchKey: Joi.string()
        .optional()
        .allow(null, '')
        .regex(/^[^*$\\]+$/)
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('userBreathworkDetailedListValidation', error))
      );
    }
    return callback(true);
  },
  deleteBreathworkValidation: (req, res, callback) => {
    const schema = Joi.object({
      breathworkId: id
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('deleteBreathworkValidation', error))
      );
    }
    return callback(true);
  },
  userBreathworkSessionValidation: (req, res, callback) => {
    const schema = Joi.object({
      breathworkId: id.required()
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('userBreathworkSessionCreation', error))
      );
    }
    return callback(true);
  },
};
