'use strict';

const Joi = require('joi');
const { validationMessageKey } = require('@services/Helper');
const { validationErrorResponseData } = require('@services/Response');
const { CONTENT_TYPE, USER_CONTENT_TYPE } = require('@services/Constant');
const { id } = require('@services/adminValidations/adminValidations');

module.exports = {
  addToTrendingValidation: (req, res, callback) => {
    const schema = Joi.object({
      contentId: id,
      contentType: Joi.number()
        .required()
        .strict()
        .valid(
          CONTENT_TYPE.MEDITATION,
          CONTENT_TYPE.SOUND,
          CONTENT_TYPE.SHOORAH_PODS,
          CONTENT_TYPE.AFFIRMATION,
          CONTENT_TYPE.RITUALS,
          CONTENT_TYPE.BREATHWORK
        ),
      duration: Joi.number().strict().optional(),
      trendingDate: Joi.date().iso().required()
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('addToTrendingValidation', error))
      );
    }
    return callback(true);
  },
  getContentDetailsValidation: (req, res, callback) => {
    const schema = Joi.object({
      contentType: Joi.number()
        .required()
        .valid(...Object.values(USER_CONTENT_TYPE).map((x) => x)),
      contentId: id
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('getContentDetailsValidation', error))
      );
    }
    return callback(true);
  }
};
