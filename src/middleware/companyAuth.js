'use strict';

const { RESPONSE_CODE, CLOUDFRONT_URL } = require('@services/Constant');
const { decode, verifyCompany } = require('@services/JwToken');
const { errorResponseData } = require('@services/Response');
const Company = require('../models/Company');
const { COMPANY_MEDIA_PATH } = require('../services/Constant');

module.exports = {
  companyTokenAuth: async (req, res, next) => {
    const token = req.headers.authorization;
    if (!token) {
      return errorResponseData(res, res.__('authorizationError'), RESPONSE_CODE.UNAUTHORIZED);
    } else {
      const tokenData = await decode(token);
      if (tokenData) {
        verifyCompany(tokenData, (err, decoded) => {
          if (err) {
            return errorResponseData(res, res.__('invalidToken'), RESPONSE_CODE.TOKEN_INVALID);
          }
          if (decoded.id) {
            req.authCompanyId = decoded.id;
            Company.findOne(
              {
                _id: req.authCompanyId
              },
              {
                company_name: 1,
                company_email: 1,
                company_logo: 1
              }
            ).then((result) => {
              if (!result) {
                return errorResponseData(res, res.__('accessDenied'), RESPONSE_CODE.UNAUTHORIZED);
              }
              result.company_logo =
                CLOUDFRONT_URL + COMPANY_MEDIA_PATH.COMPANY_PROFILE + '/' + result.company_logo;

              if (result) {
                req.companyEmail = result.company_email;
                req.companyName = result.company_name;
                req.companyLogo = result.company_logo;
                return next();
              }
              return errorResponseData(res, res.__('No Account'), RESPONSE_CODE.UNAUTHORIZED);
            });
          } else {
            return errorResponseData(res, res.__('invalidToken'), RESPONSE_CODE.TOKEN_INVALID);
          }
        });
      } else {
        return errorResponseData(res, res.__('accessDenied'), RESPONSE_CODE.UNAUTHORIZED);
      }
    }
    return null;
  }
};
