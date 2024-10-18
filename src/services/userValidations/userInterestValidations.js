'use strict';

const Joi = require('joi');
const { validationMessageKey } = require('@services/Helper');
const { validationErrorResponseData } = require('@services/Response');
const { FOCUS_TYPE } = require('@services/Constant');
const { focusIds } = require('@services/adminValidations/affirmationValidations');

module.exports = {
  addEditUserInterestValidation: (req, res, callback) => {
    const schema = Joi.object({
      focusType: Joi.number().required().strict().valid(FOCUS_TYPE.MAIN, FOCUS_TYPE.AFFIRMATION),
      mainFocusIds: focusIds
        .optional()
        .when('focusType', {
          is: FOCUS_TYPE.MAIN,
          then: Joi.required(),
          otherwise: Joi.valid(null)
        })
        .allow(null, ''),
      affirmationFocusIds: focusIds
        .optional()
        .when('focusType', {
          is: FOCUS_TYPE.AFFIRMATION,
          then: Joi.required(),
          otherwise: Joi.valid(null)
        })
        .allow(null, '')
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('addEditUserInterestValidation', error))
      );
    }
    return callback(true);
  },
  focusListValidation: (req, res, callback) => {
    const schema = Joi.object({
      focusType: Joi.number().required().valid(FOCUS_TYPE.MAIN, FOCUS_TYPE.AFFIRMATION)
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('focusListValidation', error))
      );
    }
    return callback(true);
  }
};
