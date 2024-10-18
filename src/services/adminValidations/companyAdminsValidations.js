'use strict';

const Joi = require('joi');
const { validationMessageKey } = require('@services/Helper');
const { validationErrorResponseData } = require('@services/Response');
const {
  USER_TYPE,
  ACCOUNT_STATUS,
  IMAGE_MIMETYPE,
  DISPOSABLE_EMAIL_DOMAINS,
  NODE_ENVIRONMENT
} = require('@services/Constant');
const id = Joi.string()
  .required()
  .regex(/^[0-9a-fA-F]{24}$/);

module.exports = {
  b2bAdminsListValidation: (req, res, callback) => {
    const schema = Joi.object({
      searchKey: Joi.string()
        .optional()
        .allow(null, '')
        .regex(/^[^*$\\]+$/),
      page: Joi.number().optional().allow('', null),
      perPage: Joi.number().optional().allow(null, ''),
      userType: Joi.number().optional().valid(USER_TYPE.COMPANY_ADMIN, USER_TYPE.COMPANY_SUB_ADMIN),
      accountStatus: Joi.number().optional().valid(ACCOUNT_STATUS.ACTIVE, ACCOUNT_STATUS.INACTIVE),
      sortBy: Joi.string().optional().allow(null, ''),
      sortOrder: Joi.number().valid(1, -1).optional().allow(null, ''),
      companyId: id.optional().allow(null, ''),
      id: id.optional().allow(null, '')
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('adminsListValidation', error))
      );
    }
    return callback(true);
  }
};
