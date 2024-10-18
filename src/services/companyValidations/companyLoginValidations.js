'use strict';

const Joi = require('joi');
const { joiPasswordExtendCore } = require('joi-password');
const JoiPassword = Joi.extend(joiPasswordExtendCore);
const { validationMessageKey } = require('@services/Helper');
const { validationErrorResponseData } = require('@services/Response');
const { DEVICE_TYPE } = require('@services/Constant');
const { email } = require('@services/companyValidations/companyValidations');

module.exports = {
  companyLoginValidations: (req, res, callback) => {
    const schema = Joi.object({
      email,
      password: JoiPassword.string().noWhiteSpaces().min(6).required()
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('companyLoginValidations', error))
      );
    }
    return callback(true);
  },
  //   forgetPasswordValidations: (req, res, callback) => {
  //     const schema = Joi.object({
  //       email
  //     });
  //     const { error } = schema.validate(req);
  //     if (error) {
  //       return validationErrorResponseData(
  //         res,
  //         res.__(validationMessageKey('forgetPasswordValidations', error))
  //       );
  //     }
  //     return callback(true);
  //   },
  //   adminChangePasswordValidations: (req, res, callback) => {
  //     const schema = Joi.object({
  //       oldPassword: JoiPassword.string().required(),
  //       newPassword: JoiPassword.string().noWhiteSpaces().min(6).required()
  //     });
  //     const { error } = schema.validate(req);
  //     if (error) {
  //       return validationErrorResponseData(
  //         res,
  //         res.__(validationMessageKey('adminChangePasswordValidations', error))
  //       );
  //     }
  //     return callback(true);
  //   },
  //   adminResetPasswordValidations: (req, res, callback) => {
  //     const schema = Joi.object({
  //       email,
  //       otp: Joi.string().required().trim(),
  //       newPassword: JoiPassword.string().noWhiteSpaces().min(6).required()
  //     });
  //     const { error } = schema.validate(req);
  //     if (error) {
  //       return validationErrorResponseData(
  //         res,
  //         res.__(validationMessageKey('adminResetPasswordValidations', error))
  //       );
  //     }
  //     return callback(true);
  //   },

  removeCompanyDeviceTokenValidation: (req, res, callback) => {
    const schema = Joi.object({
      deviceToken: Joi.string().required().trim()
    }).unknown();
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('removeCompanyDeviceToken', error))
      );
    }
    return callback(true);
  },

  addEditDeviceTokenValidation: (req, res, callback) => {
    const schema = Joi.object({
      deviceType: Joi.number().required().valid(DEVICE_TYPE.WEB),
      deviceToken: Joi.string().required().trim()
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('addEditDeviceTokenValidation', error))
      );
    }
    return callback(true);
  },

  refreshTokenValidation: (req, res, callback) => {
    const schema = Joi.object({
      refreshToken: Joi.string().required()
    }).unknown();
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('refreshTokenValidation', error))
      );
    }
    return callback(true);
  }
};
