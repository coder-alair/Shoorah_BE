'use strict';

const Joi = require('joi');
const { validationMessageKey } = require('@services/Helper');
const { validationErrorResponseData } = require('@services/Response');
const { REPORT_TYPE, MOOD_REPORT_DURATION } = require('../Constant');

module.exports = {
  addEditBeforeLogsValidation: (req, res, callback) => {
    const schema = Joi.object({
      anxious: Joi.number().strict().min(0).max(5).required(),
      calm: Joi.number()
        .strict()
        .min(0)
        .max(5)
        .when('anxious', { is: 0, then: Joi.required(), otherwise: Joi.valid(0) }),
      sad: Joi.number().strict().min(0).max(5).required(),
      happy: Joi.number()
        .strict()
        .min(0)
        .max(5)
        .when('sad', { is: 0, then: Joi.required(), otherwise: Joi.valid(0) }),
      noisy: Joi.number().strict().min(0).max(5).required(),
      quiet: Joi.number()
        .strict()
        .min(0)
        .max(5)
        .when('noisy', { is: 0, then: Joi.required(), otherwise: Joi.valid(0) }),
      cold: Joi.number().strict().min(0).max(5).required(),
      warm: Joi.number()
        .strict()
        .min(0)
        .max(5)
        .when('cold', { is: 0, then: Joi.required(), otherwise: Joi.valid(0) }),
      agitated: Joi.number().strict().min(0).max(5).required(),
      peaceful: Joi.number()
        .strict()
        .min(0)
        .max(5)
        .when('agitated', { is: 0, then: Joi.required(), otherwise: Joi.valid(0) }),
      uneasy: Joi.number().strict().min(0).max(5).required(),
      settled: Joi.number()
        .strict()
        .min(0)
        .max(5)
        .when('uneasy', { is: 0, then: Joi.required(), otherwise: Joi.valid(0) }),
      worried: Joi.number().strict().min(0).max(5).required(),
      atEase: Joi.number()
        .strict()
        .min(0)
        .max(5)
        .when('worried', { is: 0, then: Joi.required(), otherwise: Joi.valid(0) }),
      overwhelmed: Joi.number().strict().min(0).max(5).required(),
      inControl: Joi.number()
        .strict()
        .min(0)
        .max(5)
        .when('overwhelmed', { is: 0, then: Joi.required(), otherwise: Joi.valid(0) })
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('addEditBeforeLogsValidation', error))
      );
    }
    return callback(true);
  },
  addEditAfterLogsValidation: (req, res, callback) => {
    const schema = Joi.object({
      tossingTurning: Joi.number().strict().min(0).max(5).required(),
      sleepSoundly: Joi.number()
        .strict()
        .min(0)
        .max(5)
        .when('tossingTurning', { is: 0, then: Joi.required(), otherwise: Joi.valid(0) }),
      lightSleep: Joi.number().strict().min(0).max(5).required(),
      deepSleep: Joi.number()
        .strict()
        .min(0)
        .max(5)
        .when('lightSleep', { is: 0, then: Joi.required(), otherwise: Joi.valid(0) }),
      nightmare: Joi.number().strict().min(0).max(5).required(),
      lovelyDream: Joi.number()
        .strict()
        .min(0)
        .max(5)
        .when('nightmare', { is: 0, then: Joi.required(), otherwise: Joi.valid(0) }),
      restless: Joi.number().strict().min(0).max(5).required(),
      still: Joi.number()
        .strict()
        .min(0)
        .max(5)
        .when('restless', { is: 0, then: Joi.required(), otherwise: Joi.valid(0) }),
      sweaty: Joi.number().strict().min(0).max(5).required(),
      cool: Joi.number()
        .strict()
        .min(0)
        .max(5)
        .when('sweaty', { is: 0, then: Joi.required(), otherwise: Joi.valid(0) }),
      sleepwalking: Joi.number().strict().min(0).max(5).required(),
      stayingPut: Joi.number()
        .strict()
        .min(0)
        .max(5)
        .when('sleepwalking', { is: 0, then: Joi.required(), otherwise: Joi.valid(0) }),
      snoring: Joi.number().strict().min(0).max(5).required(),
      silent: Joi.number()
        .strict()
        .min(0)
        .max(5)
        .when('snoring', { is: 0, then: Joi.required(), otherwise: Joi.valid(0) }),
      needMoreSleep: Joi.number().strict().min(0).max(5).required(),
      rested: Joi.number()
        .strict()
        .min(0)
        .max(5)
        .when('needMoreSleep', { is: 0, then: Joi.required(), otherwise: Joi.valid(0) }),
      nocturnalEating: Joi.number().strict().min(0).max(5).required(),
      noMidnightSnacks: Joi.number()
        .strict()
        .min(0)
        .max(5)
        .when('nocturnalEating', { is: 0, then: Joi.required(), otherwise: Joi.valid(0) })
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('addEditAfterLogsValidation', error))
      );
    }
    return callback(true);
  },
  getSleepLogsDetailsValidation: (req, res, callback) => {
    const schema = Joi.object({
      reportType: Joi.number()
        .valid(REPORT_TYPE.DAILY, REPORT_TYPE.WEEKLY, REPORT_TYPE.MONTHLY, REPORT_TYPE.YEARLY)
        .required(),
      reportFromDate: Joi.date()
        .iso()
        .when('reportType', {
          is: REPORT_TYPE.DAILY,
          then: Joi.required(),
          otherwise: Joi.valid(null)
        })
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('getBeforeSleepDetailsValidation', error))
      );
    }
    return callback(true);
  },

  downloadSleepReportValidation: (req, res, callback) => {
    const schema = Joi.object({
      reportType: Joi.number()
        .valid(...Object.values(MOOD_REPORT_DURATION).map((x) => x))
        .required(),
      reportFromDate: Joi.date()
        .iso()
        .when('reportType', {
          is: MOOD_REPORT_DURATION.CUSTOM_DATES,
          then: Joi.required(),
          otherwise: Joi.valid(null)
        }),
      reportToDate: Joi.date()
        .iso()
        .when('reportType', {
          is: MOOD_REPORT_DURATION.CUSTOM_DATES,
          then: Joi.required(),
          otherwise: Joi.valid(null)
        })
        .min(Joi.ref('reportFromDate'))
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('downloadSleepReportValidation', error))
      );
    }
    return callback(true);
  }
};
