'use strict';

const { Users } = require('@models');
const Response = require('@services/Response');
const { socialLoginValidation } = require('@services/userValidations/socialLoginValidations');
const { OAuth2Client } = require('google-auth-library');
const {
  SOCIAL_LOGIN_TYPE,
  DEVICE_TYPE,
  FAIL,
  DEFAULT_USERNAME,
  ACCOUNT_STATUS,
  SUCCESS,
  PASSWORD_LENGTH,
  USER_TYPE,
  DEFAULT_USERNAME_APPLE,
  USER_TRIAL_LIMIT
} = require('@services/Constant');
const { makeRandomString, randomEmailGenerator } = require('@services/Helper');
const { issueUserToken, issueUserRefreshToken } = require('@services/JwToken');
const { AppleSignIn } = require('apple-sign-in-rest');
const FB = require('fb');
const { storeDeviceToken, generatePassword } = require('@services/authServices');

module.exports = {
  /**
   * @description This function is used to login using google, apple and facebook
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  socialLogin: (req, res) => {
    try {
      const reqParam = req.body;
      reqParam.deviceType = req.headers.devicetype;
      reqParam.deviceToken = req.headers.devicetoken;
      socialLoginValidation(reqParam, res, async (validate) => {
        if (validate) {
          let reqEmail;
          let reqName;
          let reqSocialId;
          let error = false;
          switch (reqParam.loginType) {
            case SOCIAL_LOGIN_TYPE.GOOGLE:
              const googleClientId =
                reqParam.deviceType === DEVICE_TYPE.ANDROID
                  ? process.env.GOOGLE_CLIENT_ID_ANDROID
                  : process.env.GOOGLE_CLIENT_ID_IOS;
              const googleClient = new OAuth2Client(googleClientId);
              await googleClient
                .verifyIdToken({
                  idToken: reqParam.socialLoginToken,
                  requiredAudience: googleClientId
                })
                .then((ticketData) => {
                  const payload = ticketData.getPayload();
                  reqSocialId = payload.sub;
                  reqEmail = payload.email;
                  reqName = payload.name;
                })
                .catch(() => {
                  error = true;
                  return Response.errorResponseWithoutData(res, res.__('InvalidToken'), FAIL);
                });
              break;
            case SOCIAL_LOGIN_TYPE.APPLE:
              const appleClient = new AppleSignIn({
                clientId: process.env.APPLE_CLIENT_ID,
                teamId: process.env.APPLE_TEAM_ID,
                keyIdentifier: process.env.APPLE_KEY_IDENTIFIER,
                privateKey: process.env.APPLE_PRIVATE_KEY
              });
              await appleClient
                .verifyIdToken(reqParam.socialLoginToken)
                .then((appleTicket) => {
                  reqSocialId = appleTicket.sub;
                  reqEmail = appleTicket.email;
                  reqName = DEFAULT_USERNAME_APPLE;
                })
                .catch(() => {
                  error = true;
                  return Response.errorResponseWithoutData(res, res.__('InvalidToken'), FAIL);
                });
              break;
            case SOCIAL_LOGIN_TYPE.FACEBOOK:
              await FB.api('me', {
                fields: ['id', 'name', 'email'],
                access_token: reqParam.socialLoginToken
              })
                .then((payload) => {
                  if (payload.email) {
                    reqEmail = payload.email;
                  }
                  reqSocialId = payload.id;
                  reqName = payload.name;
                })
                .catch(() => {
                  error = true;
                  return Response.errorResponseWithoutData(res, res.__('InvalidToken'), FAIL);
                });
              break;
            default:
              return Response.errorResponseWithoutData(res, res.__('invalidLoginType'), FAIL);
          }
          if (!error) {
            const filterCondition = {
              $or: [
                {
                  social_id: reqSocialId
                },
                {
                  email: reqEmail
                }
              ],
              user_type: USER_TYPE.USER,
              status: {
                $ne: ACCOUNT_STATUS.DELETED
              }
            };
            const user = await Users.findOne(filterCondition, {
              name: 1,
              user_profile: 1,
              status: 1,
              gender: 1,
              dob: 1,
              is_email_verified: 1,
              social_id: 1,
              is_under_trial: 1,
              trial_starts_from: 1,
              account_type: 1,
              country_code: 1,
              mobile: 1
            });
            if (user) {
              if (user.status === ACCOUNT_STATUS.INACTIVE) {
                return Response.errorResponseWithoutData(res, res.__('accountIsInactive'), FAIL);
              }
              if (!user.is_email_verified) {
                const updateData = {
                  is_email_verified: true,
                  otp: null
                };
                await Users.findByIdAndUpdate(user._id, updateData);
              }
              await storeDeviceToken(user._id, reqParam.deviceToken, reqParam.deviceType);
              const meta = {
                token: issueUserToken({
                  id: user._id
                }),
                refreshToken: issueUserRefreshToken({
                  id: user._id
                })
              };
              user.isUnderTrial = user?.is_under_trial
                ? (new Date().getTime() - user?.trial_starts_from.getTime()) / (1000 * 3600 * 24) <
                  USER_TRIAL_LIMIT
                : false;
              const resObj = {
                id: user.id,
                name: user.name,
                email: user.email || `${user.country_code}${user.mobile}`,
                userType: user.user_type,
                profile: user.user_profile,
                gender: user.gender,
                dob: user.dob,
                isSocialLogin: true,
                accountType: user.account_type,
                isUnderTrial: user.isUnderTrial,
                existingUser: true
              };
              return Response.successResponseData(
                res,
                resObj,
                SUCCESS,
                res.__('loginSuccess'),
                meta
              );
            } else {
              const randomPassword = await makeRandomString(PASSWORD_LENGTH);
              const hashPassword = await generatePassword(randomPassword);
              const createUserData = {
                name: reqName || DEFAULT_USERNAME,
                email: reqEmail || randomEmailGenerator(),
                password: hashPassword,
                login_platform: reqParam.loginType,
                is_email_verified: true,
                social_id: reqSocialId
              };
              const user = await Users.create(createUserData);
              await storeDeviceToken(user._id, reqParam.deviceToken, reqParam.deviceType);
              const meta = {
                token: issueUserToken({
                  id: user._id
                }),
                refreshToken: issueUserRefreshToken({
                  id: user._id
                })
              };
              user.isUnderTrial = user?.is_under_trial
                ? (new Date().getTime() - user?.trial_starts_from.getTime()) / (1000 * 3600 * 24) <
                  USER_TRIAL_LIMIT
                : false;
              const resObj = {
                id: user.id,
                name: user.name,
                email: user.email || `${user.country_code}${user.mobile}`,
                userType: user.user_type,
                profile: user.user_profile,
                gender: user.gender,
                dob: user.dob,
                isSocialLogin: true,
                accountType: user.account_type,
                isUnderTrial: user.isUnderTrial,
                existingUser: false
              };
              return Response.successResponseData(
                res,
                resObj,
                SUCCESS,
                res.__('loginSuccess'),
                meta
              );
            }
          } else {
            return Response.internalServerErrorResponse(res);
          }
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  socialLoginWeb: async (req, res) => {
    try {
      const reqParam = req.body;
      reqParam.deviceType = req.headers.devicetype;
      reqParam.deviceToken = req.headers.devicetoken;
      let reqEmail;
      let reqName;
      let error = false;
      switch (reqParam.loginType) {
        case SOCIAL_LOGIN_TYPE.GOOGLE:
          reqEmail = reqParam.email;
          reqName = reqParam.name;
          break;
        case SOCIAL_LOGIN_TYPE.APPLE:
          reqEmail = reqParam.email;
          reqName = reqParam.name;
          break;
        case SOCIAL_LOGIN_TYPE.FACEBOOK:
          reqEmail = reqParam.email;
          reqName = reqParam.name;
          break;
        default:
          return Response.errorResponseWithoutData(res, res.__('invalidLoginType'), FAIL);
      }
      if (!error) {
        const filterCondition = {
          $or: [
            {
              email: reqEmail
            }
          ],
          user_type: USER_TYPE.USER,
          status: {
            $ne: ACCOUNT_STATUS.DELETED
          }
        };
        const user = await Users.findOne(filterCondition);
        if (user) {
          if (user.status === ACCOUNT_STATUS.INACTIVE) {
            return Response.errorResponseWithoutData(res, res.__('accountIsInactive'), FAIL);
          }
          if (!user.is_email_verified) {
            const updateData = {
              is_email_verified: true,
              otp: null,
              name: reqName
            };
            await Users.findByIdAndUpdate(user._id, updateData);
          }
          const meta = {
            token: issueUserToken({
              id: user._id
            }),
            refreshToken: issueUserRefreshToken({
              id: user._id
            })
          };
          user.isUnderTrial = user?.is_under_trial
            ? (new Date().getTime() - user?.trial_starts_from.getTime()) / (1000 * 3600 * 24) <
              USER_TRIAL_LIMIT
            : false;
          const resObj = {
            id: user.id,
            name: user.name,
            email: user.email,
            userType: user.user_type,
            profile: user.user_profile,
            socialProfile: reqParam.socialProfile,
            gender: user.gender,
            dob: user.dob,
            isSocialLogin: true,
            accountType: user.account_type,
            isUnderTrial: user.isUnderTrial,
            existingUser: true
          };
          return Response.successResponseData(res, resObj, SUCCESS, res.__('loginSuccess'), meta);
        } else {
          const randomPassword = await makeRandomString(PASSWORD_LENGTH);
          const hashPassword = await generatePassword(randomPassword);
          const createUserData = {
            name: reqName || DEFAULT_USERNAME,
            email: reqEmail || randomEmailGenerator(),
            password: hashPassword,
            login_platform: reqParam.loginType,
            is_email_verified: true
          };
          const user = await Users.create(createUserData);
          const meta = {
            token: issueUserToken({
              id: user._id
            }),
            refreshToken: issueUserRefreshToken({
              id: user._id
            })
          };
          user.isUnderTrial = user?.is_under_trial
            ? (new Date().getTime() - user?.trial_starts_from.getTime()) / (1000 * 3600 * 24) <
              USER_TRIAL_LIMIT
            : false;
          const resObj = {
            id: user.id,
            name: user.name,
            email: user.email,
            userType: user.user_type,
            profile: user.user_profile,
            socialProfile: user.socialProfile,
            gender: user.gender,
            dob: user.dob,
            isSocialLogin: true,
            accountType: user.account_type,
            isUnderTrial: user.isUnderTrial,
            existingUser: false
          };
          return Response.successResponseData(res, resObj, SUCCESS, res.__('loginSuccess'), meta);
        }
      } else {
        return Response.internalServerErrorResponse(res);
      }
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  }
};
