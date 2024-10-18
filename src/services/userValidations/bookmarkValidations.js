'use strict';

const Joi = require('joi');
const { validationMessageKey } = require('@services/Helper');
const { validationErrorResponseData } = require('@services/Response');
const { CONTENT_TYPE } = require('@services/Constant');
const { id } = require('@services/adminValidations/adminValidations');

module.exports = {
  addToBookmarksValidation: (req, res, callback) => {
    const schema = Joi.object({
      contentType: Joi.number()
        .required()
        .valid(
          CONTENT_TYPE.AFFIRMATION,
          CONTENT_TYPE.MEDITATION,
          CONTENT_TYPE.SOUND,
          CONTENT_TYPE.SHOORAH_PODS
        ),
      contentId: id
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('addToBookmarksValidation', error))
      );
    }
    return callback(true);
  },
  bookmarksListValidation: (req, res, callback) => {
    const schema = Joi.object({
      contentType: Joi.number()
        .required()
        .valid(
          CONTENT_TYPE.AFFIRMATION,
          CONTENT_TYPE.MEDITATION,
          CONTENT_TYPE.SOUND,
          CONTENT_TYPE.SHOORAH_PODS
        ),
      page: Joi.number().optional(),
      perPage: Joi.number().optional()
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('bookmarksListValidation', error))
      );
    }
    return callback(true);
  },
  removeBookmarkValidation: (req, res, callback) => {
    const schema = Joi.object({
      bookmarkId: id
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('removeBookmarkValidation', error))
      );
    }
    return callback(true);
  },
  allBookMarksListValidation: (req, res, callback) => {
    const schema = Joi.object({
      page: Joi.number().optional(),
      perPage: Joi.number().optional()
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('allBookMarksListValidation', error))
      );
    }
    return callback(true);
  }
};
