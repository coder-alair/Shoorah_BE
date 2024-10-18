'use strict';

const Joi = require('joi');
const { validationMessageKey } = require('@services/Helper');
const { validationErrorResponseData } = require('@services/Response');
const {
  BREATHWORK_TYPE,
  AUTHOR_BY,
  STATUS,
  CONTENT_STATUS,
  AUDIO_MIMETYPE,
  IMAGE_MIMETYPE
} = require('@services/Constant');
const { id } = require('@services/adminValidations/adminValidations');

module.exports = {
  addEditBreathworkValidation: (req, res, callback) => {
    const schema = Joi.object({
      breathworkId: id.allow(null, ''),
      breathworkName: Joi.string().required().trim().max(100),
      breathworkType: Joi.number().required().valid(BREATHWORK_TYPE.AUDIO),
      isDraft: Joi.boolean().optional(),
      breathworkCategory: Joi.number().optional(),
      breathworkLottie: Joi.number().optional(),
      breathworkUrl: Joi.string().optional().allow(null, ''),
      description: Joi.string().required().trim(),
      duration: Joi.string()
        .required()
        .regex(/^(\d+:)?(\d+)?$/),
      breathworkImage: Joi.string().optional().allow(null, ''),
      // breathworkBy: Joi.number().required().valid(AUTHOR_BY.SHOORAH, AUTHOR_BY.EXPERT),
      breathworkStatus: Joi.number().required().valid(STATUS.INACTIVE, STATUS.ACTIVE),
      expertName: Joi.string()
        .when('breathworkBy', { is: AUTHOR_BY.EXPERT, then: Joi.required() })
        .trim(),
      expertImage: Joi.string()
        .optional()
        .valid(...IMAGE_MIMETYPE.map((x) => x))
        .allow(null, ''),
      approvalStatus: Joi.number()
        .strict()
        .when('breathworkId', {
          is: Joi.equal(null, ''),
          then: Joi.optional().valid(null, ''),
          otherwise: Joi.required().valid(...Object.values(CONTENT_STATUS).map((x) => x))
        }),
      isExpertImageDeleted: Joi.boolean().required(),
      isBasic: Joi.boolean().required(),      
      expertId: id.when('breathworkId', {
        is: Joi.equal(null, ''),
        then: Joi.required(),
        otherwise: Joi.optional().allow(null, '')
      })
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('addEditBreathworkValidation', error))
      );
    }
    return callback(true);
  },
  breathworkListValidation: (req, res, callback) => {
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
      breathworkCategory: Joi.number().optional(),
      approvalStatus: Joi.number()
        .optional()
        .valid(...Object.values(CONTENT_STATUS).map((x) => x))
        .allow(null, ''),
      breathworkType: Joi.number().optional().valid(BREATHWORK_TYPE.AUDIO).allow(null, ''),
      createdBy: id.optional().allow(null, ''),
      approvedBy: id.optional().allow(null, ''),
      isBasic: Joi.boolean().optional(),      
      breathworkStatus: Joi.number()
        .optional()
        .valid(STATUS.INACTIVE, STATUS.ACTIVE)
        .allow(null, '')
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('breathworkListValidation', error))
      );
    }
    return callback(true);
  },
  deletebreathworkValidation: (req, res, callback) => {
    const schema = Joi.object({
      breathworkId: id
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('deleteBreathworkValidation', error))
      );
    }
    return callback(true);
  },
  getBreathworkValidation: (req, res, callback) => {
    const schema = Joi.object({
      id
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('getBreathworkValidation', error))
      );
    }
    return callback(true);
  },
  addEditDraftBreathworkValidation: (req, res, callback) => {
    const schema = Joi.object({
      breathworkId: id.allow(null, ''),
      breathworkName: Joi.string().optional(),
      breathworkType: Joi.number().optional().valid(BREATHWORK_TYPE.AUDIO),
      isDraft: Joi.boolean().optional(),
      breathworkCategory: Joi.number().optional().allow(null, ''),
      breathworkLottie: Joi.number().optional().allow(null, ''),
      breathworkUrl: Joi.string().optional().allow(null, ''),
      description: Joi.string().optional().allow(null, ''),
      duration: Joi.string()
        .optional()
        .regex(/^(\d+:)?(\d+)?$/),
      breathworkImage: Joi.string().optional().allow(null, ''),
      // breathworkBy: Joi.number().optional().allow(null, ''),
      breathworkStatus: Joi.number().optional().allow(null, ''),
      expertName: Joi.string().optional().allow(null, ''),
      expertImage: Joi.string().optional().allow(null, ''),
      approvalStatus: Joi.number().optional().allow(null, ''),
      isExpertImageDeleted: Joi.boolean().optional().allow(null, ''),
      isBasic: Joi.boolean().required(),      
      expertId: id.when('breathworkId', {
        is: Joi.equal(null, ''),
        then: Joi.required(),
        otherwise: Joi.optional().allow(null, '')
      })
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('addEditDraftBreathworkValidation', error))
      );
    }
    return callback(true);
  },
  draftBreathworkListValidation: (req, res, callback) => {
    const schema = Joi.object({
      id: id.optional().allow(null, ''),
      page: Joi.number().optional().allow('', null),
      perPage: Joi.number().optional().allow('', null),
      searchKey: Joi.string()
        .optional()
        .allow(null, '')
        .regex(/^[^*$\\]+$/),
      sortBy: Joi.string().optional().allow(null, ''),
      sortOrder: Joi.number().valid(1, -1).optional().allow(null, ''),
      ratings: Joi.number().optional(),
      breathworkCategory: Joi.number().optional(),
      approvalStatus: Joi.number()
        .optional()
        .valid(...Object.values(CONTENT_STATUS).map((x) => x))
        .allow(null, ''),
      breathworkType: Joi.number().optional().valid(BREATHWORK_TYPE.AUDIO).allow(null, ''),
      createdBy: id.optional().allow(null, ''),
      approvedBy: id.optional().allow(null, ''),
      isBasic: Joi.boolean().optional(),      
      breathworkStatus: Joi.number()
        .optional()
        .valid(STATUS.INACTIVE, STATUS.ACTIVE)
        .allow(null, ''),
        
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('breathworkListValidation', error))
      );
    }
    return callback(true);
  }
};
