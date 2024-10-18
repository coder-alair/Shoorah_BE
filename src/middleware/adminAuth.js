'use strict';

const {
  RESPONSE_CODE,
  ACCOUNT_STATUS,
  USER_TYPE,
  CLOUDFRONT_URL,
  ADMIN_MEDIA_PATH
} = require('@services/Constant');
const { decode, verifyAdmin } = require('@services/JwToken');
const { Users } = require('@models');
const { errorResponseData } = require('@services/Response');
const Company = require('../models/Company');
const { COMPANY_MEDIA_PATH, PARTNER_MEDIA_PATH } = require('../services/Constant');

module.exports = {
  adminTokenAuth: async (req, res, next) => {
    const token = req.headers.authorization;
    if (!token) {
      return errorResponseData(res, res.__('authorizationError'), RESPONSE_CODE.UNAUTHORIZED);
    } else {
      const tokenData = await decode(token);
      if (tokenData) {
        verifyAdmin(tokenData, async (err, decoded) => {
          if (err) {
            return errorResponseData(res, res.__('invalidToken'), RESPONSE_CODE.TOKEN_INVALID);
          }
          if (!decoded.companyId) {
            req.authAdminId = decoded.id;
            const result = await Users.findOne(
              {
                _id: req.authAdminId,
                user_type: {
                  $in: [
                    USER_TYPE.SUPER_ADMIN,
                    USER_TYPE.SUB_ADMIN,
                    USER_TYPE.EXPERT,
                    USER_TYPE.PARTNER
                  ]
                },
                status: {
                  $ne: ACCOUNT_STATUS.DELETED
                }
              },
              {
                status: 1,
                email: 1,
                user_type: 1,
                account_type: 1,
                name: 1,
                user_profile: 1
              }
            ).populate({
              path: 'module_access',
              select: '_id user_id module_access'
            });

            if (result) {
              if (result.user_type == USER_TYPE.PARTNER) {
                result.user_profile =
                  CLOUDFRONT_URL + PARTNER_MEDIA_PATH.PARTNER_PROFILE + '/' + result.user_profile;
              } else {
                result.user_profile =
                  CLOUDFRONT_URL + ADMIN_MEDIA_PATH.ADMIN_PROFILE + '/' + result.user_profile;
              }

              if (result && result.status === ACCOUNT_STATUS.INACTIVE) {
                return errorResponseData(
                  res,
                  res.__('acccountInactive'),
                  RESPONSE_CODE.UNAUTHORIZED
                );
              }

              if (
                result &&
                (result.status !== ACCOUNT_STATUS.INACTIVE ||
                  result.status !== ACCOUNT_STATUS.DELETED)
              ) {
                req.authEmail = result.email;
                req.userType = result.user_type;
                req.accountType = result.account_type;
                req.authModuleAccess = result?.module_access?.module_access;
                req.authAdminName = result.name;
                req.authProfile = result.user_profile;
                req.companyAdmin = req?.query?.company_id;
                return next();
              }
              return errorResponseData(res, res.__('accountBlocked'), RESPONSE_CODE.UNAUTHORIZED);
            }

            if (!result) {
              return errorResponseData(res, res.__('accessDenied'), RESPONSE_CODE.UNAUTHORIZED);
            }
          }

          if (decoded.companyId) {
            req.authCompanyId = decoded.companyId;
            req.authAdminId = decoded.id;
            const result = await Company.findOne(
              {
                _id: req.authCompanyId
              },
              {
                company_name: 1,
                company_email: 1,
                company_logo: 1
              }
            ).then(async (result) => {
              if (!result) {
                return errorResponseData(res, res.__('accessDenied'), RESPONSE_CODE.UNAUTHORIZED);
              }
              const companyAdmin = await Users.findOne({
                _id: req.authAdminId,
                company_id: req.authCompanyId,
                user_type: USER_TYPE.COMPANY_ADMIN
              });
              result.company_logo =
                CLOUDFRONT_URL + COMPANY_MEDIA_PATH.COMPANY_PROFILE + '/' + result.company_logo;
              const adminUser = await Users.findOne({ _id: req.authAdminId }).select(
                'name user_type'
              );
              if (result) {
                req.companyAdmin = companyAdmin;
                req.userType = adminUser?.user_type;
                req.authAdminName = adminUser?.name;
                req.companyEmail = result?.company_email;
                req.companyName = result?.company_name;
                req.companyLogo = result?.company_logo;
                return next();
              }
              return errorResponseData(res, res.__('No Account'), RESPONSE_CODE.UNAUTHORIZED);
            });
          }

          // else {
          //   return errorResponseData(res, res.__('invalidToken'), RESPONSE_CODE.TOKEN_INVALID);
          // }
        });
      } else {
        return errorResponseData(res, res.__('accessDenied'), RESPONSE_CODE.UNAUTHORIZED);
      }
    }
    return null;
  },
  isSuperAdmin: (req, res, next) => {
    if (req.userType !== USER_TYPE.SUPER_ADMIN) {
      return errorResponseData(res, res.__('accessDenied'), RESPONSE_CODE.UNAUTHORIZED);
    }
    return next();
  },
  isSuperOrSubAdmin: (req, res, next) => {
    if (req.userType !== USER_TYPE.SUPER_ADMIN && req.userType !== USER_TYPE.SUB_ADMIN) {
      return errorResponseData(res, res.__('accessDenied'), RESPONSE_CODE.UNAUTHORIZED);
    }
    return next();
  },
  isCompanySuperAdmin: (req, res, next) => {
    if (req.userType !== USER_TYPE.COMPANY_ADMIN) {
      return errorResponseData(res, res.__('accessDenied'), RESPONSE_CODE.UNAUTHORIZED);
    }
    return next();
  },
  isCompanySuperOrSubAdmin: (req, res, next) => {
    if (req.userType !== USER_TYPE.COMPANY_ADMIN && req.userType !== USER_TYPE.COMPANY_SUB_ADMIN) {
      return errorResponseData(res, res.__('accessDenied'), RESPONSE_CODE.UNAUTHORIZED);
    }
    return next();
  },
  isExpert: (req, res, next) => {
    if (req.userType !== USER_TYPE.EXPERT) {
      return errorResponseData(res, res.__('accessDenied'), RESPONSE_CODE.UNAUTHORIZED);
    }
    return next();
  },
  isUser: (req, res, next) => {
    if (req.userType !== USER_TYPE.USER) {
      return errorResponseData(res, res.__('accessDenied'), RESPONSE_CODE.UNAUTHORIZED);
    }
    return next();
  }
};
