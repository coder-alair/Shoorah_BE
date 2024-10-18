'use strict';

const Joi = require('joi');
const { validationMessageKey } = require('@services/Helper');
const { validationErrorResponseData } = require('@services/Response');
const { SOCIAL_LOGIN_TYPE, DEVICE_TYPE } = require('@services/Constant');

module.exports = {
  socialLoginValidation: (req, res, callback) => {
    const schema = Joi.object({
      socialLoginToken: Joi.string().required(),
      loginType: Joi.number()
        .required()
        .valid(SOCIAL_LOGIN_TYPE.GOOGLE, SOCIAL_LOGIN_TYPE.APPLE, SOCIAL_LOGIN_TYPE.FACEBOOK),
      deviceToken: Joi.string().required().trim(),
      deviceType: Joi.number()
        .required()
        .valid(DEVICE_TYPE.ANDROID, DEVICE_TYPE.IOS, DEVICE_TYPE.WEB)
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('socialLoginValidation', error))
      );
    }
    return callback(true);
  }
};
