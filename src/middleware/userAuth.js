'use strict';

const { RESPONSE_CODE, ACCOUNT_STATUS, USER_TYPE } = require('@services/Constant');
const { decode, verifyUser } = require('@services/JwToken');
const { Users } = require('@models');
const { errorResponseData } = require('@services/Response');

module.exports = {
  userTokenAuth: async (req, res, next) => {
    const token = req.headers.authorization;
    if (!token || !req.headers.devicetype) {
      return errorResponseData(res, res.__('authorizationError'), RESPONSE_CODE.UNAUTHORIZED);
    } else {
      const tokenData = await decode(token);
      if (tokenData) {
        verifyUser(tokenData, (err, decoded) => {
          if (err) {
            return errorResponseData(res, res.__('invalidToken'), RESPONSE_CODE.TOKEN_INVALID);
          }
          if (decoded.id) {
            req.authUserId = decoded.id;
            Users.findOne(
              {
                _id: req.authUserId,
                // user_type: USER_TYPE.USER,
                status: {
                  $ne: ACCOUNT_STATUS.DELETED
                }
              },
              {
                name: 1,
                status: 1,
                // email: 1,
                company_id: 1,
                user_type: 1,
                account_type: 1,
                is_under_trial: 1,
                trial_starts_from: 1
              }
            ).then(async (result) => {
              if (!result) {
                return errorResponseData(res, res.__('accessDenied'), RESPONSE_CODE.UNAUTHORIZED);
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
                req.authName = result.name;
                // req.authEmail = result.email;
                req.userType = result.user_type;
                req.userCompanyId = result.company_id;
                req.accountType = result.account_type;
                req.isUnderTrial = result.is_under_trial;
                req.trialDate = result.trial_starts_from;
                return next();
              }
              return errorResponseData(res, res.__('accountBlocked'), RESPONSE_CODE.UNAUTHORIZED);
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
  },
   extractHeaders: (req, res, next) => {
    req.body.deviceToken = req.headers['devicetoken'];
    req.body.deviceType = req.headers['devicetype'];
    next();
  }
};
