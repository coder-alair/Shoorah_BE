'use strict';

const appleSignIn = require('apple-signin-auth');
const {
  Users,
  DeviceTokens,
  Config,
  Bookmarks,
  Cleanse,
  Goals,
  Reminder,
  UserBadges,
  UserCompletedRituals,
  UserGratitude,
  UserInterest,
  UserNotes,
  UserRituals,
  Subscriptions,
  Expert
} = require('@models');
const Response = require('@services/Response');
const jwt = require('jsonwebtoken');
const {
  userSignUpValidation,
  userOTPVerifyValidation,
  userForgotPasswordValidation,
  userResetPasswordValidation,
  userChangePasswordValidation,
  removeUserDeviceTokenValidation,
  versionCompatibilityValidation,
  updateOnBoardStepValidation,
  refreshTokenValidation,
  deleteUserAccountValidation
} = require('@services/userValidations/authValidations');
const {
  ACCOUNT_STATUS,
  FAIL,
  MAIL_SUBJECT,
  EMAIL_VERIFICATION,
  USER_TYPE,
  RESPONSE_CODE,
  SUCCESS,
  DAY_LIMIT,
  OTP_LIMIT,
  RESET_PASSWORD,
  OTP_LENGTH,
  CONFIG_TYPE,
  DEVICE_TYPE,
  FORCE_UPDATE,
  OPTIONAL_UPDATE,
  OTP_EXPIRY,
  CLOUDFRONT_URL,
  USER_MEDIA_PATH,
  GENDER,
  USER_TRIAL_LIMIT,
  ACCOUNT_TYPE,
  EXPERT_PROFILE_STATUS
} = require('@services/Constant');
const { makeRandomDigit } = require('@services/Helper');
const Bcrypt = require('bcrypt');
const {
  issueUserToken,
  issueUserRefreshToken,
  verifyUserRefreshToken,
  issueAdminToken,
  issueAdminRefreshToken
} = require('@services/JwToken');
const { toObjectId } = require('@services/Helper');
const { storeDeviceToken, generatePassword } = require('@services/authServices');
const { sendOtp, sendOtpToMobile, sendVerificationEmail } = require('@services/Mailer');
const {
  issueUserRefreshTokenParticular,
  issueUserTokenPaticular
} = require('../../../services/JwToken');
const {
  appendLineToFile,
  convertObjectKeysToCamelCase,
  addEditKlaviyoUser
} = require('../../../services/Helper');
const { getUploadURL, removeOldImage } = require('@services/s3Services');
const { default: axios } = require('axios');
const { COMPANY_MEDIA_PATH, KLAVIYO_LIST } = require('../../../services/Constant');
const { setAppUsage } = require('./historyController');
const CompanySubscriptions = require('../../../models/CompanySubscription');
const { sendUserOtp } = require('../../../services/Mailer');
const { GoogleAuthProvider, getAuth, signInWithCredential } = require('firebase/auth'); // Adjust based on your setup
// const { initializeApp } = require('firebase/app');
// const admin = require('firebase-admin');

// Initialize Firebase with environment variables
// const firebaseConfig = {
//     apiKey: process.env.VITE_API_KEY,
//     authDomain: process.env.VITE_AUTH_DOMAIN,
//     projectId: process.env.VITE_PROJECT_ID,
//     storageBucket: process.env.VITE_STORAGE_BUCKET,
//     messagingSenderId: process.env.VITE_MESSAGING_SENDER_ID,
//     appId: process.env.VITE_APP_ID,
//     measurementId: process.env.VITE_MEASUREMENT_ID
// };

// const app = initializeApp(firebaseConfig);
// const auth = getAuth(app);

// admin.initializeApp({
//   credential: admin.credential.applicationDefault(), // or your service account
// });

module.exports = {
  /**
   * @description This function is used to sign up as user
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  userSignUp: (req, res) => {
    try {
      const reqParam = req.body;
      userSignUpValidation(reqParam, res, async (validate) => {
        if (validate) {
          if (reqParam.userType === USER_TYPE.EXPERT) {
            let emailTrim;
            reqParam.email && (emailTrim = reqParam.email.toLowerCase().trim());
            const userExists = await Users.findOne({ email: emailTrim }).select(
              '-password -otp -last_otp_sent -otp_sent_count'
            );
            if (userExists && !reqParam.isSocialLogin) {
              return Response.successResponseWithoutData(
                res,
                reqParam.email ? res.__('emailAlreadyExists') : null,
                FAIL
              );
            } else {
              if (reqParam.isSocialLogin == true) {
                let createUserData = {
                  name: reqParam.name,
                  email: emailTrim,
                  user_type: reqParam.userType,
                  login_type: reqParam.loginType
                };
                if (userExists) {
                  let interviewConfirmation = false;
                  let isRejected = false;
                    const findExpert = await Expert.findOne({ user_id: userExists._id });
                    console.log("🚀 ~ adminOTPValidations ~ findExpert:", findExpert)
                    if (findExpert && findExpert?.profile_status == EXPERT_PROFILE_STATUS.INVITED) {
                      interviewConfirmation = true;
                    }
                    if(findExpert && findExpert?.profile_status == EXPERT_PROFILE_STATUS.REJECTED){
                      isRejected = true;
                    }
                    const data = {
                      ...userExists.toObject(),
                      interviewConfirmation,
                      isRejected,
                      isVerified:userExists.isVerified,
                      isEmailVerified:userExists.is_email_verified
                    }
                  const meta = {
                    token: issueAdminToken({
                      id: userExists._id,
                      companyId: userExists.company_id?._id
                    }),
                    refreshToken: issueAdminRefreshToken({
                      id: userExists._id,
                      companyId: userExists.company_id?._id
                    })
                  };
                  return Response.successResponseData(
                    res,
                    data,
                    SUCCESS,
                    res.__('loginSuccess'),
                    meta
                  );
                } else {
                  let interviewConfirmation = false;
                  let isRejected = false;
                  let isVerified = false;
                  const newUser = await Users.create(createUserData)
                  newUser.is_email_verified = true;
                  let isEmailVerified = newUser.is_email_verified
                  newUser.save();
                  const meta = {
                    token: issueAdminToken({
                      id: newUser._id,
                      companyId: newUser.company_id?._id
                    }),
                    refreshToken: issueAdminRefreshToken({
                      id: newUser._id,
                      companyId: newUser.company_id?._id
                    })
                  };
                  const data = {
                    ...newUser.toObject(),
                    interviewConfirmation,
                    isRejected,
                    isVerified,
                    isEmailVerified
                  }
                  return Response.successResponseData(
                    res,
                    data,
                    SUCCESS,
                    res.__('loginSuccess'),
                    meta
                  );
                }
              }
              const hashPassword = await generatePassword(reqParam.password);
              let createUserData = {
                name: reqParam.name,
                email: emailTrim,
                password: hashPassword,
                user_type: reqParam.userType
              };
              const newUser = await Users.create(createUserData);
              if (newUser) {
                // Generate a token
                const token = jwt.sign({ id: newUser._id }, process.env.JWT_USER_SECRETKEY, {
                  expiresIn: '1h' // Token valid for 1 hour
                });
                // let verificationLink;
                // if (newUser.is_email_verified == true) {
                //   verificationLink = `${process.env.FRONTEND_URL}/signupJourney/personalDetails?token=${token}`;
                // } else {
                //   verificationLink = `${process.env.FRONTEND_URL}?token=${token}`;
                // }

                const meta = {
                  token: issueAdminToken({
                    id: newUser._id,
                    companyId: newUser.company_id?._id
                  }),
                  refreshToken: issueAdminRefreshToken({
                    id: newUser._id,
                    companyId: newUser.company_id?._id
                  })
                };

                // signupJourney/personalDetails?name=cba&email=cba@yopmail.com&token=eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3MDUyYTM3OWYyZmMxYmZjMzU1YzE3MyIsImlhdCI6MTcyODM5MTczNSwiZXhwIjoxNzMwOTgzNzM1fQ.1viNvt0OpDLFDc7vcqF4Imbg1LEfrkwwClPb-vVW0rCY1XghqvtpcFcMD1Ut_-e1dqBMfPDH8ytDwIgl73t9NQ

                let verificationLink;
                // verificationLink = `${process.env.FRONTEND_URL}/signupJourney/personalDetails?name=${newUser.name}&email=${newUser.email}&token=${meta.token}`;
                verificationLink = `${process.env.FRONTEND_URL}signupJourney/personalDetails?name=${encodeURIComponent(newUser.name)}&email=${encodeURIComponent(newUser.email)}&token=${encodeURIComponent(meta.token)}`;
                newUser.is_email_verified = true;
                newUser.save();
                // Generate the verification link with the token
                const data = {
                  firstName: reqParam.name,
                  verificationLink: verificationLink
                };
                // Send verification email with the token
                await sendVerificationEmail(emailTrim, data);

                return Response.successResponseWithoutData(
                  res,
                  reqParam.email ? res.__('sendForVerification') : null,
                  EMAIL_VERIFICATION
                );
              } else {
                return Response.successResponseWithoutData(res, res.__('somethingWrong'), FAIL);
              }
            }
          }

          // ----------------------------------
          const body = `\n\n
          data: ${JSON.stringify(reqParam)} \n
          loginAt: login At : ${new Date()} \n
          reqData: ${JSON.stringify(convertObjectKeysToCamelCase(req.rawHeaders))} \n,
           req: ${JSON.stringify({ method: req.method, url: req.url, headers: req.headers, body: req.body })}

        `;
          appendLineToFile(body, `signup_logs.txt`);

          let reqEmail;
          reqParam.email && (reqEmail = reqParam.email.toLowerCase().trim());
          const findUserCondition = {
            ...(reqParam.email && { email: reqEmail }),
            ...(reqParam.mobile && {
              mobile: reqParam.mobile.trim()
            }),
            status: {
              $ne: ACCOUNT_STATUS.DELETED
            },
            user_type: USER_TYPE.USER
          };
          const userExists = await Users.findOne(findUserCondition).select(
            '_id email is_email_verified status otp_sent_count mobile country_code'
          );
          if (userExists) {
            if (userExists.status === ACCOUNT_STATUS.INACTIVE) {
              return Response.successResponseWithoutData(res, res.__('accountIsInactive'), FAIL);
            }
            if (userExists && userExists.is_email_verified) {
              return Response.successResponseWithoutData(
                res,
                reqParam.email ? res.__('emailAlreadyExists') : res.__('mobileAlreadyExists'),
                FAIL
              );
            } else {
              const userOtp = await makeRandomDigit(OTP_LENGTH);
              const hashPassword = await generatePassword(reqParam.password);
              const updateUserData = {
                name: reqParam.name,
                ...(reqParam.email && { email: reqEmail }),
                ...(reqParam.mobile && {
                  country_code: reqParam.countryCode,
                  mobile: reqParam.mobile
                }),
                password: hashPassword,
                otp: userOtp,
                last_otp_sent: new Date(),
                otp_sent_count: userExists.otp_sent_count + 1,
                dob: reqParam.dob || null,
                gender: reqParam.gender || GENDER.NOT_PREFERRED,
                job_role: reqParam.jobRole
              };
              await Users.findByIdAndUpdate(userExists._id, updateUserData);
              const locals = {
                name: reqParam.name,
                otp: userOtp,
                signUp: true
              };
              reqParam.email && (await sendUserOtp(reqEmail, MAIL_SUBJECT.VERIFY_EMAIL, locals));
              if (reqParam.mobile) {
                const otpExists = await sendOtpToMobile(
                  reqParam.countryCode + reqParam.mobile,
                  userOtp
                );
                if (!otpExists) {
                  return Response.successResponseWithoutData(res, res.__('invalidMobile'), FAIL);
                }
              }
              return Response.successResponseWithoutData(
                res,
                reqParam.email ? res.__('verifyEmail') : res.__('verifyMobile'),
                EMAIL_VERIFICATION
              );
            }
          } else {
            const userOtp = await makeRandomDigit(OTP_LENGTH);
            const hashPassword = await generatePassword(reqParam.password);
            let createUserData = {
              name: reqParam.name,
              ...(reqParam.email && { email: reqEmail }),
              ...(reqParam.mobile && {
                country_code: reqParam.countryCode,
                mobile: reqParam.mobile
              }),
              password: hashPassword,
              otp: userOtp,
              last_otp_sent: new Date(),
              otp_sent_count: 1,
              dob: reqParam.dob || null,
              job_role: reqParam.jobRole || null
            };
            if (reqParam.gender) {
              createUserData = {
                ...createUserData,
                gender: reqParam.gender
              };
            }
            const newUser = await Users.create(createUserData);
            if (newUser) {
              const locals = {
                name: newUser.name,
                otp: userOtp,
                signUp: true
              };
              reqParam.email &&
                (await sendUserOtp(newUser.email, MAIL_SUBJECT.VERIFY_EMAIL, locals));
              if (reqParam.mobile) {
                const otpExists = await sendOtpToMobile(
                  reqParam.countryCode + reqParam.mobile,
                  userOtp
                );
                if (!otpExists) {
                  await Users.findByIdAndDelete(newUser._id);
                  return Response.successResponseWithoutData(res, res.__('invalidMobile'), FAIL);
                }
              }
              return Response.successResponseWithoutData(
                res,
                reqParam.email ? res.__('verifyEmail') : res.__('verifyMobile'),
                EMAIL_VERIFICATION
              );
            } else {
              return Response.successResponseWithoutData(res, res.__('somethingWrong'), FAIL);
            }
          }
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  resendConfirmationMail: async (req, res) => {
    try {
      const { email } = req.body;

      // Trim and convert to lowercase
      const emailTrim = email.toLowerCase().trim();

      // Check if the user exists and if the email is verified
      const user = await Users.findOne({ email: emailTrim }).select(
        '_id email is_email_verified status'
      );

      if (!user) {
        return Response.successResponseWithoutData(res, res.__('emailNotFound'), FAIL);
      }

      const meta = {
        token: issueAdminToken({
          id: user._id,
          companyId: user.company_id?._id
        }),
        refreshToken: issueAdminRefreshToken({
          id: user._id,
          companyId: user.company_id?._id
        })
      };

      let verificationLink;

      verificationLink = `${process.env.FRONTEND_URL}signupJourney/personalDetails?name=${encodeURIComponent(user.name)}&email=${encodeURIComponent(user.email)}&token=${encodeURIComponent(meta.token)}`;

      user.is_email_verified = true;
      user.save();

      const data = {
        firstName: user.name,
        verificationLink: verificationLink
      };

      // Send verification email with the token
      await sendVerificationEmail(emailTrim, data);

      return Response.successResponseWithoutData(
        res,
        res.__('sendForVerification'), // Message for sending verification email
        EMAIL_VERIFICATION
      );
    } catch (err) {
      console.log(err.message);
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to verify expert's email verification link
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  verifyEmailToken: async (req, res) => {
    try {
      // Extract the token from the query parameters
      const { token } = req.query;

      // Verify the token
      const decoded = jwt.verify(token, process.env.JWT_USER_SECRETKEY);

      // Find the user by ID
      const user = await Users.findById(decoded.id);
      console.log(user, '<<<<<<<<<user');
      if (!user) {
        return Response.successResponseWithoutData(res, res.__('userNotFound'), FAIL);
      }

      // Update the user's email verification status
      if (!user.is_email_verified) {
        user.is_email_verified = true;
        await user.save();
        return Response.successResponseWithoutData(
          res,
          res.__('emailVerifiedSuccessfully'),
          SUCCESS
        );
      } else {
        return Response.successResponseWithoutData(res, res.__('emailAlreadyVerified'), FAIL);
      }
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return Response.successResponseWithoutData(res, res.__('tokenExpired'), FAIL);
      }
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to verify expert's email verification link
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  verifyEmailToken: async (req, res) => {
    try {
      // Extract the token from the query parameters
      const { token } = req.query;

      // Verify the token
      const decoded = jwt.verify(token, process.env.JWT_USER_SECRETKEY);

      // Find the user by ID
      const user = await Users.findById(decoded.id);
      console.log(user,"<<<<<<<<<user")
      if (!user) {
        return Response.successResponseWithoutData(res, res.__('userNotFound'), FAIL);
      }

      // Update the user's email verification status
      if (!user.is_email_verified) {
        user.is_email_verified = true;
        await user.save();
        return Response.successResponseWithoutData(
          res,
          res.__('emailVerifiedSuccessfully'),
          SUCCESS
        );
      } else {
        return Response.successResponseWithoutData(res, res.__('emailAlreadyVerified'), FAIL);
      }
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return Response.successResponseWithoutData(res, res.__('tokenExpired'), FAIL);
      }
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to verify expert's email verification link
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  verifyEmailToken: async (req, res) => {
    try {
      // Extract the token from the query parameters
      const { token } = req.query;

      // Verify the token
      const decoded = jwt.verify(token, process.env.JWT_USER_SECRETKEY);

      // Find the user by ID
      const user = await Users.findById(decoded.id);
      console.log(user,"<<<<<<<<<user")
      if (!user) {
        return Response.successResponseWithoutData(res, res.__('userNotFound'), FAIL);
      }

      // Update the user's email verification status
      if (!user.is_email_verified) {
        user.is_email_verified = true;
        await user.save();
        return Response.successResponseWithoutData(
          res,
          res.__('emailVerifiedSuccessfully'),
          SUCCESS
        );
      } else {
        return Response.successResponseWithoutData(res, res.__('emailAlreadyVerified'), FAIL);
      }
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return Response.successResponseWithoutData(res, res.__('tokenExpired'), FAIL);
      }
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to log in as user.
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  userLogIn: async (req, res) => {
    try {
      const reqParam = req.body;
      reqParam.deviceType = req.headers.devicetype;
      reqParam.deviceToken = req.headers.devicetoken;

      const body = `\n\n
      data: ${JSON.stringify(reqParam)} \n
      loginAt: login At : ${new Date()} \n
      reqData: ${JSON.stringify(convertObjectKeysToCamelCase(req.rawHeaders))} \n,
      req: ${JSON.stringify({ method: req.method, url: req.url, headers: req.headers, body: req.body })}
    `;
      appendLineToFile(body, `login_logs.txt`);

      const reqEmail = reqParam.email.toLowerCase().trim();
      const findUserCondition = {
        $or: [
          {
            email: reqEmail
          },
          {
            mobile: reqEmail
          },
          {
            $expr: {
              $eq: [{ $concat: ['$country_code', '$mobile'] }, reqEmail]
            }
          }
        ],
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
        company_id: 1,
        is_audio_feedback_disabled: 1,
        job_role: 1
      }).lean();

      if (user) {
        if (user.user_type == 2) {
          user.user_profile =
            CLOUDFRONT_URL + USER_MEDIA_PATH.USER_PROFILE + '/' + user.user_profile;
        } else {
          user.user_profile =
            CLOUDFRONT_URL + COMPANY_MEDIA_PATH.COMPANY_PROFILE + '/' + user.user_profile;
        }

        if (user.status === ACCOUNT_STATUS.ACTIVE) {
          Bcrypt.compare(reqParam.password, user.password, async (err, result) => {
            if (err) {
              return Response.errorResponseData(
                res,
                res.__('userNotFound'),
                RESPONSE_CODE.BAD_REQUEST
              );
            }
            if (result) {
              let companyId;
              if (user?.company_id) {
                companyId = user?.company_id;
              }
              if (user.is_email_verified) {
                await storeDeviceToken(user._id, reqParam.deviceToken, reqParam.deviceType);
                const meta = {
                  token: issueUserToken({
                    id: user._id,
                    companyId: companyId
                  }),
                  refreshToken: issueUserRefreshToken({
                    id: user._id,
                    companyId: companyId
                  })
                };
                user.isUnderTrial = user?.is_under_trial
                  ? (new Date().getTime() - user?.trial_starts_from.getTime()) /
                      (1000 * 3600 * 24) <
                    USER_TRIAL_LIMIT
                  : false;
                user.isAudioFeedbackDisabled = user?.is_audio_feedback_disabled
                  ? user.is_audio_feedback_disabled
                  : false;
                const resObj = {
                  id: user.id || user._id,
                  name: user.name,
                  email: user.email || `${user.country_code}${user.mobile}`,
                  userType: user.user_type,
                  profile: user.user_profile,
                  gender: user.gender,
                  dob: user.dob,
                  isAudioFeedbackDisabled: user.isAudioFeedbackDisabled,
                  companyId: user?.company_id,
                  isSocialLogin: user.isSocialLogin,
                  accountType: user.account_type,
                  isUnderTrial: user.isUnderTrial,
                  existingUser: user.existingUser,
                  jobRole: user.job_role
                };

                await Users.updateOne(
                  { _id: user.id },
                  {
                    $set: {
                      last_login: new Date()
                    }
                  }
                );

                let profile = {
                  email: user.email,
                  userType: user.user_type,
                  firstName: user.name
                };

                await addEditKlaviyoUser(profile);
                await setAppUsage(user.id);

                return Response.successResponseData(
                  res,
                  resObj,
                  SUCCESS,
                  res.__('loginSuccess'),
                  meta
                );
              } else {
                const userOtp = await makeRandomDigit(OTP_LENGTH);
                let updateData = {
                  last_otp_sent: new Date(),
                  otp: userOtp
                };
                if (user.last_otp_sent) {
                  const currentDate = new Date();
                  const hoursBetweenDates =
                    Math.abs(user.last_otp_sent.getTime() - currentDate.getTime()) /
                    (60 * 60 * 1000);
                  if (hoursBetweenDates < DAY_LIMIT && user.otp_sent_count >= OTP_LIMIT) {
                    return Response.successResponseWithoutData(
                      res,
                      res.__('emailVerificationLimitReached'),
                      FAIL
                    );
                  } else {
                    updateData = {
                      ...updateData,
                      otp_sent_count: hoursBetweenDates > DAY_LIMIT ? 1 : user.otp_sent_count + 1
                    };
                  }
                } else {
                  updateData = {
                    ...updateData,
                    otp_sent_count: user.otp_sent_count + 1
                  };
                }
                await Users.findOneAndUpdate({ _id: user._id }, updateData);
                const locals = {
                  name: user.name,
                  otp: userOtp
                };
                user.email && (await sendOtp(user.email, MAIL_SUBJECT.VERIFY_EMAIL, locals));
                if (user.mobile) {
                  const otpExists = await sendOtpToMobile(user.country_code + user.mobile, userOtp);
                  if (!otpExists) {
                    return Response.successResponseWithoutData(res, res.__('invalidMobile'), FAIL);
                  }
                }
                return Response.successResponseWithoutData(
                  res,
                  user.email ? res.__('otpSentToEmail') : res.__('otpSentToMobile'),
                  EMAIL_VERIFICATION
                );
              }
            } else {
              return Response.successResponseWithoutData(
                res,
                user.email ? res.__('userPasswordNotMatch') : res.__('mobilePasswordNotMatch'),
                FAIL
              );
            }
          });
        } else {
          return Response.successResponseWithoutData(res, res.__('accountIsInactive'), FAIL);
        }
      } else {
        return Response.successResponseWithoutData(res, res.__('userNotFound'), FAIL);
      }
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to verify OTP.
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  userOTPVerify: (req, res) => {
    try {
      const reqParam = req.body;
      reqParam.deviceType = req.headers.devicetype;
      reqParam.deviceToken = req.headers.devicetoken;
      userOTPVerifyValidation(reqParam, res, async (validate) => {
        if (validate) {
          const body = `\n\n
          data: ${JSON.stringify(reqParam)} \n
          loginAt: login At : ${new Date()} \n
          reqData: ${JSON.stringify(convertObjectKeysToCamelCase(req.rawHeaders))} \n
           req: ${JSON.stringify({ method: req.method, url: req.url, headers: req.headers, body: req.body })}
        `;
          appendLineToFile(body, `verify_otp_logs.txt`);

          const reqEmail = reqParam.email.toLowerCase().trim();
          const findUserCondition = {
            $or: [
              {
                email: reqEmail
              },
              {
                mobile: reqEmail
              },
              {
                $expr: {
                  $eq: [{ $concat: ['$country_code', '$mobile'] }, reqEmail]
                }
              }
            ],
            otp: reqParam.otp,
            status: {
              $ne: ACCOUNT_STATUS.DELETED
            },
            user_type: { $nin: [USER_TYPE.SUPER_ADMIN, USER_TYPE.SUB_ADMIN] }
          };
          const user = await Users.findOne(findUserCondition, {
            name: 1,
            email: 1,
            user_type: 1,
            user_profile: {
              $concat: [CLOUDFRONT_URL, USER_MEDIA_PATH.USER_PROFILE, '/', '$user_profile']
            },
            status: 1,
            last_otp_sent: 1,
            otp_sent_count: 1,
            gender: 1,
            dob: 1,
            is_under_trial: 1,
            trial_starts_from: 1,
            account_type: 1,
            country_code: 1,
            mobile: 1
          });
          if (user) {
            if (user.status === ACCOUNT_STATUS.ACTIVE) {
              const currentDate = new Date();
              const checkOtpExpiry =
                (currentDate.getTime() - user.last_otp_sent.getTime()) / (60 * 1000);
              if (checkOtpExpiry > OTP_EXPIRY) {
                return Response.successResponseWithoutData(res, res.__('otpExpired'), FAIL);
              }
              const updateObj = {
                is_email_verified: true,
                otp: null
              };
              await Users.findByIdAndUpdate(user._id, updateObj);
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
                isSocialLogin: user.isSocialLogin,
                accountType: user.account_type,
                isUnderTrial: user.isUnderTrial,
                existingUser: user.existingUser
              };

              let profile = {
                email: user.email,
                userType: user.user_type,
                firstName: user.name
              };

              await addEditKlaviyoUser(profile);

              return Response.successResponseData(
                res,
                resObj,
                SUCCESS,
                res.__('loginSuccess'),
                meta
              );
            } else {
              return Response.successResponseWithoutData(res, res.__('accountIsInactive'), FAIL);
            }
          } else {
            return Response.successResponseWithoutData(res, res.__('invalidOTP'), FAIL);
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
   * @description This function is used to sent otp to user's registered email address.
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  userForgotPassword: async (req, res) => {
    try {
      const reqParam = req.body;
      const reqEmail = reqParam.email.toLowerCase().trim();
      const findUserCondition = {
        $or: [
          {
            email: reqEmail
          },
          {
            mobile: reqEmail
          },
          {
            $expr: {
              $eq: [{ $concat: ['$country_code', '$mobile'] }, reqEmail]
            }
          }
        ],
        status: {
          $ne: ACCOUNT_STATUS.DELETED
        },
        user_type: { $nin: [USER_TYPE.SUPER_ADMIN, USER_TYPE.SUB_ADMIN] }
      };
      const user = await Users.findOne(findUserCondition).select(
        'name email status last_otp_sent otp_sent_count country_code mobile'
      );
      if (!user) {
        return Response.successResponseWithoutData(res, res.__('userNotFound'), FAIL);
      }
      if (user.status === ACCOUNT_STATUS.ACTIVE) {
        const userOtp = await makeRandomDigit(OTP_LENGTH);
        let updateData = {
          last_otp_sent: new Date(),
          otp: userOtp
        };
        if (user.last_otp_sent) {
          const currentDate = new Date();
          const hoursBetweenDates =
            Math.abs(user.last_otp_sent.getTime() - currentDate.getTime()) / (60 * 60 * 1000);
          if (hoursBetweenDates < DAY_LIMIT && user.otp_sent_count >= OTP_LIMIT) {
            return Response.successResponseWithoutData(
              res,
              res.__('forgotPasswordLimitReached'),
              FAIL
            );
          } else {
            updateData = {
              ...updateData,
              otp_sent_count: hoursBetweenDates > DAY_LIMIT ? 1 : user.otp_sent_count + 1
            };
          }
        } else {
          updateData = {
            ...updateData,
            otp_sent_count: user.otp_sent_count + 1
          };
        }
        await Users.findOneAndUpdate({ _id: user._id }, updateData);
        const locals = {
          name: user.name,
          otp: userOtp
        };
        user.email && (await sendUserOtp(user.email, MAIL_SUBJECT.FORGOT_PASSWORD, locals));
        if (user.mobile) {
          const otpExists = await sendOtpToMobile(user.country_code + user.mobile, userOtp);
          if (!otpExists) {
            return Response.successResponseWithoutData(res, res.__('invalidMobile'), FAIL);
          }
        }
        return Response.successResponseWithoutData(
          res,
          user.email ? res.__('otpSentToEmail') : res.__('otpSentToMobile'),
          RESET_PASSWORD
        );
      } else {
        return Response.successResponseWithoutData(res, res.__('accountIsInactive'), FAIL);
      }
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to reset user password
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  userResetPassword: (req, res) => {
    try {
      const reqParam = req.body;
      userResetPasswordValidation(reqParam, res, async (validate) => {
        if (validate) {
          const reqEmail = reqParam.email.toLowerCase().trim();
          const findUserCondition = {
            $or: [
              {
                email: reqEmail
              },
              {
                mobile: reqEmail
              },
              {
                $expr: {
                  $eq: [{ $concat: ['$country_code', '$mobile'] }, reqEmail]
                }
              }
            ],
            status: {
              $ne: ACCOUNT_STATUS.DELETED
            },
            user_type: { $nin: [USER_TYPE.SUPER_ADMIN, USER_TYPE.SUB_ADMIN] }
          };
          const user = await Users.findOne(findUserCondition, {
            status: 1,
            password: 1,
            otp: 1,
            last_otp_sent: 1
          });
          if (user) {
            if (user.status === ACCOUNT_STATUS.ACTIVE) {
              if (user.otp === reqParam.otp) {
                const currentDate = new Date();
                const checkOtpExpiry =
                  (currentDate.getTime() - user.last_otp_sent.getTime()) / (60 * 1000);
                if (checkOtpExpiry > OTP_EXPIRY) {
                  return Response.successResponseWithoutData(res, res.__('otpExpired'), FAIL);
                }
                Bcrypt.compare(reqParam.newPassword, user.password, async (err, result) => {
                  if (err) {
                    return Response.internalServerErrorResponse(res);
                  }
                  if (result) {
                    return Response.successResponseWithoutData(
                      res,
                      res.__('oldNewPasswordSame'),
                      FAIL
                    );
                  } else {
                    const hashPassword = await generatePassword(reqParam.newPassword);
                    const updateData = {
                      password: hashPassword,
                      is_email_verified: true,
                      otp: null
                    };
                    await Users.findByIdAndUpdate(user._id, updateData);
                    return Response.successResponseWithoutData(
                      res,
                      res.__('passwordReset'),
                      SUCCESS
                    );
                  }
                });
              } else {
                return Response.successResponseWithoutData(res, res.__('invalidOTP'), FAIL);
              }
            } else {
              return Response.successResponseWithoutData(res, res.__('accountIsInactive'), FAIL);
            }
          } else {
            return Response.successResponseWithoutData(res, res.__('userNotFound'), FAIL);
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
   * @description This function is used to change user password
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  userChangePassword: (req, res) => {
    try {
      const reqParam = req.body;
      userChangePasswordValidation(reqParam, res, async (validate) => {
        if (validate) {
          const user = await Users.findById(req.authUserId).select('password');
          if (user) {
            Bcrypt.compare(reqParam.oldPassword, user.password, async (err, result) => {
              if (err) {
                return Response.internalServerErrorResponse(res);
              }
              if (result) {
                const hashPassword = await generatePassword(reqParam.newPassword);
                await Users.findByIdAndUpdate(req.authUserId, { password: hashPassword });
                return Response.successResponseWithoutData(
                  res,
                  res.__('changePasswordSuccess'),
                  SUCCESS
                );
              } else {
                return Response.successResponseWithoutData(
                  res,
                  res.__('oldPasswordNotMatch'),
                  FAIL
                );
              }
            });
          } else {
            return Response.successResponseWithoutData(res, res.__('userNotFound'), FAIL);
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
   * @description This function is used to remove user device token
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  removeUserDeviceToken: (req, res) => {
    try {
      const reqParam = req.query;
      removeUserDeviceTokenValidation(reqParam, res, async (validate) => {
        if (validate) {
          await DeviceTokens.findOneAndDelete({
            user_id: req.authUserId,
            device_token: reqParam.deviceToken
          });
          return Response.successResponseWithoutData(res, res.__('deviceTokenRemoved'), SUCCESS);
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to check app version compatibilty
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  versionCompatibility: (req, res) => {
    try {
      const reqParam = req.headers;
      versionCompatibilityValidation(reqParam, res, async (validate) => {
        if (validate) {
          const appConfigs = await Config.find({
            config_key: {
              $in: [CONFIG_TYPE.IOS_UPDATE, CONFIG_TYPE.ANDROID_UPDATE]
            }
          });
          const versionData = appConfigs.find((x) =>
            parseInt(req.headers.devicetype) === DEVICE_TYPE.ANDROID
              ? x.config_key === CONFIG_TYPE.ANDROID_UPDATE
              : parseInt(req.headers.devicetype) === DEVICE_TYPE.IOS
                ? x.config_key === CONFIG_TYPE.IOS_UPDATE
                : null
          );
          if (versionData) {
            if (versionData.config_value.minVersion > req.headers.appversion) {
              return Response.errorResponseWithoutData(
                res,
                res.__(versionData.config_value.message),
                versionData.config_value.mandatoryUpdate ? FORCE_UPDATE : OPTIONAL_UPDATE
              );
            }
          }
          return Response.successResponseWithoutData(res, res.__('versionCompatible'), SUCCESS);
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to update logged in user onboard step.
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  updateOnBoardStep: (req, res) => {
    try {
      const reqParam = req.body;
      updateOnBoardStepValidation(reqParam, res, async (validate) => {
        if (validate) {
          await Users.findByIdAndUpdate(req.authUserId, { on_board_step: reqParam.onBoardStep });
          return Response.successResponseWithoutData(res, res.__('onboardStepUpdated'), SUCCESS);
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to get on board step details of logged in user.
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  getOnBoardStep: async (req, res) => {
    try {
      const onBoardData = await Users.findById(req.authUserId).select('on_board_step');
      return Response.successResponseData(
        res,
        { onBoardStep: onBoardData.on_board_step },
        SUCCESS,
        res.__('onBoardDetailSuccess')
      );
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used for refresh the token
   * @param {*} req
   * @param {*} res
   */
  refreshJwtToken: (req, res) => {
    try {
      const reqParam = req.body;
      refreshTokenValidation(reqParam, res, async (validData) => {
        if (validData) {
          verifyUserRefreshToken(reqParam.refreshToken, async (err, decoded) => {
            if (err) {
              return Response.errorResponseWithoutData(
                res,
                res.__('authorizationError'),
                RESPONSE_CODE.UNAUTHORIZED
              );
            }
            const meta = {
              token: issueUserToken({
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
  },

  /**
   * @description This function is used to send logged in user subscription status
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  getUserSubscriptionStatus: async (req, res) => {
    try {
      let user = await Users.findOne({ _id: req.authUserId });
      let resObj = {
        accountType: 'EXPIRED',
        isUnderTrial: false,
        productId: null,
        purchaseDeviceFrom: null,
        autoRenew: null
      };
      if (!user.company_id) {
        const userSubscriptionStatus = await Users.aggregate([
          {
            $match: {
              _id: toObjectId(req.authUserId)
            }
          },
          {
            $limit: 1
          },
          {
            $lookup: {
              from: 'subscriptions',
              let: {
                userId: '$_id'
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $eq: ['$$userId', '$user_id']
                    },
                    expires_date: { $gt: new Date() }
                  }
                },
                {
                  $sort: {
                    createdAt: -1
                  }
                },
                {
                  $limit: 1
                },
                {
                  $project: {
                    product_id: 1,
                    purchased_from_device: 1,
                    auto_renew: 1
                  }
                }
              ],
              as: 'subscriptions'
            }
          },
          {
            $project: {
              account_type: {
                $cond: {
                  if: {
                    $eq: [ACCOUNT_TYPE.FREE, '$account_type']
                  },
                  then: 'INITIAL_USER',
                  else: {
                    $cond: {
                      if: {
                        $eq: [ACCOUNT_TYPE.PAID, '$account_type']
                      },
                      then: 'SUBSCRIBED',
                      else: 'EXPIRED'
                    }
                  }
                }
              },
              is_under_trial: 1,
              trial_starts_from: 1,
              trial_ends_at: 1,
              productId: {
                $arrayElemAt: ['$subscriptions.product_id', 0]
              },
              autoRenew: {
                $arrayElemAt: ['$subscriptions.auto_renew', 0]
              },
              purchaseDeviceFrom: {
                $arrayElemAt: ['$subscriptions.purchased_from_device', 0]
              }
            }
          }
        ]);
        resObj = {
          accountType: userSubscriptionStatus[0]?.account_type,
          isUnderTrial: userSubscriptionStatus[0]?.is_under_trial
            ? !userSubscriptionStatus[0]?.trial_ends_at
              ? (new Date().getTime() - userSubscriptionStatus[0]?.trial_starts_from.getTime()) /
                  (1000 * 3600 * 24) <
                USER_TRIAL_LIMIT
              : (new Date().getTime() - userSubscriptionStatus[0]?.trial_starts_from.getTime()) /
                  (1000 * 3600 * 24) <
                userSubscriptionStatus[0]?.trial_ends_at.getTime()
            : false,
          productId: userSubscriptionStatus[0]?.productId || null,
          purchaseDeviceFrom: userSubscriptionStatus[0]?.purchaseDeviceFrom || null,
          autoRenew: userSubscriptionStatus[0]?.autoRenew || null
        };
      } else {
        console.log('here');
        const companySubscriptionStatus = await CompanySubscriptions.findOne({
          company_id: user.company_id
        });
        if (companySubscriptionStatus) {
          resObj = {
            accountType: companySubscriptionStatus?.is_under_trial
              ? 'TRIAL'
              : new Date(companySubscriptionStatus?.expires_date) < new Date()
                ? 'EXPIRED'
                : 'SUBSCRIBED',
            isUnderTrial: companySubscriptionStatus?.is_under_trial
              ? new Date() < new Date(companySubscriptionStatus?.trial_ends_at.getTime())
              : false,
            productId: companySubscriptionStatus?.product_id || null,
            purchaseDeviceFrom: null,
            autoRenew: null
          };
        }
      }
      await setAppUsage(req.authUserId);

      return Response.successResponseData(res, resObj, SUCCESS, res.__('userSubscriptioStatus'));
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to delete logged in user account
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  deleteUserAccount: async (req, res) => {
    try {
      const reqParam = req.query;
      deleteUserAccountValidation(reqParam, res, async (validate) => {
        if (validate) {
          const userDetails = await Subscriptions.findOne({
            user_id: req.authUserId,
            deletedAt: null
          })
            .select('auto_renew createdAt')
            .sort({ createdAt: -1 });
          if (userDetails && userDetails.auto_renew) {
            return Response.successResponseWithoutData(res, res.__('changeAutorenewRequest'), FAIL);
          }
          if (reqParam.authorizationCode) {
            const clientSecret = appleSignIn.getClientSecret({
              clientID: process.env.APPLE_CLIENT_ID, // Apple Client ID
              teamID: process.env.APPLE_TEAM_ID, // Apple Developer Team ID.
              privateKey: process.env.APPLE_PRIVATE_KEY,
              keyIdentifier: process.env.APPLE_KEY_IDENTIFIER, // identifier of the private key.
              expAfter: 15777000 // Unix time in seconds after which to expire the clientSecret JWT. Default is now+5 minutes.
            });
            const options = {
              clientID: process.env.APPLE_CLIENT_ID,
              clientSecret
            };
            const tokenResponse = await appleSignIn.getAuthorizationToken(
              reqParam.authorizationCode,
              options
            );
            if (tokenResponse && tokenResponse.access_token) {
              const options = {
                clientID: process.env.APPLE_CLIENT_ID, // Apple Client ID
                clientSecret,
                tokenTypeHint: 'access_token'
              };
              await appleSignIn.revokeAuthorizationToken(tokenResponse.access_token, options);
            }
          }
          const updateCondition = {
            status: ACCOUNT_STATUS.DELETED,
            deletedAt: new Date()
          };
          await Users.findByIdAndUpdate(req.authUserId, updateCondition);
          await DeviceTokens.deleteMany({
            user_id: req.authUserId
          });
          const filter = {
            user_id: req.authUserId,
            deletedAt: null
          };
          const update = {
            deletedAt: new Date()
          };
          await Bookmarks.updateMany(filter, update);
          await Cleanse.updateMany(filter, update);
          await Goals.updateMany(filter, update);
          await Reminder.updateOne(filter, update);
          await UserBadges.updateMany(filter, update);
          await UserCompletedRituals.updateMany(filter, update);
          await UserGratitude.updateMany(filter, update);
          await UserInterest.updateOne(filter, update);
          await UserNotes.updateMany(filter, update);
          await UserRituals.updateOne(filter, update);
          await Subscriptions.updateOne(filter, update);
          let user = await Users.findOne({ _id: req.authUserId });

          if (user) {
            let profile = {
              email: user.email,
              userType: user.user_type,
              firstName: user.name
            };

            await addEditKlaviyoUser(profile);
          }
          return Response.successResponseWithoutData(res, res.__('accountDeletedSuccess'), SUCCESS);
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to get config list for not subscribed users.
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  subscriptionConfigList: async (req, res) => {
    try {
      const freeAccessConfig = await Config.findOne({
        config_key: CONFIG_TYPE.USER_RESTRICTION
      }).select('config_value');
      const resObj = {
        notepadCount: freeAccessConfig?.config_value?.notepadCount,
        gratitudeCount: freeAccessConfig?.config_value?.gratitudeCount,
        cleanseCount: freeAccessConfig?.config_value?.cleanseCount,
        goalsCount: freeAccessConfig?.config_value?.goalsCount,
        moodReportAccess: freeAccessConfig?.config_value?.moodReportAccess
      };
      return Response.successResponseData(res, resObj, SUCCESS, res.__('userSubscriptioConfig'));
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  userEmailPhoneLogIn: async (req, res) => {
    try {
      const reqParam = req.body;
      reqParam.deviceType = req.headers.devicetype;
      reqParam.deviceToken = req.headers.devicetoken;
      // Email User
      if (reqParam.email) {
        const reqEmail = reqParam.email.toLowerCase().trim();
        const findUserCondition = {
          email: reqEmail,
          status: {
            $ne: ACCOUNT_STATUS.DELETED
          },
          user_type: { $nin: [USER_TYPE.SUPER_ADMIN, USER_TYPE.SUB_ADMIN] }
        };
        const user = await Users.findOne(findUserCondition);

        if (user) {
          if (user.user_type == 2) {
            user.user_profile =
              CLOUDFRONT_URL + USER_MEDIA_PATH.USER_PROFILE + '/' + user.user_profile;
          } else {
            user.user_profile =
              CLOUDFRONT_URL + COMPANY_MEDIA_PATH.COMPANY_PROFILE + '/' + user.user_profile;
          }

          if (user.status === ACCOUNT_STATUS.ACTIVE) {
            Bcrypt.compare(reqParam.password, user.password, async (err, result) => {
              if (err) {
                return Response.errorResponseData(
                  res,
                  res.__('userNotFound'),
                  RESPONSE_CODE.BAD_REQUEST
                );
              }
              if (result) {
                if (user) {
                  let companyId;
                  if (user?.company_id) {
                    companyId = user?.company_id;
                  }
                  const meta = {
                    token: issueUserToken({
                      id: user._id,
                      companyId: companyId
                    }),
                    refreshToken: issueUserRefreshToken({
                      id: user._id,
                      companyId: companyId
                    })
                  };
                  user.isUnderTrial = user?.is_under_trial
                    ? (new Date().getTime() - user?.trial_starts_from.getTime()) /
                        (1000 * 3600 * 24) <
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
                    companyId: user?.company_id,
                    isSocialLogin: user.isSocialLogin,
                    accountType: user.account_type,
                    isUnderTrial: user.isUnderTrial,
                    existingUser: user.existingUser,
                    jobRole: user.job_role
                  };

                  await Users.updateOne(
                    { _id: user.id },
                    {
                      $set: {
                        last_login: new Date()
                      }
                    }
                  );

                  let profile = {
                    email: user.email,
                    userType: user.user_type,
                    firstName: user.name
                  };

                  await addEditKlaviyoUser(profile);
                  await setAppUsage(user.id);

                  return Response.successResponseData(
                    res,
                    resObj,
                    SUCCESS,
                    res.__('loginSuccess'),
                    meta
                  );
                }
              } else {
                return Response.successResponseWithoutData(
                  res,
                  user.email && res.__('userPasswordNotMatch'),
                  FAIL
                );
              }
            });
          } else {
            return Response.successResponseWithoutData(res, res.__('accountIsInactive'), FAIL);
          }
        } else {
          return Response.successResponseWithoutData(res, res.__('userNotFound'), FAIL);
        }
      }
      //  Mobile User
      if (reqParam.mobile) {
        const reqPhone = reqParam.mobile;
        const findUserCondition = {
          $or: [
            {
              mobile: reqPhone
            },
            {
              $expr: {
                $eq: [{ $concat: ['$country_code', '$mobile'] }, reqPhone]
              }
            }
          ],
          status: {
            $ne: ACCOUNT_STATUS.DELETED
          },
          user_type: { $nin: [USER_TYPE.SUPER_ADMIN, USER_TYPE.SUB_ADMIN] }
        };
        const user = await Users.findOne(findUserCondition);

        if (user) {
          user.user_profile =
            CLOUDFRONT_URL + USER_MEDIA_PATH.USER_PROFILE + '/' + user.user_profile;

          if (user.status === ACCOUNT_STATUS.ACTIVE) {
            Bcrypt.compare(reqParam.password, user.password, async (err, result) => {
              if (err) {
                return Response.errorResponseData(
                  res,
                  res.__('userNotFound'),
                  RESPONSE_CODE.BAD_REQUEST
                );
              }
              if (result) {
                if (user.mobile) {
                  let companyId;
                  if (user?.company_id) {
                    companyId = user?.company_id;
                  }
                  const meta = {
                    token: issueUserToken({
                      id: user._id,
                      companyId
                    }),
                    refreshToken: issueUserRefreshToken({
                      id: user._id,
                      companyId
                    })
                  };
                  user.isUnderTrial = user?.is_under_trial
                    ? (new Date().getTime() - user?.trial_starts_from.getTime()) /
                        (1000 * 3600 * 24) <
                      USER_TRIAL_LIMIT
                    : false;
                  const resObj = {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    mobile: `${user.country_code}${user.mobile}`,
                    userType: user.user_type,
                    profile: user.user_profile,
                    gender: user.gender,
                    dob: user.dob,
                    companyId: user.company_id,
                    isSocialLogin: user.isSocialLogin,
                    accountType: user.account_type,
                    isUnderTrial: user.isUnderTrial,
                    existingUser: user.existingUser
                  };
                  await Users.updateOne(
                    { _id: user.id },
                    {
                      $set: {
                        last_login: new Date()
                      }
                    }
                  );
                  return Response.successResponseData(
                    res,
                    resObj,
                    SUCCESS,
                    res.__('loginSuccess'),
                    meta
                  );
                } else {
                  const userOtp = await makeRandomDigit(OTP_LENGTH);
                  let updateData = {
                    last_otp_sent: new Date(),
                    otp: userOtp
                  };
                  if (user.last_otp_sent) {
                    const currentDate = new Date();
                    const hoursBetweenDates =
                      Math.abs(user.last_otp_sent.getTime() - currentDate.getTime()) /
                      (60 * 60 * 1000);
                    if (hoursBetweenDates < DAY_LIMIT && user.otp_sent_count >= OTP_LIMIT) {
                      return Response.successResponseWithoutData(
                        res,
                        res.__('emailVerificationLimitReached'),
                        FAIL
                      );
                    } else {
                      updateData = {
                        ...updateData,
                        otp_sent_count: hoursBetweenDates > DAY_LIMIT ? 1 : user.otp_sent_count + 1
                      };
                    }
                  } else {
                    updateData = {
                      ...updateData,
                      otp_sent_count: user.otp_sent_count + 1
                    };
                  }
                  await Users.findOneAndUpdate({ _id: user._id }, updateData);

                  if (user.mobile) {
                    const otpExists = await sendOtpToMobile(
                      user.country_code + user.mobile,
                      userOtp
                    );
                    if (!otpExists) {
                      return Response.successResponseWithoutData(
                        res,
                        res.__('invalidMobile'),
                        FAIL
                      );
                    }
                  }
                  return Response.successResponseWithoutData(
                    res,
                    user.mobile && res.__('otpSentToMobile'),
                    EMAIL_VERIFICATION
                  );
                }
              } else {
                return Response.successResponseWithoutData(
                  res,
                  user.mobile && res.__('mobilePasswordNotMatch'),
                  FAIL
                );
              }
            });
          } else {
            return Response.successResponseWithoutData(res, res.__('accountIsInactive'), FAIL);
          }
        } else {
          return Response.successResponseWithoutData(res, res.__('userNotFound'), FAIL);
        }
      }
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  userForgottedPassword: async (req, res) => {
    try {
      const reqParam = req.body;
      if (reqParam.email) {
        const reqEmail = reqParam.email.toLowerCase().trim();
        const findUserCondition = {
          email: reqEmail,
          status: {
            $ne: ACCOUNT_STATUS.DELETED
          },
          user_type: { $nin: [USER_TYPE.SUPER_ADMIN, USER_TYPE.SUB_ADMIN] }
        };

        const user = await Users.findOne(findUserCondition).select(
          'name email status last_otp_sent otp_sent_count country_code mobile'
        );

        if (!user) {
          return Response.successResponseWithoutData(res, res.__('userNotFound'), FAIL);
        }
        if (user.status === ACCOUNT_STATUS.ACTIVE) {
          const userOtp = await makeRandomDigit(OTP_LENGTH);
          let updateData = {
            last_otp_sent: new Date(),
            otp: userOtp
          };
          if (user.last_otp_sent) {
            const currentDate = new Date();
            const hoursBetweenDates =
              Math.abs(user.last_otp_sent.getTime() - currentDate.getTime()) / (60 * 60 * 1000);
            if (hoursBetweenDates < DAY_LIMIT && user.otp_sent_count >= OTP_LIMIT) {
              return Response.successResponseWithoutData(
                res,
                res.__('forgotPasswordLimitReached'),
                FAIL
              );
            } else {
              updateData = {
                ...updateData,
                otp_sent_count: hoursBetweenDates > DAY_LIMIT ? 1 : user.otp_sent_count + 1
              };
            }
          } else {
            updateData = {
              ...updateData,
              otp_sent_count: user.otp_sent_count + 1
            };
          }
          await Users.findOneAndUpdate({ _id: user._id }, updateData);
          const locals = {
            name: user.name,
            otp: userOtp
          };
          user.email && (await sendUserOtp(user.email, MAIL_SUBJECT.FORGOT_PASSWORD, locals));

          return Response.successResponseWithoutData(
            res,
            user.email && res.__('otpSentToEmail'),
            RESET_PASSWORD
          );
        } else {
          return Response.successResponseWithoutData(res, res.__('accountIsInactive'), FAIL);
        }
      }

      if (reqParam.mobile) {
        const reqPhone = reqParam.mobile;
        const findUserCondition = {
          $or: [
            {
              mobile: reqPhone
            },
            {
              $expr: {
                $eq: [{ $concat: ['$country_code', '$mobile'] }, reqPhone]
              }
            }
          ],
          status: {
            $ne: ACCOUNT_STATUS.DELETED
          },
          user_type: { $nin: [USER_TYPE.SUPER_ADMIN, USER_TYPE.SUB_ADMIN] }
        };
        const user = await Users.findOne(findUserCondition);
        if (!user) {
          return Response.successResponseWithoutData(res, res.__('userNotFound'), FAIL);
        }

        if (user.status === ACCOUNT_STATUS.ACTIVE) {
          const userOtp = await makeRandomDigit(OTP_LENGTH);
          let updateData = {
            last_otp_sent: new Date(),
            otp: userOtp
          };
          if (user.last_otp_sent) {
            const currentDate = new Date();
            const hoursBetweenDates =
              Math.abs(user.last_otp_sent.getTime() - currentDate.getTime()) / (60 * 60 * 1000);
            if (hoursBetweenDates < DAY_LIMIT && user.otp_sent_count >= OTP_LIMIT) {
              return Response.successResponseWithoutData(
                res,
                res.__('forgotPasswordLimitReached'),
                FAIL
              );
            } else {
              updateData = {
                ...updateData,
                otp_sent_count: hoursBetweenDates > DAY_LIMIT ? 1 : user.otp_sent_count + 1
              };
            }
          } else {
            updateData = {
              ...updateData,
              otp_sent_count: user.otp_sent_count + 1
            };
          }
          await Users.findOneAndUpdate({ _id: user._id }, updateData);
          if (user.mobile) {
            const otpExists = await sendOtpToMobile(user.country_code + user.mobile, userOtp);
            if (!otpExists) {
              return Response.successResponseWithoutData(res, res.__('invalidMobile'), FAIL);
            }
          }
          return Response.successResponseWithoutData(
            res,
            user.email && res.__('otpSentToPhone'),
            RESET_PASSWORD
          );
        } else {
          return Response.successResponseWithoutData(res, res.__('accountIsInactive'), FAIL);
        }
      }
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  addContentToAws: async (req, res) => {
    try {
      const file = req.files;
      if (file) {
        const fileExtension = file[0].originalname?.split('.');
        const finalType = `${file[0].mimetype?.split('/')[0]}/${fileExtension[fileExtension?.length - 1]}`;

        let contentUrl;
        contentUrl = await getUploadURL(finalType, 'shoorah_faq.pdf', USER_MEDIA_PATH.RECORDS);

        console.log({ contentUrl });

        if (contentUrl.uploadURL) {
          let response = await axios.put(contentUrl.uploadURL, file[0], {
            headers: {
              'content-type': finalType
            }
          });
          console.log(response);
        }

        let url = CLOUDFRONT_URL + USER_MEDIA_PATH.RECORDS + '/shoorah_faq.pdf';
        return Response.successResponseData(res, url, res.__('fileUploaded'), SUCCESS);
      } else {
        return Response.successResponseWithoutData(res, res.__('noFileUploaded'), FAIL);
      }
    } catch (err) {
      console.log(err);
      return Response.internalServerErrorResponse(res);
    }
  }
};
