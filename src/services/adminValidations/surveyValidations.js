'use strict';

const Joi = require('joi');
const { validationMessageKey } = require('@services/Helper');
const { validationErrorResponseData } = require('@services/Response');
const { IMAGE_MIMETYPE } = require('@services/Constant');
const { STATUS } = require('../Constant');

const id = Joi.string().regex(/^[0-9a-fA-F]{24}$/);

const reqId = Joi.string()
  .required()
  .regex(/^[0-9a-fA-F]{24}$/);

module.exports = {
  addsurveyValidation: (req, res, callback) => {
    const surveyschema = Joi.object({
      survey_title: Joi.string().required(),
      user_id: Joi.string().required(),
      created_by: Joi.string(),
      approved_by: Joi.string(),
      approved_status: Joi.string(),
      approved_on: Joi.string(),
      survey_category: Joi.string().optional().allow(null, ''),
      logo: Joi.string(),
      image: Joi.string(),
      question_details: Joi.array().items(
        Joi.object().keys({
          question: Joi.string().required(),
          question_type: Joi.string(),
          que_options: Joi.array().items(
            Joi.object({
              options: Joi.string()
            })
          ),
          other_as_option: Joi.number(),
          nonOfTheAbove_as_option: Joi.number(),
          skip: Joi.number()
        })
      ),
      draft: Joi.number(),
      bulk_answer: Joi.number(),
      all_staff: Joi.number(),
      departments: Joi.array().items(
        Joi.object().keys({
          name: Joi.string()
        })
      ),
      area: Joi.array().items(
        Joi.object().keys({
          name: Joi.string()
        })
      ),
      time: Joi.string(),
      status: Joi.number(),
      deleted_at: Joi.number()
    });
    const { result, error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('addsurveyValidation', error))
      );
    }
    return callback(true);
  },

  addEditSurveyValidation: (req, res, callback) => {
    const surveySchema = Joi.object({
      surveyId: id.allow(null, ''),
      surveyTitle: Joi.string().required(),
      createdBy: id.allow(null, ''),
      approvedBy: id.allow(null, ''),
      approvedStatus: Joi.string(),
      approvedOn: Joi.number().optional(),
      templateCategory: Joi.number().optional(),
      surveyCategory: id.optional().allow(null, ''),
      surveyDuration: Joi.string().optional().allow(null, ''),
      status: Joi.number().optional().valid(STATUS.INACTIVE, STATUS.ACTIVE),
      surveyLogo: Joi.string()
        .optional()
        .valid(...IMAGE_MIMETYPE.map((x) => x))
        .allow(null, ''),
      surveyImage: Joi.string()
        .optional()
        .valid(...IMAGE_MIMETYPE.map((x) => x))
        .allow(null, ''),
      questions: Joi.array(),
      departments: Joi.array(),
      isSurveyImageDeleted: Joi.boolean().optional(),
      isSurveyLogoDeleted: Joi.boolean().optional(),
      isDraft: Joi.boolean().optional(),
      isTemplate: Joi.boolean().optional(),
      surveyArea: Joi.string().optional().allow(null, ''),
      notifyTime: Joi.string().optional().allow(null, '')
    });
    const { error } = surveySchema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('addsurveyValidation', error))
      );
    }
    return callback(true);
  },

  getSurveyValidation: (req, res, callback) => {
    const surveySchema = Joi.object({
      surveyId: reqId
    });
    const { error } = surveySchema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('getSurveyValidation', error))
      );
    }
    return callback(true);
  },

  getAllSurveyValidation: (req, res, callback) => {
    const surveySchema = Joi.object({
      page: Joi.number().optional().allow('', null),
      perPage: Joi.number().optional().allow('', null),
      searchKey: Joi.string()
        .optional()
        .allow(null, '')
        .regex(/^[^*$\\]+$/),
      sortBy: Joi.string().optional().allow(null, ''),
      sortOrder: Joi.number().valid(1, -1).optional().allow(null, ''),
      approvalStatus: Joi.number().optional().allow(null, ''),
      createdBy: id.optional().allow(null, ''),
      approvedBy: id.optional().allow(null, ''),
      isDraft: Joi.boolean().optional(),
      isTemplate: Joi.boolean().optional(),
      surveyStatus: Joi.number().optional().valid(STATUS.INACTIVE, STATUS.ACTIVE).allow(null, '')
    });
    const { error } = surveySchema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('getSurveyValidation', error))
      );
    }
    return callback(true);
  },

  addEditSurveyCategoryValidation: (req, res, callback) => {
    const surveySchema = Joi.object({
      categoryId: id.allow(null, ''),
      categoryName: Joi.string().optional()
    });
    const { error } = surveySchema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('addEditSurveyCategory', error))
      );
    }
    return callback(true);
  },

  deleteSurveyCategoryValidation: (req, res, callback) => {
    const surveySchema = Joi.object({
      categoryId: id.allow(null, '')
    });
    const { error } = surveySchema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('deleteSurveyCategoryValidation', error))
      );
    }
    return callback(true);
  },

  deleteSurveyValidation: (req, res, callback) => {
    const surveySchema = Joi.object({
      surveyId: id.allow(null, '')
    });
    const { error } = surveySchema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('deleteSurveyValidation', error))
      );
    }
    return callback(true);
  }
};
