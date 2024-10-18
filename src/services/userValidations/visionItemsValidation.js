'use strict';

const Joi = require('joi');
const { validationMessageKey } = require('../../services/Helper');
const { validationErrorResponseData } = require('../../services/Response');
const { ITEM_TYPE } = require('../../services/Constant');

module.exports = {
  addEditVisionItemsValidation: (req, res, callback) => {
    const schema = Joi.object({
      vision_item_id: Joi.string().optional().allow(null, ""),
      vision_id: Joi.string().required(),
      item_type: Joi.number()
        .when('vision_item_id', {
          is: Joi.exist(),
          then: Joi.optional(),
          otherwise: Joi.required()
        })
        .valid(ITEM_TYPE.WORD_TYPE, ITEM_TYPE.PHOTO_TYPE),
      main_text: Joi.string().optional().allow(null, ''),
      title: Joi.string().optional().allow(null, ''),
      story: Joi.string().optional().allow(null, ''),
      secondary_text: Joi.string().allow(null, ''),
      theme: Joi.string().allow(null, ''),
      isRandomImage: Joi.boolean().required(),
      image_url: Joi.string()
        .when('item_type', {
          is: ITEM_TYPE.PHOTO_TYPE,
          then: Joi.optional(),
          otherwise: Joi.optional()
        }).allow(null, ""),
      created_by: Joi.string().optional().allow(null, ""),
      created_at: Joi.string().optional().allow(null, ""),
      image: Joi.array().optional(),
      color_code: Joi.string().optional().allow(null, ''),
      main_text_color: Joi.string().optional().allow(null, ''),
      text_color: Joi.string().optional().allow(null, ''),
      secondary_text_color: Joi.string().optional().allow(null, ''),
      tags: Joi.array().items(Joi.string().optional())
    });
    const { error } = schema.validate(req);
    console.log(error);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('visionItemsCompletedStatusValidation', error))
      );
    }
    return callback(true);
  },
  deleteVisionItemsValidation: (req, res, callback) => {
    const schema = Joi.object({
      vision_item_id: Joi.string().required()
    });
    const { error } = schema.validate(req);
    console.log(error);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('visionItemsCompletedStatusValidation', error))
      );
    }
    return callback(true);
  },
  reorderVisionItemsValidation: (req, res, callback) => {
    const schema = Joi.object({ item_ids: Joi.array().items(Joi.string().required()) });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('visionItemsCompletedStatusValidation', error))
      );
    }
    return callback(true);
  }
};
