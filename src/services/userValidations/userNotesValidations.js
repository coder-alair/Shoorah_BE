'use strict';

const Joi = require('joi');
const { validationMessageKey } = require('@services/Helper');
const { validationErrorResponseData } = require('@services/Response');
const { IMAGE_MIMETYPE } = require('@services/Constant');

const id = Joi.string()
  .optional()
  .regex(/^[0-9a-fA-F]{24}$/);

module.exports = {
  addEditUserNotesValidation: (req, res, callback) => {
    const schema = Joi.object({
      notesId: id.allow(null, ''),
      title: Joi.string().required().trim(),
      imageUrl: Joi.string()
        .required()
        .allow(null, '')
        .valid(...IMAGE_MIMETYPE.map((x) => x)),
      description: Joi.string()
        .trim()
        .when('isSaved', {
          is: false,
          then: Joi.optional().allow(null, ''),
          otherwise: Joi.required()
        }),
      folderId: id.allow(null, ''),
      isSaved: Joi.boolean().required(),
      isImageDeleted: Joi.boolean().required()
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('addEditUserNotesValidation', error))
      );
    }
    return callback(true);
  },
  userNotesDetailedListValidation: (req, res, callback) => {
    const schema = Joi.object({
      isSaved: Joi.boolean().required(),
      page: Joi.number().optional(),
      perPage: Joi.number().optional(),
      startDate: Joi.date()
        .iso()
        .optional(),
      endDate: Joi.date()
        .iso()
        .min(Joi.ref('startDate'))
        .optional(),
      folderId: id.allow(null, ''),
      searchKey: Joi.string()
        .optional()
        .allow(null, '')
        .regex(/^[^*$\\]+$/)
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('userNotesDetailedListValidation', error))
      );
    }
    return callback(true);
  },
  deleteNoteValidation: (req, res, callback) => {
    const schema = Joi.object({
      notesId: id
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('deleteNoteValidation', error))
      );
    }
    return callback(true);
  }
};
