'use strict';

const Joi = require('joi');
const { validationMessageKey } = require('@services/Helper');
const { validationErrorResponseData } = require('@services/Response');
const { IMAGE_MIMETYPE } = require('@services/Constant');

const idValidation = Joi.string().regex(/^[0-9a-fA-F]{24}$/);

module.exports = {
  getPodExpertsValidation: (req, res, callback) => {
    const schema = Joi.object({
      id: idValidation.optional().allow(null, ''),
      page: Joi.number().min(1).optional().allow(null, ''),
      limit: Joi.number().min(1).optional().allow(null, ''),
      search: Joi.string().max(50).optional().allow(null, '')
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        validationMessageKey('getPodExpertsValidation', error)
      );
    }

    return callback(true);
  },
  addPodExpertValidation: (req, res, callback) => {
    const schema = Joi.object({
      name: Joi.string().required().trim().max(50),
      description: Joi.string().optional().trim().allow(null, ''),
      isActive: Joi.boolean().optional(),
      imageType: Joi.string()
        .optional()
        .trim()
        .valid(...IMAGE_MIMETYPE)
        .allow(null, '')
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        validationMessageKey('addPodExpertValidation', error)
      );
    }

    return callback(true);
  },
  updatePodExpertValidation: (req, res, callback) => {
    const schema = Joi.object({
      id: idValidation.required(),
      name: Joi.string().trim().max(50).optional(),
      description: Joi.string().trim().optional().allow(null, ''),
      isActive: Joi.boolean().optional(),
      imageType: Joi.string()
        .optional()
        .trim()
        .allow(null, '')
        .valid(...IMAGE_MIMETYPE)
      }).or('name', 'description', 'isActive', 'imageType');
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        validationMessageKey('updatePodExpertValidation', error)
      );
    }

    return callback(true);
  }
};
