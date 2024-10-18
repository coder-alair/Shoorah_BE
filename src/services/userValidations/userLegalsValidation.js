'use strict';

const Joi = require('joi');
const { validationMessageKey } = require('@services/Helper');
const { validationErrorResponseData } = require('@services/Response');

module.exports = {
  updateUserLegalValidation: (req, res, callback) => {
    const schema = Joi.object().keys({
      legals: Joi.object({
        breathworkDisclaimer: Joi.boolean(),
        shuruDisclaimer: Joi.boolean(),
        surveyDisclaimer: Joi.boolean(),
        selfAssessmentDisclaimer: Joi.boolean(),
      })
             
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('updateUserLegalValidation', error))
      );
    }
    return callback(true);
  }
};
