'use strict';

const Joi = require('joi');
const { validationMessageKey } = require('@services/Helper');
const { validationErrorResponseData } = require('@services/Response');
const { DEVICE_TYPE } = require('@services/Constant');

module.exports = {
  maintenanceMiddlewareValidation: (req, res, callback) => {
    const schema = Joi.object({
      deviceType: Joi.number()
        .required()
        .valid(...Object.values(DEVICE_TYPE).map((x) => x))
    }).unknown();
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('maintenanceMiddlewareValidation', error))
      );
    }
    return callback(true);
  }
};
