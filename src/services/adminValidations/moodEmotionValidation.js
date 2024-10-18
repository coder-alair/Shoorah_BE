'use strict';

const Joi = require('joi');
const { validationMessageKey } = require('@services/Helper');
const { validationErrorResponseData } = require('@services/Response');
const { REPORT_TYPE } = require('../Constant');
const { id } = require('@services/adminValidations/adminValidations');

module.exports = {
    getUsersEmotionDetailsValidation: (req, res, callback) => {
        const schema = Joi.object({
            reportFromDate: Joi.date()
                .iso()
                .required(),
            reportToDate: Joi.date()
                .iso()
                .required()
                .min(Joi.ref('reportFromDate')),
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

    getUserEmotionValidation: (req, res, callback) => {
        const schema = Joi.object({
            userId: id,
            reportFromDate: Joi.date()
                .iso()
                .required(),
            reportToDate: Joi.date()
                .iso()
                .required()
                .min(Joi.ref('reportFromDate')),
        });
        const { error } = schema.validate(req);
        if (error) {
            return validationErrorResponseData(
                res,
                res.__(validationMessageKey('getEmotionValidation', error))
            );
        }
        return callback(true);
    },

};
