'use strict';

const Joi = require('joi');
const { validationMessageKey } = require('@services/Helper');
const { validationErrorResponseData } = require('@services/Response');
const { focusIds } = require('@services/adminValidations/affirmationValidations');
const { id } = require('@services/adminValidations/adminValidations');

module.exports = {
  ritualsListValidation: (req, res, callback) => {
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
        res.__(validationMessageKey('ritualsListValidation', error))
      );
    }
    return callback(true);
  },
  addMyRitualsValidation: (req, res, callback) => {
    const schema = Joi.object({
      ritualIds: focusIds.optional()
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('addMyRitualsValidation', error))
      );
    }
    return callback(true);
  },
  myRitualListValidation: (req, res, callback) => {
    const schema = Joi.object({
      page: Joi.number().optional(),
      perPage: Joi.number().optional(),
      searchKey: Joi.string()
        .optional()
        .allow(null, '')
        .regex(/^[^*$\\]+$/),
      focusIds: Joi.valid(null) // Filter by focusIds functionality is deprecated but because of FE common function we have changed to allow them to send null
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('myRitualListValidation', error))
      );
    }
    return callback(true);
  },
  deleteMyRitualValidation: (req, res, callback) => {
    const schema = Joi.object({
      ritualId: id
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('deletemyRitualValidation', error))
      );
    }
    return callback(true);
  },
  myRitualsCompletedStatusValidation: (req, res, callback) => {
    const schema = Joi.object({
      ritualId: id,
      isCompleted: Joi.boolean().required()
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('myRitualsCompletedStatusValidation', error))
      );
    }
    return callback(true);
  },
  myRitualsCompletedStatusListValidation: (req, res, callback) => {
    const schema = Joi.object({
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
        res.__(validationMessageKey('myRitualsCompletedStatusListValidation', error))
      );
    }
    return callback(true);
  }
};
