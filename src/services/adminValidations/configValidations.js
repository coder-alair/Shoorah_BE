'use strict';

const Joi = require('joi');
const { validationMessageKey } = require('@services/Helper');
const { validationErrorResponseData } = require('@services/Response');
const { CONFIG_TYPE } = require('@services/Constant');

module.exports = {
  updateConfigValidation: (req, res, callback) => {
    const schema = Joi.object().keys({
      configKey: Joi.number()
        .strict()
        .required()
        .valid(...Object.values(CONFIG_TYPE).map((x) => x)),
      configValue: Joi.object({
        ios: Joi.boolean(),
        android: Joi.boolean(),
        website: Joi.boolean(),
        minVersion: Joi.string()
          .trim()
          .regex(/^[0-9](\.[0-9]{1,2}){0,2}$/),
        message: Joi.string().trim(),
        mandatoryUpdate: Joi.boolean()
      })
        .when('configKey', {
          is: CONFIG_TYPE.MAINTENANCE_MODE,
          then: Joi.object({
            ios: Joi.required(),
            android: Joi.required(),
            website: Joi.required()
          })
        })
        .when('configKey', {
          is: [CONFIG_TYPE.IOS_UPDATE, CONFIG_TYPE.ANDROID_UPDATE],
          then: Joi.object({
            minVersion: Joi.required(),
            message: Joi.required(),
            mandatoryUpdate: Joi.required()
          })
        })
        .when('configKey', {
          is: CONFIG_TYPE.USER_RESTRICTION,
          then: Joi.object({
            playCount: Joi.number().required(),
            exploreAccess: Joi.boolean().required(),
            trendingAccess: Joi.boolean().required(),
            ritualAccess: Joi.boolean().required(),
            notepadCount: Joi.number().required(),
            gratitudeCount: Joi.number().required(),
            cleanseCount: Joi.number().required(),
            goalsCount: Joi.number().required(),
            moodAccess: Joi.boolean().required(),
            moodReportAccess: Joi.boolean().required()
          }).required()
        })
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('updateConfigValidation', error))
      );
    }
    return callback(true);
  }
};
