const Joi = require('joi');
const {
  SURVEY_STATUS,
  SURVEY_SCOPE,
  SURVEY_TARGET,
  SURVEY_TYPE,
  IMAGE_MIMETYPE,
  CONTENT_STATUS
} = require('@services/Constant');
const { idSchema, requiredIdSchema } = require('@helpers/validationUtils');

module.exports = {
  addSurveySchema: Joi.object({
    surveyTitle: Joi.string().required(),
    surveyStatus: Joi.number().valid(...Object.values(SURVEY_STATUS)),
    surveyType: Joi.number().valid(...Object.values(SURVEY_TYPE)),
    scope: Joi.number()
      .optional()
      .valid(...Object.values(SURVEY_SCOPE))
      .allow(null),
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
    questions: Joi.array(),
    notifyTime: Joi.string().optional().allow(null, '')
  }),
  editSurveySchema: Joi.object({
    surveyId: requiredIdSchema,
    surveyTitle: Joi.string().optional(),
    approvedBy: idSchema.allow(null, ''),
    approvedOn: Joi.number().optional(),
    surveyStatus: Joi.number()
      .optional()
      .valid(...Object.values(SURVEY_STATUS)),
    surveyType: Joi.number()
      .optional()
      .valid(...Object.values(SURVEY_TYPE)),
    scope: Joi.number()
      .optional()
      .valid(...Object.values(SURVEY_SCOPE)),
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
  getSurveyByIdSchema: Joi.object({
    surveyId: requiredIdSchema
  }),
  getAllSurveysSchema: Joi.object({
    page: Joi.number().optional().allow('', null),
    perPage: Joi.number().optional().allow('', null),
    searchKey: Joi.string()
      .optional()
      .allow(null, '')
      .regex(/^[^*$\\]+$/),
    sortBy: Joi.string().optional().allow(null, ''),
    sortOrder: Joi.number().valid(1, -1).optional().allow(null, ''),
    surveyStatus: Joi.number()
      .optional()
      .valid(...Object.values(SURVEY_STATUS))
      .default(SURVEY_STATUS.ACTIVE),
    surveyType: Joi.number()
      .optional()
      .valid(...Object.values(SURVEY_TYPE))
      .default(SURVEY_TYPE.DRAFT)
  }),
  deleteSurveySchema: Joi.object({
    surveyId: requiredIdSchema
  }),
  surveyApprovalSchema: Joi.object({
    surveyStatus: Joi.number().required().valid(CONTENT_STATUS.APPROVED, CONTENT_STATUS.REJECTED),
    surveyId: requiredIdSchema,
    comment: Joi.string().optional().allow(null, '')
  }),

  getSpecialisationListSchema: Joi.object({
    category: Joi.string(),
    page: Joi.number().min(1).optional().allow(null, ''),
    limit: Joi.number().min(1).optional().allow(null, ''),
    search: Joi.string()
      .max(50)
      .optional()
      .allow(null, '')
      .regex(/^[^*$\\]+$/)
  }),

  //Specialisation schema
  getSpecialisationListSchema: Joi.object({
    categoryId: idSchema,
    page: Joi.number().min(1).optional().allow(null, ''),
    limit: Joi.number().min(1).optional().allow(null, ''),
    search: Joi.string()
      .max(50)
      .optional()
      .allow(null, '')
      .regex(/^[^*$\\]+$/)
  }),
  addSpecialisationToListSchema: Joi.object({
    categoryId: requiredIdSchema,
    specialisationIds: Joi.string().required()
  })
};
