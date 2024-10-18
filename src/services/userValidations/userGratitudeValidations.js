'use strict';

const Joi = require('joi');
const { validationMessageKey } = require('@services/Helper');
const { validationErrorResponseData } = require('@services/Response');
const { IMAGE_MIMETYPE } = require('@services/Constant');
const { id } = require('@services/adminValidations/adminValidations');

module.exports = {
  addUserGratitudeValidation: (req, res, callback) => {
    const schema = Joi.object({
      userGratitudeId: id.allow(null, ''),
      title: Joi.string().required().trim(),
      imageUrl: Joi.string()
        .required()
        .allow(null, '')
        .valid(...IMAGE_MIMETYPE.map((x) => x)),
      description: Joi.string()
        .when('isSaved', {
          is: false,
          then: Joi.optional().allow(null, ''),
          otherwise: Joi.required()
        })
        .trim(),
      isSaved: Joi.boolean().required(),
      isImageDeleted: Joi.boolean().required()
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('addUserGratitudeValidation', error))
      );
    }
    return callback(true);
  },
  userGratitudeDetailedListValidation: (req, res, callback) => {
    const schema = Joi.object({
      isSaved: Joi.boolean().required(),
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
        res.__(validationMessageKey('userGratitudeDetailedListValidation', error))
      );
    }
    return callback(true);
  },
  exploreGratitudesValidation: (req, res, callback) => {
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
        res.__(validationMessageKey('exploreGratitudesValidation', error))
      );
    }
    return callback(true);
  },
  deleteGratitudeValidation: (req, res, callback) => {
    const schema = Joi.object({
      userGratitudeId: id
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('deleteGratitudeValidation', error))
      );
    }
    return callback(true);
  }
};
