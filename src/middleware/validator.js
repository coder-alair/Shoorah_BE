const { validationErrorResponseData } = require('@services/Response');
const { validationMessageKey } = require('@services/Helper');
const { sanitizeNullPayloads } = require('@helpers/utils');

const validate = (schema, operation, isQuery, sanitizeConfig) => (req, res, next) => {
  const data = isQuery ? req?.query : req?.body;
  const sanitizedData =
    typeof sanitizeConfig === 'boolean' && sanitizeConfig
      ? data
      : sanitizeNullPayloads(data, sanitizeConfig?.filterEmptyStrings);

  const { error } = schema.validate(sanitizedData);
  if (error) {
    return validationErrorResponseData(res, res.__(validationMessageKey(`${operation}`, error)));
  }

  next();
};
module.exports = validate;
