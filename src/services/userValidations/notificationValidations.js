'use strict';

const Joi = require('joi');
const { validationMessageKey } = require('@services/Helper');
const { validationErrorResponseData } = require('@services/Response');
const { id } = require('@services/adminValidations/adminValidations');

module.exports = {
  listUserNotificationValidation: (req, res, callback) => {
    const schema = Joi.object({
      page: Joi.number().optional(),
      perPage: Joi.number().optional(),
      companyId: Joi.string().optional(),

      searchKey: Joi.string()
        .optional()
        .allow(null, '')
        .regex(/^[^*$\\]+$/)
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('listUserNotificationValidation', error))
      );
    }
    return callback(true);
  },
  deleteNotificationValidation: (req, res, callback) => {
    const schema = Joi.object({
      notificationId: id
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('deleteNotificationValidation', error))
      );
    }
    return callback(true);
  }
};
