'use strict';

const Joi = require('joi');
const { validationMessageKey } = require('@services/Helper');
const { validationErrorResponseData } = require('@services/Response');
const { AFFIRMATION_TYPE, STATUS, CONTENT_STATUS } = require('@services/Constant');
const focusIds = Joi.array()
  .items(Joi.string().regex(/^[0-9a-fA-F]{24}$/))
  .required();
const { id } = require('@services/adminValidations/adminValidations');

module.exports = {
  focusIds,
  addEditAffirmationValidation: (req, res, callback) => {
    const schema = Joi.object({
      affirmationId: id.allow(null, ''),
      affirmationType: Joi.number().required().strict().valid(AFFIRMATION_TYPE.MANUAL),
      affirmationName: Joi.string()
        .when('affirmationType', {
          is: AFFIRMATION_TYPE.MANUAL,
          then: Joi.required()
        })
        .trim(),
      description: Joi.string().allow(null, ''),
      // .when('affirmationType', {
      //   is: AFFIRMATION_TYPE.MANUAL,
      //   then: Joi.optional().allow(null, '')
      // }),
      affirmationStatus: Joi.number()
        .strict()
        .when('affirmationType', { is: AFFIRMATION_TYPE.MANUAL, then: Joi.required() })
        .valid(STATUS.ACTIVE, STATUS.INACTIVE),
      focusIds,
      isDraft: Joi.boolean().optional(),
      approvalStatus: Joi.number()
        .strict()
        .when('affirmationId', {
          is: Joi.equal(null, ''),
          then: Joi.optional().valid(null, ''),
          otherwise: Joi.required().valid(...Object.values(CONTENT_STATUS).map((x) => x))
        })
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
  affirmationDetailedListValidation: (req, res, callback) => {
    const schema = Joi.object({
      page: Joi.number().optional().allow('', null),
      perPage: Joi.number().optional().allow('', null),
      searchKey: Joi.string()
        .optional()
        .allow(null, '')
        .regex(/^[^*$\\]+$/),
      sortBy: Joi.string().optional().allow(null, ''),
      sortOrder: Joi.number().valid(1, -1).optional().allow(null, ''),
      affirmationStatus: Joi.number()
        .optional()
        .valid(STATUS.INACTIVE, STATUS.ACTIVE)
        .allow(null, ''),
      approvalStatus: Joi.number()
        .optional()
        .valid(...Object.values(CONTENT_STATUS).map((x) => x)),
      createdBy: id.optional().allow(null, ''),
      approvedBy: id.optional().allow(null, ''),
      id: id.optional().allow(null, '')
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('affirmationDetailedListValidation', error))
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
  addAffirmationCsvValidation: (req, res, callback) => {
    const schema = Joi.object({
      affirmationType: Joi.number().required().valid(AFFIRMATION_TYPE.CSV),
      csvFileMimetype: Joi.string().valid('text/csv').required(),
      focusIds
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('addAffirmationCsvValidation', error))
      );
    }
    return callback(true);
  },
  getAffirmationValidation: (req, res, callback) => {
    const schema = Joi.object({
      id
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('getAffirmationValidation', error))
      );
    }
    return callback(true);
  },
  addEditDraftAffirmationValidation: (req, res, callback) => {
    const focusIds = Joi.array()
      .items(Joi.string().regex(/^[0-9a-fA-F]{24}$/))
      .unique()
      .optional();

    const schema = Joi.object({
      affirmationId: id.allow(null, ''),
      affirmationType: Joi.number().optional(),
      affirmationName: Joi.string().optional().trim(),
      description: Joi.string().allow(null, ''),
      // .when('affirmationType', {
      //   is: AFFIRMATION_TYPE.MANUAL,
      //   then: Joi.optional().allow(null, '')
      // }),
      affirmationStatus: Joi.number().optional(),
      focusIds,
      approvalStatus: Joi.number().optional(),
      isDraft: Joi.boolean().optional()
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('addEditDraftAffirmationValidation', error))
      );
    }
    return callback(true);
  },
  affirmationDraftsDetailedListValidation: (req, res, callback) => {
    const schema = Joi.object({
      page: Joi.number().optional().allow('', null),
      perPage: Joi.number().optional().allow('', null),
      searchKey: Joi.string()
        .optional()
        .allow(null, '')
        .regex(/^[^*$\\]+$/),
      sortBy: Joi.string().optional().allow(null, ''),
      sortOrder: Joi.number().valid(1, -1).optional().allow(null, ''),
      affirmationStatus: Joi.number()
        .optional()
        .valid(STATUS.INACTIVE, STATUS.ACTIVE)
        .allow(null, ''),
      approvalStatus: Joi.number()
        .optional()
        .valid(...Object.values(CONTENT_STATUS).map((x) => x)),
      createdBy: id.optional().allow(null, ''),
      approvedBy: id.optional().allow(null, ''),
      id: id.optional().allow(null, '')
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('affirmationDraftDetailedListValidation', error))
      );
    }
    return callback(true);
  }
};
