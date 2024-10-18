'use strict';

const Joi = require('joi');
const { validationMessageKey } = require('@services/Helper');
const { validationErrorResponseData } = require('@services/Response');
const { TUTORIAL_CONTENT_TYPE, IMAGE_MIMETYPE, VIDEO_MIMETYPE } = require('@services/Constant');

module.exports = {
  addEditTutorialVideosValidation: (req, res, callback) => {
    const schema = Joi.object({
      videoUrl: Joi.string()
        .required()
        .allow(null, '')
        .valid(...VIDEO_MIMETYPE.map((x) => x)),
      thumbnail: Joi.string()
        .required()
        .allow(null, '')
        .valid(...IMAGE_MIMETYPE.map((x) => x)),
      duration: Joi.string()
        .when('videoUrl', { is: Joi.exist(), then: Joi.required() })
        .regex(/^(([0-1]?[0-9]|2[0-3]):)?([0-5][0-9]:)?([0-5][0-9])$/),
      contentType: Joi.number()
        .strict()
        .required()
        .valid(...Object.values(TUTORIAL_CONTENT_TYPE).map((x) => x)),
      heading: Joi.string().optional(),
      subHeading: Joi.string().optional(),
      isImageDeleted: Joi.boolean().required(),
      isVideoDeleted: Joi.boolean().required()
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('addEditTutorialVideosValidation', error))
      );
    }
    return callback(true);
  },
  getTutorialVideoValidation: (req, res, callback) => {
    const schema = Joi.object({
      contentType: Joi.number()
        .required()
        .valid(...Object.values(TUTORIAL_CONTENT_TYPE).map((x) => x))
        .allow(null, '')
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('getTutorialVideoValidation', error))
      );
    }
    return callback(true);
  }
};
