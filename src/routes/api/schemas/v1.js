const Joi = require('joi');
const { joiPasswordExtendCore } = require('joi-password');
const JoiPassword = Joi.extend(joiPasswordExtendCore);
const { DEVICE_TYPE } = require('@services/Constant');
const { email, id } = require('@services/adminValidations/adminValidations');
const { CONTENT_TYPE, USER_SURVEY_TYPE } = require('@services/Constant');
const { idSchema, requiredIdSchema } = require('@helpers/validationUtils');

module.exports = {
  loginSchema: Joi.object({
    email: Joi.alternatives().conditional(Joi.string().email(), {
      then: email,
      otherwise: Joi.string().required()
    }),
    password: JoiPassword.string().noWhiteSpaces().min(6).required(),
    deviceType: Joi.number()
      .required()
      .valid(DEVICE_TYPE.ANDROID, DEVICE_TYPE.IOS, DEVICE_TYPE.WEB),
    deviceToken: Joi.string().required()
  }),

  getRecentlyPlayedSchema: Joi.object({
    contentType: Joi.number()
      .required()
      .valid(
        CONTENT_TYPE.MEDITATION,
        CONTENT_TYPE.SOUND,
        CONTENT_TYPE.SHOORAH_PODS,
        CONTENT_TYPE.BREATHWORK
      )
  }),
  addRecentlyPlayedSchema: Joi.object({
    contentType: Joi.number()
      .required()
      .valid(
        CONTENT_TYPE.MEDITATION,
        CONTENT_TYPE.SOUND,
        CONTENT_TYPE.SHOORAH_PODS,
        CONTENT_TYPE.BREATHWORK
      ),
    contentId: id.required()
  }),

  forgotPasswordSchema: Joi.object({
    email: Joi.alternatives().conditional(Joi.string().email(), {
      then: email,
      otherwise: Joi.string().required()
    })
  }),

  createPlaylistSchema: Joi.object({
    user_id: requiredIdSchema,
    name: Joi.string().max(50).required().trim()
  }),
  deletePlaylistSchema: Joi.object({
    id: requiredIdSchema
  }),
  getPlaylistSchema: Joi.object({
    userId: idSchema,
    id: idSchema
  }).xor('userId', 'id'),
  updatePlaylistSchema: Joi.object({
    id: requiredIdSchema,
    name: Joi.string().max(50).trim().optional(),
    description: Joi.string().max(120).trim().optional().allow(null, ''),
    order: Joi.array()
      .items(
        Joi.object().keys({
          audioId: requiredIdSchema,
          index: Joi.number().required()
        })
      )
      .min(1)
      .optional()
  }).or('name', 'description', 'order'),
  getSuggestedContentSchema: Joi.object({
    playlistId: requiredIdSchema,
    limit: Joi.number().optional().allow(null, ''),
    search: Joi.string()
      .max(50)
      .optional()
      .allow(null, '')
      .regex(/^[^*$\\]+$/)
  }),
  playlistAddRemoveAudioSchema: Joi.object({
    playlistId: requiredIdSchema,
    audioId: requiredIdSchema,
    audioType: Joi.string().valid('breathwork', 'meditation', 'shoorah_pod', 'sound').required()
  }),
  getPodExpertsSchema: Joi.object({
    id: idSchema.optional().allow(null, ''),
    page: Joi.number().min(1).optional().allow(null, ''),
    limit: Joi.number().min(1).optional().allow(null, ''),
    search: Joi.string()
      .max(50)
      .optional()
      .allow(null, '')
      .regex(/^[^*$\\]+$/)
  }),

  getSurveysSchema: Joi.object({
    type: Joi.number().valid(...Object.values(USER_SURVEY_TYPE)),
    page: Joi.number().min(1).optional().allow(null, ''),
    limit: Joi.number().min(1).optional().allow(null, '')
  }),
  surveySubmissionSchema: Joi.object({
    surveyId: requiredIdSchema,
    questionId: requiredIdSchema,
    option: Joi.string().when('skipped', {
      is: true,
      then: Joi.optional().valid('', null),
      otherwise: Joi.required()
    }),
    skipped: Joi.boolean()
  })
};
