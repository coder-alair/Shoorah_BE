'use strict';

const Bcrypt = require('bcrypt');
const { Users, DeviceTokens } = require('@models');
const {
  adminLoginValidations,
  adminOTPValidations,
  forgetPasswordValidations,
  adminChangePasswordValidations,
  adminResetPasswordValidations,
  removeAdminDeviceTokenValidation,
  addEditDeviceTokenValidation,
  refreshTokenValidation
} = require('@services/adminValidations/authValidations');
const {
  RESPONSE_CODE,
  ACCOUNT_STATUS,
  FAIL,
  SUCCESS,
  USER_TYPE,
  EMAIL_VERIFICATION,
  DAY_LIMIT,
  OTP_LIMIT,
  RESET_PASSWORD,
  MAIL_SUBJECT,
  OTP_LENGTH,
  OTP_EXPIRY,
  CLOUDFRONT_URL,
  ADMIN_MEDIA_PATH
} = require('@services/Constant');
const {
  issueAdminToken,
  verifyAdminRefreshToken,
  issueAdminRefreshToken
} = require('@services/JwToken');
const Response = require('@services/Response');
const { makeRandomDigit } = require('@services/Helper');
const { storeDeviceToken } = require('@services/authServices');
const { sendOtp } = require('@services/Mailer');
const {
  COMPANY_MEDIA_PATH,
  KLAVIYO_LIST,
  PARTNER_MEDIA_PATH
} = require('../../../services/Constant');

module.exports = {
  /**
   * @description This function is used for refresh the token
   * @param {*} req
   * @param {*} res
   */

  refreshJwtToken: async (req, res) => {
    try {
      const reqParam = req.headers;
      reqParam.refreshToken = reqParam['refresh-token'];
      refreshTokenValidation(reqParam, res, async (validData) => {
        if (validData) {
          verifyAdminRefreshToken(reqParam.refreshToken, async (err, decoded) => {
            if (err) {
              return Response.errorResponseData(
                res,
                res.__('invalidToken'),
                RESPONSE_CODE.UNAUTHORIZED
              );
            }
            const meta = {
              token: issueAdminToken({
                id: decoded.id
              })
            };
            return Response.successResponseWithoutData(res, res.__('tokenRefresh'), SUCCESS, meta);
          });
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  }
};
