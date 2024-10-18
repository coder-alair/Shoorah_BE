'use strict';

const Joi = require('joi');
const { validationMessageKey } = require('@services/Helper');
const { validationErrorResponseData } = require('@services/Response');
const {
  AUTHOR_BY,
  STATUS,
  CONTENT_STATUS,
  AUDIO_MIMETYPE,
  IMAGE_MIMETYPE
} = require('@services/Constant');
const { focusIds } = require('@services/adminValidations/affirmationValidations');
const { id } = require('@services/adminValidations/adminValidations');

module.exports = {
  addEditSoundValidation: (req, res, callback) => {
    const schema = Joi.object({
      soundId: id.allow(null, ''),
      soundTitle: Joi.string().required().trim().max(100),
      isDraft: Joi.boolean().optional(),
      soundUrl: Joi.string()
        .when('soundId', {
          is: Joi.equal(null, ''),
          then: Joi.required(),
          otherwise: Joi.optional()
        })
        .valid(...AUDIO_MIMETYPE.map((x) => x))
        .allow(null, ''),
      description: Joi.string().required().trim(),
      duration: Joi.string()
        .required()
        .regex(/^(\d+:)?(\d+)?$/),
      // .regex(/^(([0-1]?[0-9]|2[0-3]):)?([0-5][0-9]:)?([0-5][0-9])$/),
      soundImage: Joi.string()
        .when('soundId', {
          is: Joi.equal(null, ''),
          then: Joi.required(),
          otherwise: Joi.optional().allow(null, '')
        })
        .valid(...IMAGE_MIMETYPE.map((x) => x)),
      // soundBy: Joi.number().required().valid(AUTHOR_BY.SHOORAH, AUTHOR_BY.EXPERT),
      expertName: Joi.string()
        .when('soundBy', { is: AUTHOR_BY.EXPERT, then: Joi.required() })
        .trim(),
      expertImage: Joi.string()
        .optional()
        .trim()
        .valid(...IMAGE_MIMETYPE.map((x) => x))
        .allow(null, ''),
      soundStatus: Joi.number().required().valid(STATUS.INACTIVE, STATUS.ACTIVE),
      focusIds,
      approvalStatus: Joi.number()
        .strict()
        .when('soundId', {
          is: Joi.equal(null, ''),
          then: Joi.optional().valid(null, ''),
          otherwise: Joi.required().valid(...Object.values(CONTENT_STATUS).map((x) => x))
        }),
      isExpertImageDeleted: Joi.boolean().required(),
      expertId: id.when('soundId', {
        is: Joi.equal(null, ''),
        then: Joi.required(),
        otherwise: Joi.optional().allow(null, '')
      })
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('addEditSoundValidation', error))
      );
    }
    return callback(true);
  },
  getDetailedSoundListValidation: (req, res, callback) => {
    const schema = Joi.object({
      page: Joi.number().optional().allow('', null),
      perPage: Joi.number().optional().allow('', null),
      searchKey: Joi.string()
        .optional()
        .allow(null, '')
        .regex(/^[^*$\\]+$/),
      sortBy: Joi.string().optional().allow(null, ''),
      ratings: Joi.number().optional(),
      sortOrder: Joi.number().valid(1, -1).optional().allow(null, ''),
      approvalStatus: Joi.number()
        .optional()
        .valid(...Object.values(CONTENT_STATUS).map((x) => x)),
      createdBy: id.optional().allow(null, ''),
      approvedBy: id.optional().allow(null, ''),
      soundStatus: Joi.number().optional().valid(STATUS.INACTIVE, STATUS.ACTIVE).allow(null, ''),
      id: id.optional().allow(null, ''),
      expertId: id.optional().allow(null, '')
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('getDetailedSoundListValidation', error))
      );
    }
    return callback(true);
  },
  deleteSoundValidation: (req, res, callback) => {
    const schema = Joi.object({
      soundId: id
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('deleteSoundValidation', error))
      );
    }
    return callback(true);
  },
  getSoundValidation: (req, res, callback) => {
    const schema = Joi.object({
      id
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('getSoundValidation', error))
      );
    }
    return callback(true);
  },
  addEditDraftSoundValidation: (req, res, callback) => {
    const focusIds = Joi.array()
      .items(Joi.string().regex(/^[0-9a-fA-F]{24}$/))
      .unique()
      .optional();

    const schema = Joi.object({
      soundId: id.allow(null, ''),
      soundTitle: Joi.string().optional().trim().max(100),
      soundUrl: Joi.string().optional().allow(null, ''),
      description: Joi.string().optional().trim().allow(null, ''),
      isDraft: Joi.boolean().optional(),
      duration: Joi.string()
        .optional()
        .regex(/^(\d+:)?(\d+)?$/),
      // .regex(/^(([0-1]?[0-9]|2[0-3]):)?([0-5][0-9]:)?([0-5][0-9])$/),
      soundImage: Joi.string().optional().allow(null, ''),
      // soundBy: Joi.number().optional().allow(null, ''),
      expertName: Joi.string().optional().trim().allow(null, ''),
      expertImage: Joi.string().optional().allow(null, ''),
      soundStatus: Joi.number().optional(),
      focusIds,
      approvalStatus: Joi.number().optional().allow(null, ''),
      isExpertImageDeleted: Joi.boolean().optional(),
      expertId: id.when('soundId', {
        is: Joi.equal(null, ''),
        then: Joi.required(),
        otherwise: Joi.optional().allow(null, '')
      })
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('addEditSoundValidation', error))
      );
    }
    return callback(true);
  },
  getDetailedDraftSoundListValidation: (req, res, callback) => {
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
        .valid(...Object.values(CONTENT_STATUS).map((x) => x)),
      createdBy: id.optional().allow(null, ''),
      approvedBy: id.optional().allow(null, ''),
      soundStatus: Joi.number().optional().valid(STATUS.INACTIVE, STATUS.ACTIVE).allow(null, ''),
      id: id.optional().allow(null, '')
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('getDetailedDraftSoundListValidation', error))
      );
    }
    return callback(true);
  }
};
