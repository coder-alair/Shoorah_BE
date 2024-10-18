'use strict';

const Joi = require('joi');
const { validationMessageKey } = require('@services/Helper');
const { validationErrorResponseData } = require('@services/Response');
const { HISTORY_DATA_DURATION } = require('@services/Constant');

module.exports = {
    historyDataValidation: (req, res, callback) => {
        const schema = Joi.object({
            reportType: Joi.number()
                .valid(...Object.values(HISTORY_DATA_DURATION).map((x) => x))
                .required(),
            monthInterval: Joi.number().required(),
            yearInterval: Joi.number().required(),
            contentType: Joi.number().optional(),
            fromDate: Joi.date()
                .iso()
                .required(),
            toDate: Joi.date()
                .iso()
                .required()
                .min(Joi.ref('fromDate')),
        });
        const { error } = schema.validate(req);
        if (error) {
            return validationErrorResponseData(
                res,
                res.__(validationMessageKey('historyDataValidation', error))
            );
        }
        return callback(true);
    }
};
