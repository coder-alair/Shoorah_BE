'use strict';

const Joi = require('joi');
const { validationMessageKey } = require('@services/Helper');
const { validationErrorResponseData } = require('@services/Response');
const { REMINDER_TYPE } = require('@services/Constant');

module.exports = {
  addUpdateReminderValidation: (req, res, callback) => {
    const schema = Joi.object({
      reminders: Joi.array()
        .items(
          Joi.object({
            reminderType: Joi.string()
              .required()
              .valid(...Object.values(REMINDER_TYPE).map((x) => x)),
            reminderPeriod: Joi.number().strict().min(0).max(3).required(),
            interval: Joi.number()
              .strict()
              .min(0)
              .max(10)
              .required()
              .when('reminderPeriod', { is: 0, then: Joi.valid(0) })
          }).required()
        )
        .unique()
        .required()
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('addUpdateReminderValidation', error))
      );
    }
    return callback(true);
  }
};
