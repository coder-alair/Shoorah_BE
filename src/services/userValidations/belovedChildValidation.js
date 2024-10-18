'use strict';

const Joi = require('joi');
const { validationMessageKey } = require('@services/Helper');
const { validationErrorResponseData } = require('@services/Response');
const focusIds = Joi.array()
  .items(Joi.string().regex(/^[0-9a-fA-F]{24}$/))
  .required()

module.exports = {
    addBelovedChildValidation: (req, res, callback) => {
        const schema = Joi.object({
            name: Joi.string().required().min(2),
            dob: Joi.date().required().less('now'),
            gender: Joi.string().required().valid('male', 'female', 'other'),
            affirmation:focusIds,
            familyType: Joi.string().required().valid('child', 'beloved'),
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

    getBelovedChildValidation:(req,res,callback)=>{
        const schema = Joi.object({
            familyType:  Joi.string()
            .required()
            .trim(),
        });
        console.log("req-------"+req);
        const { error } = schema.validate(req);
        console.log("req----22---"+error); 
        if (error) {
            return validationErrorResponseData( 
                res,
                res.__(validationMessageKey('familyTypeRequired', error))
            );
        }
        return callback(true);
    
    },
    deleteBelovedChildValidation:(req,res,callback)=>{
        const schema = Joi.object({
             id:  Joi.string()
            .required()
            .trim(),
        });
        const { error } = schema.validate(req);
        if (error) {
            return validationErrorResponseData(
                res,
                res.__(validationMessageKey('childBelovedIdRrquired', error))
            );
        }
        return callback(true);
    
    }
    
};
