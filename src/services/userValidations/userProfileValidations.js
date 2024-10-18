'use strict';

const Joi = require('joi');
const { validationMessageKey } = require('@services/Helper');
const { validationErrorResponseData } = require('@services/Response');
const { GENDER, IMAGE_MIMETYPE } = require('@services/Constant');
const { id } = require('@services/adminValidations/adminValidations');
const { joiPasswordExtendCore } = require('joi-password');
const JoiPassword = Joi.extend(joiPasswordExtendCore);
const { email } = require('@services/adminValidations/adminValidations');

module.exports = {
  getUserProfileValidation: (req, res, callback) => {
    const schema = Joi.object({
      userId: id
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('getUserProfileValidation', error))
      );
    }
    return callback(true);
  },
  editUserProfileValidation: (req, res, callback) => {
    const schema = Joi.object({
      name: Joi.string().max(50).optional().trim(),
      dob: Joi.date().iso().optional().allow(null, ''),
      isAudioFeedbackDisabled: Joi.boolean().optional(),
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
      profile: Joi.string()
        .optional()
        .allow(null, '')
        .valid(...IMAGE_MIMETYPE.map((x) => x)),
      isImageDeleted: Joi.boolean().optional(),
      jobRole: Joi.string().optional().allow(null, '')
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('editUserProfileValidation', error))
      );
    }
    return callback(true);
  },
  editUserProfileWebValidation: (req, res, callback) => {
    const schema = Joi.object({
      firstName: Joi.string().max(50).required().trim(),
      lastName: Joi.string().max(50).required().trim(),
      jobRole: Joi.string().optional().allow(null, ''),
      isAudioFeedbackDisabled: Joi.boolean().optional(),
      email: Joi.alternatives().conditional(Joi.string().email(), {
        then: email,
        otherwise: Joi.string().required()
      }),
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
        .required()
        .allow(null, ''),
      profile: Joi.string()
        .optional()
        .allow(null, '')
        .valid(...IMAGE_MIMETYPE.map((x) => x)),
      isImageDeleted: Joi.boolean().required(),
      country: Joi.string().max(50).optional().trim(),
      password: JoiPassword.string().noWhiteSpaces().min(6).required()
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('editUserProfileValidation', error))
      );
    }
    return callback(true);
  }
};
