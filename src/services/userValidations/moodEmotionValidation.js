'use strict';

const Joi = require('joi');
const { validationMessageKey } = require('@services/Helper');
const { validationErrorResponseData } = require('@services/Response');
const { REPORT_TYPE } = require('../Constant');

module.exports = {
    addEditEmotionsValidation: (req, res, callback) => {
        const schema = Joi.object({
            feedback: Joi.string().required().valid('happy', 'sad', 'overjoyed', 'neutral', 'depressed').trim(),
        });
        const { error } = schema.validate(req);
        if (error) {
            return validationErrorResponseData(
                res,
                res.__(validationMessageKey('addMoodsEmotionValidations', error))
            );
        }
        return callback(true);
    },
    getEmotionDetailsValidation: (req, res, callback) => {
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
                res.__(validationMessageKey('getEmotionDetailsValidation', error))
            );
        }
        return callback(true);
    },
    
};
