'use strict';

const Joi = require('joi');
const { validationMessageKey } = require('@services/Helper');
const { validationErrorResponseData } = require('@services/Response');
const { REPORT_TYPE, MOOD_REPORT_DURATION } = require('@services/Constant');

module.exports = {
  addEditMoodValidation: (req, res, callback) => {
    const schema = Joi.object({
      demotivated: Joi.number().strict().min(0).max(5).required(),
      motivated: Joi.number()
        .strict()
        .min(0)
        .max(5)
        .when('demotivated', { is: 0, then: Joi.required(), otherwise: Joi.valid(0) }),
      low: Joi.number().strict().min(0).max(5).required(),
      content: Joi.number()
        .strict()
        .min(0)
        .max(5)
        .when('low', { is: 0, then: Joi.required(), otherwise: Joi.valid(0) }),
      angry: Joi.number().strict().min(0).max(5).required(),
      sad: Joi.number().strict().min(0).max(5).required(),
      happy: Joi.number()
        .strict()
        .min(0)
        .max(5)
        .when('sad', { is: 0, then: Joi.required(), otherwise: Joi.valid(0) }),
      needSupport: Joi.number().strict().min(0).max(5).required(),
      iCanManage: Joi.number()
        .strict()
        .min(0)
        .max(5)
        .when('needSupport', { is: 0, then: Joi.required(), otherwise: Joi.valid(0) }),
      helpless: Joi.number().strict().min(0).max(5).required(),
      iAmInControl: Joi.number()
        .strict()
        .min(0)
        .max(5)
        .when('helpless', { is: 0, then: Joi.required(), otherwise: Joi.valid(0) }),
      tired: Joi.number().strict().min(0).max(5).required(),
      energised: Joi.number()
        .strict()
        .min(0)
        .max(5)
        .when('tired', { is: 0, then: Joi.required(), otherwise: Joi.valid(0) }),
      stressed: Joi.number().strict().min(0).max(5).required(),
      balanced: Joi.number()
        .strict()
        .min(0)
        .max(5)
        .when('stressed', { is: 0, then: Joi.required(), otherwise: Joi.valid(0) }),
      anxious: Joi.number().strict().min(0).max(5).required(),
      relaxed: Joi.number()
        .strict()
        .min(0)
        .max(5)
        .when('anxious', { is: 0, then: Joi.required(), otherwise: Joi.valid(0) }),
      calm: Joi.number()
        .strict()
        .min(0)
        .max(5)
        .when('angry', { is: 0, then: Joi.required(), otherwise: Joi.valid(0) }),
      notGood: Joi.number().min(0).max(5).optional(),
      great: Joi.number()
        .strict()
        .min(0)
        .max(5)
        .when('notGood', { is: 0, then: Joi.optional(), otherwise: Joi.valid(0) })
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('addEditMoodValidation', error))
      );
    }
    return callback(true);
  },

  professionalMoodValidation: (req, res, callback) => {
    const schema = Joi.object({
      dissatisfied: Joi.number().strict().min(0).max(5).required(),
      verySatisfied: Joi.number()
        .strict()
        .min(0)
        .max(5)
        .when('dissatisfied', { is: 0, then: Joi.required(), otherwise: Joi.valid(0) }),
      unpleasant: Joi.number().strict().min(0).max(5).required(),
      positive: Joi.number()
        .strict()
        .min(0)
        .max(5)
        .when('unpleasant', { is: 0, then: Joi.required(), otherwise: Joi.valid(0) }),
      inadequate: Joi.number().strict().min(0).max(5).required(),
      comprehensive: Joi.number()
        .strict()
        .min(0)
        .max(5)
        .when('inadequate', { is: 0, then: Joi.required(), otherwise: Joi.valid(0) }),
      insufficient: Joi.number().strict().min(0).max(5).required(),
      wellEquipped: Joi.number()
        .strict()
        .min(0)
        .max(5)
        .when('insufficient', { is: 0, then: Joi.required(), otherwise: Joi.valid(0) }),
      unsupported: Joi.number().strict().min(0).max(5).required(),
      highlySupported: Joi.number()
        .strict()
        .min(0)
        .max(5)
        .when('unsupported', { is: 0, then: Joi.required(), otherwise: Joi.valid(0) }),
      negative: Joi.number().strict().min(0).max(5).required(),
      inclusive: Joi.number()
        .strict()
        .min(0)
        .max(5)
        .when('negative', { is: 0, then: Joi.required(), otherwise: Joi.valid(0) }),
      lacking: Joi.number().strict().min(0).max(5).required(),
      excellent: Joi.number()
        .strict()
        .min(0)
        .max(5)
        .when('lacking', { is: 0, then: Joi.required(), otherwise: Joi.valid(0) }),
      unmanageable: Joi.number().strict().min(0).max(5).required(),
      manageable: Joi.number()
        .strict()
        .min(0)
        .max(5)
        .when('unmanageable', { is: 0, then: Joi.required(), otherwise: Joi.valid(0) }),
      poor: Joi.number().strict().min(0).max(5).required(),
      supportive: Joi.number()
        .strict()
        .min(0)
        .max(5)
        .when('poor', { is: 0, then: Joi.required(), otherwise: Joi.valid(0) }),
      overwhelming: Joi.number().strict().min(0).max(5).required(),
      comfortable: Joi.number()
        .strict()
        .min(0)
        .max(5)
        .when('overwhelming', { is: 0, then: Joi.required(), otherwise: Joi.valid(0) })
    });
    const { error } = schema.validate(req);
    if (error) {
      console.error(error);
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('addEditProfessionalMoodValidation', error))
      );
    }
    return callback(true);
  },

  getMoodDetailsValidation: (req, res, callback) => {
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
        res.__(validationMessageKey('getMoodDetailsValidation', error))
      );
    }
    return callback(true);
  },
  downloadMoodReportValidation: (req, res, callback) => {
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
        res.__(validationMessageKey('downloadMoodReportValidation', error))
      );
    }
    return callback(true);
  }
};
