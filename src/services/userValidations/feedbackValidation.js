'use strict';

const Joi = require('joi');
const { validationMessageKey } = require('@services/Helper');
const { validationErrorResponseData } = require('@services/Response');
const { id } = require('@services/adminValidations/adminValidations');
const { HELP_US_IMPROVE, CONTENT_TYPE } = require('../Constant');

module.exports = {
    addUserFeedbackValidation: (req, res, callback) => {
        const schema = Joi.object({
            contentId: id,
            feedback: Joi.string()
                .required()
                .valid(...Object.values(HELP_US_IMPROVE).map((x) => x)),
            contentType: Joi.number()
                .required()
                .valid(...Object.values(CONTENT_TYPE).map((x) => x))
        });
        const { error } = schema.validate(req);
        if (error) {
            return validationErrorResponseData(
                res,
                res.__(validationMessageKey('addFeedbackValidation', error))
            );
        }
        return callback(true);
    },
    getFeedbackValidation: (req, res, callback) => {
        const schema = Joi.object({
            contentId: id,
            contentType: Joi.number()
                .required()
                .valid(...Object.values(CONTENT_TYPE).map((x) => x))
        });
        const { error } = schema.validate(req);
        if (error) {
            return validationErrorResponseData(
                res,
                res.__(validationMessageKey('getFeedbackValidation', error))
            );
        }
        return callback(true);
    },

};
