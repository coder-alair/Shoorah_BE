const Joi = require('joi');

module.exports = {
  idSchema: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
  requiredIdSchema: Joi.string()
    .required()
    .regex(/^[0-9a-fA-F]{24}$/)
};
