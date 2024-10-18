'use strict';

module.exports = {
  /**
   * @description This function use for format success response of rest api containing data
   * @param data
   * @param code
   * @param message
   * @param res
   * @param extras
   * @returns {{data: *, meta: {message: *, code: *}}}
   */
  successResponseData(res, data, code = 1, message, extras) {
    const response = {
      data,
      meta: {
        code,
        message
      }
    };
    if (extras) {
      Object.keys(extras).forEach((key) => {
        if ({}.hasOwnProperty.call(extras, key)) {
          response.meta[key] = extras[key];
        }
      });
    }
    return res.send(response);
  },

  /**
   * @description This function use for format success response of rest api witout data
   * @param res
   * @param message
   * @param code
   * @returns {{data: *, meta: {message: *, code: *}}}
   */
  successResponseWithoutData(res, message, code = 1, extras) {
    const response = {
      data: null,
      meta: {
        code,
        message
      }
    };
    if (extras) {
      Object.keys(extras).forEach((key) => {
        if ({}.hasOwnProperty.call(extras, key)) {
          response.meta[key] = extras[key];
        }
      });
    }
    return res.send(response);
  },

  /**
   * @description This function use for format error response of rest api
   * @param res
   * @param message
   * @param code
   * @returns {{response: {code: *, message: *}}}
   */
  errorResponseData(res, message, code = 400) {
    const response = {
      code,
      message
    };
    return res.status(code).send(response);
  },

  /**
   * @description This function use for format error response of rest api witout data
   * @param res
   * @param message
   * @param code
   * @returns {{data: *, meta: {code: *, message: *}}}
   */
  errorResponseWithoutData(res, message, code = 0) {
    const response = {
      data: null,
      meta: {
        code,
        message
      }
    };
    if (code > 200) {
      return res.status(code).send(response);
    } else {
      return res.send(response);
    }
  },

  /**
   * @description This function use for format validation error response of rest api
   * @param res
   * @param message
   * @param code
   * @returns {{response: {code: *, message: *}}}
   */
  validationErrorResponseData(res, message, code = 400) {
    const response = {
      code,
      message
    };
    return res.status(code).send(response);
  },
  internalServerErrorResponse(res,message = null) {
    const response = {
      code: 500,
      message: message || res.__('internalError')
    };
    return res.status(500).send(response);
  }
};
