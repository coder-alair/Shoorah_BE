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
const { getUploadURL, removeOldImage } = require('@services/s3Services');

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
const { COMPANY_MEDIA_PATH, KLAVIYO_LIST, PARTNER_MEDIA_PATH } = require('../../services/Constant');
const { unixTimeStamp, addEditKlaviyoUser } = require('../../services/Helper');

module.exports = {
  /**
   * @description This function is used for get partner profile
   * @param {*} req
   * @param {*} res
   */

  getProfile: async (req, res) => {
    try {
      const reqParam = req.params;
      const findUserCondition = {
        _id: req.authAdminId,
        status: ACCOUNT_STATUS.ACTIVE,
        user_type: USER_TYPE.PARTNER
      };
      let userData = await Users.findOne(findUserCondition, {
        _id: 1,
        name: 1,
        email: 1,
        dob: 1,
        gender: 1,
        user_profile: 1,
        first_name: 1,
        last_name: 1,
        country: 1,
        user_type: 1,
        job_role: 1,
        status: 1,
        account_type: 1,
        company_id: 1,
        commission: 1,
        mobile: 1
      }).lean();

      if (userData) {
        userData.profile =
          CLOUDFRONT_URL + PARTNER_MEDIA_PATH.PARTNER_PROFILE + '/' + userData.user_profile;
        userData.jobRole = userData?.job_role;
        userData.id = userData?._id;

        let profile = {
          email: userData.email,
          userType: userData.user_type,
          firstName: userData.name
        };

        await addEditKlaviyoUser(profile);

        return Response.successResponseData(
          res,
          userData,
          SUCCESS,
          res.__('getPartnerProfileSuccess')
        );
      } else {
        return Response.successResponseWithoutData(res, res.__('userDataNotFound'), FAIL);
      }
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  updateProfile: async (req, res) => {
    try {
      const reqParam = req.body;
      const findUserCondition = {
        _id: req.authAdminId,
        status: ACCOUNT_STATUS.ACTIVE,
        user_type: USER_TYPE.PARTNER
      };
      let userData = await Users.findOne(findUserCondition, {
        _id: 1,
        name: 1,
        email: 1,
        dob: 1,
        gender: 1,
        user_profile: 1,
        first_name: 1,
        last_name: 1,
        country: 1,
        job_role: 1,
        status: 1,
        account_type: 1,
        company_id: 1
      }).lean();

      if (!userData) {
        return Response.successResponseWithoutData(res, res.__('userNotFound'), FAIL);
      }

      if (userData) {
        const reqEmail = reqParam.email.toLowerCase().trim();
        let updateData = {
          name: reqParam.name?.trim(),
          email: reqEmail,
          mobile: reqParam.mobile,
          job_role: reqParam.jobRole
        };
        let userProfileUrl;
        if (reqParam.profile) {
          const existingProfile = await Users.findOne(findUserCondition).select('user_profile');
          if (existingProfile && existingProfile.user_profile) {
            await removeOldImage(
              existingProfile.user_profile,
              PARTNER_MEDIA_PATH.PARTNER_PROFILE,
              res
            );
          }
          const imageExtension = reqParam.profile.split('/')[1];
          const profileImage = `${unixTimeStamp(new Date())}-${makeRandomDigit(
            4
          )}.${imageExtension}`;
          userProfileUrl = await getUploadURL(
            reqParam.imageUrl,
            profileImage,
            PARTNER_MEDIA_PATH.PARTNER_PROFILE
          );
          updateData = {
            ...updateData,
            user_profile: profileImage
          };
        }
        const partnerData = await Users.findByIdAndUpdate(findUserCondition, updateData, {
          new: true
        }).select('_id');
        if (partnerData) {
          return Response.successResponseWithoutData(
            res,
            res.__('partnerDataUpdated'),
            SUCCESS,
            userProfileUrl || null
          );
        }
      } else {
        return Response.successResponseWithoutData(res, res.__('userDataNotFound'), FAIL);
      }
    } catch (err) {
      console.error(err);
      return Response.internalServerErrorResponse(res);
    }
  }
};
