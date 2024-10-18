'use strict';

const Joi = require('joi');
const { validationMessageKey } = require('@services/Helper');
const { validationErrorResponseData } = require('@services/Response');
const { BADGE_TYPE } = require('@services/Constant');

module.exports = {
  badgeDetailsListValidation: (req, res, callback) => {
    const schema = Joi.object({
      badgeType: Joi.number()
        .required()
        .valid(...Object.values(BADGE_TYPE).map((x) => x))
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('badgeDetailsListValidation', error))
      );
    }
    return callback(true);
  }
};
