'use strict';

const Joi = require('joi');
const { validationMessageKey } = require('@services/Helper');
const { validationErrorResponseData } = require('@services/Response');
const {
  MEDITATION_TYPE,
  AUTHOR_BY,
  STATUS,
  CONTENT_STATUS,
  AUDIO_MIMETYPE,
  IMAGE_MIMETYPE
} = require('@services/Constant');
const { focusIds } = require('@services/adminValidations/affirmationValidations');
const { id } = require('@services/adminValidations/adminValidations');

module.exports = {
  addEditMeditationValidation: (req, res, callback) => {
    const schema = Joi.object({
      meditationId: id.allow(null, ''),
      meditationName: Joi.string().required().trim().max(100),
      meditationType: Joi.number().required().valid(MEDITATION_TYPE.AUDIO),
      isDraft: Joi.boolean().optional(),
      meditationUrl: Joi.string()
        .when('meditationId', {
          is: Joi.equal(null, ''),
          then: Joi.required(),
          otherwise: Joi.optional().allow(null, '')
        })
        .valid(...AUDIO_MIMETYPE.map((x) => x)),
      description: Joi.string().required().trim(),
      duration: Joi.string()
        .required()
        .regex(/^(\d+:)?(\d+)?$/),
      meditationImage: Joi.string()
        .when('meditationId', {
          is: Joi.equal(null, ''),
          then: Joi.required(),
          otherwise: Joi.optional().allow(null, '')
        })
        .valid(...IMAGE_MIMETYPE.map((x) => x)),
      focusIds,
      // meditationBy: Joi.number().required().valid(AUTHOR_BY.SHOORAH, AUTHOR_BY.EXPERT),
      meditationStatus: Joi.number().required().valid(STATUS.INACTIVE, STATUS.ACTIVE),
      expertName: Joi.string()
        .when('meditationBy', { is: AUTHOR_BY.EXPERT, then: Joi.required() })
        .trim(),
      expertImage: Joi.string()
        .optional()
        .valid(...IMAGE_MIMETYPE.map((x) => x))
        .allow(null, ''),
      approvalStatus: Joi.number()
        .strict()
        .when('meditationId', {
          is: Joi.equal(null, ''),
          then: Joi.optional().valid(null, ''),
          otherwise: Joi.required().valid(...Object.values(CONTENT_STATUS).map((x) => x))
        }),
      isExpertImageDeleted: Joi.boolean().required(),
      expertId: id.when('meditationId', {
        is: Joi.equal(null, ''),
        then: Joi.required(),
        otherwise: Joi.optional().allow(null, '')
      })
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('addEditMeditationValidation', error))
      );
    }
    return callback(true);
  },
  meditationListValidation: (req, res, callback) => {
    const schema = Joi.object({
      id: id.optional().allow(null, ''),
      expertId: id.optional().allow(null, ''),
      page: Joi.number().optional().allow('', null),
      perPage: Joi.number().optional().allow('', null),
      searchKey: Joi.string()
        .optional()
        .allow(null, '')
        .regex(/^[^*$\\]+$/),
      sortBy: Joi.string().optional().allow(null, ''),
      sortOrder: Joi.number().valid(1, -1).optional().allow(null, ''),
      ratings: Joi.number().optional(),
      approvalStatus: Joi.number()
        .optional()
        .valid(...Object.values(CONTENT_STATUS).map((x) => x))
        .allow(null, ''),
      meditationType: Joi.number().optional().valid(MEDITATION_TYPE.AUDIO).allow(null, ''),
      createdBy: id.optional().allow(null, ''),
      approvedBy: id.optional().allow(null, ''),
      meditationStatus: Joi.number()
        .optional()
        .valid(STATUS.INACTIVE, STATUS.ACTIVE)
        .allow(null, '')
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('meditationListValidation', error))
      );
    }
    return callback(true);
  },
  deleteMeditationValidation: (req, res, callback) => {
    const schema = Joi.object({
      meditationId: id
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('deleteMeditationValidation', error))
      );
    }
    return callback(true);
  },
  getMeditationValidation: (req, res, callback) => {
    const schema = Joi.object({
      id
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('getMeditationValidation', error))
      );
    }
    return callback(true);
  },
  addEditDraftMeditationValidation: (req, res, callback) => {
    const focusIds = Joi.array()
      .items(Joi.string().regex(/^[0-9a-fA-F]{24}$/))
      .unique()
      .optional();
    const schema = Joi.object({
      meditationId: id.allow(null, ''),
      meditationName: Joi.string().optional().trim().max(100),
      meditationType: Joi.number().optional(),
      meditationUrl: Joi.string().optional().allow(null, ''),
      description: Joi.string().optional().trim().allow(null, ''),
      duration: Joi.string()
        .optional()
        .regex(/^(\d+:)?(\d+)?$/),
      meditationImage: Joi.string().optional().allow(null, ''),
      focusIds,
      // meditationBy: Joi.number().optional(),
      meditationStatus: Joi.number().optional(),
      expertName: Joi.string().optional().trim(),
      expertImage: Joi.string().optional(),
      approvalStatus: Joi.number().optional(),
      isExpertImageDeleted: Joi.boolean().optional(),
      isDraft: Joi.boolean().optional(),
      expertId: id.when('meditationId', {
        is: Joi.equal(null, ''),
        then: Joi.required(),
        otherwise: Joi.optional().allow(null, '')
      })
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('addEditDraftMeditationValidation', error))
      );
    }
    return callback(true);
  },
  draftMeditationListValidation: (req, res, callback) => {
    const schema = Joi.object({
      id: id.optional().allow(null, ''),
      page: Joi.number().optional().allow('', null),
      perPage: Joi.number().optional().allow('', null),
      isDraft: Joi.boolean().optional(),
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
      meditationType: Joi.number().optional().valid(MEDITATION_TYPE.AUDIO).allow(null, ''),
      createdBy: id.optional().allow(null, ''),
      approvedBy: id.optional().allow(null, ''),
      meditationStatus: Joi.number()
        .optional()
        .valid(STATUS.INACTIVE, STATUS.ACTIVE)
        .allow(null, '')
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('meditationListValidation', error))
      );
    }
    return callback(true);
  }
};
