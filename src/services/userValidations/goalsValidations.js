'use strict';

const Joi = require('joi');
const { validationMessageKey } = require('@services/Helper');
const { validationErrorResponseData } = require('@services/Response');
const { IMAGE_MIMETYPE } = require('@services/Constant');
const { id } = require('@services/adminValidations/adminValidations');

module.exports = {
  addEditGoalsValidation: (req, res, callback) => {
    const schema = Joi.object({
      goalId: id.allow(null, ''),
      title: Joi.string().required().trim(),
      imageUrl: Joi.string()
        .allow(null, '')
        .custom((value, helpers) => {
          if (value) {
            const mimeType = value.split('.').pop(); // Extract file extension
            if (!IMAGE_MIMETYPE.includes(mimeType)) {
              return helpers.error('any.invalid');
            }
          }
          return value;
        }, 'Custom image URL validation'),
      description: Joi.string().optional().trim(),
      dueDate: Joi.date().allow(null, '').optional(),
      isCompleted: Joi.boolean().required(),
      isSaved: Joi.boolean().required(),
      checklist: Joi.array().optional(),
      isImageDeleted: Joi.boolean().required()
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('addEditGoalsValidation', error))
      );
    }
    return callback(true);
  },
  myGoalsListValidation: (req, res, callback) => {
    const schema = Joi.object({
      isCompleted: Joi.boolean().optional(),
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
        res.__(validationMessageKey('myGoalsListValidation', error))
      );
    }
    return callback(true);
  },
  myDraftGoalsValidation: (req, res, callback) => {
    const schema = Joi.object({
      page: Joi.number().optional(),
      perPage: Joi.number().optional()
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('myDraftGoalsValidation', error))
      );
    }
    return callback(true);
  },
  deleteGoalValidation: (req, res, callback) => {
    const schema = Joi.object({
      goalId: id
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('deleteGoalValidation', error))
      );
    }
    return callback(true);
  }
};
