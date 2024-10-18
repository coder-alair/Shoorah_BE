'use strict';

const Joi = require('joi');
const { validationMessageKey } = require('@services/Helper');
const { validationErrorResponseData } = require('@services/Response');
const {
  AUDIO_MIMETYPE,
  SHOORAH_PODS_TYPE,
  IMAGE_MIMETYPE,
  AUTHOR_BY,
  STATUS,
  CONTENT_STATUS
} = require('@services/Constant');
const { focusIds } = require('@services/adminValidations/affirmationValidations');
const { id } = require('@services/adminValidations/adminValidations');

module.exports = {
  addEditShoorahPodsValidation: (req, res, callback) => {
    const schema = Joi.object({
      podId: id.allow(null, ''),
      podName: Joi.string().required().trim().max(100),
      podType: Joi.number().required().valid(SHOORAH_PODS_TYPE.AUDIO),
      podUrl: Joi.string()
        .when('podId', {
          is: Joi.equal(null, ''),
          then: Joi.required(),
          otherwise: Joi.optional().allow(null, '')
        })
        .valid(...AUDIO_MIMETYPE.map((x) => x)),
      description: Joi.string().required().trim(),
      isDraft: Joi.boolean().optional(),
      duration: Joi.string()
        .required()
        .regex(/^(\d+:)?(\d+)?$/),
      podImage: Joi.string()
        .when('podId', {
          is: Joi.equal(null, ''),
          then: Joi.required(),
          otherwise: Joi.optional().allow(null, '')
        })
        .valid(...IMAGE_MIMETYPE.map((x) => x)),
      focusIds,
      // podBy: Joi.number().required().valid(AUTHOR_BY.SHOORAH, AUTHOR_BY.EXPERT),
      podStatus: Joi.number().required().valid(STATUS.INACTIVE, STATUS.ACTIVE),
      expertName: Joi.string().when('podBy', { is: AUTHOR_BY.EXPERT, then: Joi.required() }).trim(),
      expertImage: Joi.string()
        .optional()
        .valid(...IMAGE_MIMETYPE.map((x) => x))
        .allow(null, ''),
      approvalStatus: Joi.number()
        .strict()
        .when('podId', {
          is: Joi.equal(null, ''),
          then: Joi.optional().valid(null, ''),
          otherwise: Joi.required().valid(...Object.values(CONTENT_STATUS).map((x) => x))
        }),
      isExpertImageDeleted: Joi.boolean().required(),
      expertId: id.when('podId', {
        is: Joi.equal(null, ''),
        then: Joi.required(),
        otherwise: Joi.optional().allow(null, '')
      })
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('addEditShoorahPodsValidation', error))
      );
    }
    return callback(true);
  },
  shoorahPodsListValidation: (req, res, callback) => {
    const schema = Joi.object({
      id: id.optional().allow(null, ''),
      expertId: id.optional().allow(null, ''),
      page: Joi.number().optional().allow('', null),
      perPage: Joi.number().optional().allow('', null),
      ratings: Joi.number().optional(),
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
      podStatus: Joi.number().optional().valid(STATUS.INACTIVE, STATUS.ACTIVE).allow(null, '')
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('shoorahPodsListValidation', error))
      );
    }
    return callback(true);
  },
  deleteShoorahPodsValidation: (req, res, callback) => {
    const schema = Joi.object({
      podId: id
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('deleteShoorahPodsValidation', error))
      );
    }
    return callback(true);
  },
  getShoorahPodValidation: (req, res, callback) => {
    const schema = Joi.object({
      id
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('getShoorahPodValidation', error))
      );
    }
    return callback(true);
  },
  addEditDraftShoorahPodsValidation: (req, res, callback) => {
    const focusIds = Joi.array()
      .items(Joi.string().regex(/^[0-9a-fA-F]{24}$/))
      .unique()
      .optional();

    const schema = Joi.object({
      podId: id.allow(null, ''),
      podName: Joi.string().optional().trim().max(100).allow(null, ''),
      podType: Joi.number().optional(),
      podUrl: Joi.string().optional().allow(null, ''),
      description: Joi.string().optional().trim().allow(null, ''),
      duration: Joi.string()
        .optional()
        .regex(/^(\d+:)?(\d+)?$/),
      podImage: Joi.string().optional().allow(null, ''),
      focusIds,
      // podBy: Joi.number().optional(),
      podStatus: Joi.number().optional(),
      expertName: Joi.string().optional().allow(null, ''),
      expertImage: Joi.string().optional().allow(null, ''),
      approvalStatus: Joi.number().optional(),
      isDraft: Joi.boolean().optional(),
      isExpertImageDeleted: Joi.boolean().optional(),
      expertId: id.when('podId', {
        is: Joi.equal(null, ''),
        then: Joi.required(),
        otherwise: Joi.optional().allow(null, '')
      })
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('addEditDraftShoorahPodsValidation', error))
      );
    }
    return callback(true);
  },
  draftShoorahPodsListValidation: (req, res, callback) => {
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
      approvalStatus: Joi.number()
        .optional()
        .valid(...Object.values(CONTENT_STATUS).map((x) => x))
        .allow(null, ''),
      createdBy: id.optional().allow(null, ''),
      approvedBy: id.optional().allow(null, ''),
      podStatus: Joi.number().optional().valid(STATUS.INACTIVE, STATUS.ACTIVE).allow(null, '')
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('shoorahPodsListValidation', error))
      );
    }
    return callback(true);
  }
};
