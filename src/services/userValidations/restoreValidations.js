'use strict';
const Joi = require('joi');
const { validationMessageKey } = require('@services/Helper');
const { validationErrorResponseData } = require('@services/Response');
// const { focusIds } = require('@services/adminValidations/affirmationValidations');

const focusIds = Joi.array()
  .items(Joi.string().regex(/^[0-9a-fA-F]{24}$/))
  .unique()
  .required();

module.exports = {
  restoreMeditationListValidation: (req, res, callback) => {
    const schema = Joi.object({
      page: Joi.number().optional(),
      perPage: Joi.number().optional(),
      searchKey: Joi.string()
        .optional()
        .allow(null, '')
        .regex(/^[^*$\\]+$/),
      focusIds: focusIds.optional(),
      categoryId: Joi.string().optional()
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('restoreMeditationListValidation', error))
      );
    }
    return callback(true);
  },
  restoreSoundListValidation: (req, res, callback) => {
    const schema = Joi.object({
      page: Joi.number().optional(),
      perPage: Joi.number().optional(),
      searchKey: Joi.string()
        .optional()
        .allow(null, '')
        .regex(/^[^*$\\]+$/),
      focusIds: focusIds.optional(),
      categoryId: Joi.string().optional()
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('restoreSoundListValidation', error))
      );
    }
    return callback(true);
  },
  shoorahPodsListValidation: (req, res, callback) => {
    const schema = Joi.object({
      page: Joi.number().optional(),
      perPage: Joi.number().optional(),
      searchKey: Joi.string()
        .optional()
        .allow(null, '')
        .regex(/^[^*$\\]+$/),
      focusIds: focusIds.optional(),
      categoryId: Joi.string().optional()
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('shoorahPodsListValidation', error))
      );
    }
    return callback(true);
  }
};
