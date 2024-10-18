'use strict';

const Joi = require('joi');
const { validationMessageKey } = require('@services/Helper');
const { validationErrorResponseData } = require('@services/Response');
const { id } = require('@services/adminValidations/adminValidations');

module.exports = {
  addEditUserFolderValidation: (req, res, callback) => {
    const schema = Joi.object({
      folderId: id.allow(null, ''),
      name: Joi.string().required().trim(),
      folderType:Joi.number().required(),
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('addEditUserFoldersValidation', error))
      );
    }
    return callback(true);
  },
  userFoldersDetailedListValidation: (req, res, callback) => {
    const schema = Joi.object({
        folderType:Joi.number().required(),
        searchKey: Joi.string()
        .optional()
        .allow(null, '')
        .regex(/^[^*$\\]+$/)
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('userFoldersDetailedListValidation', error))
      );
    }
    return callback(true);
  },
  deleteFolderValidation: (req, res, callback) => {
    const schema = Joi.object({
      folderId: id
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('deleteFoldersValidation', error))
      );
    }
    return callback(true);
  }
};
