'use strict';

const Joi = require('joi');
const { validationMessageKey } = require('@services/Helper');
const { validationErrorResponseData } = require('@services/Response');
const { CMS_ALIAS } = require('@services/Constant');

module.exports = {
  cmsDetailedListValidation: (req, res, callback) => {
    const schema = Joi.object({
      cmsAlias: Joi.string()
        .required()
        .valid(...Object.values(CMS_ALIAS).map((x) => x))
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('cmsDetailedListValidation', error))
      );
    }
    return callback(true);
  }
};
