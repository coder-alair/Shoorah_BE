'use strict';

const Joi = require('joi');
const { joiPasswordExtendCore } = require('joi-password');
const JoiPassword = Joi.extend(joiPasswordExtendCore);
const { validationMessageKey } = require('@services/Helper');
const { validationErrorResponseData } = require('@services/Response');
const { GENDER, DEVICE_TYPE, ON_BOARD_STEPS, USER_TYPE } = require('@services/Constant');
const { email } = require('@services/adminValidations/adminValidations');

module.exports = {
  userSignUpValidation: (req, res, callback) => {
    const schema = Joi.object({
      name: Joi.string().max(50).required().trim(),
      jobRole: Joi.string().max(100).optional().trim(),
      email: Joi.alternatives().conditional(Joi.ref('mobile'), {
        then: Joi.valid(null, ''),
        otherwise: email
      }),
      // isSocialLogin: Joi.boolean().optional(),
      // loginType: Joi.boolean().optional(),
      // password: JoiPassword.string().noWhiteSpaces().min(6).optional(),
      isSocialLogin: Joi.boolean().optional(),
      loginType: Joi.number().when('isSocialLogin', {
        is: true,
        then: Joi.required(),
        otherwise: Joi.optional()
      }),
      password: JoiPassword.string().noWhiteSpaces().min(6).when('isSocialLogin', {
        is: false,
        then: Joi.required(),
        otherwise: Joi.optional()
      }),
      profile: Joi.string().optional().allow(null, '').trim(),
      dob: Joi.date().iso().optional().allow(null, ''),
      gender: Joi.array()
        .items(
          Joi.number().valid(
            GENDER.NOT_PREFERRED,
            GENDER.MALE,
            GENDER.FEMALE,
            GENDER.NON_BINARY,
            GENDER.INTERSEX,
            GENDER.TRANSGENDER
          )
        )
        .optional()
        .allow(null, ''),
      countryCode: Joi.string().when('email', {
        is: Joi.equal(null, ''),
        then: Joi.optional(),
        otherwise: Joi.valid(null, '')
      }),
      userType: Joi.number().valid(USER_TYPE.EXPERT),
      mobile: Joi.string()
        .min(5)
        .when('email', {
          is: Joi.equal(null, ''),
          then: Joi.optional(),
          otherwise: Joi.valid(null, '')
        })
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('userSignUpValidation', error))
      );
    }
    return callback(true);
  },

  userOTPVerifyValidation: (req, res, callback) => {
    const schema = Joi.object({
      email: Joi.alternatives().conditional(Joi.string().email(), {
        then: email,
        otherwise: Joi.string().required()
      }),
      otp: JoiPassword.string().required().trim(),
      deviceType: Joi.number()
        .required()
        .valid(DEVICE_TYPE.ANDROID, DEVICE_TYPE.IOS, DEVICE_TYPE.WEB),
      deviceToken: Joi.string().required().trim()
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('userOTPVerifyValidation', error))
      );
    }
    return callback(true);
  },
  userForgotPasswordValidation: (req, res, callback) => {
    const schema = Joi.object({
      email: Joi.alternatives().conditional(Joi.string().email(), {
        then: email,
        otherwise: Joi.string().required()
      })
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('userForgotPasswordValidation', error))
      );
    }
    return callback(true);
  },
  userResetPasswordValidation: (req, res, callback) => {
    const schema = Joi.object({
      email: Joi.alternatives().conditional(Joi.string().email(), {
        then: email,
        otherwise: Joi.string().required()
      }),
      otp: Joi.string().required().trim(),
      newPassword: JoiPassword.string().noWhiteSpaces().min(6).required(),
      confirmPassword: JoiPassword.string()
        .noWhiteSpaces()
        .min(6)
        .required()
        .valid(Joi.ref('newPassword'))
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('userResetPasswordValidation', error))
      );
    }
    return callback(true);
  },
  userChangePasswordValidation: (req, res, callback) => {
    const schema = Joi.object({
      oldPassword: JoiPassword.string().noWhiteSpaces().min(6).required(),
      newPassword: JoiPassword.string()
        .noWhiteSpaces()
        .min(6)
        .required()
        .disallow(Joi.ref('oldPassword')),
      confirmPassword: JoiPassword.string()
        .noWhiteSpaces()
        .min(6)
        .required()
        .valid(Joi.ref('newPassword'))
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('userChangePasswordValidation', error))
      );
    }
    return callback(true);
  },
  removeUserDeviceTokenValidation: (req, res, callback) => {
    const schema = Joi.object({
      deviceToken: Joi.string().required().trim()
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('removeUserDeviceTokenValidation', error))
      );
    }
    return callback(true);
  },
  versionCompatibilityValidation: (req, res, callback) => {
    const schema = Joi.object({
      devicetype: Joi.number().required().valid(DEVICE_TYPE.ANDROID, DEVICE_TYPE.IOS),
      appversion: Joi.string().required().trim()
    }).unknown();
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('versionCompatibilityValidation', error))
      );
    }
    return callback(true);
  },
  updateOnBoardStepValidation: (req, res, callback) => {
    const schema = Joi.object({
      onBoardStep: Joi.number()
        .required()
        .valid(...Object.values(ON_BOARD_STEPS).map((x) => x))
        .allow(null)
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('updateOnBoardStepValidation', error))
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
  },
  deleteUserAccountValidation: (req, res, callback) => {
    const schema = Joi.object({
      authorizationCode: Joi.string().optional().allow(null, '')
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('deleteUserAccountValidation', error))
      );
    }
    return callback(true);
  }
};
