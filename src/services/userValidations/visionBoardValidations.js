'use strict';

const Joi = require('joi');
const { validationMessageKey } = require('@services/Helper');
const { validationErrorResponseData } = require('@services/Response');
const { REPORT_TYPE, MOOD_REPORT_DURATION } = require('@services/Constant');
const { id } = require('@services/adminValidations/adminValidations');

module.exports = {
  addEditVisionBoardValidation: (req, res, callback) => {
    const schema = Joi.object({
      visionId: Joi.string().allow(null, '').optional().trim(),
      idea: Joi.string().max(50).optional().trim(),
      title: Joi.string().max(50).required().trim(),
      sub_title: Joi.string().allow(null, '').optional().trim(),
      tag: Joi.string().allow(null, '').optional().trim(),
      theme: Joi.string().allow(null, '').optional(),
      color: Joi.string().allow(null, '').optional().trim(),
      text_color: Joi.string().allow(null, '').optional(),
      image: Joi.string().allow(null, '').optional().trim(),
      reminder: Joi.boolean().default(false),
      reminder_time: Joi.string().allow(null).allow('').optional().trim(),
      is_archive: Joi.string().allow(null).allow('').optional().trim()
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('addEditVisionBoardValidation', error))
      );
    }
    return callback(true);
  },
  deleteMyDeleteValidation: (req, res, callback) => {
    const schema = Joi.object({
      visionId: id
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('deleteMyVisionValidation', error))
      );
    }
    return callback(true);
  },

  reorderVisionValidation: (req, res, callback) => {
    const schema = Joi.object({ vision_ids: Joi.array().items(Joi.string().required()) });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('visionItemsCompletedStatusValidation', error))
      );
    }
    return callback(true);
  },
  visionBoardSettingValidation: (req, res, callback) => {
    const schema = Joi.object({
      title: Joi.string().allow('').optional().trim(),
      text_color: Joi.string().allow('').optional().trim(),
      theme: Joi.string().allow(null, '').optional(),
      photo_quality: Joi.string().allow('').optional().trim(),
      bg_image: Joi.string().allow('').optional().trim()
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('addEditVisionBoardValidation', error))
      );
    }
    return callback(true);
  }
};
