'use strict';

const Bcrypt = require('bcrypt');
const { Users, DeviceTokens, InterviewSchedual } = require('@models');
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
  ADMIN_MEDIA_PATH,
  EXPERT_PROFILE_STATUS,
  NOT_FOUND,
} = require('@services/Constant');
const {
  issueAdminToken,
  verifyAdminRefreshToken,
  issueAdminRefreshToken
} = require('@services/JwToken');
const Response = require('@services/Response');
const { makeRandomDigit } = require('@services/Helper');
const { storeDeviceToken } = require('@services/authServices');
const { sendOtp, sendResetPasswordLink } = require('@services/Mailer');
const {
  COMPANY_MEDIA_PATH,
  KLAVIYO_LIST,
  PARTNER_MEDIA_PATH,
  EXPERT_MEDIA_PATH
} = require('../../../services/Constant');
const { addEditKlaviyoUser } = require('../../../services/Helper');
const Expert = require('../../../models/Expert');

module.exports = {
  /**
   * @description This function is used for admin login
   * @param {*} req
   * @param {*} res
   * @return {*}
   */
  adminLogin: (req, res) => {
    try {
      const reqParam = req.body;
      adminLoginValidations(reqParam, res, async (validate) => {
        if (validate) {
          const reqEmail = reqParam.email.toLowerCase().trim();
          const findUserCondition = {
            email: reqEmail,
            status: {
              $ne: ACCOUNT_STATUS.DELETED
            },
            user_type: {
              $ne: USER_TYPE.USER
            }
          };
          const user = await Users.findOne(findUserCondition)
            .select({
              name: 1,
              user_type: 1,
              email: 1,
              user_profile: 1,
              is_email_verified: 1,
              status: 1,
              password: 1,
              last_otp_sent: 1,
              otp_sent_count: 1,
              company_id: 1
            })
            .populate({
              path: 'module_access',
              select: 'module_access'
            })
            .populate({
              path: 'company_id',
              select: 'company_name company_type restrict_company'
            });

          // if (user && user.is_email_verified !== true) {
          //   return Response.errorResponseWithoutData(
          //     res,
          //     res.__('emailIsNotVerfied'),
          //     RESPONSE_CODE.FORBIDDEN
          //   );
          // }

          if(!user){
              return Response.errorResponseWithoutData(
              res,
              res.__('emailDoesNotExits'),
              NOT_FOUND
            );
          }

          if (user) {
            if (user?.company_id?.restrict_company) {
              return Response.errorResponseData(
                res,
                'company is restricted, please contact with admin',
                RESPONSE_CODE.BAD_REQUEST
              );
            }

            if (user.status === ACCOUNT_STATUS.ACTIVE) {
              if(user.user_type == USER_TYPE.EXPERT && reqParam.isSocialLogin == true){
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
                return Response.successResponseData(
                  res,
                  user,
                  SUCCESS,
                  res.__('loginSuccess'),
                  meta
                );
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
                      updateData = { ...updateData, otp_sent_count: user.otp_sent_count + 1 };
                      await Users.findOneAndUpdate({ _id: user._id }, updateData);
                    }
                  } else {
                    if (user.otp_sent_count > 4) {
                      updateData = { ...updateData, otp_sent_count: 0 };
                      await Users.findOneAndUpdate({ _id: user._id }, updateData);
                    }
                    updateData = { ...updateData, otp_sent_count: user.otp_sent_count + 1 };
                    await Users.findOneAndUpdate({ _id: user._id }, updateData);
                  }

                  const locals = {
                    name: user.name,
                    otp: userOtp
                  };
                  await sendOtp(user.email, MAIL_SUBJECT.VERIFY_EMAIL, locals);
                  return Response.successResponseWithoutData(
                    res,
                    res.__('otpSentToEmail'),
                    EMAIL_VERIFICATION
                  );
                  // }
                } else {
                  return Response.successResponseWithoutData(
                    res,
                    res.__('userPasswordNotMatch'),
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
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },
  resendOtp: (req, res) => {
    try {
      const reqParam = req.body;
      const reqEmail = reqParam.email.toLowerCase().trim();
  
      // Find the user based on the email
      const findUserCondition = {
        email: reqEmail,
        status: ACCOUNT_STATUS.EXPERT // Check if status is expert
      };
  
      Users.findOne(findUserCondition)
        .select({
          name: 1,
          email: 1,
          last_otp_sent: 1,
          otp_sent_count: 1
        })
        .then(async (user) => {
          if (!user) {
            return Response.successResponseWithoutData(res, res.__('userNotFound'), FAIL);
          }
  
          const currentDate = new Date();
          const hoursBetweenDates =
            user.last_otp_sent ? 
            Math.abs(user.last_otp_sent.getTime() - currentDate.getTime()) / (60 * 60 * 1000) : 
            null;
  
          if (hoursBetweenDates < DAY_LIMIT && user.otp_sent_count >= OTP_LIMIT) {
            return Response.successResponseWithoutData(
              res,
              res.__('emailVerificationLimitReached'),
              FAIL
            );
          }
  
          const userOtp = await makeRandomDigit(OTP_LENGTH);
          const updateData = {
            last_otp_sent: new Date(),
            otp: userOtp,
            otp_sent_count: user.otp_sent_count ? user.otp_sent_count + 1 : 1
          };
  
          await Users.findOneAndUpdate({ _id: user._id }, updateData);
  
          const locals = {
            name: user.name,
            otp: userOtp
          };
          await sendOtp(user.email, MAIL_SUBJECT.VERIFY_EMAIL, locals);
          
          return Response.successResponseWithoutData(
            res,
            res.__('otpSentToEmail'),
            EMAIL_VERIFICATION
          );
        })
        .catch(err => {
          console.error(err);
          return Response.internalServerErrorResponse(res);
        });
    } catch (err) {
      console.error(err);
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function used to verify otp.
   * @param {*} req
   * @param {*} res
   * @return {*}
   */
  adminOTPVerify: (req, res) => {
    try {
      const reqParam = req.body;
      adminOTPValidations(reqParam, res, async (validate) => {
        if (validate) {
          const findUserCondition = {
            email: reqParam.email.trim(),
            otp: reqParam.otp,
            status: {
              $ne: ACCOUNT_STATUS.DELETED
            },
            user_type: {
              $ne: USER_TYPE.USER
            }
          };
          const user = await Users.findOne(findUserCondition)
            .select({
              name: 1,
              user_type: 1,
              email: 1,
              user_profile: 1,
              is_email_verified: 1,
              status: 1,
              password: 1,
              mobile: 1,
              country_code: 1,
              last_otp_sent: 1,
              otp_sent_count: 1,
              company_id: 1,
              isVerified: 1
            })
            .populate({
              path: 'module_access',
              select: 'module_access'
            })
            .populate({
              path: 'company_id',
              select: 'company_name company_type shuru_usage peap_usage restrict_company'
            });
            
          if (user) {
            if (user?.user_type == 0 || user?.user_type == 1) {
              user.user_profile =
                CLOUDFRONT_URL + ADMIN_MEDIA_PATH.ADMIN_PROFILE + '/' + user.user_profile;
            }

            if (user?.user_type == 3 || user?.user_type == 4) {
              user.user_profile =
                CLOUDFRONT_URL + COMPANY_MEDIA_PATH.COMPANY_PROFILE + '/' + user.user_profile;
            }

            if (user?.user_type == 5) {
              user.user_profile =
                CLOUDFRONT_URL + PARTNER_MEDIA_PATH.PARTNER_PROFILE + '/' + user.user_profile;
            }
            let interviewConfirmation = false;
            let isRejected = false;
            if (user?.user_type == USER_TYPE.EXPERT) {
              const findExpert = await Expert.findOne({ user_id: user._id });
              if (findExpert && findExpert.profile_status == EXPERT_PROFILE_STATUS.INVITED) {
                interviewConfirmation = true;
              }
              const expertData = await Expert.findOne({ user_id: user._id });
              if(expertData && expertData.profile_status == EXPERT_PROFILE_STATUS.REJECTED){
                isRejected = true;
              }
            }

            if (user?.company_id?.restrict_company) {
              return Response.errorResponseData(
                res,
                'company is restricted, please contact with admin',
                RESPONSE_CODE.BAD_REQUEST
              );
            }

            if (user.status === ACCOUNT_STATUS.ACTIVE) {
              const currentDate = new Date();
              const checkOtpExpiry =
                (currentDate.getTime() - user.last_otp_sent.getTime()) / (60 * 1000);
              if (checkOtpExpiry > OTP_EXPIRY) {
                return Response.successResponseWithoutData(res, res.__('otpExpired'), FAIL);
              }
              const updateObj = {
                is_email_verified: true,
                otp: null,
                last_login: new Date(),
                otp_sent_count: 0
              };
              await Users.findByIdAndUpdate(user._id, updateObj);
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
              user.moduleAccess = user?.module_access?.module_access;
              const resObj = {
                id: user.id,
                name: user.name,
                email: user.email,
                userType: user.user_type,
                profile: user.user_profile,
                companyId: user.company_id?._id,
                companyType: user.company_id?.company_type,
                companyName: user.company_id?.company_name,
                shuruUsage: user.company_id?.shuru_usage,
                peapUsage: user.company_id?.peap_usage,
                slug: user.company_id?.company_name.replace(/ /g, '-'),
                moduleAccess: user?.module_access ? user.module_access.module_access : null,
                expertApprove: user?.approve,
                isVerified: user?.isVerified,
                isEmailVerified: user?.is_email_verified,
              };
              if(user?.user_type == USER_TYPE.EXPERT){
                resObj.interviewConfirmation = interviewConfirmation;
                resObj.isRejected = isRejected;

              }

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

  adminDirectLogin: (req, res) => {
    try {
      const reqParam = req.body;
      adminLoginValidations(reqParam, res, async (validate) => {
        if (validate) {
          const reqEmail = reqParam.email.toLowerCase().trim();
          const findUserCondition = {
            email: reqEmail,
            status: {
              $ne: ACCOUNT_STATUS.DELETED
            },
            user_type: {
              $in: [USER_TYPE.COMPANY_ADMIN, USER_TYPE.COMPANY_SUB_ADMIN]
            }
          };
          const user = await Users.findOne(findUserCondition)
            .select({
              name: 1,
              user_type: 1,
              email: 1,
              user_profile: 1,
              is_email_verified: 1,
              status: 1,
              password: 1,
              last_otp_sent: 1,
              otp_sent_count: 1,
              company_id: 1
            })
            .populate({
              path: 'module_access',
              select: 'module_access'
            })
            .populate({
              path: 'company_id',
              select: 'company_name company_type restrict_company'
            });

          if (user) {
            if (user?.company_id?.restrict_company) {
              return Response.errorResponseData(
                res,
                'company is restricted, please contact with admin',
                RESPONSE_CODE.BAD_REQUEST
              );
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
                  await Users.findOneAndUpdate({ _id: user._id }, { last_login: new Date() });
                  if (user.is_email_verified) {
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
                    const resObj = {
                      id: user.id,
                      name: user.name,
                      email: user.email,
                      userType: user.user_type,
                      profile: user.user_profile,
                      companyId: user.company_id?._id,
                      companyType: user.company_id?.company_type,
                      companyName: user.company_id?.company_name,
                      slug: user.company_id?.company_name.replace(/ /g, '-'),
                      moduleAccess: user.module_access ? user.module_access.module_access : null
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
                  return Response.successResponseWithoutData(
                    res,
                    res.__('userPasswordNotMatch'),
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
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function used to send otp to registred email address.
   * @param {*} req
   * @param {*} res
   * @return {*}
   */
  adminForgetPassword: (req, res) => {
    try {
      const reqParam = req.body;
      forgetPasswordValidations(reqParam, res, async (validate) => {
        if (validate) {
          const reqEmail = reqParam.email.toLowerCase().trim();
          const findUserCondition = {
            email: reqEmail,
            status: {
              $ne: ACCOUNT_STATUS.DELETED
            },
            user_type: {
              $ne: USER_TYPE.USER
            }
          };
          const user = await Users.findOne(findUserCondition).select(
            'name email status last_otp_sent otp_sent_count user_type'
          );
          if (!user) {
            return Response.successResponseWithoutData(res, res.__('userNotFound'), FAIL);
          }
          if (user.status === ACCOUNT_STATUS.ACTIVE) {
             // Check if user.user_type is 6
             console.log(user.user_type,"<<<<<<user.user_type")
          if (user.user_type === USER_TYPE.EXPERT) {
            const resetPasswordLink = `${process.env.FRONTEND_URL}reset-password?userId=${user._id}`;
            const locals = {
              name: user.name,
              resetPasswordLink: resetPasswordLink
            };

            await sendResetPasswordLink(user.email, locals); // Call the function to send the reset password link
            return Response.successResponseWithoutData(res, res.__('resetPasswordLinkSent'), RESET_PASSWORD);
          }
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
              updateData = { ...updateData, otp_sent_count: user.otp_sent_count + 1 };
            }
            await Users.findOneAndUpdate({ _id: user._id }, updateData);
            const locals = {
              name: user.name,
              otp: userOtp
            };
            await sendOtp(user.email, MAIL_SUBJECT.FORGOT_PASSWORD, locals);
            return Response.successResponseWithoutData(
              res,
              res.__('otpSentToEmail'),
              RESET_PASSWORD
            );
          } else {
            return Response.successResponseWithoutData(res, res.__('accountIsInactive'), FAIL);
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
   * @description This function is used to change admin password
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  adminChangePassword: (req, res) => {
    try {
      const reqParam = req.body;
      adminChangePasswordValidations(reqParam, res, async (validate) => {
        if (validate) {
          const user = await Users.findById(req.authAdminId).select('password');
          if (user) {
            Bcrypt.compare(reqParam.oldPassword, user.password, (err, result) => {
              if (err) {
                return Response.internalServerErrorResponse(res);
              }
              if (result) {
                Bcrypt.compare(reqParam.newPassword, user.password, (err, newPasswordSame) => {
                  if (err) {
                    return Response.internalServerErrorResponse(res);
                  }
                  if (newPasswordSame) {
                    return Response.successResponseWithoutData(
                      res,
                      res.__('oldNewPasswordSame'),
                      FAIL
                    );
                  } else {
                    Bcrypt.hash(reqParam.newPassword, 10, async (err, newPassword) => {
                      if (err) {
                        return Response.internalServerErrorResponse(res);
                      }
                      await Users.findByIdAndUpdate(req.authAdminId, { password: newPassword });
                      return Response.successResponseWithoutData(
                        res,
                        res.__('changePasswordSuccess'),
                        SUCCESS
                      );
                    });
                  }
                });
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
   * @description This function is used to reset password
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  // adminResetPassword: (req, res) => {
  //   try {
  //     const reqParam = req.body;
  //     adminResetPasswordValidations(reqParam, res, async (validate) => {
  //       if (validate) {
  //         // Retrieve user by email
  //         const reqEmail = reqParam.email.toLowerCase().trim();
  //         const findUserCondition = {
  //           email: reqEmail,
  //           status: {
  //             $ne: ACCOUNT_STATUS.DELETED
  //           }
  //         };
  
  //         const user = await Users.findOne(findUserCondition)
  //           .select('user_type otp status password last_otp_sent')
  //           .populate({
  //             path: 'module_access',
  //             select: 'module_access'
  //           });
  
  //         if (user) {
  //           if (user.status === ACCOUNT_STATUS.ACTIVE) {
  //             // Check if user_type is 6 for direct password update
  //             if (user.user_type === USER_TYPE.EXPERT) {
  //               // Directly update the password without OTP
  //               Bcrypt.compare(reqParam.newPassword, user.password, (err, result) => {
  //                 if (err) {
  //                   return Response.internalServerErrorResponse(res);
  //                 }
  //                 if (result) {
  //                   return Response.successResponseWithoutData(
  //                     res,
  //                     res.__('oldNewPasswordSame'),
  //                     FAIL
  //                   );
  //                 } else {
  //                   Bcrypt.hash(reqParam.newPassword, 10, async (err, newPassword) => {
  //                     if (err) {
  //                       return Response.internalServerErrorResponse(res);
  //                     }
  //                     const updateData = {
  //                       password: newPassword,
  //                       is_email_verified: true,
  //                       otp: null // Optional: if you want to clear the OTP field
  //                     };
  //                     await Users.findByIdAndUpdate(user._id, updateData);
  //                     return Response.successResponseWithoutData(
  //                       res,
  //                       res.__('passwordReset'),
  //                       SUCCESS
  //                     );
  //                   });
  //                 }
  //               });
  //             } else {
  //               // Validate OTP for other user types
  //               if (user.otp === reqParam.otp) {
  //                 const currentDate = new Date();
  //                 const checkOtpExpiry =
  //                   (currentDate.getTime() - user.last_otp_sent.getTime()) / (60 * 1000);
  //                 if (checkOtpExpiry > OTP_EXPIRY) {
  //                   return Response.successResponseWithoutData(res, res.__('otpExpired'), FAIL);
  //                 }
  //                 Bcrypt.compare(reqParam.newPassword, user.password, (err, result) => {
  //                   if (err) {
  //                     return Response.internalServerErrorResponse(res);
  //                   }
  //                   if (result) {
  //                     return Response.successResponseWithoutData(
  //                       res,
  //                       res.__('oldNewPasswordSame'),
  //                       FAIL
  //                     );
  //                   } else {
  //                     Bcrypt.hash(reqParam.newPassword, 10, async (err, newPassword) => {
  //                       if (err) {
  //                         return Response.internalServerErrorResponse(res);
  //                       }
  //                       const updateData = {
  //                         password: newPassword,
  //                         is_email_verified: true,
  //                         otp: null
  //                       };
  //                       await Users.findByIdAndUpdate(user._id, updateData);
  //                       return Response.successResponseWithoutData(
  //                         res,
  //                         res.__('passwordReset'),
  //                         SUCCESS
  //                       );
  //                     });
  //                   }
  //                 });
  //               } else {
  //                 return Response.successResponseWithoutData(res, res.__('invalidOTP'), FAIL);
  //               }
  //             }
  //           } else {
  //             return Response.successResponseWithoutData(res, res.__('accountIsInactive'), FAIL);
  //           }
  //         } else {
  //           return Response.successResponseWithoutData(res, res.__('userNotFound'), FAIL);
  //         }
  //       } else {
  //         return Response.internalServerErrorResponse(res);
  //       }
  //     });
  //   } catch (err) {
  //     return Response.internalServerErrorResponse(res);
  //   }
  // },

  adminResetPassword : async (req, res) => {
    try {
      const reqParam = req.body;
  
      adminResetPasswordValidations(reqParam, res, async (validate) => {
        if (validate) {
          // Determine whether to search by email or userId
          let findUserCondition = {};
          
          if (reqParam.email) {
            // If email is provided, search by email
            const reqEmail = reqParam.email.toLowerCase().trim();
            findUserCondition = {
              email: reqEmail,
              status: {
                $ne: ACCOUNT_STATUS.DELETED,
              },
            };
          } else if (reqParam.userId) {
            // If email is not provided, search by userId
            findUserCondition = {
              _id: reqParam.userId,
              status: {
                $ne: ACCOUNT_STATUS.DELETED,
              },
            };
          } else {
            // If neither email nor userId is provided, return error
            return Response.successResponseWithoutData(res, res.__('emailOrUserIdRequired'), FAIL);
          }
  
          // Find the user by the specified condition
          const user = await Users.findOne(findUserCondition)
            .select('user_type otp status password last_otp_sent')
            .populate({
              path: 'module_access',
              select: 'module_access',
            });
  
          if (user) {
            // Check if user status is active
            if (user.status === ACCOUNT_STATUS.ACTIVE) {
              // If user_type is expert (6), bypass email and OTP validation
              if (user.user_type === USER_TYPE.EXPERT) {
                // Directly update the password without OTP validation
                Bcrypt.compare(reqParam.newPassword, user.password, (err, result) => {
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
                    Bcrypt.hash(reqParam.newPassword, 10, async (err, newPassword) => {
                      if (err) {
                        return Response.internalServerErrorResponse(res);
                      }
                      const updateData = {
                        password: newPassword,
                        is_email_verified: true,
                        otp: null, // Optional: clear OTP field if necessary
                      };
                      await Users.findByIdAndUpdate(user._id, updateData);
                      return Response.successResponseWithoutData(
                        res,
                        res.__('passwordReset'),
                        SUCCESS
                      );
                    });
                  }
                });
              } else {
                // Validate OTP for non-expert users
                if (user.otp === reqParam.otp) {
                  const currentDate = new Date();
                  const checkOtpExpiry = (currentDate.getTime() - user.last_otp_sent.getTime()) / (60 * 1000);
  
                  if (checkOtpExpiry > OTP_EXPIRY) {
                    return Response.successResponseWithoutData(res, res.__('otpExpired'), FAIL);
                  }
  
                  Bcrypt.compare(reqParam.newPassword, user.password, (err, result) => {
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
                      Bcrypt.hash(reqParam.newPassword, 10, async (err, newPassword) => {
                        if (err) {
                          return Response.internalServerErrorResponse(res);
                        }
                        const updateData = {
                          password: newPassword,
                          is_email_verified: true,
                          otp: null,
                        };
                        await Users.findByIdAndUpdate(user._id, updateData);
                        return Response.successResponseWithoutData(
                          res,
                          res.__('passwordReset'),
                          SUCCESS
                        );
                      });
                    }
                  });
                } else {
                  return Response.successResponseWithoutData(res, res.__('invalidOTP'), FAIL);
                }
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
   * @description This function is used to add update device token.
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  addEditDeviceToken: (req, res) => {
    try {
      const reqParam = {
        deviceType: req.headers.devicetype,
        deviceToken: req.headers.devicetoken
      };
      addEditDeviceTokenValidation(reqParam, res, async (validate) => {
        if (validate) {
          await storeDeviceToken(req.authAdminId, reqParam.deviceToken, reqParam.deviceType);
          return Response.successResponseWithoutData(res, res.__('deviceTokenUpdated'), SUCCESS);
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @descriptiom This function is used to remove device token
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  removeAdminDeviceToken: (req, res) => {
    try {
      const reqParam = req.headers;
      reqParam.deviceToken = req.headers.devicetoken;
      removeAdminDeviceTokenValidation(reqParam, res, async (validate) => {
        if (validate) {
          await DeviceTokens.findOneAndDelete({
            user_id: req.authAdminId,
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
