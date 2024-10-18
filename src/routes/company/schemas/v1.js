const Joi = require('joi');
const {
  IMAGE_MIMETYPE,
  CONTENT_STATUS,
  SURVEY_TYPE,
  SURVEY_STATUS,
  SURVEY_TARGET
} = require('@services/Constant');
const { idSchema, requiredIdSchema } = require('@helpers/validationUtils');

module.exports = {
  addEditB2BSurveySchema: Joi.object({
    surveyId: idSchema.allow(null, ''),
    surveyTitle: Joi.string().optional(),
    surveyStatus: Joi.number()
      .optional()
      .valid(...Object.values(SURVEY_STATUS)),
    surveyType: Joi.number().optional().valid(SURVEY_TYPE.DRAFT, SURVEY_TYPE.SURVEY),
    target: Joi.array()
      .optional()
      .items(Joi.number().valid(...Object.values(SURVEY_TARGET))),
    category: Joi.string().optional().allow(null, ''),
    surveyDuration: Joi.string().optional().allow(null, ''),
    surveyLogo: Joi.string()
      .optional()
      .valid(...IMAGE_MIMETYPE.map((x) => x))
      .allow(null, ''),
    surveyImage: Joi.string()
      .optional()
      .valid(...IMAGE_MIMETYPE.map((x) => x))
      .allow(null, ''),
    previewLogo: Joi.string().optional().allow(null, ''),
    previewImage: Joi.string().optional().allow(null, ''),
    questions: Joi.array().optional(),
    notifyTime: Joi.string().optional().allow(null, '')
  }),
  getAllB2BSurveysSchema: Joi.object({
    page: Joi.number().optional().allow('', null),
    perPage: Joi.number().optional().allow('', null),
    searchKey: Joi.string()
      .optional()
      .allow(null, '')
      .regex(/^[^*$\\]+$/),
    sortBy: Joi.string().optional().allow(null, ''),
    sortOrder: Joi.number().valid(1, -1).optional().allow(null, ''),
    surveyType: Joi.number()
      .optional()
      .valid(...Object.values(SURVEY_TYPE))
      .allow(null, ''),
    surveyStatus: Joi.number()
      .optional()
      .valid(...Object.values(SURVEY_STATUS))
      .allow(null, '')
  }),
  getB2BSurveyByIdSchema: Joi.object({
    surveyId: requiredIdSchema
  }),
  deleteB2BSurveySchema: Joi.object({
    surveyId: requiredIdSchema
  }),
  b2bSurveyApprovalSchema: Joi.object({
    surveyStatus: Joi.number().required().valid(CONTENT_STATUS.APPROVED, CONTENT_STATUS.REJECTED),
    surveyId: requiredIdSchema,
    comment: Joi.string().optional().allow(null, '')
  })
};
