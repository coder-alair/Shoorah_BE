'use strict';

const { Users, UserLegals } = require('@models');
const Response = require('@services/Response');
const {
  getUserProfileValidation,
  editUserProfileValidation,
  editUserProfileWebValidation
} = require('@services/userValidations/userProfileValidations');
const {
  ACCOUNT_STATUS,
  FAIL,
  SUCCESS,
  USER_TYPE,
  USER_MEDIA_PATH,
  CLOUDFRONT_URL
} = require('@services/Constant');
const { unixTimeStamp, makeRandomDigit, toObjectId } = require('@services/Helper');
const { getUploadURL, removeOldImage } = require('@services/s3Services');
const { RESPONSE_CODE } = require('../../../services/Constant');
const Bcrypt = require('bcrypt');
const { addEditKlaviyoUser } = require('../../../services/Helper');
const { sanitizeNullPayloads } = require('@helpers/utils');

module.exports = {
  /**
   * @description This function is used to get user profile.
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  getUserProfile: (req, res) => {
    try {
      const reqParam = req.params;
      getUserProfileValidation(reqParam, res, async (validate) => {
        if (validate) {
          const findUserCondition = {
            _id: reqParam.userId,
            status: ACCOUNT_STATUS.ACTIVE,
            user_type: { $nin: [USER_TYPE.SUPER_ADMIN, USER_TYPE.SUB_ADMIN] }
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
            account_type: 1,
            is_audio_feedback_disabled: 1,
            company_id: 1
          })
            .populate({
              path: 'company_id',
              select: 'company_email shuru_usage peap_usage company_name contact_number'
            })
            .lean();

          if (userData) {
            userData.profile =
              CLOUDFRONT_URL + USER_MEDIA_PATH.USER_PROFILE + '/' + userData.user_profile;
            userData.jobRole = userData?.job_role;
            userData.id = userData?._id;
            userData.isAudioFeedbackDisabled = userData?.is_audio_feedback_disabled
              ? userData.is_audio_feedback_disabled
              : false;

            if (userData.company_id) {
              userData.companyId = userData?.company_id?._id;
              userData.companyName = userData?.company_id?.company_name;
              userData.companyEmail = userData?.company_id?.company_email;
              userData.shuruUsage = userData?.company_id?.shuru_usage;
              userData.peapUsage = userData?.company_id?.peap_usage;
            }

            let userLegals= await UserLegals.findOne({user_id:toObjectId(reqParam.userId)});
            userData.legals = null;  

            if (userLegals) {
              if (typeof userLegals.legals === 'string') {
                userData.legals = JSON.parse(userLegals?.legals);  
              } else {
                userData.legals = userLegals?.legals;  
              }
            }

            return Response.successResponseData(
              res,
              userData,
              SUCCESS,
              res.__('getUserProfileSuccess')
            );
          } else {
            return Response.successResponseWithoutData(res, res.__('userDataNotFound'), FAIL);
          }
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to update logged-in user profile
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  editUserProfile: (req, res) => {
    try {
      const reqParam = sanitizeNullPayloads(req.body);
      editUserProfileValidation(reqParam, res, async (validate) => {
        if (validate) {
          let updateData = {
            name: reqParam.name,
            dob: reqParam.dob || null,
            gender: reqParam.gender,
            is_audio_feedback_disabled: reqParam.isAudioFeedbackDisabled,
            job_role: reqParam.jobRole
          };
          let userProfileUrl;
          if (reqParam.profile) {
            const existingProfile = await Users.findById(req.authUserId).select('user_profile');
            if (existingProfile && existingProfile.user_profile) {
              await removeOldImage(existingProfile.user_profile, USER_MEDIA_PATH.USER_PROFILE, res);
            }
            const imageExtension = reqParam.profile.split('/')[1];
            const profileImage = `${unixTimeStamp(new Date())}-${makeRandomDigit(
              4
            )}.${imageExtension}`;
            userProfileUrl = await getUploadURL(
              reqParam.imageUrl,
              profileImage,
              USER_MEDIA_PATH.USER_PROFILE
            );
            updateData = {
              ...updateData,
              user_profile: profileImage
            };
          }
          if (reqParam.isImageDeleted) {
            updateData = {
              ...updateData,
              user_profile: null
            };
            const existingProfile = await Users.findById(req.authUserId).select('user_profile');
            if (existingProfile && existingProfile.user_profile) {
              await removeOldImage(existingProfile.user_profile, USER_MEDIA_PATH.USER_PROFILE, res);
            }
          }
          const updatedUserProfile = await Users.findByIdAndUpdate(req.authUserId, updateData, {
            new: true
          });
          if (updatedUserProfile) {
            return Response.successResponseWithoutData(
              res,
              res.__('userDataUpdated'),
              SUCCESS,
              userProfileUrl || null
            );
          } else {
            return Response.successResponseWithoutData(res, res.__('userDataNotFound'), FAIL);
          }
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  editUserProfileWeb: (req, res) => {
    try {
      const reqParam = req.body;
      editUserProfileWebValidation(reqParam, res, async (validate) => {
        if (validate) {
          let updateData = {
            name: reqParam.firstName + ' ' + reqParam.lastName,
            first_name: reqParam.firstName,
            last_name: reqParam.lastName,
            dob: reqParam.dob || null,
            gender: reqParam.gender,
            country: reqParam.country,
            email: reqParam.email,
            job_role: reqParam.jobRole
          };

          let existingProfile = await Users.findOne({ email: reqParam.email });
          if (existingProfile) {
            delete updateData.email;
          }

          let userProfileUrl;
          const findUserCondition = {
            _id: req.authUserId,
            status: {
              $ne: ACCOUNT_STATUS.DELETED
            },
            user_type: { $nin: [USER_TYPE.SUPER_ADMIN, USER_TYPE.SUB_ADMIN] }
          };
          const user = await Users.findOne(findUserCondition, {
            name: 1,
            email: 1,
            user_type: 1,
            is_email_verified: 1,
            status: 1,
            user_profile: 1,
            password: 1,
            last_otp_sent: 1,
            otp_sent_count: 1,
            gender: 1,
            dob: 1,
            is_under_trial: 1,
            trial_starts_from: 1,
            account_type: 1,
            country_code: 1,
            mobile: 1,
            job_role: 1
          });

          if (user) {
            if (reqParam.isImageDeleted) {
              updateData = {
                ...updateData,
                user_profile: null
              };
              const existingProfile = await Users.findById(req.authUserId).select('user_profile');
              if (existingProfile && existingProfile.user_profile) {
                await removeOldImage(
                  existingProfile.user_profile,
                  USER_MEDIA_PATH.USER_PROFILE,
                  res
                );
              }
            }

            if (reqParam.profile) {
              const existingProfile = await Users.findById(req.authUserId).select('user_profile');
              if (existingProfile && existingProfile.user_profile) {
                await removeOldImage(
                  existingProfile.user_profile,
                  USER_MEDIA_PATH.USER_PROFILE,
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
                USER_MEDIA_PATH.USER_PROFILE
              );
              updateData = {
                ...updateData,
                user_profile: profileImage
              };
            }

            Bcrypt.compare(reqParam.password, user.password, async (err, result) => {
              if (err) {
                return Response.errorResponseData(
                  res,
                  res.__('userNotFound'),
                  RESPONSE_CODE.BAD_REQUEST
                );
              }
              if (result) {
                console.log(updateData);
                await Users.findByIdAndUpdate(req.authUserId, updateData, {
                  new: true
                });

                return Response.successResponseWithoutData(
                  res,
                  res.__('userDataUpdated'),
                  SUCCESS,
                  userProfileUrl || null
                );
              } else {
                return Response.successResponseWithoutData(res, res.__('passwordNotMatched'), FAIL);
              }
            });
          } else {
            return Response.successResponseWithoutData(res, res.__('userDataNotFound'), FAIL);
          }
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      console.log(err);
      return Response.internalServerErrorResponse(res);
    }
  },

  getUsersList: async (req, res) => {
    try {
      let reqParam = req.query;

      let profiles = await Users.find().select('name email user_type');
      for (const i of profiles) {
        if (i.email) {
          let profile = {
            email: i.email,
            userType: i.user_type,
            firstName: i.name
          };

          await addEditKlaviyoUser(profile);
        }
      }

      return Response.successResponseData(res, profiles, SUCCESS, res.__('getKlaviyoListSuccess'));
    } catch (err) {
      console.error(err);
      return Response.internalServerErrorResponse(res);
    }
  }
};
