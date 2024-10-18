'use strict';

const Joi = require('joi');
const { validationMessageKey } = require('@services/Helper');
const { validationErrorResponseData } = require('@services/Response');
const { GRATITUDE_TYPE, STATUS, CONTENT_STATUS } = require('@services/Constant');
const { focusIds } = require('@services/adminValidations/affirmationValidations');
const { id } = require('@services/adminValidations/adminValidations');

module.exports = {
  addEditGratitudeValidation: (req, res, callback) => {
    const schema = Joi.object({
      gratitudeId: id.allow(null, ''),
      gratitudeTitle: Joi.string().required().trim(),
      gratitudeType: Joi.number()
        .required()
        .valid(GRATITUDE_TYPE.IMAGE, GRATITUDE_TYPE.VIDEO, GRATITUDE_TYPE.TEXT),
      gratitudeUrl: Joi.string().when('gratitudeType', {
        is: Joi.equal(GRATITUDE_TYPE.IMAGE, GRATITUDE_TYPE.VIDEO),
        then: Joi.when('gratitudeId', {
          is: Joi.equal(null, ''),
          then: Joi.required()
        }),
        otherwise: Joi.optional()
      }),
      duration: Joi.string()
        .when('gratitudeUrl', { is: Joi.exist(), then: Joi.required() })
        .regex(/^(([0-1]?[0-9]|2[0-3]):)?([0-5][0-9]:)?([0-5][0-9])$/),
      thumbnail: Joi.string().optional(),
      focusIds,
      gratitudeStatus: Joi.number().required().valid(STATUS.INACTIVE, STATUS.ACTIVE),
      approvalStatus: Joi.number()
        .strict()
        .when('gratitudeId', {
          is: Joi.equal(null, ''),
          then: Joi.optional().valid(null, ''),
          otherwise: Joi.required().valid(...Object.values(CONTENT_STATUS).map((x) => x))
        })
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('addEditGratitudeValidation', error))
      );
    }
    return callback(true);
  },
  gratitudeDetailedListValidation: (req, res, callback) => {
    const schema = Joi.object({
      page: Joi.number().optional().allow('', null),
      perPage: Joi.number().optional().allow('', null),
      searchKey: Joi.string()
        .optional()
        .allow(null, '')
        .regex(/^[^*$\\]+$/),
      sortBy: Joi.string().optional().allow(null, ''),
      sortOrder: Joi.number().valid(1, -1).optional().allow(null, ''),
      approvalStatus: Joi.number()
        .optional()
        .valid(...Object.values(CONTENT_STATUS).map((x) => x))
        .allow(null, ''),
      createdBy: id.optional().allow(null, ''),
      approvedBy: id.optional().allow(null, ''),
      gratitudeStatus: Joi.number()
        .optional()
        .valid(STATUS.INACTIVE, STATUS.ACTIVE)
        .allow(null, ''),
      id: id.optional().allow(null, '')
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('gratitudeDetailedListValidation', error))
      );
    }
    return callback(true);
  },
  deleteGratitudeValidation: (req, res, callback) => {
    const schema = Joi.object({
      gratitudeId: id
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
