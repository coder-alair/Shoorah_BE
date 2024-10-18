'use strict';

const Joi = require('joi');
const { validationMessageKey } = require('@services/Helper');
const { validationErrorResponseData } = require('@services/Response');
const { DISPOSABLE_EMAIL_DOMAINS, NODE_ENVIRONMENT } = require('@services/Constant');
const email = Joi.string()
  .max(50)
  .required()
  .email()
  .trim()
  .pattern(/^[^+]+$/)
  .custom((value, helper) => {
    if (
      DISPOSABLE_EMAIL_DOMAINS.includes(value.split('@')[1]) &&
      process.env.NODE_ENV === NODE_ENVIRONMENT.PRODUCTION
    ) {
      return validationErrorResponseData(
        helper,
        helper.__(validationMessageKey('addEditCompanyValidation', helper))
      );
    } else {
      return true;
    }
  });

module.exports = {
  email
};
