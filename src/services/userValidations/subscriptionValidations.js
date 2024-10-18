'use strict';

const Joi = require('joi');
const { validationMessageKey } = require('@services/Helper');
const { validationErrorResponseData } = require('@services/Response');
const { DEVICE_TYPE, OFFER_TYPE } = require('@services/Constant');

module.exports = {
  verifyInAppPurchaseValidation: (req, res, callback) => {
    const schema = Joi.object({
      receiptData: Joi.string().required(),
      deviceType: Joi.string().required().valid(DEVICE_TYPE.ANDROID, DEVICE_TYPE.IOS),
      productId: Joi.string().when('deviceType', { is: DEVICE_TYPE.ANDROID, then: Joi.required() })
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('verifyInAppPurchaseValidation', error))
      );
    }
    return callback(true);
  },
  applePubSubNotificationValidation: (req, res, callback) => {
    const schema = Joi.object({
      signedPayload: Joi.string().required()
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('applePubSubNotificationValidation', error))
      );
    }
    return callback(true);
  },
  createAppleSignatureValidation: (req, res, callback) => {
    const schema = Joi.object({
      appBundleID: Joi.string().required(),
      productIdentifier: Joi.string().required(),
      offerID: Joi.string()
        .required()
        .valid(...Object.values(OFFER_TYPE).map((x) => x)),
      applicationUsername: Joi.string().required()
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('createAppleSignatureValidation', error))
      );
    }
    return callback(true);
  }
};
