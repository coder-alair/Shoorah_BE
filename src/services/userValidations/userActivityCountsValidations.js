'use strict';

const Joi = require('joi');
const { validationMessageKey } = require('@services/Helper');
const { validationErrorResponseData } = require('@services/Response');
const { FEATURE_TYPE } = require('@services/Constant');

module.exports = {
  updateUserActivityCountValidation: (req, res, callback) => {
    const schema = Joi.object({
      featureType: Joi.number()
        .required()
        .strict()
        .valid(...Object.values(FEATURE_TYPE).map((x) => x))
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('updateUserActivityCountValidation', error))
      );
    }
    return callback(true);
  }
};
