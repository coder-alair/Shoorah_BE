const Joi = require('joi');
const { STATUS, MEDITATION_TYPE, IMAGE_MIMETYPE, CONTENT_STATUS } = require('@services/Constant');
const { idSchema } = require('@helpers/validationUtils');
const { id } = require('@services/adminValidations/adminValidations');

module.exports = {
  addEditSurveySchema: Joi.object({
    surveyId: idSchema.allow(null, ''),
    surveyTitle: Joi.string().required(),
    createdBy: idSchema.allow(null, ''),
    approvedBy: idSchema.allow(null, ''),
    approvedStatus: Joi.string(),
    approvedOn: Joi.number().optional(),
    templateCategory: Joi.number().optional(),
    surveyCategory: idSchema.optional().allow(null, ''),
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
  }),
  meditationListSchema: Joi.object({
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
    meditationStatus: Joi.number().optional().valid(STATUS.INACTIVE, STATUS.ACTIVE).allow(null, '')
  })
};
