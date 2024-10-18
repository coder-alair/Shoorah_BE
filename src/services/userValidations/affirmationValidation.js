'use strict';

const Joi = require('joi');
const { validationMessageKey } = require('@services/Helper');
const { validationErrorResponseData } = require('@services/Response');
const { IMAGE_MIMETYPE } = require('@services/Constant');
const { focusIds } = require('@services/adminValidations/affirmationValidations');

const { id } = require('@services/adminValidations/adminValidations');

module.exports = {
  addEditAffirmationValidation: (req, res, callback) => {
    const schema = Joi.object({
      affirmationId: id.allow(null, ''),
      title: Joi.string().required().trim(),
      imageUrl: Joi.string()
        .allow(null, '')
        .valid(...IMAGE_MIMETYPE.map((x) => x)),
      description: Joi.string().optional().trim(),
      isSaved: Joi.boolean().required(),
      isImageDeleted: Joi.boolean().required()
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('addEditAffirmationValidation', error))
      );
    }
    return callback(true);
  },
  affirmationListValidation: (req, res, callback) => {
    const schema = Joi.object({
      isSaved: Joi.boolean().required(),
      page: Joi.number().optional(),
      perPage: Joi.number().optional(),
      searchKey: Joi.string()
        .optional()
        .allow(null, '')
        .regex(/^[^*$\\]+$/i)
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('myAffirmationListValidation', error))
      );
    }
    return callback(true);
  },
  deleteAffirmationValidation: (req, res, callback) => {
    const schema = Joi.object({
      affirmationId: id
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('deleteAffirmationValidation', error))
      );
    }
    return callback(true);
  },
  affirmationListValidation: (req, res, callback) => {
    const schema = Joi.object({
      page: Joi.number().optional(),
      perPage: Joi.number().optional(),
      searchKey: Joi.string()
        .optional()
        .allow(null, '')
        .regex(/^[^*$\\]+$/),
      isSaved: Joi.boolean().optional(),
      focusIds: focusIds.optional(),
      categoryId: Joi.string().optional()
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('affirmationListValidation', error))
      );
    }
    return callback(true);
  }
};
