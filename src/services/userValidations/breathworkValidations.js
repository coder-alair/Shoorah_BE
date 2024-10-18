'use strict';

const Joi = require('joi');
const { validationMessageKey } = require('@services/Helper');
const { validationErrorResponseData } = require('@services/Response');
const { IMAGE_MIMETYPE } = require('@services/Constant');
const { id } = require('@services/adminValidations/adminValidations');
const { focusIds } = require('@services/adminValidations/affirmationValidations');


module.exports = {
    addBreathworkInterestValidations: (req, res, callback) => {
        const schema = Joi.object({
            goals:Joi.array().optional(),
            breathworkExp:Joi.string().optional(),
            sessions:Joi.number().optional(),
            sessionDuration:Joi.number().optional(),
            max_hold_min:Joi.string().optional(),
            max_hold_sec:Joi.string().optional(),
            max_exhale_min:Joi.string().optional(),
            max_exhale_sec:Joi.string().optional(),
            basicStatus:Joi.boolean().optional(),
            basicList: focusIds
            .optional()
            .allow(null, ''),
        });
        const { error } = schema.validate(req);
        if (error) {
            return validationErrorResponseData(
                res,
                res.__(validationMessageKey('addEditBreathworkInterestValidation', error))
            );
        }
        return callback(true);
    },
    myGoalsListValidation: (req, res, callback) => {
        const schema = Joi.object({
            isCompleted: Joi.boolean().optional(),
            page: Joi.number().optional(),
            perPage: Joi.number().optional(),
            searchKey: Joi.string()
                .optional()
                .allow(null, '')
                .regex(/^[^*$\\]+$/)
        });
        const { error } = schema.validate(req);
        if (error) {
            return validationErrorResponseData(
                res,
                res.__(validationMessageKey('myGoalsListValidation', error))
            );
        }
        return callback(true);
    },
    addEditBreathHoldValidations: (req, res, callback) => {
        const schema = Joi.object({
            max_hold_min:Joi.string().required(),
            max_hold_sec:Joi.string().required(),
        });
        const { error } = schema.validate(req);
        if (error) {
            return validationErrorResponseData(
                res,
                res.__(validationMessageKey('addEditBreathHoldValidation', error))
            );
        }
        return callback(true);
    },
    addEditBreathExhaleValidations: (req, res, callback) => {
        const schema = Joi.object({
            max_exhale_min:Joi.string().required(),
            max_exhale_sec:Joi.string().required(),
        });
        const { error } = schema.validate(req);
        if (error) {
            return validationErrorResponseData(
                res,
                res.__(validationMessageKey('addEditBreathExhaleValidation', error))
            );
        }
        return callback(true);
    }
 
};
