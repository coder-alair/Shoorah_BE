'use strict';

const Joi = require('joi');
const { validationMessageKey } = require('@services/Helper');
const { validationErrorResponseData } = require('@services/Response');
const { IMAGE_MIMETYPE } = require('@services/Constant');
const { id } = require('@services/adminValidations/adminValidations');

module.exports = {
  addEditCleanseValidation: (req, res, callback) => {
    const schema = Joi.object({
      cleanseId: id.allow(null, ''),
      title: Joi.string().required().trim(),
      imageUrl: Joi.string()
        .required()
        .allow(null, '')
        .valid(...IMAGE_MIMETYPE.map((x) => x)),
      description: Joi.string()
        .trim()
        .when('isSaved', {
          is: false,
          then: Joi.optional().allow(null, ''),
          otherwise: Joi.required()
        }),
      isSaved: Joi.boolean().required(),
      isImageDeleted: Joi.boolean().required()
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('addEditCleanseValidation', error))
      );
    }
    return callback(true);
  },
  cleanseDetailedListValidation: (req, res, callback) => {
    const schema = Joi.object({
      isSaved: Joi.boolean().required(),
      page: Joi.number().optional(),
      perPage: Joi.number().optional(),
      startDate: Joi.date()
      .iso()
      .optional(),
      endDate:Joi.date()
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
        res.__(validationMessageKey('cleanseDetailedListValidation', error))
      );
    }
    return callback(true);
  },
  deleteCleanseValidation: (req, res, callback) => {
    const schema = Joi.object({
      cleanseId: id.allow(null, '')
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('deleteCleanseValidation', error))
      );
    }
    return callback(true);
  }
};
