/* eslint-disable camelcase */
'use strict';

const {
  Users,
  ContentApproval,
  Mood,
  Cleanse,
  UserGratitude,
  Goals,
  UserRituals,
  UserNotes,
  UserBadges
} = require('@models');
const Response = require('@services/Response');
const {
  usersListValidation,
  editUserValidation,
  getUserDetailValidation,
  myDraftContentValidation,
  bulkUserStatusUpdateValidation,
  userMoodReportValidation,
  userPerformanceDataValidation,
  userBadgeCountValidation,
  userBadgeDetailsValidation
} = require('@services/adminValidations/usersValidations');
const { generatePassword } = require('@services/authServices');
const csv = require('csv-parser');
const stream = require('stream');
const {
  USER_TYPE,
  ACCOUNT_STATUS,
  PAGE,
  PER_PAGE,
  SUCCESS,
  FAIL,
  CONTENT_STATUS,
  REPORT_TYPE,
  MOOD_REPORT,
  SORT_BY,
  SORT_ORDER,
  CLOUDFRONT_URL,
  USER_MEDIA_PATH,
  PERFORMANCE_CONTENT_TYPE,
  STATUS,
  SHOORAH_GURU,
  BADGE_TYPE,
  BRONZE_CATEGORY_DESCRIPTION,
  CATEGORY_TYPE,
  CATEGORY_TITLE,
  PLATINUM_CATEGORY_DESCRIPTION,
  SILVER_CATEGORY_DESCRIPTION,
  DIAMOND_CATEGORY_DESCRIPTION,
  GOLD_CATEGORY_DESCRIPTION,
  ACCOUNT_TYPE
} = require('@services/Constant');
const {
  toObjectId,
  currentDateOnly,
  getFirstDayOfWeek,
  getFirstDayOfMonth
} = require('@services/Helper');
const { getUploadURL, removeOldImage } = require('@services/s3Services');

const {
  makeRandomDigit,
  makeRandomString,
  convertObjectKeysToCamelCase,
  unixTimeStamp,
  addEditKlaviyoUser,
  calculatePercentage
} = require('../../../services/Helper');
const { sendPassword, sendB2BPassword, sendPartnerPassword } = require('../../../services/Mailer');
const { CompanyUsers, Company, Subscriptions, Conversation, UserAffirmation } = require('../../../models');
const { RESPONSE_CODE, MAIL_SUBJECT, SHURU_REPORT_MESSAGES, NODE_ENVIRONMENT, MOOD_PDF_SIZE } = require('../../../services/Constant');
const { trialNotification } = require('../../../services/userServices/trialServices');
const ProfessionalMood = require('../../../models/ProfessionalMood');
const BeforeSleep = require('../../../models/BeforeSleep');
const AfterSleep = require('../../../models/AfterSleep');

const puppeteer = require('puppeteer');
const pug = require('pug');
const { overallMoodReportValidation } = require('../../../services/adminValidations/usersValidations');

module.exports = {
  /**
   * @description This function is used to list all users
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  usersList: (req, res) => {
    try {
      const reqParam = req.query;
      usersListValidation(reqParam, res, async (validate) => {
        if (validate) {
          const page = reqParam.page ? parseInt(reqParam.page) : PAGE;
          const company = reqParam.company ? reqParam.company : null;
          const perPage = reqParam.perPage ? parseInt(reqParam.perPage) : PER_PAGE;
          const skip = (page - 1) * perPage || 0;
          const sortBy = reqParam.sortBy || 'createdAt';
          const sortOrder = reqParam.sortOrder ? parseInt(reqParam.sortOrder) : SORT_ORDER;
          const filterData = {
            user_type: USER_TYPE.USER,
            status: {
              $ne: ACCOUNT_STATUS.DELETED
            },
            ...(reqParam.searchKey && {
              $or: [
                { name: { $regex: '.*' + reqParam.searchKey + '.*', $options: 'i' } },
                { email: { $regex: '.*' + reqParam.searchKey + '.*', $options: 'i' } },
                {
                  $expr: {
                    $regexMatch: {
                      input: { $concat: ['$country_code', '$mobile'] },
                      regex: reqParam.searchKey,
                      options: 'i'
                    }
                  }
                }
              ]
            }),
            ...(reqParam.accountType &&
              (parseInt(reqParam.accountType) === ACCOUNT_TYPE.IS_UNDER_TRIAL
                ? { is_under_trial: true }
                : parseInt(reqParam.accountType) === ACCOUNT_TYPE.PAID
                  ? { is_under_trial: false, account_type: parseInt(reqParam.accountType) }
                  : { account_type: parseInt(reqParam.accountType) })),
            ...(reqParam.accountStatus && { status: parseInt(reqParam.accountStatus) }),
            ...(reqParam.loginPlatform && { login_platform: parseInt(reqParam.loginPlatform) }),
            ...(reqParam.addedBy && { user_added_by: reqParam.addedBy }),
            ...(reqParam.jobRole && { job_role: reqParam.jobRole }),
            ...(reqParam.role &&
              (reqParam.role == 'true'
                ? { company_id: { $ne: null } }
                : { company_id: { $eq: null } })),

            ...(reqParam.id && { _id: toObjectId(reqParam.id) })
          };

          if (company) filterData.company_id = company;

          const totalRecords = await Users.countDocuments(filterData);
          let users = await Users.find(filterData, {
            id: '$_id',
            name: '$name',
            email: 1,
            isEmailVerified: '$is_email_verified',
            registeredOn: '$createdAt',
            loginPlatform: '$login_platform',
            login_platform: 1,
            lastLogin: '$last_login',
            last_login: 1,
            company_id: 1,
            user_profile: 1,
            accountType: '$account_type',
            account_type: 1,
            accountStatus: '$status',
            user_added_by: 1,
            job_role: 1,
            addedBy: '$user_added_by',
            createdAt: 1
          })
            .sort({ [sortBy]: sortOrder })
            .skip(skip)
            .limit(perPage)
            .populate({
              path: 'company_id',
              select: 'company_email company_name contact_number'
            })
            .lean();

          if (users.length > 0) {
            users.map(
              (i) =>
              (i.user_profile =
                CLOUDFRONT_URL + USER_MEDIA_PATH.USER_PROFILE + '/' + i.user_profile)
            );
            users.map((i) => (i.addedBy = i.user_added_by));
            users.map((i) => (i.accountType = i.account_type));
            users.map((i) => (i.loginPlatform = i.login_platform));
            users.map((i) => (i.jobRole = i.job_role));
            users.map((i) => (i.lastLogin = i.last_login));
          }

          return Response.successResponseData(res, users, SUCCESS, res.__('userListSuccess'), {
            page,
            perPage,
            totalRecords
          });
        } else {
          console.log(res);
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      console.log(err);

      return Response.internalServerErrorResponse(res);
    }
  },
  /**
   * @description This function is used to edit user details
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */

  addUser: async (req, res) => {
    try {
      const reqParam = req.body;

      if (reqParam.id) {
        let user = await Users.findOne({ _id: reqParam.id });

        if (!user) {
          return Response.successResponseWithoutData(res, res.__('noUserFound'), FAIL);
        }

        await Users.updateOne(
          { _id: reqParam.id },
          {
            $set: {
              account_type: reqParam.accountType,
              name: reqParam.name,
              company_id: reqParam.company ? reqParam.company : null
            }
          }
        );

        let existingAccount = await CompanyUsers.findOne({ user_id: reqParam.id });

        if (existingAccount) {
          if (!reqParam.company) {
            await CompanyUsers.deleteOne({ user_id: reqParam.id });
          } else {
            await CompanyUsers.updateOne(
              { user_id: reqParam.id },
              {
                $set: {
                  name: reqParam.name,
                  company_id: reqParam.company ? reqParam.company : null,
                  user_id: reqParam.id
                }
              },
              { upsert: true }
            );
          }
        } else {
          if (!reqParam.company) {
            await CompanyUsers.deleteOne({ user_id: reqParam.id });
          } else {
            await CompanyUsers.create({
              name: reqParam.name,
              email_address: reqParam.email,
              employee_id: makeRandomDigit(2),
              company_id: reqParam.company ? reqParam.company : null,
              user_id: reqParam.id
            });
          }
        }

        let message = 'User has been updated';

        return Response.successResponseData(
          res,
          convertObjectKeysToCamelCase(message),
          SUCCESS,
          res.__('userUpdateSuccessfully')
        );
      } else {
        if (!reqParam.email) {
          return Response.successResponseWithoutData(res, res.__('noUserEmailFound'), SUCCESS);
        }
        if (!reqParam.firstName) {
          return Response.successResponseWithoutData(res, res.__('fillFirstName'), SUCCESS);
        }
        if (!reqParam.lastName) {
          return Response.successResponseWithoutData(res, res.__('fillLastName'), SUCCESS);
        }
        let user = await Users.findOne({ email: reqParam.email, user_type: 2, deletedAt: null });
        if (user) {
          return Response.successResponseWithoutData(res, res.__('userAlreadyExisted'), SUCCESS);
        }
        let uploadURL = null;
        if (reqParam.image) {
          const imageExtension = reqParam.image.split('/')[1];
          const userImage = `${unixTimeStamp(new Date())}-${makeRandomDigit(4)}.${imageExtension}`;

          let uploaded = await getUploadURL(
            reqParam.image,
            userImage,
            USER_MEDIA_PATH.USER_PROFILE
          );

          uploadURL = uploaded?.uploadURL;
          reqParam.image = uploaded?.filename;
        }
        let password = makeRandomDigit(2) + makeRandomString(5) + makeRandomDigit(4);
        const hashPassword = await generatePassword(password);
        let newUser = await Users.create({
          email: reqParam.email,
          first_name: reqParam.firstName,
          last_name: reqParam.lastName,
          name: reqParam.firstName + ' ' + reqParam.lastName,
          gender: reqParam.gender,
          ethnicity: reqParam.ethnicity,
          dob: reqParam.dob,
          password: hashPassword,
          user_type: USER_TYPE.USER,
          status: ACCOUNT_STATUS.ACTIVE,
          user_added_by: 'admin',
          account_type: reqParam.accountType,
          job_role: reqParam.jobRole,
          company_id: reqParam.company ? reqParam.company : null,
          login_platform: reqParam.platform
        });

        if (!reqParam.company) {
          await CompanyUsers.deleteOne({ user_id: newUser.id });
        } else {
          await CompanyUsers.create({
            email_address: newUser.email,
            name: newUser.name,
            employee_id: makeRandomDigit(2),
            company_id: reqParam.company,
            user_id: newUser.id
          });
        }

        const locals = {
          name: newUser.name,
          email: reqParam.email,
          password: password
        };

        await sendPassword(reqParam.email, locals);
        let createdUser = await Users.findOne({ email: reqParam.email }).select(
          'email _id status account_type name first_name last_name profile'
        );
        return Response.successResponseData(
          res,
          convertObjectKeysToCamelCase(createdUser),
          SUCCESS,
          res.__('newUserAddedSuccessfully'),
          { uploadURL }
        );
      }
    } catch (error) {
      console.log(error);
      if (error?.code == 11000) {
        if (error.message.includes('employee_id_1')) {
          return Response.errorResponseWithoutData(
            res,
            'Employee Id is already registered !',
            RESPONSE_CODE.BAD_REQUEST
          );
        } else if (error.message.includes('email_address_1')) {
          return Response.errorResponseWithoutData(
            res,
            'Company Email is already registered !',
            RESPONSE_CODE.BAD_REQUEST
          );
        } else if (error.message.includes('contact_number_1')) {
          return Response.errorResponseWithoutData(
            res,
            'Contact Number is already registered !',
            RESPONSE_CODE.BAD_REQUEST
          );
        } else {
          return Response.errorResponseWithoutData(res, error.message, RESPONSE_CODE.BAD_REQUEST);
        }
      }
      return Response.internalServerErrorResponse(res);
    }
  },

  editUser: (req, res) => {
    try {
      const reqParam = req.body;
      editUserValidation(reqParam, res, async (validate) => {
        if (validate) {
          const filterCondition = {
            _id: reqParam.userId,
            status: {
              $ne: ACCOUNT_STATUS.DELETED
            },
          };
          const updateData = {
            status: reqParam.accountStatus
          };
          const userData = await Users.findOneAndUpdate(filterCondition, updateData, {
            new: true
          }).select('_id');
          if (userData) {
            return Response.successResponseWithoutData(res, res.__('userDetailUpdated'), SUCCESS);
          } else {
            return Response.successResponseWithoutData(res, res.__('invalidUserId'), FAIL);
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
   * @description This function is used to get perticular user's detail
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  getUserDetail: (req, res) => {
    try {
      const reqParam = req.params;
      getUserDetailValidation(reqParam, res, async (validate) => {
        if (validate) {
          const findUserCondition = {
            _id: reqParam.userId,
            status: {
              $ne: ACCOUNT_STATUS.DELETED
            }
          };

          const userDetails = await Users.findOne(findUserCondition, {
            id: '$_id',
            _id: 1,
            userName: '$name',
            userEmail: {
              $cond: [
                {
                  $gt: ['$email', null]
                },
                '$email',
                {
                  $concat: ['+', '$country_code', '$mobile']
                }
              ]
            },
            userProfile: {
              $concat: [CLOUDFRONT_URL, USER_MEDIA_PATH.USER_PROFILE, '/', '$user_profile']
            },
            loginPlatform: '$login_platform',
            isEmailVerified: '$is_email_verirfied',
            registeredOn: '$createdAt',
            accountType: '$account_type',
            accountStatus: '$status',
            user_added_by: 1,
            dob: 1,
            gender: 1
          }).lean();
          if (userDetails) {
            const userSubscriptionStatus = await Users.aggregate([
              {
                $match: {
                  _id: toObjectId(userDetails._id)
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

            userDetails.account = userSubscriptionStatus[0]?.account_type || 'INITIAL_USER';
            userDetails.productId = userSubscriptionStatus[0]?.productId || null;
            userDetails.purchaseDeviceFrom = userSubscriptionStatus[0]?.purchaseDeviceFrom || null;
            userDetails.autoRenew = userSubscriptionStatus[0]?.autoRenew || null;

            return Response.successResponseData(
              res,
              userDetails,
              SUCCESS,
              res.__('getUserSuccess')
            );
          } else {
            return Response.successResponseWithoutData(res, res.__('noUsersFound'), SUCCESS);
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
   * @description This function is used to get content created by logged in user which is not approved.
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  myDraftContent: async (req, res) => {
    try {
      const reqParam = req.query;
      myDraftContentValidation(reqParam, res, async (validate) => {
        if (validate) {
          let page = PAGE;
          let perPage = PER_PAGE;
          if (reqParam.page) {
            page = parseInt(reqParam.page);
          }
          if (reqParam.perPage) {
            perPage = parseInt(reqParam.perPage);
          }
          const skip = (page - 1) * perPage || 0;
          let filterCondition = {
            created_by: req.authAdminId,
            content_status: CONTENT_STATUS.DRAFT,
            deletedAt: null
          };
          if (reqParam.searchKey) {
            filterCondition = {
              ...filterCondition,
              display_name: { $regex: '.*' + reqParam.searchKey + '.*', $options: 'i' }
            };
          }
          if (reqParam.contentType) {
            filterCondition = {
              ...filterCondition,
              content_type: parseInt(reqParam.contentType)
            };
          }
          let sortBy = SORT_BY;
          let sortOrder = SORT_ORDER;
          if (reqParam.sortBy) {
            sortBy = reqParam.sortBy;
          }
          if (reqParam.sortOrder) {
            sortOrder = parseInt(reqParam.sortOrder);
          }
          const totalRecords = await ContentApproval.countDocuments(filterCondition);
          const myDraftContent = await ContentApproval.find(filterCondition, {
            id: '$_id',
            _id: 0,
            contentType: '$content_type',
            displayName: '$display_name',
            contentStatus: '$content_status',
            createdOn: '$createdAt',
            comments: 1,
            updatedOn: '$updated_on'
          })
            .populate({
              path: 'focus_ids',
              select: 'display_name'
            })
            .populate({
              path: 'updated_by',
              select: 'name'
            })
            .populate({
              path: 'comments.commented_by',
              select: 'name'
            })
            .skip(skip)
            .limit(perPage)
            .sort({ [sortBy]: sortOrder })
            .lean();
          const myDrafts = myDraftContent.map((el) => {
            const { focus_ids, comments, updated_by, ...rest } = el;
            return {
              updatedBy: updated_by,
              focus: focus_ids,
              comments: comments?.map((x) => {
                const { commented_by, ...rest } = x;
                return { commented_by: commented_by?.name, ...rest };
              }),
              ...rest
            };
          });
          return Response.successResponseData(
            res,
            myDrafts,
            SUCCESS,
            res.__('draftContentListSuccess'),
            {
              page,
              perPage,
              totalRecords
            }
          );
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },
  /**
   * @description This function is used to bulk update user's status
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  bulkUserStatusUpdate: (req, res) => {
    try {
      const reqParam = req.body;
      bulkUserStatusUpdateValidation(reqParam, res, async (validate) => {
        if (validate) {
          const filterCondition = {
            _id: {
              $in: reqParam.userIds
            },
            status: {
              $ne: ACCOUNT_STATUS.DELETED
            }
          };
          const updateData = {
            status: reqParam.userStatus,
            deletedAt: reqParam.userStatus === ACCOUNT_STATUS.DELETED ? new Date() : null
          };
          await Users.bulkWrite([
            {
              updateMany: {
                filter: filterCondition,
                update: updateData
              }
            }
          ]);
          return Response.successResponseWithoutData(
            res,
            res.__('userStatusUpdateSuccess'),
            SUCCESS
          );
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to get user mood report
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  userMoodReport: (req, res) => {
    try {
      const reqParam = req.query;
      userMoodReportValidation(reqParam, res, async (validate) => {
        if (validate) {
          let dateFrom = currentDateOnly();
          let dateTo = currentDateOnly();
          dateTo.setDate(dateTo.getDate() + 1);
          const moodData = [];
          const sequence = {
            demotivated: 1,
            motivated: 2,
            low: 3,
            content: 4,
            sad: 5,
            happy: 6,
            needSupport: 7,
            iCanManage: 8,
            helpless: 9,
            iAmInControl: 10,
            tired: 11,
            energised: 12,
            angry: 13,
            calm: 14,
            anxious: 15,
            relaxed: 16,
            stressed: 17,
            balanced: 18
          };
          switch (parseInt(reqParam.reportType)) {
            case REPORT_TYPE.DAILY:
              dateFrom = currentDateOnly();
              dateTo = currentDateOnly();
              dateTo.setDate(dateFrom.getDate() + 1);
              dateFrom = getFirstDayOfMonth(dateFrom);
              const filterCondition = [
                {
                  $match: {
                    user_id: toObjectId(reqParam.userId),
                    createdAt: {
                      $gte: dateFrom,
                      $lt: dateTo
                    },
                    deletedAt: null
                  }
                },
                {
                  $addFields: {
                    date: {
                      $dateToString: {
                        format: '%Y-%m-%d',
                        date: '$createdAt'
                      }
                    }
                  }
                },
                {
                  $group: {
                    _id: '$date',
                    anxious: {
                      $avg: '$anxious'
                    },
                    calm: {
                      $avg: '$calm'
                    },
                    needSupport: {
                      $avg: '$need_support'
                    },
                    demotivated: {
                      $avg: '$demotivated'
                    },
                    motivated: {
                      $avg: '$motivated'
                    },
                    low: {
                      $avg: '$low'
                    },
                    content: {
                      $avg: '$content'
                    },
                    angry: {
                      $avg: '$angry'
                    },
                    happy: {
                      $avg: '$happy'
                    },
                    iCanManage: {
                      $avg: '$i_can_manage'
                    },
                    helpless: {
                      $avg: '$helpless'
                    },
                    i_am_in_control: {
                      $avg: '$i_am_in_control'
                    },
                    tired: {
                      $avg: '$tired'
                    },
                    stressed: {
                      $avg: '$stressed'
                    },
                    balanced: {
                      $avg: '$balanced'
                    },
                    energised: {
                      $avg: '$energised'
                    },
                    sad: {
                      $avg: '$sad'
                    },
                    relaxed: {
                      $avg: '$relaxed'
                    },
                    createdAt: {
                      $first: '$createdAt'
                    }
                  }
                }
              ];
              const dailyMood = await Mood.aggregate(filterCondition);
              const dayRange = [dateFrom];
              for (let i = 1; i < dateTo.getDate() - 1; i++) {
                dateFrom = new Date(dateFrom);
                dateFrom.setDate(dateFrom.getDate() + 1);
                dayRange.push(dateFrom);
              }
              let numberOfDays = 1;
              dayRange.forEach((date) => {
                const data = dailyMood.filter(
                  (x) => x.createdAt.getDate().toString() === date.getDate().toString()
                );
                const tempObj = {
                  interval: numberOfDays,
                  demotivated: data.length > 0 ? data[0].demotivated : 0,
                  motivated: data.length > 0 ? data[0].motivated : 0,
                  low: data.length > 0 ? data[0].low : 0,
                  content: data.length > 0 ? data[0].content : 0,
                  sad: data.length > 0 ? data[0].sad : 0,
                  happy: data.length > 0 ? data[0].happy : 0,
                  needSupport: data.length > 0 ? data[0].needSupport : 0,
                  iCanManage: data.length > 0 ? data[0].iCanManage : 0,
                  helpless: data.length > 0 ? data[0].helpless : 0,
                  iAmInControl: data.length > 0 ? data[0].iAmInControl : 0,
                  tired: data.length > 0 ? data[0].tired : 0,
                  energised: data.length > 0 ? data[0].energised : 0,
                  angry: data.length > 0 ? data[0].angry : 0,
                  calm: data.length > 0 ? data[0].calm : 0,
                  anxious: data.length > 0 ? data[0].anxious : 0,
                  relaxed: data.length > 0 ? data[0].relaxed : 0,
                  stressed: data.length > 0 ? data[0].stressed : 0,
                  balanced: data.length > 0 ? data[0].balanced : 0
                };
                moodData.push(tempObj);
                numberOfDays += 1;
              });
              return Response.successResponseData(
                res,
                moodData,
                SUCCESS,
                res.__('moodListSuccess'),
                {
                  sequence
                }
              );
            case REPORT_TYPE.WEEKLY:
              dateFrom.setDate(dateFrom.getDate() - MOOD_REPORT.NUMBER_OF_WEEKS * 7);
              dateFrom = getFirstDayOfWeek(dateFrom);
              const weeklyQuery = [
                {
                  $match: {
                    user_id: toObjectId(reqParam.userId),
                    deletedAt: null,
                    createdAt: {
                      $gte: dateFrom,
                      $lt: dateTo
                    }
                  }
                },
                {
                  $addFields: {
                    weekStart: {
                      $dateFromParts: {
                        isoWeekYear: { $isoWeekYear: '$createdAt' },
                        isoWeek: { $isoWeek: '$createdAt' },
                        isoDayOfWeek: 0
                      }
                    }
                  }
                },
                {
                  $group: {
                    _id: '$weekStart',
                    anxious: {
                      $avg: '$anxious'
                    },
                    calm: {
                      $avg: '$calm'
                    },
                    needSupport: {
                      $avg: '$need_support'
                    },
                    demotivated: {
                      $avg: '$demotivated'
                    },
                    motivated: {
                      $avg: '$motivated'
                    },
                    low: {
                      $avg: '$low'
                    },
                    content: {
                      $avg: '$content'
                    },
                    angry: {
                      $avg: '$angry'
                    },
                    happy: {
                      $avg: '$happy'
                    },
                    iCanManage: {
                      $avg: '$i_can_manage'
                    },
                    helpless: {
                      $avg: '$helpless'
                    },
                    iAmInControl: {
                      $avg: '$i_am_in_control'
                    },
                    tired: {
                      $avg: '$tired'
                    },
                    stressed: {
                      $avg: '$stressed'
                    },
                    balanced: {
                      $avg: '$balanced'
                    },
                    energised: {
                      $avg: '$energised'
                    },
                    sad: {
                      $avg: '$sad'
                    },
                    relaxed: {
                      $avg: '$relaxed'
                    }
                  }
                }
              ];
              const weeklyData = await Mood.aggregate(weeklyQuery);
              const dateRange = [dateFrom];
              for (let x = 0; x <= 5; x++) {
                dateFrom = new Date(dateFrom);
                dateFrom.setDate(dateFrom.getDate() + 7);
                dateRange.push(dateFrom);
              }
              let numberOfWeek = 1;
              dateRange.map((el) => {
                const data = weeklyData.filter((x) => x._id.toString() === el.toString());
                const tempObj = {
                  interval: numberOfWeek,
                  demotivated: data.length > 0 ? data[0].demotivated : 0,
                  motivated: data.length > 0 ? data[0].motivated : 0,
                  low: data.length > 0 ? data[0].low : 0,
                  content: data.length > 0 ? data[0].content : 0,
                  sad: data.length > 0 ? data[0].sad : 0,
                  happy: data.length > 0 ? data[0].happy : 0,
                  needSupport: data.length > 0 ? data[0].needSupport : 0,
                  iCanManage: data.length > 0 ? data[0].iCanManage : 0,
                  helpless: data.length > 0 ? data[0].helpless : 0,
                  iAmInControl: data.length > 0 ? data[0].iAmInControl : 0,
                  tired: data.length > 0 ? data[0].tired : 0,
                  energised: data.length > 0 ? data[0].energised : 0,
                  angry: data.length > 0 ? data[0].angry : 0,
                  calm: data.length > 0 ? data[0].calm : 0,
                  anxious: data.length > 0 ? data[0].anxious : 0,
                  relaxed: data.length > 0 ? data[0].relaxed : 0,
                  stressed: data.length > 0 ? data[0].stressed : 0,
                  balanced: data.length > 0 ? data[0].balanced : 0
                };
                moodData.push(tempObj);
                numberOfWeek += 1;
              });
              return Response.successResponseData(
                res,
                moodData,
                SUCCESS,
                res.__('moodListSuccess'),
                {
                  sequence
                }
              );
            case REPORT_TYPE.MONTHLY:
              dateFrom.setMonth(dateFrom.getMonth() - MOOD_REPORT.NUMBER_OF_MONTHS);
              dateFrom = getFirstDayOfMonth(dateFrom);
              const monthlyQuery = [
                {
                  $match: {
                    user_id: toObjectId(reqParam.userId),
                    deletedAt: null,
                    createdAt: {
                      $gte: dateFrom,
                      $lt: dateTo
                    }
                  }
                },
                {
                  $addFields: {
                    monthStart: {
                      $dateFromString: {
                        dateString: {
                          $dateToString: {
                            format: '%Y-%m-01',
                            date: new Date()
                          }
                        }
                      }
                    }
                  }
                },
                {
                  $group: {
                    _id: '$monthStart',
                    anxious: {
                      $avg: '$anxious'
                    },
                    calm: {
                      $avg: '$calm'
                    },
                    needSupport: {
                      $avg: '$need_support'
                    },
                    demotivated: {
                      $avg: '$demotivated'
                    },
                    motivated: {
                      $avg: '$motivated'
                    },
                    low: {
                      $avg: '$low'
                    },
                    content: {
                      $avg: '$content'
                    },
                    angry: {
                      $avg: '$angry'
                    },
                    happy: {
                      $avg: '$happy'
                    },
                    iCanManage: {
                      $avg: '$i_can_manage'
                    },
                    helpless: {
                      $avg: '$helpless'
                    },
                    iAmInControl: {
                      $avg: '$i_am_in_control'
                    },
                    tired: {
                      $avg: '$tired'
                    },
                    stressed: {
                      $avg: '$stressed'
                    },
                    balanced: {
                      $avg: '$balanced'
                    },
                    energised: {
                      $avg: '$energised'
                    },
                    sad: {
                      $avg: '$sad'
                    },
                    relaxed: {
                      $avg: '$relaxed'
                    }
                  }
                }
              ];
              const monthlyData = await Mood.aggregate(monthlyQuery);
              const monthRange = [dateFrom];
              for (let x = 0; x <= 5; x++) {
                dateFrom = new Date(dateFrom);
                dateFrom.setMonth(dateFrom.getMonth() + 1);
                monthRange.push(dateFrom);
              }
              let numberOfMonth = 1;
              monthRange.map((date) => {
                const data = monthlyData.filter((x) => x._id.toString() === date.toString());
                const tempObj = {
                  interval: numberOfMonth,
                  demotivated: data.length > 0 ? data[0].demotivated : 0,
                  motivated: data.length > 0 ? data[0].motivated : 0,
                  low: data.length > 0 ? data[0].low : 0,
                  content: data.length > 0 ? data[0].content : 0,
                  sad: data.length > 0 ? data[0].sad : 0,
                  happy: data.length > 0 ? data[0].happy : 0,
                  needSupport: data.length > 0 ? data[0].needSupport : 0,
                  iCanManage: data.length > 0 ? data[0].iCanManage : 0,
                  helpless: data.length > 0 ? data[0].helpless : 0,
                  iAmInControl: data.length > 0 ? data[0].iAmInControl : 0,
                  tired: data.length > 0 ? data[0].tired : 0,
                  energised: data.length > 0 ? data[0].energised : 0,
                  angry: data.length > 0 ? data[0].angry : 0,
                  calm: data.length > 0 ? data[0].calm : 0,
                  anxious: data.length > 0 ? data[0].anxious : 0,
                  relaxed: data.length > 0 ? data[0].relaxed : 0,
                  stressed: data.length > 0 ? data[0].stressed : 0,
                  balanced: data.length > 0 ? data[0].balanced : 0
                };
                moodData.push(tempObj);
                numberOfMonth += 1;
              });
              return Response.successResponseData(
                res,
                moodData,
                SUCCESS,
                res.__('moodListSuccess'),
                {
                  sequence
                }
              );
            case REPORT_TYPE.YEARLY:
              dateFrom.setFullYear(dateFrom.getFullYear() - MOOD_REPORT.NUMBER_OF_YEARS);
              dateFrom = getFirstDayOfMonth(dateFrom);
              const yearlyQuery = [
                {
                  $match: {
                    user_id: toObjectId(reqParam.userId),
                    deletedAt: null,
                    createdAt: {
                      $gte: dateFrom,
                      $lt: dateTo
                    }
                  }
                },
                {
                  $addFields: {
                    year: {
                      $year: '$createdAt'
                    }
                  }
                },
                {
                  $group: {
                    _id: '$year',
                    anxious: {
                      $avg: '$anxious'
                    },
                    calm: {
                      $avg: '$calm'
                    },
                    needSupport: {
                      $avg: '$need_support'
                    },
                    demotivated: {
                      $avg: '$demotivated'
                    },
                    motivated: {
                      $avg: '$motivated'
                    },
                    low: {
                      $avg: '$low'
                    },
                    content: {
                      $avg: '$content'
                    },
                    angry: {
                      $avg: '$angry'
                    },
                    happy: {
                      $avg: '$happy'
                    },
                    iCanManage: {
                      $avg: '$i_can_manage'
                    },
                    helpless: {
                      $avg: '$helpless'
                    },
                    iAmInControl: {
                      $avg: '$i_am_in_control'
                    },
                    tired: {
                      $avg: '$tired'
                    },
                    stressed: {
                      $avg: '$stressed'
                    },
                    balanced: {
                      $avg: '$balanced'
                    },
                    energised: {
                      $avg: '$energised'
                    },
                    sad: {
                      $avg: '$sad'
                    },
                    relaxed: {
                      $avg: '$relaxed'
                    }
                  }
                }
              ];
              const yearlyData = await Mood.aggregate(yearlyQuery);
              const yearRange = [dateFrom.getFullYear()];
              for (let x = 0; x <= 1; x++) {
                dateFrom = new Date(dateFrom);
                dateFrom.setFullYear(dateFrom.getFullYear() + 1);
                yearRange.push(dateFrom.getFullYear());
              }
              let numberOfYears = 1;
              yearRange.map((date) => {
                const data = yearlyData.filter((x) => x._id === date);
                const tempObj = {
                  interval: numberOfYears,
                  demotivated: data.length > 0 ? data[0].demotivated : 0,
                  motivated: data.length > 0 ? data[0].motivated : 0,
                  low: data.length > 0 ? data[0].low : 0,
                  content: data.length > 0 ? data[0].content : 0,
                  sad: data.length > 0 ? data[0].sad : 0,
                  happy: data.length > 0 ? data[0].happy : 0,
                  needSupport: data.length > 0 ? data[0].needSupport : 0,
                  iCanManage: data.length > 0 ? data[0].iCanManage : 0,
                  helpless: data.length > 0 ? data[0].helpless : 0,
                  iAmInControl: data.length > 0 ? data[0].iAmInControl : 0,
                  tired: data.length > 0 ? data[0].tired : 0,
                  energised: data.length > 0 ? data[0].energised : 0,
                  angry: data.length > 0 ? data[0].angry : 0,
                  calm: data.length > 0 ? data[0].calm : 0,
                  anxious: data.length > 0 ? data[0].anxious : 0,
                  relaxed: data.length > 0 ? data[0].relaxed : 0,
                  stressed: data.length > 0 ? data[0].stressed : 0,
                  balanced: data.length > 0 ? data[0].balanced : 0
                };
                moodData.push(tempObj);
                numberOfYears += 1;
              });
              return Response.successResponseData(
                res,
                moodData,
                SUCCESS,
                res.__('moodListSuccess'),
                {
                  sequence
                }
              );
            default:
              return Response.successResponseWithoutData(res, res.__('noMoodCase'), FAIL);
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
   * @description This function is used to get user performance data.
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  userPerformanceData: (req, res) => {
    try {
      const reqParam = req.query;
      userPerformanceDataValidation(reqParam, res, async (validate) => {
        if (validate) {
          let page = PAGE;
          let perPage = PER_PAGE;
          if (reqParam.page) {
            page = parseInt(reqParam.page);
          }
          if (reqParam.perPage) {
            perPage = parseInt(reqParam.perPage);
          }
          const skip = (page - 1) * perPage || 0;
          let filterCondition = {
            user_id: toObjectId(reqParam.userId),
            deletedAt: null
          };
          let performanceData = [];
          let aggregationPipeline = [];
          switch (parseInt(reqParam.contentType)) {
            case PERFORMANCE_CONTENT_TYPE.CLEANSE:
              filterCondition = {
                ...filterCondition,
                is_saved: true
              };
              aggregationPipeline = [
                {
                  $match: filterCondition
                },
                {
                  $project: {
                    cleanseId: '$_id',
                    _id: 0,
                    title: 1,
                    description: 1,
                    imageUrl: {
                      $concat: [CLOUDFRONT_URL, USER_MEDIA_PATH.CLEANSE, '/', '$image_url']
                    },
                    createdOn: '$createdAt'
                  }
                },
                {
                  $facet: {
                    metaData: [{ $count: 'totalCount' }, { $addFields: { page, perPage } }],
                    data: [{ $skip: skip }, { $limit: perPage }]
                  }
                }
              ];
              performanceData = await Cleanse.aggregate(aggregationPipeline);
              break;
            case PERFORMANCE_CONTENT_TYPE.GRATITUDE:
              filterCondition = {
                ...filterCondition,
                is_saved: true
              };
              aggregationPipeline = [
                {
                  $match: filterCondition
                },
                {
                  $project: {
                    userGratitudeId: '$_id',
                    title: '$display_name',
                    description: 1,
                    imageUrl: {
                      $concat: [CLOUDFRONT_URL, USER_MEDIA_PATH.GRATITUDE, '/', '$image_url']
                    },
                    createdOn: '$createdAt',
                    _id: 0
                  }
                },
                {
                  $facet: {
                    metaData: [{ $count: 'totalCount' }, { $addFields: { page, perPage } }],
                    data: [{ $skip: skip }, { $limit: perPage }]
                  }
                }
              ];
              performanceData = await UserGratitude.aggregate(aggregationPipeline);
              break;
            case PERFORMANCE_CONTENT_TYPE.GOALS:
              filterCondition = {
                ...filterCondition,
                is_saved: true
              };
              const fromDate = currentDateOnly();
              aggregationPipeline = [
                {
                  $match: filterCondition
                },
                {
                  $addFields: {
                    timeRemaining: {
                      $divide: [
                        {
                          $subtract: ['$due_date', fromDate]
                        },
                        86400000
                      ]
                    }
                  }
                },
                {
                  $project: {
                    goalId: '$_id',
                    _id: 0,
                    imageUrl: {
                      $concat: [CLOUDFRONT_URL, USER_MEDIA_PATH.GOALS, '/', '$image_url']
                    },
                    title: 1,
                    isCompleted: '$is_completed',
                    dueDate: '$due_date',
                    completedOn: '$completed_on',
                    daysRemaining: {
                      $cond: {
                        if: {
                          $eq: ['$is_completed', true]
                        },
                        then: '$$REMOVE',
                        else: {
                          $cond: {
                            if: {
                              $lt: ['$timeRemaining', 0]
                            },
                            then: -1,
                            else: '$timeRemaining'
                          }
                        }
                      }
                    }
                  }
                },
                {
                  $facet: {
                    metaData: [{ $count: 'totalCount' }, { $addFields: { page, perPage } }],
                    data: [{ $skip: skip }, { $limit: perPage }]
                  }
                },
                {
                  $sort: {
                    dueDate: 1
                  }
                }
              ];
              performanceData = await Goals.aggregate(aggregationPipeline);
              break;
            case PERFORMANCE_CONTENT_TYPE.RITUALS:
              const filterRituals = {
                status: STATUS.ACTIVE,
                approved_by: {
                  $ne: null
                },
                $expr: {
                  $in: ['$_id', '$$ritualIds']
                }
              };
              const aggregateCondition = [
                {
                  $match: {
                    user_id: toObjectId(reqParam.userId),
                    deletedAt: null,
                    ritual_ids: {
                      $not: {
                        $size: 0
                      }
                    }
                  }
                },
                {
                  $limit: 1
                },
                {
                  $lookup: {
                    from: 'rituals',
                    let: {
                      ritualIds: '$ritual_ids'
                    },
                    pipeline: [
                      {
                        $match: filterRituals
                      },
                      {
                        $project: {
                          id: '$_id',
                          title: '$display_name',
                          focus_ids: 1,
                          updatedAt: 1
                        }
                      }
                    ],
                    as: 'userRituals'
                  }
                },
                {
                  $unwind: {
                    path: '$userRituals',
                    preserveNullAndEmptyArrays: false
                  }
                }
              ];
              const filterFocus = {
                status: STATUS.ACTIVE,
                approved_by: {
                  $ne: null
                },
                $expr: {
                  $in: ['$_id', '$$focusIds']
                }
              };
              aggregateCondition.push(
                {
                  $lookup: {
                    from: 'focus',
                    let: {
                      focusIds: '$userRituals.focus_ids'
                    },
                    pipeline: [
                      {
                        $match: filterFocus
                      },
                      {
                        $project: {
                          display_name: 1
                        }
                      }
                    ],
                    as: 'userRituals.focus'
                  }
                },
                {
                  $addFields: {
                    'userRituals.focusName': '$userRituals.focus.display_name'
                  }
                },
                {
                  $project: {
                    'userRituals.id': '$userRituals._id',
                    'userRituals.title': 1,
                    'userRituals.focusName': 1,
                    'userRituals.updatedAt': 1
                  }
                },
                {
                  $sort: {
                    'userRituals.updatedAt': -1
                  }
                },
                {
                  $facet: {
                    metaData: [
                      {
                        $count: 'totalCount'
                      },
                      {
                        $addFields: {
                          page,
                          perPage
                        }
                      }
                    ],
                    data: [
                      {
                        $skip: skip
                      },
                      {
                        $limit: perPage
                      }
                    ]
                  }
                },
                {
                  $project: {
                    metaData: 1,
                    data: '$data.userRituals'
                  }
                }
              );

              performanceData = await UserRituals.aggregate(aggregateCondition);
              break;
            case PERFORMANCE_CONTENT_TYPE.NOTES:
              filterCondition = {
                ...filterCondition,
                is_saved: true
              };
              aggregationPipeline = [
                {
                  $match: filterCondition
                },
                {
                  $project: {
                    notesId: '$_id',
                    _id: 0,
                    title: 1,
                    description: 1,
                    imageUrl: {
                      $concat: [CLOUDFRONT_URL, USER_MEDIA_PATH.NOTES, '/', '$image_url']
                    },
                    createdOn: '$createdAt'
                  }
                },
                {
                  $facet: {
                    metaData: [{ $count: 'totalCount' }, { $addFields: { page, perPage } }],
                    data: [{ $skip: skip }, { $limit: perPage }]
                  }
                }
              ];
              performanceData = await UserNotes.aggregate(aggregationPipeline);
              break;
            default:
              return Response.successResponseWithoutData(res, res.__('noContentTypeFound'), FAIL);
          }
          return performanceData.length > 0
            ? Response.successResponseData(
              res,
              performanceData[0].data,
              SUCCESS,
              res.__('moodListSuccess'),
              performanceData[0].metaData[0]
            )
            : Response.successResponseWithoutData(res, res.__('somethingWrong'), FAIL);
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to get count of user badges
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  userBadgeCount: (req, res) => {
    try {
      const reqParam = req.query;
      userBadgeCountValidation(reqParam, res, async (validate) => {
        if (validate) {
          const aggregatePipeline = [
            {
              $match: {
                user_id: toObjectId(reqParam.userId),
                deletedAt: null
              }
            },
            {
              $group: {
                _id: '$badge_type',
                badgeCount: {
                  $sum: 1
                }
              }
            },
            {
              $project: {
                badgeType: '$_id',
                badgeCount: 1,
                _id: 0
              }
            }
          ];
          const totalBadgeData = await UserBadges.aggregate(aggregatePipeline);
          const remainingBadges = Object.values(BADGE_TYPE).filter(
            (x) => !totalBadgeData.some((y) => y.badgeType === x)
          );
          if (remainingBadges.length > 0) {
            remainingBadges.map((badge) => {
              const tempObj = {
                badgeCount: 0,
                badgeType: badge
              };
              totalBadgeData.push(tempObj);
            });
          }
          const diamondBadge = totalBadgeData.find((x) => x.badgeType === BADGE_TYPE.DIAMOND);
          const tempObj = {
            badgeCount: diamondBadge.badgeCount >= 3 ? 1 : 0,
            badgeType: SHOORAH_GURU
          };
          totalBadgeData.push(tempObj);
          return Response.successResponseData(
            res,
            totalBadgeData,
            SUCCESS,
            res.__('userBadgesCountSuccess')
          );
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to get user badge details
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  userBadgeDetails: (req, res) => {
    try {
      const reqParam = req.query;
      userBadgeDetailsValidation(reqParam, res, async (validate) => {
        if (validate) {
          const filterCondition = {
            user_id: reqParam.userId,
            badge_type: parseInt(reqParam.badgeType),
            deletedAt: null
          };
          const badgeDetails = await UserBadges.find(filterCondition).select(
            'category_type badge_type -_id'
          );
          let description = BRONZE_CATEGORY_DESCRIPTION;
          switch (parseInt(reqParam.badgeType)) {
            case BADGE_TYPE.BRONZE:
              description = BRONZE_CATEGORY_DESCRIPTION;
              break;
            case BADGE_TYPE.SILVER:
              description = SILVER_CATEGORY_DESCRIPTION;
              break;
            case BADGE_TYPE.GOLD:
              description = GOLD_CATEGORY_DESCRIPTION;
              break;
            case BADGE_TYPE.PLATINUM:
              description = PLATINUM_CATEGORY_DESCRIPTION;
              break;
            case BADGE_TYPE.DIAMOND:
              description = DIAMOND_CATEGORY_DESCRIPTION;
              break;
          }
          const resObj = {
            App_Consistency: [
              {
                title: CATEGORY_TITLE.TIME_SUBSCRIBED_ON_APP,
                description: description.TIME_SUBSCRIBED_ON_APP,
                isUnlocked: false
              }
            ],
            Rituals: [
              {
                title: CATEGORY_TITLE.USER_RITUALS,
                description: description.USER_RITUALS,
                isUnlocked: false
              }
            ],
            Restore: [
              {
                title: CATEGORY_TITLE.LISTEN_MEDITATION,
                description: description.LISTEN_MEDITATION,
                isUnlocked: false
              },
              {
                title: CATEGORY_TITLE.LISTEN_SOUND,
                description: description.LISTEN_SOUND,
                isUnlocked: false
              }
            ],
            Journal: [
              {
                title: CATEGORY_TITLE.CLEANSE,
                description: description.CLEANSE,
                isUnlocked: false
              },
              {
                title: CATEGORY_TITLE.USER_GRATITUDE,
                description: description.USER_GRATITUDE,
                isUnlocked: false
              },
              {
                title: CATEGORY_TITLE.NOTES,
                description: description.NOTES,
                isUnlocked: false
              }
            ],
            Shoorah_Pods: [
              {
                title: CATEGORY_TITLE.SHOORAH_PODS,
                description: description.SHOORAH_PODS,
                isUnlocked: false
              }
            ],
            Goals: [
              {
                title: CATEGORY_TITLE.GOALS,
                description: description.GOALS,
                isUnlocked: false
              }
            ],
            Affirmations: [
              {
                title: CATEGORY_TITLE.AFFIRMATION,
                description: description.AFFIRMATION,
                isUnlocked: false
              }
            ],
            Notifications: [
              {
                title: CATEGORY_TITLE.RECEIVED_NOTIFICATION,
                description: description.RECEIVED_NOTIFICATION,
                isUnlocked: false
              }
            ]
          };
          await badgeDetails.forEach((el) => {
            switch (el.category_type) {
              case CATEGORY_TYPE.USER_RITUALS:
                resObj.Rituals[
                  resObj.Rituals.findIndex((x) => x.title === CATEGORY_TITLE.USER_RITUALS)
                ].isUnlocked = true;
                break;
              case CATEGORY_TYPE.LISTEN_MEDITATION:
                resObj.Restore[
                  resObj.Restore.findIndex((x) => x.title === CATEGORY_TITLE.LISTEN_MEDITATION)
                ].isUnlocked = true;
                break;
              case CATEGORY_TYPE.LISTEN_SOUND:
                resObj.Restore[
                  resObj.Restore.findIndex((x) => x.title === CATEGORY_TITLE.LISTEN_SOUND)
                ].isUnlocked = true;
                break;
              case CATEGORY_TYPE.CLEANSE:
                resObj.Journal[
                  resObj.Journal.findIndex((x) => x.title === CATEGORY_TITLE.CLEANSE)
                ].isUnlocked = true;
                break;
              case CATEGORY_TYPE.USER_GRATITUDE:
                resObj.Journal[
                  resObj.Journal.findIndex((x) => x.title === CATEGORY_TITLE.USER_GRATITUDE)
                ].isUnlocked = true;
                break;
              case CATEGORY_TYPE.NOTES:
                resObj.Journal[
                  resObj.Journal.findIndex((x) => x.title === CATEGORY_TITLE.NOTES)
                ].isUnlocked = true;
                break;
              case CATEGORY_TYPE.AFFIRMATION:
                resObj.Affirmations[
                  resObj.Affirmations.findIndex((x) => x.title === CATEGORY_TITLE.AFFIRMATION)
                ].isUnlocked = true;
                break;
              case CATEGORY_TYPE.GOALS:
                resObj.Goals[
                  resObj.Goals.findIndex((x) => x.title === CATEGORY_TITLE.GOALS)
                ].isUnlocked = true;
                break;
              case CATEGORY_TYPE.RECEIVED_NOTIFICATION:
                resObj.Notifications[
                  resObj.Notifications.findIndex(
                    (x) => x.title === CATEGORY_TITLE.RECEIVED_NOTIFICATION
                  )
                ].isUnlocked = true;
                break;
              case CATEGORY_TYPE.TIME_SUBSCRIBED_ON_APP:
                resObj.App_Consistency[
                  resObj.App_Consistency.findIndex(
                    (x) => x.title === CATEGORY_TITLE.TIME_SUBSCRIBED_ON_APP
                  )
                ].isUnlocked = true;
                break;
              case CATEGORY_TYPE.SHOORAH_POD:
                resObj.Shoorah_Pods[
                  resObj.Shoorah_Pods.findIndex((x) => x.title === CATEGORY_TITLE.SHOORAH_PODS)
                ].isUnlocked = true;
                break;
            }
          });
          return Response.successResponseData(
            res,
            resObj,
            SUCCESS,
            res.__('userBadgeDetailSuccess')
          );
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  importUsers: async (req, res) => {
    try {
      const usersData = [];
      const csvFile = req.files;
      const company_id = req.body.company || req.query.company;

      if (!csvFile || !csvFile[0]) {
        return Response.errorResponseWithoutData(res, 'CSV file is required', FAIL);
      }

      // Convert the buffer into a readable stream
      const bufferStream = new stream.PassThrough();
      bufferStream.end(csvFile[0].buffer);

      // Use the bufferStream instead of fs.createReadStream()
      bufferStream
        .pipe(csv())
        .on('data', (row) => {
          usersData.push(row);
        })

        .on('end', async () => {
          const results = [];
          const user_existed = [];

          for (const userdetail of usersData) {
            if (company_id) {
              const company = await Company.findOne({ _id: company_id }).select(
                'no_of_seat_bought _id'
              );
              const totalCompanyUsers = await Users.find({
                company_id: { $exists: true, $eq: company_id },
                user_type: { $in: [2, 4] },
                deletedAt: null,
                status: 1
              }).countDocuments();
              if (company.no_of_seat_bought <= totalCompanyUsers) {
                userdetail.reason = 'Seats are fully occupied. Add more seats.';
                user_existed.push(userdetail);
                continue;
                // return Response.errorResponseWithoutData(res, "Seats are fully occupied. Add more seats.", FAIL);
              }
            }

            const existingEmailUser = await Users.findOne({ email: userdetail.email });

            if (existingEmailUser) {
              userdetail.reason = 'Same email already Exists';
              user_existed.push(userdetail);

              let profile = {
                email: existingEmailUser.email,
                userType: USER_TYPE.USER,
                firstName: existingEmailUser.name
              };

              await addEditKlaviyoUser(profile);
              continue;
            }

            const existing = await CompanyUsers.findOne({ email_address: userdetail.email });

            if (existing) {
              userdetail.reason = 'User with Same email or number already registered';
              user_existed.push(userdetail);

              let profile = {
                email: existing.email_address,
                userType: USER_TYPE.USER,
                firstName: existing.name
              };

              await addEditKlaviyoUser(profile);
              continue;
            }

            if (!existing && company_id) {
              const existingEmployee = await CompanyUsers.findOne({
                employee_id: userdetail.employee_id,
                company_id: company_id
              });

              if (existingEmployee) {
                userdetail.reason = 'User with Same employee id already registered in your company';
                user_existed.push(userdetail);
                continue;
              }
            }

            let password = makeRandomDigit(2) + makeRandomString(5) + makeRandomDigit(4);
            const hashPassword = await generatePassword(password);
            let accountType = 1;

            if (company_id) {
              accountType = 2;
            }

            let createUser = new Users({
              name: userdetail.name ? userdetail.name.toLowerCase() : null,
              company_id: company_id ? company_id : null,
              dob: userdetail.date_of_birth && new Date(userdetail.date_of_birth),
              mobile: userdetail.contact_number,
              email: userdetail.email ? userdetail.email.toLowerCase() : null,
              password: hashPassword,
              login_platform: 0,
              account_type: accountType,
              country: userdetail.country ? userdetail.country.toLowerCase() : null,
              is_email_verified: userdetail.is_email_verified
                ? userdetail.is_email_verified.toLowerCase()
                : false,
              ethnicity: userdetail.ethnicity ? userdetail.ethnicity.toLowerCase() : null,
              job_role: userdetail.job_role ? userdetail.job_role.toLowerCase() : null
            });
            await createUser.save();

            const existingcreateUser = await Users.findOne({
              email: userdetail.email,
              company_id: company_id
            });

            if (company_id) {
              let newUser = new CompanyUsers({
                name: userdetail.name ? userdetail.name.toLowerCase() : null,
                date_of_birth:
                  userdetail.date_of_birth && new Date(userdetail.date_of_birth).toISOString(),
                marital_status: userdetail.marital_status
                  ? userdetail.marital_status.toLowerCase()
                  : null,
                date_of_marriage:
                  userdetail.date_of_marriage && new Date(userdetail.date_of_marriage),
                contact_number: userdetail.contact_number,
                employee_id: userdetail.employee_id,
                email_address: userdetail.email ? userdetail.email.toLowerCase() : null,
                department: userdetail.department ? userdetail.department.toLowerCase() : null,
                designation: userdetail.designation ? userdetail.designation.toLowerCase() : null,
                city: userdetail.city ? userdetail.city.toLowerCase() : null,
                state: userdetail.state ? userdetail.state.toLowerCase() : null,
                country: userdetail.country ? userdetail.country.toLowerCase() : null,
                company_id: company_id,
                user_id: existingcreateUser._id
              });
              await newUser.save();

              const newCompanyUser = await CompanyUsers.findOne({
                email_address: userdetail.email,
                user_id: existingcreateUser._id
              });

              if (!newCompanyUser) {
                await Users.deleteOne({ _id: existingcreateUser._id });
              }

              results.push(userdetail);

              let profile = {
                email: userdetail.email,
                userType: USER_TYPE.USER,
                firstName: userdetail.name
              };

              await addEditKlaviyoUser(profile);
            }

            const locals = {
              name: userdetail.name,
              email: userdetail.email,
              password: password
            };
            await sendPassword(userdetail.email, locals);
          }

          return Response.successResponseData(
            res,
            { results, user_existed },
            SUCCESS,
            res.__('importUsersSuccess')
          );
        });
    } catch (error) {
      console.log(error);
      return Response.internalServerErrorResponse(res);
    }
  },

  cancelSubscription: async (req, res) => {
    try {
      let reqParam = req.body;
      let user = await Users.findOne({ _id: reqParam.id }).select('email user_type name');
      if (user) {
        const existingSubscriptions = await Subscriptions.find({
          user_id: reqParam.id,
          deletedAt: null
        });
        for (const subscription of existingSubscriptions) {
          if (subscription.original_transaction_id.includes('sub_')) {
            await stripe.subscriptions.update(subscription.original_transaction_id, {
              cancel_at_period_end: true
            });
          }
          await Subscriptions.updateOne({ _id: subscription._id }, { $set: { auto_renew: false } });
        }

        let profile = {
          email: user.email,
          userType: user.user_type,
          firstName: user.name
        };

        await addEditKlaviyoUser(profile);

        let message = 'Unsubscribed successfully';

        return Response.successResponseData(res, message, SUCCESS, res.__('unsubscribedSuccess'));
      } else {
        let message = 'something went wrong';
        return Response.successResponseData(res, message, FAIL, res.__('somethingWentWrong'));
      }
    } catch (err) {
      console.error(err);
      return Response.internalServerErrorResponse(err);
    }
  },

  changeUserCreds: async (req, res) => {
    try {
      let reqParam = req.body;
      let user = await Users.findOne({ _id: toObjectId(reqParam.id) }).select(
        'email user_type name'
      );
      if (user) {
        let password = makeRandomDigit(2) + makeRandomString(5) + makeRandomDigit(4);
        const hashPassword = await generatePassword(password);

        await Users.updateOne(
          { _id: toObjectId(reqParam.id) },
          {
            $set: {
              password: hashPassword
            }
          }
        );

        const locals = {
          name: user.name,
          email: user.email,
          password: password,
          subject: 'Welcome to Shoorah'
        };

        if (user.user_type == 2) {
          await sendPassword(user.email, locals);
        } else if (user.user_type == 3 || user.user_type == 4) {
          await sendB2BPassword(user.email, MAIL_SUBJECT.B2B_WELCOME, locals);
        } else if (user.user_type == 5) {
          await sendPartnerPassword(user.email, MAIL_SUBJECT.B2B_WELCOME, locals);
        } else {
          await sendPassword(user.email, locals);
        }

        let message = 'User Creds Change Successfully!';

        return Response.successResponseData(res, message, SUCCESS, res.__('sendEmailSuccess'));
      } else {
        let message = 'something went wrong';
        return Response.successResponseData(res, message, FAIL, res.__('somethingWentWrong'));
      }
    } catch (err) {
      console.error(err);
      return Response.internalServerErrorResponse(err);
    }
  },

  addUserTrial: async (req, res) => {
    try {
      let reqParam = req.body;
      let user = await Users.findOne({ _id: toObjectId(reqParam.id) }).select(
        'email company_id is_under_trial trial_starts_from user_type name'
      );
      if (user) {
        if (user.user_type == USER_TYPE.USER && !user.company_id) {
          await Users.updateOne(
            { _id: toObjectId(reqParam.id) },
            {
              $set: {
                account_type: ACCOUNT_TYPE.IS_UNDER_TRIAL,
                is_under_trial: true,
                trial_starts_from: new Date(),
                trial_ends_at: new Date(
                  new Date().getTime() + parseInt(reqParam.days) * 24 * 60 * 60 * 1000
                )
              }
            }
          );

          await trialNotification(req.authAdminId, parseInt(reqParam.days), reqParam.id);
          let message = 'User is on trial now!';

          return Response.successResponseData(res, message, SUCCESS, res.__('userTrialSuccess'));
        } else {
          let message = 'Trial is not for this user!';
          return Response.successResponseData(res, message, FAIL, res.__('userTrialFail'));
        }
      } else {
        let message = 'something went wrong';
        return Response.successResponseData(res, message, FAIL, res.__('somethingWentWrong'));
      }
    } catch (err) {
      console.error(err);
      return Response.internalServerErrorResponse(err);
    }
  },

  /**
  * @description This function is used to get user professional mood report
  * @param {*} req
  * @param {*} res
  * @returns {*}
  */
  userProfessionalMoodReport: (req, res) => {
    try {
      const reqParam = req.query;
      userMoodReportValidation(reqParam, res, async (validate) => {
        if (validate) {
          let dateFrom = currentDateOnly();
          let dateTo = currentDateOnly();
          dateTo.setDate(dateTo.getDate() + 1);
          const moodData = [];
          const sequence = {

            dissatisfied:
              1,
            verySatisfied:
              2,
            unpleasant:
              3,
            positive:
              4,
            overwhelming:
              5,
            comfortable:
              6,
            poor:
              7,
            supportive:
              8,
            unmanageable:
              9,
            manageable:
              10,
            lacking:
              11,
            excellent:
              12,
            negative:
              13,
            inclusive:
              14,
            unsupported:
              15,
            highlySupported:
              16,
            insufficient:
              17,
            wellEquipped:
              18,
            inadequate:
              19,
            comprehensive:
              20,
          };
          switch (parseInt(reqParam.reportType)) {
            case REPORT_TYPE.DAILY:
              dateFrom = currentDateOnly();
              dateTo = currentDateOnly();
              dateTo.setDate(dateFrom.getDate() + 1);
              dateFrom = getFirstDayOfMonth(dateFrom);
              const filterCondition = [
                {
                  $match: {
                    user_id: toObjectId(reqParam.userId),
                    createdAt: {
                      $gte: dateFrom,
                      $lt: dateTo
                    },
                    deletedAt: null
                  }
                },
                {
                  $addFields: {
                    date: {
                      $dateToString: {
                        format: '%Y-%m-%d',
                        date: '$createdAt'
                      }
                    }
                  }
                },
                {
                  $group: {
                    _id: '$date',
                    dissatisfied: {
                      $avg: '$dissatisfied'
                    },
                    verySatisfied: {
                      $avg: '$very_satisfied'
                    },
                    unpleasant: {
                      $avg: '$unpleasant'
                    },
                    positive: {
                      $avg: '$positive'
                    },
                    overwhelming: {
                      $avg: '$overwhelming'
                    },
                    comfortable: {
                      $avg: '$comfortable'
                    },
                    poor: {
                      $avg: '$poor'
                    },
                    supportive: {
                      $avg: '$supportive'
                    },
                    unmanageable: {
                      $avg: '$unmanageable'
                    },
                    manageable: {
                      $avg: '$manageable'
                    },
                    lacking: {
                      $avg: '$lacking'
                    },
                    excellent: {
                      $avg: '$excellent'
                    },
                    negative: {
                      $avg: '$negative'
                    },
                    inclusive: {
                      $avg: '$inclusive'
                    },
                    unsupported: {
                      $avg: '$unsupported'
                    },
                    highlySupported: {
                      $avg: '$highly_supported'
                    },
                    insufficient: {
                      $avg: '$insufficient'
                    },
                    wellEquipped: {
                      $avg: '$well_equipped'
                    },
                    inadequate: {
                      $avg: '$inadequate'
                    },
                    comprehensive: {
                      $avg: '$comprehensive'
                    },
                    createdAt: {
                      $first: '$createdAt'
                    }
                  }
                }
              ];
              const dailyMood = await ProfessionalMood.aggregate(filterCondition);
              const dayRange = [dateFrom];
              for (let i = 1; i < dateTo.getDate() - 1; i++) {
                dateFrom = new Date(dateFrom);
                dateFrom.setDate(dateFrom.getDate() + 1);
                dayRange.push(dateFrom);
              }
              let numberOfDays = 1;
              dayRange.forEach((date) => {
                const data = dailyMood.filter(
                  (x) => x.createdAt.getDate().toString() === date.getDate().toString()
                );
                const tempObj = {
                  interval: numberOfDays,
                  dissatisfied: data.length > 0 ? data[0].dissatisfied : 0,
                  verySatisfied: data.length > 0 ? data[0].verySatisfied : 0,
                  unpleasant: data.length > 0 ? data[0].unpleasant : 0,
                  positive: data.length > 0 ? data[0].positive : 0,
                  overwhelming: data.length > 0 ? data[0].overwhelming : 0,
                  comfortable: data.length > 0 ? data[0].comfortable : 0,
                  poor: data.length > 0 ? data[0].poor : 0,
                  supportive: data.length > 0 ? data[0].supportive : 0,
                  unmanageable: data.length > 0 ? data[0].unmanageable : 0,
                  manageable: data.length > 0 ? data[0].manageable : 0,
                  excellent: data.length > 0 ? data[0].excellent : 0,
                  negative: data.length > 0 ? data[0].negative : 0,
                  unsupported: data.length > 0 ? data[0].unsupported : 0,
                  inclusive: data.length > 0 ? data[0].inclusive : 0,
                  highlySupported: data.length > 0 ? data[0].highlySupported : 0,
                  insufficient: data.length > 0 ? data[0].insufficient : 0,
                  wellEquipped: data.length > 0 ? data[0].wellEquipped : 0,
                  inadequate: data.length > 0 ? data[0].inadequate : 0,
                  lacking: data.length > 0 ? data[0].lacking : 0,
                  comprehensive: data.length > 0 ? data[0].comprehensive : 0,
                };
                moodData.push(tempObj);
                numberOfDays += 1;
              });
              return Response.successResponseData(
                res,
                moodData,
                SUCCESS,
                res.__('professonalmoodListSuccess'),
                {
                  sequence
                }
              );
            case REPORT_TYPE.WEEKLY:
              dateFrom.setDate(dateFrom.getDate() - MOOD_REPORT.NUMBER_OF_WEEKS * 7);
              dateFrom = getFirstDayOfWeek(dateFrom);
              const weeklyQuery = [
                {
                  $match: {
                    user_id: toObjectId(reqParam.userId),
                    deletedAt: null,
                    createdAt: {
                      $gte: dateFrom,
                      $lt: dateTo
                    }
                  }
                },
                {
                  $addFields: {
                    weekStart: {
                      $dateFromParts: {
                        isoWeekYear: { $isoWeekYear: '$createdAt' },
                        isoWeek: { $isoWeek: '$createdAt' },
                        isoDayOfWeek: 0
                      }
                    }
                  }
                },
                {
                  $group: {
                    _id: '$weekStart',
                    dissatisfied: {
                      $avg: '$dissatisfied'
                    },
                    verySatisfied: {
                      $avg: '$very_satisfied'
                    },
                    unpleasant: {
                      $avg: '$unpleasant'
                    },
                    positive: {
                      $avg: '$positive'
                    },
                    overwhelming: {
                      $avg: '$overwhelming'
                    },
                    comfortable: {
                      $avg: '$comfortable'
                    },
                    poor: {
                      $avg: '$poor'
                    },
                    supportive: {
                      $avg: '$supportive'
                    },
                    unmanageable: {
                      $avg: '$unmanageable'
                    },
                    manageable: {
                      $avg: '$manageable'
                    },
                    lacking: {
                      $avg: '$lacking'
                    },
                    excellent: {
                      $avg: '$excellent'
                    },
                    negative: {
                      $avg: '$negative'
                    },
                    inclusive: {
                      $avg: '$inclusive'
                    },
                    unsupported: {
                      $avg: '$unsupported'
                    },
                    highlySupported: {
                      $avg: '$highly_supported'
                    },
                    insufficient: {
                      $avg: '$insufficient'
                    },
                    wellEquipped: {
                      $avg: '$well_equipped'
                    },
                    inadequate: {
                      $avg: '$inadequate'
                    },
                    comprehensive: {
                      $avg: '$comprehensive'
                    },
                  }
                }
              ];
              const weeklyData = await ProfessionalMood.aggregate(weeklyQuery);
              const dateRange = [dateFrom];
              for (let x = 0; x <= 5; x++) {
                dateFrom = new Date(dateFrom);
                dateFrom.setDate(dateFrom.getDate() + 7);
                dateRange.push(dateFrom);
              }
              let numberOfWeek = 1;
              dateRange.map((el) => {
                const data = weeklyData.filter((x) => x._id.toString() === el.toString());
                const tempObj = {
                  interval: numberOfWeek,
                  dissatisfied: data.length > 0 ? data[0].dissatisfied : 0,
                  verySatisfied: data.length > 0 ? data[0].verySatisfied : 0,
                  unpleasant: data.length > 0 ? data[0].unpleasant : 0,
                  positive: data.length > 0 ? data[0].positive : 0,
                  overwhelming: data.length > 0 ? data[0].overwhelming : 0,
                  comfortable: data.length > 0 ? data[0].comfortable : 0,
                  poor: data.length > 0 ? data[0].poor : 0,
                  supportive: data.length > 0 ? data[0].supportive : 0,
                  unmanageable: data.length > 0 ? data[0].unmanageable : 0,
                  manageable: data.length > 0 ? data[0].manageable : 0,
                  excellent: data.length > 0 ? data[0].excellent : 0,
                  negative: data.length > 0 ? data[0].negative : 0,
                  unsupported: data.length > 0 ? data[0].unsupported : 0,
                  inclusive: data.length > 0 ? data[0].inclusive : 0,
                  highlySupported: data.length > 0 ? data[0].highlySupported : 0,
                  insufficient: data.length > 0 ? data[0].insufficient : 0,
                  wellEquipped: data.length > 0 ? data[0].wellEquipped : 0,
                  inadequate: data.length > 0 ? data[0].inadequate : 0,
                  lacking: data.length > 0 ? data[0].lacking : 0,
                  comprehensive: data.length > 0 ? data[0].comprehensive : 0,
                };
                moodData.push(tempObj);
                numberOfWeek += 1;
              });
              return Response.successResponseData(
                res,
                moodData,
                SUCCESS,
                res.__('professonalmoodListSuccess'),
                {
                  sequence
                }
              );
            case REPORT_TYPE.MONTHLY:
              dateFrom.setMonth(dateFrom.getMonth() - MOOD_REPORT.NUMBER_OF_MONTHS);
              dateFrom = getFirstDayOfMonth(dateFrom);
              const monthlyQuery = [
                {
                  $match: {
                    user_id: toObjectId(reqParam.userId),
                    deletedAt: null,
                    createdAt: {
                      $gte: dateFrom,
                      $lt: dateTo
                    }
                  }
                },
                {
                  $addFields: {
                    monthStart: {
                      $dateFromString: {
                        dateString: {
                          $dateToString: {
                            format: '%Y-%m-01',
                            date: new Date()
                          }
                        }
                      }
                    }
                  }
                },
                {
                  $group: {
                    _id: '$monthStart',
                    dissatisfied: {
                      $avg: '$dissatisfied'
                    },
                    verySatisfied: {
                      $avg: '$very_satisfied'
                    },
                    unpleasant: {
                      $avg: '$unpleasant'
                    },
                    positive: {
                      $avg: '$positive'
                    },
                    overwhelming: {
                      $avg: '$overwhelming'
                    },
                    comfortable: {
                      $avg: '$comfortable'
                    },
                    poor: {
                      $avg: '$poor'
                    },
                    supportive: {
                      $avg: '$supportive'
                    },
                    unmanageable: {
                      $avg: '$unmanageable'
                    },
                    manageable: {
                      $avg: '$manageable'
                    },
                    lacking: {
                      $avg: '$lacking'
                    },
                    excellent: {
                      $avg: '$excellent'
                    },
                    negative: {
                      $avg: '$negative'
                    },
                    inclusive: {
                      $avg: '$inclusive'
                    },
                    unsupported: {
                      $avg: '$unsupported'
                    },
                    highlySupported: {
                      $avg: '$highly_supported'
                    },
                    insufficient: {
                      $avg: '$insufficient'
                    },
                    wellEquipped: {
                      $avg: '$well_equipped'
                    },
                    inadequate: {
                      $avg: '$inadequate'
                    },
                    comprehensive: {
                      $avg: '$comprehensive'
                    },
                  }
                }
              ];
              const monthlyData = await ProfessionalMood.aggregate(monthlyQuery);
              const monthRange = [dateFrom];
              for (let x = 0; x <= 5; x++) {
                dateFrom = new Date(dateFrom);
                dateFrom.setMonth(dateFrom.getMonth() + 1);
                monthRange.push(dateFrom);
              }
              let numberOfMonth = 1;
              monthRange.map((date) => {
                const data = monthlyData.filter((x) => x._id.toString() === date.toString());
                const tempObj = {
                  interval: numberOfMonth,
                  dissatisfied: data.length > 0 ? data[0].dissatisfied : 0,
                  verySatisfied: data.length > 0 ? data[0].verySatisfied : 0,
                  unpleasant: data.length > 0 ? data[0].unpleasant : 0,
                  positive: data.length > 0 ? data[0].positive : 0,
                  overwhelming: data.length > 0 ? data[0].overwhelming : 0,
                  comfortable: data.length > 0 ? data[0].comfortable : 0,
                  poor: data.length > 0 ? data[0].poor : 0,
                  supportive: data.length > 0 ? data[0].supportive : 0,
                  unmanageable: data.length > 0 ? data[0].unmanageable : 0,
                  manageable: data.length > 0 ? data[0].manageable : 0,
                  excellent: data.length > 0 ? data[0].excellent : 0,
                  negative: data.length > 0 ? data[0].negative : 0,
                  unsupported: data.length > 0 ? data[0].unsupported : 0,
                  inclusive: data.length > 0 ? data[0].inclusive : 0,
                  highlySupported: data.length > 0 ? data[0].highlySupported : 0,
                  insufficient: data.length > 0 ? data[0].insufficient : 0,
                  wellEquipped: data.length > 0 ? data[0].wellEquipped : 0,
                  inadequate: data.length > 0 ? data[0].inadequate : 0,
                  lacking: data.length > 0 ? data[0].lacking : 0,
                  comprehensive: data.length > 0 ? data[0].comprehensive : 0,
                };
                moodData.push(tempObj);
                numberOfMonth += 1;
              });
              return Response.successResponseData(
                res,
                moodData,
                SUCCESS,
                res.__('professonalmoodListSuccess'),
                {
                  sequence
                }
              );
            case REPORT_TYPE.YEARLY:
              dateFrom.setFullYear(dateFrom.getFullYear() - MOOD_REPORT.NUMBER_OF_YEARS);
              dateFrom = getFirstDayOfMonth(dateFrom);
              const yearlyQuery = [
                {
                  $match: {
                    user_id: toObjectId(reqParam.userId),
                    deletedAt: null,
                    createdAt: {
                      $gte: dateFrom,
                      $lt: dateTo
                    }
                  }
                },
                {
                  $addFields: {
                    year: {
                      $year: '$createdAt'
                    }
                  }
                },
                {
                  $group: {
                    _id: '$year',
                    dissatisfied: {
                      $avg: '$dissatisfied'
                    },
                    verySatisfied: {
                      $avg: '$very_satisfied'
                    },
                    unpleasant: {
                      $avg: '$unpleasant'
                    },
                    positive: {
                      $avg: '$positive'
                    },
                    overwhelming: {
                      $avg: '$overwhelming'
                    },
                    comfortable: {
                      $avg: '$comfortable'
                    },
                    poor: {
                      $avg: '$poor'
                    },
                    supportive: {
                      $avg: '$supportive'
                    },
                    unmanageable: {
                      $avg: '$unmanageable'
                    },
                    manageable: {
                      $avg: '$manageable'
                    },
                    lacking: {
                      $avg: '$lacking'
                    },
                    excellent: {
                      $avg: '$excellent'
                    },
                    negative: {
                      $avg: '$negative'
                    },
                    inclusive: {
                      $avg: '$inclusive'
                    },
                    unsupported: {
                      $avg: '$unsupported'
                    },
                    highlySupported: {
                      $avg: '$highly_supported'
                    },
                    insufficient: {
                      $avg: '$insufficient'
                    },
                    wellEquipped: {
                      $avg: '$well_equipped'
                    },
                    inadequate: {
                      $avg: '$inadequate'
                    },
                    comprehensive: {
                      $avg: '$comprehensive'
                    },
                  }
                }
              ];
              const yearlyData = await ProfessionalMood.aggregate(yearlyQuery);
              const yearRange = [dateFrom.getFullYear()];
              for (let x = 0; x <= 1; x++) {
                dateFrom = new Date(dateFrom);
                dateFrom.setFullYear(dateFrom.getFullYear() + 1);
                yearRange.push(dateFrom.getFullYear());
              }
              let numberOfYears = 1;
              yearRange.map((date) => {
                const data = yearlyData.filter((x) => x._id === date);
                const tempObj = {
                  interval: numberOfYears,
                  dissatisfied: data.length > 0 ? data[0].dissatisfied : 0,
                  verySatisfied: data.length > 0 ? data[0].verySatisfied : 0,
                  unpleasant: data.length > 0 ? data[0].unpleasant : 0,
                  positive: data.length > 0 ? data[0].positive : 0,
                  overwhelming: data.length > 0 ? data[0].overwhelming : 0,
                  comfortable: data.length > 0 ? data[0].comfortable : 0,
                  poor: data.length > 0 ? data[0].poor : 0,
                  supportive: data.length > 0 ? data[0].supportive : 0,
                  unmanageable: data.length > 0 ? data[0].unmanageable : 0,
                  manageable: data.length > 0 ? data[0].manageable : 0,
                  excellent: data.length > 0 ? data[0].excellent : 0,
                  negative: data.length > 0 ? data[0].negative : 0,
                  unsupported: data.length > 0 ? data[0].unsupported : 0,
                  inclusive: data.length > 0 ? data[0].inclusive : 0,
                  highlySupported: data.length > 0 ? data[0].highlySupported : 0,
                  insufficient: data.length > 0 ? data[0].insufficient : 0,
                  wellEquipped: data.length > 0 ? data[0].wellEquipped : 0,
                  inadequate: data.length > 0 ? data[0].inadequate : 0,
                  lacking: data.length > 0 ? data[0].lacking : 0,
                  comprehensive: data.length > 0 ? data[0].comprehensive : 0,
                };
                moodData.push(tempObj);
                numberOfYears += 1;
              });
              return Response.successResponseData(
                res,
                moodData,
                SUCCESS,
                res.__('professonalmoodListSuccess'),
                {
                  sequence
                }
              );
            default:
              return Response.successResponseWithoutData(res, res.__('noMoodCase'), FAIL);
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
 * @description This function is used to get user before sleep report
 * @param {*} req
 * @param {*} res
 * @returns {*}
 */
  userBeforeSleepReport: (req, res) => {
    try {
      const reqParam = req.query;
      userMoodReportValidation(reqParam, res, async (validate) => {
        if (validate) {
          let dateFrom = currentDateOnly();
          let dateTo = currentDateOnly();
          dateTo.setDate(dateTo.getDate() + 1);
          const moodData = [];
          const sequence = {
            anxious:
              1,
            calm:
              2,
            sad:
              3,
            happy:
              4,
            noisy:
              5,
            quiet:
              6,
            cold:
              7,
            warm:
              8,
            agitated:
              9,
            peaceful:
              10,
            uneasy:
              11,
            settled:
              12,
            worried:
              13,
            atEase:
              14,
            overwhelmed:
              15,
            inControl:
              16
          };
          switch (parseInt(reqParam.reportType)) {
            case REPORT_TYPE.DAILY:
              dateFrom = currentDateOnly();
              dateTo = currentDateOnly();
              dateTo.setDate(dateFrom.getDate() + 1);
              dateFrom = getFirstDayOfMonth(dateFrom);
              const filterCondition = [
                {
                  $match: {
                    user_id: toObjectId(reqParam.userId),
                    createdAt: {
                      $gte: dateFrom,
                      $lt: dateTo
                    },
                    deletedAt: null
                  }
                },
                {
                  $addFields: {
                    date: {
                      $dateToString: {
                        format: '%Y-%m-%d',
                        date: '$createdAt'
                      }
                    }
                  }
                },
                {
                  $group: {
                    _id: '$date',
                    anxious: {
                      $avg: '$anxious'
                    },
                    calm: {
                      $avg: '$calm'
                    },
                    sad: {
                      $avg: '$sad'
                    },
                    happy: {
                      $avg: '$happy'
                    },
                    noisy: {
                      $avg: '$noisy'
                    },
                    quiet: {
                      $avg: '$quiet'
                    },
                    cold: {
                      $avg: '$cold'
                    },
                    warm: {
                      $avg: '$warm'
                    },
                    agitated: {
                      $avg: '$agitated'
                    },
                    peaceful: {
                      $avg: '$peaceful'
                    },
                    uneasy: {
                      $avg: '$uneasy'
                    },
                    settled: {
                      $avg: '$settled'
                    },
                    worried: {
                      $avg: '$worried'
                    },
                    atEase: {
                      $avg: '$at_ease'
                    },
                    overwhelmed: {
                      $avg: '$overwhelmed'
                    },
                    inControl: {
                      $avg: '$in_control'
                    },
                    createdAt: {
                      $first: '$createdAt'
                    }
                  }
                }
              ];
              const dailyMood = await BeforeSleep.aggregate(filterCondition);
              const dayRange = [dateFrom];
              for (let i = 1; i < dateTo.getDate() - 1; i++) {
                dateFrom = new Date(dateFrom);
                dateFrom.setDate(dateFrom.getDate() + 1);
                dayRange.push(dateFrom);
              }
              let numberOfDays = 1;
              dayRange.forEach((date) => {
                const data = dailyMood.filter(
                  (x) => x.createdAt.getDate().toString() === date.getDate().toString()
                );
                const tempObj = {
                  interval: numberOfDays,
                  anxious: data.length > 0 ? data[0].anxious : 0,
                  calm: data.length > 0 ? data[0].calm : 0,
                  sad: data.length > 0 ? data[0].sad : 0,
                  happy: data.length > 0 ? data[0].happy : 0,
                  noisy: data.length > 0 ? data[0].noisy : 0,
                  quiet: data.length > 0 ? data[0].quiet : 0,
                  warm: data.length > 0 ? data[0].warm : 0,
                  cold: data.length > 0 ? data[0].cold : 0,
                  agitated: data.length > 0 ? data[0].agitated : 0,
                  peaceful: data.length > 0 ? data[0].peaceful : 0,
                  uneasy: data.length > 0 ? data[0].uneasy : 0,
                  settled: data.length > 0 ? data[0].settled : 0,
                  worried: data.length > 0 ? data[0].worried : 0,
                  atEase: data.length > 0 ? data[0].atEase : 0,
                  overwhelmed: data.length > 0 ? data[0].overwhelmed : 0,
                };
                moodData.push(tempObj);
                numberOfDays += 1;
              });
              return Response.successResponseData(
                res,
                moodData,
                SUCCESS,
                res.__('beforeSleepListSuccess'),
                {
                  sequence
                }
              );
            case REPORT_TYPE.WEEKLY:
              dateFrom.setDate(dateFrom.getDate() - MOOD_REPORT.NUMBER_OF_WEEKS * 7);
              dateFrom = getFirstDayOfWeek(dateFrom);
              const weeklyQuery = [
                {
                  $match: {
                    user_id: toObjectId(reqParam.userId),
                    deletedAt: null,
                    createdAt: {
                      $gte: dateFrom,
                      $lt: dateTo
                    }
                  }
                },
                {
                  $addFields: {
                    weekStart: {
                      $dateFromParts: {
                        isoWeekYear: { $isoWeekYear: '$createdAt' },
                        isoWeek: { $isoWeek: '$createdAt' },
                        isoDayOfWeek: 0
                      }
                    }
                  }
                },
                {
                  $group: {
                    _id: '$weekStart',
                    anxious: {
                      $avg: '$anxious'
                    },
                    calm: {
                      $avg: '$calm'
                    },
                    sad: {
                      $avg: '$sad'
                    },
                    happy: {
                      $avg: '$happy'
                    },
                    noisy: {
                      $avg: '$noisy'
                    },
                    quiet: {
                      $avg: '$quiet'
                    },
                    cold: {
                      $avg: '$cold'
                    },
                    warm: {
                      $avg: '$warm'
                    },
                    agitated: {
                      $avg: '$agitated'
                    },
                    peaceful: {
                      $avg: '$peaceful'
                    },
                    uneasy: {
                      $avg: '$uneasy'
                    },
                    settled: {
                      $avg: '$settled'
                    },
                    worried: {
                      $avg: '$worried'
                    },
                    atEase: {
                      $avg: '$at_ease'
                    },
                    overwhelmed: {
                      $avg: '$overwhelmed'
                    },
                    inControl: {
                      $avg: '$in_control'
                    },
                  }
                }
              ];
              const weeklyData = await BeforeSleep.aggregate(weeklyQuery);
              const dateRange = [dateFrom];
              for (let x = 0; x <= 5; x++) {
                dateFrom = new Date(dateFrom);
                dateFrom.setDate(dateFrom.getDate() + 7);
                dateRange.push(dateFrom);
              }
              let numberOfWeek = 1;
              dateRange.map((el) => {
                const data = weeklyData.filter((x) => x._id.toString() === el.toString());
                const tempObj = {
                  interval: numberOfWeek,
                  anxious: data.length > 0 ? data[0].anxious : 0,
                  calm: data.length > 0 ? data[0].calm : 0,
                  sad: data.length > 0 ? data[0].sad : 0,
                  happy: data.length > 0 ? data[0].happy : 0,
                  noisy: data.length > 0 ? data[0].noisy : 0,
                  quiet: data.length > 0 ? data[0].quiet : 0,
                  warm: data.length > 0 ? data[0].warm : 0,
                  cold: data.length > 0 ? data[0].cold : 0,
                  agitated: data.length > 0 ? data[0].agitated : 0,
                  peaceful: data.length > 0 ? data[0].peaceful : 0,
                  uneasy: data.length > 0 ? data[0].uneasy : 0,
                  settled: data.length > 0 ? data[0].settled : 0,
                  worried: data.length > 0 ? data[0].worried : 0,
                  atEase: data.length > 0 ? data[0].atEase : 0,
                  overwhelmed: data.length > 0 ? data[0].overwhelmed : 0,
                };
                moodData.push(tempObj);
                numberOfWeek += 1;
              });
              return Response.successResponseData(
                res,
                moodData,
                SUCCESS,
                res.__('beforeSleepListSuccess'),
                {
                  sequence
                }
              );
            case REPORT_TYPE.MONTHLY:
              dateFrom.setMonth(dateFrom.getMonth() - MOOD_REPORT.NUMBER_OF_MONTHS);
              dateFrom = getFirstDayOfMonth(dateFrom);
              const monthlyQuery = [
                {
                  $match: {
                    user_id: toObjectId(reqParam.userId),
                    deletedAt: null,
                    createdAt: {
                      $gte: dateFrom,
                      $lt: dateTo
                    }
                  }
                },
                {
                  $addFields: {
                    monthStart: {
                      $dateFromString: {
                        dateString: {
                          $dateToString: {
                            format: '%Y-%m-01',
                            date: new Date()
                          }
                        }
                      }
                    }
                  }
                },
                {
                  $group: {
                    _id: '$monthStart',
                    anxious: {
                      $avg: '$anxious'
                    },
                    calm: {
                      $avg: '$calm'
                    },
                    sad: {
                      $avg: '$sad'
                    },
                    happy: {
                      $avg: '$happy'
                    },
                    noisy: {
                      $avg: '$noisy'
                    },
                    quiet: {
                      $avg: '$quiet'
                    },
                    cold: {
                      $avg: '$cold'
                    },
                    warm: {
                      $avg: '$warm'
                    },
                    agitated: {
                      $avg: '$agitated'
                    },
                    peaceful: {
                      $avg: '$peaceful'
                    },
                    uneasy: {
                      $avg: '$uneasy'
                    },
                    settled: {
                      $avg: '$settled'
                    },
                    worried: {
                      $avg: '$worried'
                    },
                    atEase: {
                      $avg: '$at_ease'
                    },
                    overwhelmed: {
                      $avg: '$overwhelmed'
                    },
                    inControl: {
                      $avg: '$in_control'
                    },
                  }
                }
              ];
              const monthlyData = await BeforeSleep.aggregate(monthlyQuery);
              const monthRange = [dateFrom];
              for (let x = 0; x <= 5; x++) {
                dateFrom = new Date(dateFrom);
                dateFrom.setMonth(dateFrom.getMonth() + 1);
                monthRange.push(dateFrom);
              }
              let numberOfMonth = 1;
              monthRange.map((date) => {
                const data = monthlyData.filter((x) => x._id.toString() === date.toString());
                const tempObj = {
                  interval: numberOfMonth,
                  anxious: data.length > 0 ? data[0].anxious : 0,
                  calm: data.length > 0 ? data[0].calm : 0,
                  sad: data.length > 0 ? data[0].sad : 0,
                  happy: data.length > 0 ? data[0].happy : 0,
                  noisy: data.length > 0 ? data[0].noisy : 0,
                  quiet: data.length > 0 ? data[0].quiet : 0,
                  warm: data.length > 0 ? data[0].warm : 0,
                  cold: data.length > 0 ? data[0].cold : 0,
                  agitated: data.length > 0 ? data[0].agitated : 0,
                  peaceful: data.length > 0 ? data[0].peaceful : 0,
                  uneasy: data.length > 0 ? data[0].uneasy : 0,
                  settled: data.length > 0 ? data[0].settled : 0,
                  worried: data.length > 0 ? data[0].worried : 0,
                  atEase: data.length > 0 ? data[0].atEase : 0,
                  overwhelmed: data.length > 0 ? data[0].overwhelmed : 0,
                };
                moodData.push(tempObj);
                numberOfMonth += 1;
              });
              return Response.successResponseData(
                res,
                moodData,
                SUCCESS,
                res.__('ListSuccess'),
                {
                  sequence
                }
              );
            case REPORT_TYPE.YEARLY:
              dateFrom.setFullYear(dateFrom.getFullYear() - MOOD_REPORT.NUMBER_OF_YEARS);
              dateFrom = getFirstDayOfMonth(dateFrom);
              const yearlyQuery = [
                {
                  $match: {
                    user_id: toObjectId(reqParam.userId),
                    deletedAt: null,
                    createdAt: {
                      $gte: dateFrom,
                      $lt: dateTo
                    }
                  }
                },
                {
                  $addFields: {
                    year: {
                      $year: '$createdAt'
                    }
                  }
                },
                {
                  $group: {
                    _id: '$year',
                    anxious: {
                      $avg: '$anxious'
                    },
                    calm: {
                      $avg: '$calm'
                    },
                    sad: {
                      $avg: '$sad'
                    },
                    happy: {
                      $avg: '$happy'
                    },
                    noisy: {
                      $avg: '$noisy'
                    },
                    quiet: {
                      $avg: '$quiet'
                    },
                    cold: {
                      $avg: '$cold'
                    },
                    warm: {
                      $avg: '$warm'
                    },
                    agitated: {
                      $avg: '$agitated'
                    },
                    peaceful: {
                      $avg: '$peaceful'
                    },
                    uneasy: {
                      $avg: '$uneasy'
                    },
                    settled: {
                      $avg: '$settled'
                    },
                    worried: {
                      $avg: '$worried'
                    },
                    atEase: {
                      $avg: '$at_ease'
                    },
                    overwhelmed: {
                      $avg: '$overwhelmed'
                    },
                    inControl: {
                      $avg: '$in_control'
                    },
                  }
                }
              ];
              const yearlyData = await BeforeSleep.aggregate(yearlyQuery);
              const yearRange = [dateFrom.getFullYear()];
              for (let x = 0; x <= 1; x++) {
                dateFrom = new Date(dateFrom);
                dateFrom.setFullYear(dateFrom.getFullYear() + 1);
                yearRange.push(dateFrom.getFullYear());
              }
              let numberOfYears = 1;
              yearRange.map((date) => {
                const data = yearlyData.filter((x) => x._id === date);
                const tempObj = {
                  interval: numberOfYears,
                  anxious: data.length > 0 ? data[0].anxious : 0,
                  calm: data.length > 0 ? data[0].calm : 0,
                  sad: data.length > 0 ? data[0].sad : 0,
                  happy: data.length > 0 ? data[0].happy : 0,
                  noisy: data.length > 0 ? data[0].noisy : 0,
                  quiet: data.length > 0 ? data[0].quiet : 0,
                  warm: data.length > 0 ? data[0].warm : 0,
                  cold: data.length > 0 ? data[0].cold : 0,
                  agitated: data.length > 0 ? data[0].agitated : 0,
                  peaceful: data.length > 0 ? data[0].peaceful : 0,
                  uneasy: data.length > 0 ? data[0].uneasy : 0,
                  settled: data.length > 0 ? data[0].settled : 0,
                  worried: data.length > 0 ? data[0].worried : 0,
                  atEase: data.length > 0 ? data[0].atEase : 0,
                  overwhelmed: data.length > 0 ? data[0].overwhelmed : 0,
                };
                moodData.push(tempObj);
                numberOfYears += 1;
              });
              return Response.successResponseData(
                res,
                moodData,
                SUCCESS,
                res.__('BeforeSleepListSuccess'),
                {
                  sequence
                }
              );
            default:
              return Response.successResponseWithoutData(res, res.__('noBeforeSleepCase'), FAIL);
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
 * @description This function is used to get user after sleep report
 * @param {*} req
 * @param {*} res
 * @returns {*}
 */
  userAfterSleepReport: (req, res) => {
    try {
      const reqParam = req.query;
      userMoodReportValidation(reqParam, res, async (validate) => {
        if (validate) {
          let dateFrom = currentDateOnly();
          let dateTo = currentDateOnly();
          dateTo.setDate(dateTo.getDate() + 1);
          const moodData = [];
          const sequence = {
            tossingTurning:
              1,
            sleepSoundly:
              2,
            lightSleep:
              3,
            deepSleep:
              4,
            nightmare:
              5,
            lovelyDream:
              6,
            restless:
              7,
            still:
              8,
            sweaty:
              9,
            cool:
              10,
            sleepwalking:
              11,
            stayingPut:
              12,
            snoring:
              13,
            silent:
              14,
            needMoreSleep:
              15,
            rested:
              16,
            nocturnalEating:
              17,
            noMidnightSnacks:
              18,
          };
          switch (parseInt(reqParam.reportType)) {
            case REPORT_TYPE.DAILY:
              dateFrom = currentDateOnly();
              dateTo = currentDateOnly();
              dateTo.setDate(dateFrom.getDate() + 1);
              dateFrom = getFirstDayOfMonth(dateFrom);
              const filterCondition = [
                {
                  $match: {
                    user_id: toObjectId(reqParam.userId),
                    createdAt: {
                      $gte: dateFrom,
                      $lt: dateTo
                    },
                    deletedAt: null
                  }
                },
                {
                  $addFields: {
                    date: {
                      $dateToString: {
                        format: '%Y-%m-%d',
                        date: '$createdAt'
                      }
                    }
                  }
                },
                {
                  $group: {
                    _id: '$date',
                    tossingTurning: {
                      $avg: '$tossing_and_turning'
                    },
                    sleepSoundly: {
                      $avg: '$sleep_soundly'
                    },
                    lightSleep: {
                      $avg: '$light_sleep'
                    },
                    deepSleep: {
                      $avg: '$deep_sleep'
                    },
                    nightmare: {
                      $avg: '$nightmare'
                    },
                    lovelyDream: {
                      $avg: '$lovely_dream'
                    },
                    restless: {
                      $avg: '$restless'
                    },
                    still: {
                      $avg: '$still'
                    },
                    sweaty: {
                      $avg: '$sweaty'
                    },
                    cool: {
                      $avg: '$cool'
                    },
                    sleepwalking: {
                      $avg: '$sleepwalking'
                    },
                    stayingPut: {
                      $avg: '$staying_put'
                    },
                    snoring: {
                      $avg: '$snoring'
                    },
                    silent: {
                      $avg: '$silent'
                    },
                    needMoreSleep: {
                      $avg: '$need_more_sleep'
                    },
                    rested: {
                      $avg: '$rested'
                    },
                    nocturnalEating: {
                      $avg: '$nocturnal_eating'
                    },
                    noMidnightSnacks: {
                      $avg: '$no_midnight_snacks'
                    },
                    createdAt: {
                      $first: '$createdAt'
                    }
                  }
                }
              ];
              const dailyMood = await AfterSleep.aggregate(filterCondition);
              const dayRange = [dateFrom];
              for (let i = 1; i < dateTo.getDate() - 1; i++) {
                dateFrom = new Date(dateFrom);
                dateFrom.setDate(dateFrom.getDate() + 1);
                dayRange.push(dateFrom);
              }
              let numberOfDays = 1;
              dayRange.forEach((date) => {
                const data = dailyMood.filter(
                  (x) => x.createdAt.getDate().toString() === date.getDate().toString()
                );
                const tempObj = {
                  interval: numberOfDays,
                  tossingTurning: data.length > 0 ? data[0].tossingTurning : 0,
                  sleepSoundly: data.length > 0 ? data[0].sleepSoundly : 0,
                  lightSleep: data.length > 0 ? data[0].lightSleep : 0,
                  deepSleep: data.length > 0 ? data[0].deepSleep : 0,
                  nightmare: data.length > 0 ? data[0].nightmare : 0,
                  lovelyDream: data.length > 0 ? data[0].lovelyDream : 0,
                  restless: data.length > 0 ? data[0].restless : 0,
                  still: data.length > 0 ? data[0].still : 0,
                  sweaty: data.length > 0 ? data[0].sweaty : 0,
                  cool: data.length > 0 ? data[0].cool : 0,
                  sleepwalking: data.length > 0 ? data[0].sleepwalking : 0,
                  stayingPut: data.length > 0 ? data[0].stayingPut : 0,
                  snoring: data.length > 0 ? data[0].snoring : 0,
                  silent: data.length > 0 ? data[0].silent : 0,
                  needMoreSleep: data.length > 0 ? data[0].needMoreSleep : 0,
                  rested: data.length > 0 ? data[0].rested : 0,
                  nocturnalEating: data.length > 0 ? data[0].nocturnalEating : 0,
                  noMidnightSnacks: data.length > 0 ? data[0].noMidnightSnacks : 0,
                };
                moodData.push(tempObj);
                numberOfDays += 1;
              });
              return Response.successResponseData(
                res,
                moodData,
                SUCCESS,
                res.__('afterSleepListSuccess'),
                {
                  sequence
                }
              );
            case REPORT_TYPE.WEEKLY:
              dateFrom.setDate(dateFrom.getDate() - MOOD_REPORT.NUMBER_OF_WEEKS * 7);
              dateFrom = getFirstDayOfWeek(dateFrom);
              const weeklyQuery = [
                {
                  $match: {
                    user_id: toObjectId(reqParam.userId),
                    deletedAt: null,
                    createdAt: {
                      $gte: dateFrom,
                      $lt: dateTo
                    }
                  }
                },
                {
                  $addFields: {
                    weekStart: {
                      $dateFromParts: {
                        isoWeekYear: { $isoWeekYear: '$createdAt' },
                        isoWeek: { $isoWeek: '$createdAt' },
                        isoDayOfWeek: 0
                      }
                    }
                  }
                },
                {
                  $group: {
                    _id: '$weekStart',
                    tossingTurning: {
                      $avg: '$tossing_and_turning'
                    },
                    sleepSoundly: {
                      $avg: '$sleep_soundly'
                    },
                    lightSleep: {
                      $avg: '$light_sleep'
                    },
                    deepSleep: {
                      $avg: '$deep_sleep'
                    },
                    nightmare: {
                      $avg: '$nightmare'
                    },
                    lovelyDream: {
                      $avg: '$lovely_dream'
                    },
                    restless: {
                      $avg: '$restless'
                    },
                    still: {
                      $avg: '$still'
                    },
                    sweaty: {
                      $avg: '$sweaty'
                    },
                    cool: {
                      $avg: '$cool'
                    },
                    sleepwalking: {
                      $avg: '$sleepwalking'
                    },
                    stayingPut: {
                      $avg: '$staying_put'
                    },
                    snoring: {
                      $avg: '$snoring'
                    },
                    silent: {
                      $avg: '$silent'
                    },
                    needMoreSleep: {
                      $avg: '$need_more_sleep'
                    },
                    rested: {
                      $avg: '$rested'
                    },
                    nocturnalEating: {
                      $avg: '$nocturnal_eating'
                    },
                    noMidnightSnacks: {
                      $avg: '$no_midnight_snacks'
                    },
                  }
                }
              ];
              const weeklyData = await AfterSleep.aggregate(weeklyQuery);
              const dateRange = [dateFrom];
              for (let x = 0; x <= 5; x++) {
                dateFrom = new Date(dateFrom);
                dateFrom.setDate(dateFrom.getDate() + 7);
                dateRange.push(dateFrom);
              }
              let numberOfWeek = 1;
              dateRange.map((el) => {
                const data = weeklyData.filter((x) => x._id.toString() === el.toString());
                const tempObj = {
                  interval: numberOfWeek,
                  tossingTurning: data.length > 0 ? data[0].tossingTurning : 0,
                  sleepSoundly: data.length > 0 ? data[0].sleepSoundly : 0,
                  lightSleep: data.length > 0 ? data[0].lightSleep : 0,
                  deepSleep: data.length > 0 ? data[0].deepSleep : 0,
                  nightmare: data.length > 0 ? data[0].nightmare : 0,
                  lovelyDream: data.length > 0 ? data[0].lovelyDream : 0,
                  restless: data.length > 0 ? data[0].restless : 0,
                  still: data.length > 0 ? data[0].still : 0,
                  sweaty: data.length > 0 ? data[0].sweaty : 0,
                  cool: data.length > 0 ? data[0].cool : 0,
                  sleepwalking: data.length > 0 ? data[0].sleepwalking : 0,
                  stayingPut: data.length > 0 ? data[0].stayingPut : 0,
                  snoring: data.length > 0 ? data[0].snoring : 0,
                  silent: data.length > 0 ? data[0].silent : 0,
                  needMoreSleep: data.length > 0 ? data[0].needMoreSleep : 0,
                  rested: data.length > 0 ? data[0].rested : 0,
                  nocturnalEating: data.length > 0 ? data[0].nocturnalEating : 0,
                  noMidnightSnacks: data.length > 0 ? data[0].noMidnightSnacks : 0,
                };
                moodData.push(tempObj);
                numberOfWeek += 1;
              });
              return Response.successResponseData(
                res,
                moodData,
                SUCCESS,
                res.__('afterSleepListSuccess'),
                {
                  sequence
                }
              );
            case REPORT_TYPE.MONTHLY:
              dateFrom.setMonth(dateFrom.getMonth() - MOOD_REPORT.NUMBER_OF_MONTHS);
              dateFrom = getFirstDayOfMonth(dateFrom);
              const monthlyQuery = [
                {
                  $match: {
                    user_id: toObjectId(reqParam.userId),
                    deletedAt: null,
                    createdAt: {
                      $gte: dateFrom,
                      $lt: dateTo
                    }
                  }
                },
                {
                  $addFields: {
                    monthStart: {
                      $dateFromString: {
                        dateString: {
                          $dateToString: {
                            format: '%Y-%m-01',
                            date: new Date()
                          }
                        }
                      }
                    }
                  }
                },
                {
                  $group: {
                    _id: '$monthStart',
                    tossingTurning: {
                      $avg: '$tossing_and_turning'
                    },
                    sleepSoundly: {
                      $avg: '$sleep_soundly'
                    },
                    lightSleep: {
                      $avg: '$light_sleep'
                    },
                    deepSleep: {
                      $avg: '$deep_sleep'
                    },
                    nightmare: {
                      $avg: '$nightmare'
                    },
                    lovelyDream: {
                      $avg: '$lovely_dream'
                    },
                    restless: {
                      $avg: '$restless'
                    },
                    still: {
                      $avg: '$still'
                    },
                    sweaty: {
                      $avg: '$sweaty'
                    },
                    cool: {
                      $avg: '$cool'
                    },
                    sleepwalking: {
                      $avg: '$sleepwalking'
                    },
                    stayingPut: {
                      $avg: '$staying_put'
                    },
                    snoring: {
                      $avg: '$snoring'
                    },
                    silent: {
                      $avg: '$silent'
                    },
                    needMoreSleep: {
                      $avg: '$need_more_sleep'
                    },
                    rested: {
                      $avg: '$rested'
                    },
                    nocturnalEating: {
                      $avg: '$nocturnal_eating'
                    },
                    noMidnightSnacks: {
                      $avg: '$no_midnight_snacks'
                    },
                  }
                }
              ];
              const monthlyData = await AfterSleep.aggregate(monthlyQuery);
              const monthRange = [dateFrom];
              for (let x = 0; x <= 5; x++) {
                dateFrom = new Date(dateFrom);
                dateFrom.setMonth(dateFrom.getMonth() + 1);
                monthRange.push(dateFrom);
              }
              let numberOfMonth = 1;
              monthRange.map((date) => {
                const data = monthlyData.filter((x) => x._id.toString() === date.toString());
                const tempObj = {
                  interval: numberOfMonth,
                  tossingTurning: data.length > 0 ? data[0].tossingTurning : 0,
                  sleepSoundly: data.length > 0 ? data[0].sleepSoundly : 0,
                  lightSleep: data.length > 0 ? data[0].lightSleep : 0,
                  deepSleep: data.length > 0 ? data[0].deepSleep : 0,
                  nightmare: data.length > 0 ? data[0].nightmare : 0,
                  lovelyDream: data.length > 0 ? data[0].lovelyDream : 0,
                  restless: data.length > 0 ? data[0].restless : 0,
                  still: data.length > 0 ? data[0].still : 0,
                  sweaty: data.length > 0 ? data[0].sweaty : 0,
                  cool: data.length > 0 ? data[0].cool : 0,
                  sleepwalking: data.length > 0 ? data[0].sleepwalking : 0,
                  stayingPut: data.length > 0 ? data[0].stayingPut : 0,
                  snoring: data.length > 0 ? data[0].snoring : 0,
                  silent: data.length > 0 ? data[0].silent : 0,
                  needMoreSleep: data.length > 0 ? data[0].needMoreSleep : 0,
                  rested: data.length > 0 ? data[0].rested : 0,
                  nocturnalEating: data.length > 0 ? data[0].nocturnalEating : 0,
                  noMidnightSnacks: data.length > 0 ? data[0].noMidnightSnacks : 0,
                };
                moodData.push(tempObj);
                numberOfMonth += 1;
              });
              return Response.successResponseData(
                res,
                moodData,
                SUCCESS,
                res.__('afterSleepListSuccess'),
                {
                  sequence
                }
              );
            case REPORT_TYPE.YEARLY:
              dateFrom.setFullYear(dateFrom.getFullYear() - MOOD_REPORT.NUMBER_OF_YEARS);
              dateFrom = getFirstDayOfMonth(dateFrom);
              const yearlyQuery = [
                {
                  $match: {
                    user_id: toObjectId(reqParam.userId),
                    deletedAt: null,
                    createdAt: {
                      $gte: dateFrom,
                      $lt: dateTo
                    }
                  }
                },
                {
                  $addFields: {
                    year: {
                      $year: '$createdAt'
                    }
                  }
                },
                {
                  $group: {
                    _id: '$year',
                    tossingTurning: {
                      $avg: '$tossing_and_turning'
                    },
                    sleepSoundly: {
                      $avg: '$sleep_soundly'
                    },
                    lightSleep: {
                      $avg: '$light_sleep'
                    },
                    deepSleep: {
                      $avg: '$deep_sleep'
                    },
                    nightmare: {
                      $avg: '$nightmare'
                    },
                    lovelyDream: {
                      $avg: '$lovely_dream'
                    },
                    restless: {
                      $avg: '$restless'
                    },
                    still: {
                      $avg: '$still'
                    },
                    sweaty: {
                      $avg: '$sweaty'
                    },
                    cool: {
                      $avg: '$cool'
                    },
                    sleepwalking: {
                      $avg: '$sleepwalking'
                    },
                    stayingPut: {
                      $avg: '$staying_put'
                    },
                    snoring: {
                      $avg: '$snoring'
                    },
                    silent: {
                      $avg: '$silent'
                    },
                    needMoreSleep: {
                      $avg: '$need_more_sleep'
                    },
                    rested: {
                      $avg: '$rested'
                    },
                    nocturnalEating: {
                      $avg: '$nocturnal_eating'
                    },
                    noMidnightSnacks: {
                      $avg: '$no_midnight_snacks'
                    },
                  }
                }
              ];
              const yearlyData = await AfterSleep.aggregate(yearlyQuery);
              const yearRange = [dateFrom.getFullYear()];
              for (let x = 0; x <= 1; x++) {
                dateFrom = new Date(dateFrom);
                dateFrom.setFullYear(dateFrom.getFullYear() + 1);
                yearRange.push(dateFrom.getFullYear());
              }
              let numberOfYears = 1;
              yearRange.map((date) => {
                const data = yearlyData.filter((x) => x._id === date);
                const tempObj = {
                  interval: numberOfYears,
                  tossingTurning: data.length > 0 ? data[0].tossingTurning : 0,
                  sleepSoundly: data.length > 0 ? data[0].sleepSoundly : 0,
                  lightSleep: data.length > 0 ? data[0].lightSleep : 0,
                  deepSleep: data.length > 0 ? data[0].deepSleep : 0,
                  nightmare: data.length > 0 ? data[0].nightmare : 0,
                  lovelyDream: data.length > 0 ? data[0].lovelyDream : 0,
                  restless: data.length > 0 ? data[0].restless : 0,
                  still: data.length > 0 ? data[0].still : 0,
                  sweaty: data.length > 0 ? data[0].sweaty : 0,
                  cool: data.length > 0 ? data[0].cool : 0,
                  sleepwalking: data.length > 0 ? data[0].sleepwalking : 0,
                  stayingPut: data.length > 0 ? data[0].stayingPut : 0,
                  snoring: data.length > 0 ? data[0].snoring : 0,
                  silent: data.length > 0 ? data[0].silent : 0,
                  needMoreSleep: data.length > 0 ? data[0].needMoreSleep : 0,
                  rested: data.length > 0 ? data[0].rested : 0,
                  nocturnalEating: data.length > 0 ? data[0].nocturnalEating : 0,
                  noMidnightSnacks: data.length > 0 ? data[0].noMidnightSnacks : 0,
                };
                moodData.push(tempObj);
                numberOfYears += 1;
              });
              return Response.successResponseData(
                res,
                moodData,
                SUCCESS,
                res.__('afterSleepListSuccess'),
                {
                  sequence
                }
              );
            default:
              return Response.successResponseWithoutData(res, res.__('noAfterSleepCase'), FAIL);
          }
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  userWellbeingProfessionalData: (req, res) => {
    try {
      const reqParam = req.query;
      userMoodReportValidation(reqParam, res, async (validate) => {
        if (validate) {
          let dateFrom = currentDateOnly();
          let dateTo = currentDateOnly();
          const moodData = [];

          dateTo.setDate(dateTo.getDate() + 1);
          switch (parseInt(reqParam.reportType)) {
            case REPORT_TYPE.DAILY:
              dateFrom = currentDateOnly();
              dateTo = currentDateOnly();
              dateTo.setDate(dateFrom.getDate() + 1);
              dateFrom = getFirstDayOfMonth(dateFrom);
              const filterCondition = [
                {
                  $match: {
                    user_id: toObjectId(reqParam.userId),
                    createdAt: {
                      $gte: dateFrom,
                      $lt: dateTo
                    },
                    positivity: {
                      $exists: true,
                    },
                    deletedAt: null
                  }
                },
                {
                  $addFields: {
                    date: {
                      $dateToString: {
                        format: '%Y-%m-%d',
                        date: '$createdAt'
                      }
                    }
                  }
                },
                {
                  $group: {
                    _id: '$date',
                    positiveCounts: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$positivity', true] }, // Check if 'positivity' is true
                          then: 1,
                          else: 0
                        }
                      }
                    },
                    negativeCounts: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$positivity', false] }, // Check if 'positivity' is true
                          then: 1,
                          else: 0
                        }
                      }
                    },
                    createdAt: {
                      $first: '$createdAt'
                    }
                  }
                }
              ];
              const dailyMood = await ProfessionalMood.aggregate(filterCondition);
              const dayRange = [dateFrom];
              for (let i = 1; i < dateTo.getDate() - 1; i++) {
                dateFrom = new Date(dateFrom);
                dateFrom.setDate(dateFrom.getDate() + 1);
                dayRange.push(dateFrom);
              }
              let numberOfDays = 1;
              dayRange.forEach((date) => {
                const data = dailyMood.filter(
                  (x) => x.createdAt.getDate().toString() === date.getDate().toString()
                );
                const tempObj = {
                  interval: numberOfDays,
                  positive: data.length > 0 ? data[0].positiveCounts : 0,
                  negative: data.length > 0 ? data[0].negativeCounts : 0,
                };
                moodData.push(tempObj);
                numberOfDays += 1;
              });
              return Response.successResponseData(
                res,
                moodData,
                SUCCESS,
                res.__('wellbeingListSuccess'),
              );
            case REPORT_TYPE.WEEKLY:
              dateFrom.setDate(dateFrom.getDate() - MOOD_REPORT.NUMBER_OF_WEEKS * 7);
              dateFrom = getFirstDayOfWeek(dateFrom);
              const weeklyQuery = [
                {
                  $match: {
                    user_id: toObjectId(reqParam.userId),
                    deletedAt: null,
                    positivity: {
                      $exists: true,
                    },
                    createdAt: {
                      $gte: dateFrom,
                      $lt: dateTo
                    }
                  }
                },
                {
                  $addFields: {
                    weekStart: {
                      $dateFromParts: {
                        isoWeekYear: { $isoWeekYear: '$createdAt' },
                        isoWeek: { $isoWeek: '$createdAt' },
                        isoDayOfWeek: 0
                      }
                    }
                  }
                },
                {
                  $group: {
                    _id: '$weekStart',
                    positiveCounts: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$positivity', true] }, // Check if 'positivity' is true
                          then: 1,
                          else: 0
                        }
                      }
                    },
                    negativeCounts: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$positivity', false] }, // Check if 'positivity' is true
                          then: 1,
                          else: 0
                        }
                      }
                    },
                    createdAt: {
                      $first: '$createdAt'
                    }
                  }
                }
              ];
              const weeklyData = await ProfessionalMood.aggregate(weeklyQuery);
              const dateRange = [dateFrom];
              for (let x = 0; x <= 5; x++) {
                dateFrom = new Date(dateFrom);
                dateFrom.setDate(dateFrom.getDate() + 7);
                dateRange.push(dateFrom);
              }
              let numberOfWeek = 1;
              dateRange.map((el) => {
                const data = weeklyData.filter((x) => x._id.toString() === el.toString());
                const tempObj = {
                  interval: numberOfWeek,
                  positive: data.length > 0 ? data[0].positiveCounts : 0,
                  negative: data.length > 0 ? data[0].negativeCounts : 0,
                };
                moodData.push(tempObj);
                numberOfWeek += 1;
              });
              return Response.successResponseData(
                res,
                moodData,
                SUCCESS,
                res.__('wellbeingListSuccess'),
              );
            case REPORT_TYPE.MONTHLY:
              dateFrom.setMonth(dateFrom.getMonth() - MOOD_REPORT.NUMBER_OF_MONTHS);
              dateFrom = getFirstDayOfMonth(dateFrom);
              const monthlyQuery = [
                {
                  $match: {
                    user_id: toObjectId(reqParam.userId),
                    deletedAt: null,
                    positivity: {
                      $exists: true,
                    },
                    createdAt: {
                      $gte: dateFrom,
                      $lt: dateTo
                    }
                  }
                },
                {
                  $addFields: {
                    monthStart: {
                      $dateFromString: {
                        dateString: {
                          $dateToString: {
                            format: '%Y-%m-01',
                            date: new Date()
                          }
                        }
                      }
                    }
                  }
                },
                {
                  $group: {
                    _id: '$monthStart',
                    positiveCounts: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$positivity', true] }, // Check if 'positivity' is true
                          then: 1,
                          else: 0
                        }
                      }
                    },
                    negativeCounts: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$positivity', false] }, // Check if 'positivity' is true
                          then: 1,
                          else: 0
                        }
                      }
                    },
                    createdAt: {
                      $first: '$createdAt'
                    }
                  }
                }
              ];
              const monthlyData = await ProfessionalMood.aggregate(monthlyQuery);
              const monthRange = [dateFrom];
              for (let x = 0; x <= 5; x++) {
                dateFrom = new Date(dateFrom);
                dateFrom.setMonth(dateFrom.getMonth() + 1);
                monthRange.push(dateFrom);
              }
              let numberOfMonth = 1;
              monthRange.map((date) => {
                const data = monthlyData.filter((x) => x._id.toString() === date.toString());
                const tempObj = {
                  interval: numberOfMonth,
                  positive: data.length > 0 ? data[0].positiveCounts : 0,
                  negative: data.length > 0 ? data[0].negativeCounts : 0,
                };
                moodData.push(tempObj);
                numberOfMonth += 1;
              });
              return Response.successResponseData(
                res,
                moodData,
                SUCCESS,
                res.__('wellbeingListSuccess'),
              );
            case REPORT_TYPE.YEARLY:
              dateFrom.setFullYear(dateFrom.getFullYear() - MOOD_REPORT.NUMBER_OF_YEARS);
              dateFrom = getFirstDayOfMonth(dateFrom);
              const yearlyQuery = [
                {
                  $match: {
                    user_id: toObjectId(reqParam.userId),
                    deletedAt: null,
                    positivity: {
                      $exists: true,
                    },
                    createdAt: {
                      $gte: dateFrom,
                      $lt: dateTo
                    }
                  }
                },
                {
                  $addFields: {
                    year: {
                      $year: '$createdAt'
                    }
                  }
                },
                {
                  $group: {
                    _id: '$year',
                    positiveCounts: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$positivity', true] }, // Check if 'positivity' is true
                          then: 1,
                          else: 0
                        }
                      }
                    },
                    negativeCounts: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$positivity', false] }, // Check if 'positivity' is true
                          then: 1,
                          else: 0
                        }
                      }
                    },
                    createdAt: {
                      $first: '$createdAt'
                    }
                  }
                }
              ];
              const yearlyData = await ProfessionalMood.aggregate(yearlyQuery);
              const yearRange = [dateFrom.getFullYear()];
              for (let x = 0; x <= 1; x++) {
                dateFrom = new Date(dateFrom);
                dateFrom.setFullYear(dateFrom.getFullYear() + 1);
                yearRange.push(dateFrom.getFullYear());
              }
              let numberOfYears = 1;
              yearRange.map((date) => {
                const data = yearlyData.filter((x) => x._id === date);
                const tempObj = {
                  interval: numberOfYears,
                  positive: data.length > 0 ? data[0].positiveCounts : 0,
                  negative: data.length > 0 ? data[0].negativeCounts : 0,
                };
                moodData.push(tempObj);
                numberOfYears += 1;
              });
              return Response.successResponseData(
                res,
                moodData,
                SUCCESS,
                res.__('wellbeingListSuccess'),
              );
            default:
              return Response.successResponseWithoutData(res, res.__('noTypeCase'), FAIL);
          }
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  userWellbeingPersonalData: (req, res) => {
    try {
      const reqParam = req.query;
      userMoodReportValidation(reqParam, res, async (validate) => {
        if (validate) {
          let dateFrom = currentDateOnly();
          let dateTo = currentDateOnly();
          const moodData = [];

          dateTo.setDate(dateTo.getDate() + 1);
          switch (parseInt(reqParam.reportType)) {
            case REPORT_TYPE.DAILY:
              dateFrom = currentDateOnly();
              dateTo = currentDateOnly();
              dateTo.setDate(dateFrom.getDate() + 1);
              dateFrom = getFirstDayOfMonth(dateFrom);
              const filterCondition = [
                {
                  $match: {
                    user_id: toObjectId(reqParam.userId),
                    createdAt: {
                      $gte: dateFrom,
                      $lt: dateTo
                    },
                    positivity: {
                      $exists: true,
                    },
                    deletedAt: null
                  }
                },
                {
                  $addFields: {
                    date: {
                      $dateToString: {
                        format: '%Y-%m-%d',
                        date: '$createdAt'
                      }
                    }
                  }
                },
                {
                  $group: {
                    _id: '$date',
                    positiveCounts: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$positivity', true] }, // Check if 'positivity' is true
                          then: 1,
                          else: 0
                        }
                      }
                    },
                    negativeCounts: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$positivity', false] }, // Check if 'positivity' is true
                          then: 1,
                          else: 0
                        }
                      }
                    },
                    createdAt: {
                      $first: '$createdAt'
                    }
                  }
                }
              ];
              const dailyMood = await Mood.aggregate(filterCondition);
              const dayRange = [dateFrom];
              for (let i = 1; i < dateTo.getDate() - 1; i++) {
                dateFrom = new Date(dateFrom);
                dateFrom.setDate(dateFrom.getDate() + 1);
                dayRange.push(dateFrom);
              }
              let numberOfDays = 1;
              dayRange.forEach((date) => {
                const data = dailyMood.filter(
                  (x) => x.createdAt.getDate().toString() === date.getDate().toString()
                );
                const tempObj = {
                  interval: numberOfDays,
                  positive: data.length > 0 ? data[0].positiveCounts : 0,
                  negative: data.length > 0 ? data[0].negativeCounts : 0,
                };
                moodData.push(tempObj);
                numberOfDays += 1;
              });
              return Response.successResponseData(
                res,
                moodData,
                SUCCESS,
                res.__('wellbeingListSuccess'),
              );
            case REPORT_TYPE.WEEKLY:
              dateFrom.setDate(dateFrom.getDate() - MOOD_REPORT.NUMBER_OF_WEEKS * 7);
              dateFrom = getFirstDayOfWeek(dateFrom);
              const weeklyQuery = [
                {
                  $match: {
                    user_id: toObjectId(reqParam.userId),
                    deletedAt: null,
                    positivity: {
                      $exists: true,
                    },
                    createdAt: {
                      $gte: dateFrom,
                      $lt: dateTo
                    }
                  }
                },
                {
                  $addFields: {
                    weekStart: {
                      $dateFromParts: {
                        isoWeekYear: { $isoWeekYear: '$createdAt' },
                        isoWeek: { $isoWeek: '$createdAt' },
                        isoDayOfWeek: 0
                      }
                    }
                  }
                },
                {
                  $group: {
                    _id: '$weekStart',
                    positiveCounts: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$positivity', true] }, // Check if 'positivity' is true
                          then: 1,
                          else: 0
                        }
                      }
                    },
                    negativeCounts: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$positivity', false] }, // Check if 'positivity' is true
                          then: 1,
                          else: 0
                        }
                      }
                    },
                    createdAt: {
                      $first: '$createdAt'
                    }
                  }
                }
              ];
              const weeklyData = await Mood.aggregate(weeklyQuery);
              const dateRange = [dateFrom];
              for (let x = 0; x <= 5; x++) {
                dateFrom = new Date(dateFrom);
                dateFrom.setDate(dateFrom.getDate() + 7);
                dateRange.push(dateFrom);
              }
              let numberOfWeek = 1;
              dateRange.map((el) => {
                const data = weeklyData.filter((x) => x._id.toString() === el.toString());
                const tempObj = {
                  interval: numberOfWeek,
                  positive: data.length > 0 ? data[0].positiveCounts : 0,
                  negative: data.length > 0 ? data[0].negativeCounts : 0,
                };
                moodData.push(tempObj);
                numberOfWeek += 1;
              });
              return Response.successResponseData(
                res,
                moodData,
                SUCCESS,
                res.__('wellbeingListSuccess'),
              );
            case REPORT_TYPE.MONTHLY:
              dateFrom.setMonth(dateFrom.getMonth() - MOOD_REPORT.NUMBER_OF_MONTHS);
              dateFrom = getFirstDayOfMonth(dateFrom);
              const monthlyQuery = [
                {
                  $match: {
                    user_id: toObjectId(reqParam.userId),
                    deletedAt: null,
                    positivity: {
                      $exists: true,
                    },
                    createdAt: {
                      $gte: dateFrom,
                      $lt: dateTo
                    }
                  }
                },
                {
                  $addFields: {
                    monthStart: {
                      $dateFromString: {
                        dateString: {
                          $dateToString: {
                            format: '%Y-%m-01',
                            date: new Date()
                          }
                        }
                      }
                    }
                  }
                },
                {
                  $group: {
                    _id: '$monthStart',
                    positiveCounts: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$positivity', true] }, // Check if 'positivity' is true
                          then: 1,
                          else: 0
                        }
                      }
                    },
                    negativeCounts: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$positivity', false] }, // Check if 'positivity' is true
                          then: 1,
                          else: 0
                        }
                      }
                    },
                    createdAt: {
                      $first: '$createdAt'
                    }
                  }
                }
              ];
              const monthlyData = await Mood.aggregate(monthlyQuery);
              const monthRange = [dateFrom];
              for (let x = 0; x <= 5; x++) {
                dateFrom = new Date(dateFrom);
                dateFrom.setMonth(dateFrom.getMonth() + 1);
                monthRange.push(dateFrom);
              }
              let numberOfMonth = 1;
              monthRange.map((date) => {
                const data = monthlyData.filter((x) => x._id.toString() === date.toString());
                const tempObj = {
                  interval: numberOfMonth,
                  positive: data.length > 0 ? data[0].positiveCounts : 0,
                  negative: data.length > 0 ? data[0].negativeCounts : 0,
                };
                moodData.push(tempObj);
                numberOfMonth += 1;
              });
              return Response.successResponseData(
                res,
                moodData,
                SUCCESS,
                res.__('wellbeingListSuccess'),
              );
            case REPORT_TYPE.YEARLY:
              dateFrom.setFullYear(dateFrom.getFullYear() - MOOD_REPORT.NUMBER_OF_YEARS);
              dateFrom = getFirstDayOfMonth(dateFrom);
              const yearlyQuery = [
                {
                  $match: {
                    user_id: toObjectId(reqParam.userId),
                    deletedAt: null,
                    positivity: {
                      $exists: true,
                    },
                    createdAt: {
                      $gte: dateFrom,
                      $lt: dateTo
                    }
                  }
                },
                {
                  $addFields: {
                    year: {
                      $year: '$createdAt'
                    }
                  }
                },
                {
                  $group: {
                    _id: '$year',
                    positiveCounts: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$positivity', true] }, // Check if 'positivity' is true
                          then: 1,
                          else: 0
                        }
                      }
                    },
                    negativeCounts: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$positivity', false] }, // Check if 'positivity' is true
                          then: 1,
                          else: 0
                        }
                      }
                    },
                    createdAt: {
                      $first: '$createdAt'
                    }
                  }
                }
              ];
              const yearlyData = await Mood.aggregate(yearlyQuery);
              const yearRange = [dateFrom.getFullYear()];
              for (let x = 0; x <= 1; x++) {
                dateFrom = new Date(dateFrom);
                dateFrom.setFullYear(dateFrom.getFullYear() + 1);
                yearRange.push(dateFrom.getFullYear());
              }
              let numberOfYears = 1;
              yearRange.map((date) => {
                const data = yearlyData.filter((x) => x._id === date);
                const tempObj = {
                  interval: numberOfYears,
                  positive: data.length > 0 ? data[0].positiveCounts : 0,
                  negative: data.length > 0 ? data[0].negativeCounts : 0,
                };
                moodData.push(tempObj);
                numberOfYears += 1;
              });
              return Response.successResponseData(
                res,
                moodData,
                SUCCESS,
                res.__('wellbeingListSuccess'),
              );
            default:
              return Response.successResponseWithoutData(res, res.__('noTypeCase'), FAIL);
          }
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  userWellbeingShuruData: (req, res) => {
    try {
      const reqParam = req.query;
      userMoodReportValidation(reqParam, res, async (validate) => {
        if (validate) {
          let dateFrom = currentDateOnly();
          let dateTo = currentDateOnly();
          const moodData = [];

          dateTo.setDate(dateTo.getDate() + 1);
          switch (parseInt(reqParam.reportType)) {
            case REPORT_TYPE.DAILY:
              dateFrom = currentDateOnly();
              dateTo = currentDateOnly();
              dateTo.setDate(dateFrom.getDate() + 1);
              dateFrom = getFirstDayOfMonth(dateFrom);
              const filterCondition = [
                {
                  $match: {
                    userId: reqParam.userId,
                    createdAt: {
                      $gte: dateFrom,
                      $lt: dateTo
                    },
                    positivity: {
                      $exists: true,
                    },
                  }
                },
                {
                  $addFields: {
                    date: {
                      $dateToString: {
                        format: '%Y-%m-%d',
                        date: '$createdAt'
                      }
                    }
                  }
                },
                {
                  $group: {
                    _id: '$date',
                    positiveCounts: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$positivity', true] }, // Check if 'positivity' is true
                          then: 1,
                          else: 0
                        }
                      }
                    },
                    negativeCounts: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$positivity', false] }, // Check if 'positivity' is true
                          then: 1,
                          else: 0
                        }
                      }
                    },
                    createdAt: {
                      $first: '$createdAt'
                    }
                  }
                }
              ];
              const dailyMood = await Conversation.aggregate(filterCondition);
              const dayRange = [dateFrom];
              for (let i = 1; i < dateTo.getDate() - 1; i++) {
                dateFrom = new Date(dateFrom);
                dateFrom.setDate(dateFrom.getDate() + 1);
                dayRange.push(dateFrom);
              }
              let numberOfDays = 1;
              dayRange.forEach((date) => {
                const data = dailyMood.filter(
                  (x) => x.createdAt.getDate().toString() === date.getDate().toString()
                );
                const tempObj = {
                  interval: numberOfDays,
                  positive: data.length > 0 ? Math.round(data[0].positiveCounts / 2) : 0,
                  negative: data.length > 0 ? Math.round(data[0].negativeCounts / 2) : 0,
                };
                moodData.push(tempObj);
                numberOfDays += 1;
              });
              return Response.successResponseData(
                res,
                moodData,
                SUCCESS,
                res.__('wellbeingListSuccess'),
              );
            case REPORT_TYPE.WEEKLY:
              dateFrom.setDate(dateFrom.getDate() - MOOD_REPORT.NUMBER_OF_WEEKS * 7);
              dateFrom = getFirstDayOfWeek(dateFrom);
              const weeklyQuery = [
                {
                  $match: {
                    userId: reqParam.userId,
                    positivity: {
                      $exists: true,
                    },
                    createdAt: {
                      $gte: dateFrom,
                      $lt: dateTo
                    }
                  }
                },
                {
                  $addFields: {
                    weekStart: {
                      $dateFromParts: {
                        isoWeekYear: { $isoWeekYear: '$createdAt' },
                        isoWeek: { $isoWeek: '$createdAt' },
                        isoDayOfWeek: 0
                      }
                    }
                  }
                },
                {
                  $group: {
                    _id: '$weekStart',
                    positiveCounts: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$positivity', true] }, // Check if 'positivity' is true
                          then: 1,
                          else: 0
                        }
                      }
                    },
                    negativeCounts: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$positivity', false] }, // Check if 'positivity' is true
                          then: 1,
                          else: 0
                        }
                      }
                    },
                    createdAt: {
                      $first: '$createdAt'
                    }
                  }
                }
              ];
              const weeklyData = await Conversation.aggregate(weeklyQuery);
              const dateRange = [dateFrom];
              for (let x = 0; x <= 5; x++) {
                dateFrom = new Date(dateFrom);
                dateFrom.setDate(dateFrom.getDate() + 7);
                dateRange.push(dateFrom);
              }
              let numberOfWeek = 1;
              dateRange.map((el) => {
                const data = weeklyData.filter((x) => x._id.toString() === el.toString());
                const tempObj = {
                  interval: numberOfWeek,
                  positive: data.length > 0 ? Math.round(data[0].positiveCounts / 2) : 0,
                  negative: data.length > 0 ? Math.round(data[0].negativeCounts / 2) : 0,
                };
                moodData.push(tempObj);
                numberOfWeek += 1;
              });
              return Response.successResponseData(
                res,
                moodData,
                SUCCESS,
                res.__('wellbeingListSuccess'),
              );
            case REPORT_TYPE.MONTHLY:
              dateFrom.setMonth(dateFrom.getMonth() - MOOD_REPORT.NUMBER_OF_MONTHS);
              dateFrom = getFirstDayOfMonth(dateFrom);
              const monthlyQuery = [
                {
                  $match: {
                    userId: reqParam.userId,
                    positivity: {
                      $exists: true,
                    },
                    createdAt: {
                      $gte: dateFrom,
                      $lt: dateTo
                    }
                  }
                },
                {
                  $addFields: {
                    monthStart: {
                      $dateFromString: {
                        dateString: {
                          $dateToString: {
                            format: '%Y-%m-01',
                            date: new Date()
                          }
                        }
                      }
                    }
                  }
                },
                {
                  $group: {
                    _id: '$monthStart',
                    positiveCounts: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$positivity', true] }, // Check if 'positivity' is true
                          then: 1,
                          else: 0
                        }
                      }
                    },
                    negativeCounts: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$positivity', false] }, // Check if 'positivity' is true
                          then: 1,
                          else: 0
                        }
                      }
                    },
                    createdAt: {
                      $first: '$createdAt'
                    }
                  }
                }
              ];
              const monthlyData = await Conversation.aggregate(monthlyQuery);
              const monthRange = [dateFrom];
              for (let x = 0; x <= 5; x++) {
                dateFrom = new Date(dateFrom);
                dateFrom.setMonth(dateFrom.getMonth() + 1);
                monthRange.push(dateFrom);
              }
              let numberOfMonth = 1;
              monthRange.map((date) => {
                const data = monthlyData.filter((x) => x._id.toString() === date.toString());
                const tempObj = {
                  interval: numberOfMonth,
                  positive: data.length > 0 ? Math.round(data[0].positiveCounts / 2) : 0,
                  negative: data.length > 0 ? Math.round(data[0].negativeCounts / 2) : 0,
                };
                moodData.push(tempObj);
                numberOfMonth += 1;
              });
              return Response.successResponseData(
                res,
                moodData,
                SUCCESS,
                res.__('wellbeingListSuccess'),
              );
            case REPORT_TYPE.YEARLY:
              dateFrom.setFullYear(dateFrom.getFullYear() - MOOD_REPORT.NUMBER_OF_YEARS);
              dateFrom = getFirstDayOfMonth(dateFrom);
              const yearlyQuery = [
                {
                  $match: {
                    userId: reqParam.userId,
                    positivity: {
                      $exists: true,
                    },
                    createdAt: {
                      $gte: dateFrom,
                      $lt: dateTo
                    }
                  }
                },
                {
                  $addFields: {
                    year: {
                      $year: '$createdAt'
                    }
                  }
                },
                {
                  $group: {
                    _id: '$year',
                    positiveCounts: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$positivity', true] }, // Check if 'positivity' is true
                          then: 1,
                          else: 0
                        }
                      }
                    },
                    negativeCounts: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$positivity', false] }, // Check if 'positivity' is true
                          then: 1,
                          else: 0
                        }
                      }
                    },
                    createdAt: {
                      $first: '$createdAt'
                    }
                  }
                }
              ];
              const yearlyData = await Conversation.aggregate(yearlyQuery);
              const yearRange = [dateFrom.getFullYear()];
              for (let x = 0; x <= 1; x++) {
                dateFrom = new Date(dateFrom);
                dateFrom.setFullYear(dateFrom.getFullYear() + 1);
                yearRange.push(dateFrom.getFullYear());
              }
              let numberOfYears = 1;
              yearRange.map((date) => {
                const data = yearlyData.filter((x) => x._id === date);
                const tempObj = {
                  interval: numberOfYears,
                  positive: data.length > 0 ? Math.round(data[0].positiveCounts / 2) : 0,
                  negative: data.length > 0 ? Math.round(data[0].negativeCounts / 2) : 0,
                };
                moodData.push(tempObj);
                numberOfYears += 1;
              });
              return Response.successResponseData(
                res,
                moodData,
                SUCCESS,
                res.__('wellbeingListSuccess'),
              );
            default:
              return Response.successResponseWithoutData(res, res.__('noTypeCase'), FAIL);
          }
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  userWellbeingJournalData: (req, res) => {
    try {
      const reqParam = req.query;
      userMoodReportValidation(reqParam, res, async (validate) => {
        if (validate) {
          let dateFrom = currentDateOnly();
          let dateTo = currentDateOnly();
          const moodData = [];

          dateTo.setDate(dateTo.getDate() + 1);
          switch (parseInt(reqParam.reportType)) {
            case REPORT_TYPE.DAILY:
              dateFrom = currentDateOnly();
              dateTo = currentDateOnly();
              dateTo.setDate(dateFrom.getDate() + 1);
              dateFrom = getFirstDayOfMonth(dateFrom);
              const filterCondition = [
                {
                  $match: {
                    user_id: toObjectId(reqParam.userId),
                    createdAt: {
                      $gte: dateFrom,
                      $lt: dateTo
                    },
                    positivity: {
                      $exists: true,
                    },
                  }
                },
                {
                  $addFields: {
                    date: {
                      $dateToString: {
                        format: '%Y-%m-%d',
                        date: '$createdAt'
                      }
                    }
                  }
                },
                {
                  $group: {
                    _id: '$date',
                    positiveCounts: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$positivity', true] }, // Check if 'positivity' is true
                          then: 1,
                          else: 0
                        }
                      }
                    },
                    negativeCounts: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$positivity', false] }, // Check if 'positivity' is true
                          then: 1,
                          else: 0
                        }
                      }
                    },
                    createdAt: {
                      $first: '$createdAt'
                    }
                  }
                }
              ];
              const dailyMood = await Cleanse.aggregate(filterCondition);
              const dailyGratitude = await UserGratitude.aggregate(filterCondition);
              const dailyAffirmation = await UserAffirmation.aggregate(filterCondition);
              const dailyNotes = await UserNotes.aggregate(filterCondition);
              const dailyGoals = await Goals.aggregate(filterCondition);

              const dayRange = [dateFrom];
              for (let i = 1; i < dateTo.getDate() - 1; i++) {
                dateFrom = new Date(dateFrom);
                dateFrom.setDate(dateFrom.getDate() + 1);
                dayRange.push(dateFrom);
              }
              let numberOfDays = 1;
              dayRange.forEach((date) => {
                const data1 = dailyMood.filter(
                  (x) => x.createdAt.getDate().toString() === date.getDate().toString()
                );
                const data2 = dailyGratitude.filter(
                  (x) => x.createdAt.getDate().toString() === date.getDate().toString()
                );
                const data3 = dailyAffirmation.filter(
                  (x) => x.createdAt.getDate().toString() === date.getDate().toString()
                );
                const data4 = dailyNotes.filter(
                  (x) => x.createdAt.getDate().toString() === date.getDate().toString()
                );
                const data5 = dailyGoals.filter(
                  (x) => x.createdAt.getDate().toString() === date.getDate().toString()
                );
                const tempObj = {
                  interval: numberOfDays,
                  cleansePositive: data1.length > 0 ? data1[0].positiveCounts : 0,
                  cleanseNegative: data1.length > 0 ? data1[0].negativeCounts : 0,
                  gratitudePositive: data2.length > 0 ? data2[0].positiveCounts : 0,
                  gratitudeNegative: data2.length > 0 ? data2[0].negativeCounts : 0,
                  affirmationsPositive: data3.length > 0 ? data3[0].positiveCounts : 0,
                  affirmationsNegative: data3.length > 0 ? data3[0].negativeCounts : 0,
                  notesPositive: data4.length > 0 ? data4[0].positiveCounts : 0,
                  notesNegative: data4.length > 0 ? data4[0].negativeCounts : 0,
                  goalsPositive: data5.length > 0 ? data5[0].positiveCounts : 0,
                  goalsNegative: data5.length > 0 ? data5[0].negativeCounts : 0,
                };
                moodData.push(tempObj);
                numberOfDays += 1;
              });
              return Response.successResponseData(
                res,
                moodData,
                SUCCESS,
                res.__('wellbeingListSuccess'),
              );
            case REPORT_TYPE.WEEKLY:
              dateFrom.setDate(dateFrom.getDate() - MOOD_REPORT.NUMBER_OF_WEEKS * 7);
              dateFrom = getFirstDayOfWeek(dateFrom);
              const weeklyQuery = [
                {
                  $match: {
                    user_id: toObjectId(reqParam.userId),
                    positivity: {
                      $exists: true,
                    },
                    createdAt: {
                      $gte: dateFrom,
                      $lt: dateTo
                    }
                  }
                },
                {
                  $addFields: {
                    weekStart: {
                      $dateFromParts: {
                        isoWeekYear: { $isoWeekYear: '$createdAt' },
                        isoWeek: { $isoWeek: '$createdAt' },
                        isoDayOfWeek: 0
                      }
                    }
                  }
                },
                {
                  $group: {
                    _id: '$weekStart',
                    positiveCounts: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$positivity', true] }, // Check if 'positivity' is true
                          then: 1,
                          else: 0
                        }
                      }
                    },
                    negativeCounts: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$positivity', false] }, // Check if 'positivity' is true
                          then: 1,
                          else: 0
                        }
                      }
                    },
                    createdAt: {
                      $first: '$createdAt'
                    }
                  }
                }
              ];
              const weeklyMood = await Cleanse.aggregate(weeklyQuery);
              const weeklyGratitude = await UserGratitude.aggregate(weeklyQuery);
              const weeklyAffirmation = await UserAffirmation.aggregate(weeklyQuery);
              const weeklyNotes = await UserNotes.aggregate(weeklyQuery);
              const weeklyGoals = await Goals.aggregate(weeklyQuery);

              const dateRange = [dateFrom];
              for (let x = 0; x <= 5; x++) {
                dateFrom = new Date(dateFrom);
                dateFrom.setDate(dateFrom.getDate() + 7);
                dateRange.push(dateFrom);
              }
              let numberOfWeek = 1;
              dateRange.map((el) => {
                const data1 = weeklyMood.filter((x) => x._id.toString() === el.toString());
                const data2 = weeklyGratitude.filter((x) => x._id.toString() === el.toString());
                const data3 = weeklyAffirmation.filter((x) => x._id.toString() === el.toString());
                const data4 = weeklyNotes.filter((x) => x._id.toString() === el.toString());
                const data5 = weeklyGoals.filter((x) => x._id.toString() === el.toString());

                const tempObj = {
                  interval: numberOfWeek,
                  cleansePositive: data1.length > 0 ? data1[0].positiveCounts : 0,
                  cleanseNegative: data1.length > 0 ? data1[0].negativeCounts : 0,
                  gratitudePositive: data2.length > 0 ? data2[0].positiveCounts : 0,
                  gratitudeNegative: data2.length > 0 ? data2[0].negativeCounts : 0,
                  affirmationsPositive: data3.length > 0 ? data3[0].positiveCounts : 0,
                  affirmationsNegative: data3.length > 0 ? data3[0].negativeCounts : 0,
                  notesPositive: data4.length > 0 ? data4[0].positiveCounts : 0,
                  notesNegative: data4.length > 0 ? data4[0].negativeCounts : 0,
                  goalsPositive: data5.length > 0 ? data5[0].positiveCounts : 0,
                  goalsNegative: data5.length > 0 ? data5[0].negativeCounts : 0,
                };
                moodData.push(tempObj);
                numberOfWeek += 1;
              });
              return Response.successResponseData(
                res,
                moodData,
                SUCCESS,
                res.__('wellbeingListSuccess'),
              );
            case REPORT_TYPE.MONTHLY:
              dateFrom.setMonth(dateFrom.getMonth() - MOOD_REPORT.NUMBER_OF_MONTHS);
              dateFrom = getFirstDayOfMonth(dateFrom);
              const monthlyQuery = [
                {
                  $match: {
                    user_id: toObjectId(reqParam.userId),
                    positivity: {
                      $exists: true,
                    },
                    createdAt: {
                      $gte: dateFrom,
                      $lt: dateTo
                    }
                  }
                },
                {
                  $addFields: {
                    monthStart: {
                      $dateFromString: {
                        dateString: {
                          $dateToString: {
                            format: '%Y-%m-01',
                            date: new Date()
                          }
                        }
                      }
                    }
                  }
                },
                {
                  $group: {
                    _id: '$monthStart',
                    positiveCounts: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$positivity', true] }, // Check if 'positivity' is true
                          then: 1,
                          else: 0
                        }
                      }
                    },
                    negativeCounts: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$positivity', false] }, // Check if 'positivity' is true
                          then: 1,
                          else: 0
                        }
                      }
                    },
                    createdAt: {
                      $first: '$createdAt'
                    }
                  }
                }
              ];
              const monthlyMood = await Cleanse.aggregate(monthlyQuery);
              const monthlyGratitude = await UserGratitude.aggregate(monthlyQuery);
              const monthlyAffirmation = await UserAffirmation.aggregate(monthlyQuery);
              const monthlyNotes = await UserNotes.aggregate(monthlyQuery);
              const monthlyGoals = await Goals.aggregate(monthlyQuery);

              const monthRange = [dateFrom];
              for (let x = 0; x <= 5; x++) {
                dateFrom = new Date(dateFrom);
                dateFrom.setMonth(dateFrom.getMonth() + 1);
                monthRange.push(dateFrom);
              }
              let numberOfMonth = 1;
              monthRange.map((date) => {
                const data1 = monthlyMood.filter((x) => x._id.toString() === date.toString());
                const data2 = monthlyGratitude.filter((x) => x._id.toString() === date.toString());
                const data3 = monthlyAffirmation.filter((x) => x._id.toString() === date.toString());
                const data4 = monthlyNotes.filter((x) => x._id.toString() === date.toString());
                const data5 = monthlyGoals.filter((x) => x._id.toString() === date.toString());

                const tempObj = {
                  interval: numberOfMonth,
                  cleansePositive: data1.length > 0 ? data1[0].positiveCounts : 0,
                  cleanseNegative: data1.length > 0 ? data1[0].negativeCounts : 0,
                  gratitudePositive: data2.length > 0 ? data2[0].positiveCounts : 0,
                  gratitudeNegative: data2.length > 0 ? data2[0].negativeCounts : 0,
                  affirmationsPositive: data3.length > 0 ? data3[0].positiveCounts : 0,
                  affirmationsNegative: data3.length > 0 ? data3[0].negativeCounts : 0,
                  notesPositive: data4.length > 0 ? data4[0].positiveCounts : 0,
                  notesNegative: data4.length > 0 ? data4[0].negativeCounts : 0,
                  goalsPositive: data5.length > 0 ? data5[0].positiveCounts : 0,
                  goalsNegative: data5.length > 0 ? data5[0].negativeCounts : 0,
                };
                moodData.push(tempObj);
                numberOfMonth += 1;
              });
              return Response.successResponseData(
                res,
                moodData,
                SUCCESS,
                res.__('wellbeingListSuccess'),
              );
            case REPORT_TYPE.YEARLY:
              dateFrom.setFullYear(dateFrom.getFullYear() - MOOD_REPORT.NUMBER_OF_YEARS);
              dateFrom = getFirstDayOfMonth(dateFrom);
              const yearlyQuery = [
                {
                  $match: {
                    user_id: toObjectId(reqParam.userId),
                    positivity: {
                      $exists: true,
                    },
                    createdAt: {
                      $gte: dateFrom,
                      $lt: dateTo
                    }
                  }
                },
                {
                  $addFields: {
                    year: {
                      $year: '$createdAt'
                    }
                  }
                },
                {
                  $group: {
                    _id: '$year',
                    positiveCounts: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$positivity', true] }, // Check if 'positivity' is true
                          then: 1,
                          else: 0
                        }
                      }
                    },
                    negativeCounts: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$positivity', false] }, // Check if 'positivity' is true
                          then: 1,
                          else: 0
                        }
                      }
                    },
                    createdAt: {
                      $first: '$createdAt'
                    }
                  }
                }
              ];
              const yearlyMood = await Cleanse.aggregate(yearlyQuery);
              const yearlyGratitude = await UserGratitude.aggregate(yearlyQuery);
              const yearlyAffirmation = await UserAffirmation.aggregate(yearlyQuery);
              const yearlyNotes = await UserNotes.aggregate(yearlyQuery);
              const yearlyGoals = await Goals.aggregate(yearlyQuery);

              const yearRange = [dateFrom.getFullYear()];
              for (let x = 0; x <= 1; x++) {
                dateFrom = new Date(dateFrom);
                dateFrom.setFullYear(dateFrom.getFullYear() + 1);
                yearRange.push(dateFrom.getFullYear());
              }
              let numberOfYears = 1;
              yearRange.map((date) => {
                const data1 = yearlyMood.filter((x) => x._id === date);
                const data2 = yearlyGratitude.filter((x) => x._id === date);
                const data3 = yearlyAffirmation.filter((x) => x._id === date);
                const data4 = yearlyNotes.filter((x) => x._id === date);
                const data5 = yearlyGoals.filter((x) => x._id === date);

                const tempObj = {
                  interval: numberOfYears,
                  cleansePositive: data1.length > 0 ? data1[0].positiveCounts : 0,
                  cleanseNegative: data1.length > 0 ? data1[0].negativeCounts : 0,
                  gratitudePositive: data2.length > 0 ? data2[0].positiveCounts : 0,
                  gratitudeNegative: data2.length > 0 ? data2[0].negativeCounts : 0,
                  affirmationsPositive: data3.length > 0 ? data3[0].positiveCounts : 0,
                  affirmationsNegative: data3.length > 0 ? data3[0].negativeCounts : 0,
                  notesPositive: data4.length > 0 ? data4[0].positiveCounts : 0,
                  notesNegative: data4.length > 0 ? data4[0].negativeCounts : 0,
                  goalsPositive: data5.length > 0 ? data5[0].positiveCounts : 0,
                  goalsNegative: data5.length > 0 ? data5[0].negativeCounts : 0,
                };
                moodData.push(tempObj);
                numberOfYears += 1;
              });
              return Response.successResponseData(
                res,
                moodData,
                SUCCESS,
                res.__('wellbeingListSuccess'),
              );
            default:
              return Response.successResponseWithoutData(res, res.__('noTypeCase'), FAIL);
          }
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  overallWellbeingProfessionalData: (req, res) => {
    try {
      const reqParam = req.query;
      overallMoodReportValidation(reqParam, res, async (validate) => {
        if (validate) {
          let dateFrom = currentDateOnly();
          let dateTo = currentDateOnly();
          const moodData = [];

          dateTo.setDate(dateTo.getDate() + 1);
          switch (parseInt(reqParam.reportType)) {
            case REPORT_TYPE.DAILY:
              dateFrom = currentDateOnly();
              dateTo = currentDateOnly();
              dateTo.setDate(dateFrom.getDate() + 1);
              dateFrom = getFirstDayOfMonth(dateFrom);
              const filterCondition = [
                {
                  $match: {
                    createdAt: {
                      $gte: dateFrom,
                      $lt: dateTo
                    },
                    positivity: {
                      $exists: true,
                    },
                    deletedAt: null
                  }
                },
                {
                  $addFields: {
                    date: {
                      $dateToString: {
                        format: '%Y-%m-%d',
                        date: '$createdAt'
                      }
                    }
                  }
                },
                {
                  $group: {
                    _id: '$date',
                    positiveCounts: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$positivity', true] }, // Check if 'positivity' is true
                          then: 1,
                          else: 0
                        }
                      }
                    },
                    negativeCounts: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$positivity', false] }, // Check if 'positivity' is true
                          then: 1,
                          else: 0
                        }
                      }
                    },
                    createdAt: {
                      $first: '$createdAt'
                    }
                  }
                }
              ];
              const dailyMood = await ProfessionalMood.aggregate(filterCondition);
              const dayRange = [dateFrom];
              for (let i = 1; i < dateTo.getDate() - 1; i++) {
                dateFrom = new Date(dateFrom);
                dateFrom.setDate(dateFrom.getDate() + 1);
                dayRange.push(dateFrom);
              }
              let numberOfDays = 1;
              dayRange.forEach((date) => {
                const data = dailyMood.filter(
                  (x) => x.createdAt.getDate().toString() === date.getDate().toString()
                );
                const tempObj = {
                  interval: numberOfDays,
                  positive: data.length > 0 ? data[0].positiveCounts : 0,
                  negative: data.length > 0 ? data[0].negativeCounts : 0,
                };
                moodData.push(tempObj);
                numberOfDays += 1;
              });
              return Response.successResponseData(
                res,
                moodData,
                SUCCESS,
                res.__('wellbeingListSuccess'),
              );
            case REPORT_TYPE.WEEKLY:
              dateFrom.setDate(dateFrom.getDate() - MOOD_REPORT.NUMBER_OF_WEEKS * 7);
              dateFrom = getFirstDayOfWeek(dateFrom);
              const weeklyQuery = [
                {
                  $match: {
                    deletedAt: null,
                    positivity: {
                      $exists: true,
                    },
                    createdAt: {
                      $gte: dateFrom,
                      $lt: dateTo
                    }
                  }
                },
                {
                  $addFields: {
                    weekStart: {
                      $dateFromParts: {
                        isoWeekYear: { $isoWeekYear: '$createdAt' },
                        isoWeek: { $isoWeek: '$createdAt' },
                        isoDayOfWeek: 0
                      }
                    }
                  }
                },
                {
                  $group: {
                    _id: '$weekStart',
                    positiveCounts: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$positivity', true] }, // Check if 'positivity' is true
                          then: 1,
                          else: 0
                        }
                      }
                    },
                    negativeCounts: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$positivity', false] }, // Check if 'positivity' is true
                          then: 1,
                          else: 0
                        }
                      }
                    },
                    createdAt: {
                      $first: '$createdAt'
                    }
                  }
                }
              ];
              const weeklyData = await ProfessionalMood.aggregate(weeklyQuery);
              const dateRange = [dateFrom];
              for (let x = 0; x <= 5; x++) {
                dateFrom = new Date(dateFrom);
                dateFrom.setDate(dateFrom.getDate() + 7);
                dateRange.push(dateFrom);
              }
              let numberOfWeek = 1;
              dateRange.map((el) => {
                const data = weeklyData.filter((x) => x._id.toString() === el.toString());
                const tempObj = {
                  interval: numberOfWeek,
                  positive: data.length > 0 ? data[0].positiveCounts : 0,
                  negative: data.length > 0 ? data[0].negativeCounts : 0,
                };
                moodData.push(tempObj);
                numberOfWeek += 1;
              });
              return Response.successResponseData(
                res,
                moodData,
                SUCCESS,
                res.__('wellbeingListSuccess'),
              );
            case REPORT_TYPE.MONTHLY:
              dateFrom.setMonth(dateFrom.getMonth() - MOOD_REPORT.NUMBER_OF_MONTHS);
              dateFrom = getFirstDayOfMonth(dateFrom);
              const monthlyQuery = [
                {
                  $match: {
                    deletedAt: null,
                    positivity: {
                      $exists: true,
                    },
                    createdAt: {
                      $gte: dateFrom,
                      $lt: dateTo
                    }
                  }
                },
                {
                  $addFields: {
                    monthStart: {
                      $dateFromString: {
                        dateString: {
                          $dateToString: {
                            format: '%Y-%m-01',
                            date: new Date()
                          }
                        }
                      }
                    }
                  }
                },
                {
                  $group: {
                    _id: '$monthStart',
                    positiveCounts: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$positivity', true] }, // Check if 'positivity' is true
                          then: 1,
                          else: 0
                        }
                      }
                    },
                    negativeCounts: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$positivity', false] }, // Check if 'positivity' is true
                          then: 1,
                          else: 0
                        }
                      }
                    },
                    createdAt: {
                      $first: '$createdAt'
                    }
                  }
                }
              ];
              const monthlyData = await ProfessionalMood.aggregate(monthlyQuery);
              const monthRange = [dateFrom];
              for (let x = 0; x <= 5; x++) {
                dateFrom = new Date(dateFrom);
                dateFrom.setMonth(dateFrom.getMonth() + 1);
                monthRange.push(dateFrom);
              }
              let numberOfMonth = 1;
              monthRange.map((date) => {
                const data = monthlyData.filter((x) => x._id.toString() === date.toString());
                const tempObj = {
                  interval: numberOfMonth,
                  positive: data.length > 0 ? data[0].positiveCounts : 0,
                  negative: data.length > 0 ? data[0].negativeCounts : 0,
                };
                moodData.push(tempObj);
                numberOfMonth += 1;
              });
              return Response.successResponseData(
                res,
                moodData,
                SUCCESS,
                res.__('wellbeingListSuccess'),
              );
            case REPORT_TYPE.YEARLY:
              dateFrom.setFullYear(dateFrom.getFullYear() - MOOD_REPORT.NUMBER_OF_YEARS);
              dateFrom = getFirstDayOfMonth(dateFrom);
              const yearlyQuery = [
                {
                  $match: {
                    deletedAt: null,
                    positivity: {
                      $exists: true,
                    },
                    createdAt: {
                      $gte: dateFrom,
                      $lt: dateTo
                    }
                  }
                },
                {
                  $addFields: {
                    year: {
                      $year: '$createdAt'
                    }
                  }
                },
                {
                  $group: {
                    _id: '$year',
                    positiveCounts: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$positivity', true] }, // Check if 'positivity' is true
                          then: 1,
                          else: 0
                        }
                      }
                    },
                    negativeCounts: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$positivity', false] }, // Check if 'positivity' is true
                          then: 1,
                          else: 0
                        }
                      }
                    },
                    createdAt: {
                      $first: '$createdAt'
                    }
                  }
                }
              ];
              const yearlyData = await ProfessionalMood.aggregate(yearlyQuery);
              const yearRange = [dateFrom.getFullYear()];
              for (let x = 0; x <= 1; x++) {
                dateFrom = new Date(dateFrom);
                dateFrom.setFullYear(dateFrom.getFullYear() + 1);
                yearRange.push(dateFrom.getFullYear());
              }
              let numberOfYears = 1;
              yearRange.map((date) => {
                const data = yearlyData.filter((x) => x._id === date);
                const tempObj = {
                  interval: numberOfYears,
                  positive: data.length > 0 ? data[0].positiveCounts : 0,
                  negative: data.length > 0 ? data[0].negativeCounts : 0,
                };
                moodData.push(tempObj);
                numberOfYears += 1;
              });
              return Response.successResponseData(
                res,
                moodData,
                SUCCESS,
                res.__('wellbeingListSuccess'),
              );
            default:
              return Response.successResponseWithoutData(res, res.__('noTypeCase'), FAIL);
          }
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  overallWellbeingPersonalData: (req, res) => {
    try {
      const reqParam = req.query;
      overallMoodReportValidation(reqParam, res, async (validate) => {
        if (validate) {
          let dateFrom = currentDateOnly();
          let dateTo = currentDateOnly();
          const moodData = [];

          dateTo.setDate(dateTo.getDate() + 1);
          switch (parseInt(reqParam.reportType)) {
            case REPORT_TYPE.DAILY:
              dateFrom = currentDateOnly();
              dateTo = currentDateOnly();
              dateTo.setDate(dateFrom.getDate() + 1);
              dateFrom = getFirstDayOfMonth(dateFrom);
              const filterCondition = [
                {
                  $match: {
                    createdAt: {
                      $gte: dateFrom,
                      $lt: dateTo
                    },
                    positivity: {
                      $exists: true,
                    },
                    deletedAt: null
                  }
                },
                {
                  $addFields: {
                    date: {
                      $dateToString: {
                        format: '%Y-%m-%d',
                        date: '$createdAt'
                      }
                    }
                  }
                },
                {
                  $group: {
                    _id: '$date',
                    positiveCounts: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$positivity', true] }, // Check if 'positivity' is true
                          then: 1,
                          else: 0
                        }
                      }
                    },
                    negativeCounts: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$positivity', false] }, // Check if 'positivity' is true
                          then: 1,
                          else: 0
                        }
                      }
                    },
                    createdAt: {
                      $first: '$createdAt'
                    }
                  }
                }
              ];
              const dailyMood = await Mood.aggregate(filterCondition);
              const dayRange = [dateFrom];
              for (let i = 1; i < dateTo.getDate() - 1; i++) {
                dateFrom = new Date(dateFrom);
                dateFrom.setDate(dateFrom.getDate() + 1);
                dayRange.push(dateFrom);
              }
              let numberOfDays = 1;
              dayRange.forEach((date) => {
                const data = dailyMood.filter(
                  (x) => x.createdAt.getDate().toString() === date.getDate().toString()
                );
                const tempObj = {
                  interval: numberOfDays,
                  positive: data.length > 0 ? data[0].positiveCounts : 0,
                  negative: data.length > 0 ? data[0].negativeCounts : 0,
                };
                moodData.push(tempObj);
                numberOfDays += 1;
              });
              return Response.successResponseData(
                res,
                moodData,
                SUCCESS,
                res.__('wellbeingListSuccess'),
              );
            case REPORT_TYPE.WEEKLY:
              dateFrom.setDate(dateFrom.getDate() - MOOD_REPORT.NUMBER_OF_WEEKS * 7);
              dateFrom = getFirstDayOfWeek(dateFrom);
              const weeklyQuery = [
                {
                  $match: {
                    deletedAt: null,
                    positivity: {
                      $exists: true,
                    },
                    createdAt: {
                      $gte: dateFrom,
                      $lt: dateTo
                    }
                  }
                },
                {
                  $addFields: {
                    weekStart: {
                      $dateFromParts: {
                        isoWeekYear: { $isoWeekYear: '$createdAt' },
                        isoWeek: { $isoWeek: '$createdAt' },
                        isoDayOfWeek: 0
                      }
                    }
                  }
                },
                {
                  $group: {
                    _id: '$weekStart',
                    positiveCounts: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$positivity', true] }, // Check if 'positivity' is true
                          then: 1,
                          else: 0
                        }
                      }
                    },
                    negativeCounts: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$positivity', false] }, // Check if 'positivity' is true
                          then: 1,
                          else: 0
                        }
                      }
                    },
                    createdAt: {
                      $first: '$createdAt'
                    }
                  }
                }
              ];
              const weeklyData = await Mood.aggregate(weeklyQuery);
              const dateRange = [dateFrom];
              for (let x = 0; x <= 5; x++) {
                dateFrom = new Date(dateFrom);
                dateFrom.setDate(dateFrom.getDate() + 7);
                dateRange.push(dateFrom);
              }
              let numberOfWeek = 1;
              dateRange.map((el) => {
                const data = weeklyData.filter((x) => x._id.toString() === el.toString());
                const tempObj = {
                  interval: numberOfWeek,
                  positive: data.length > 0 ? data[0].positiveCounts : 0,
                  negative: data.length > 0 ? data[0].negativeCounts : 0,
                };
                moodData.push(tempObj);
                numberOfWeek += 1;
              });
              return Response.successResponseData(
                res,
                moodData,
                SUCCESS,
                res.__('wellbeingListSuccess'),
              );
            case REPORT_TYPE.MONTHLY:
              dateFrom.setMonth(dateFrom.getMonth() - MOOD_REPORT.NUMBER_OF_MONTHS);
              dateFrom = getFirstDayOfMonth(dateFrom);
              const monthlyQuery = [
                {
                  $match: {
                    deletedAt: null,
                    positivity: {
                      $exists: true,
                    },
                    createdAt: {
                      $gte: dateFrom,
                      $lt: dateTo
                    }
                  }
                },
                {
                  $addFields: {
                    monthStart: {
                      $dateFromString: {
                        dateString: {
                          $dateToString: {
                            format: '%Y-%m-01',
                            date: new Date()
                          }
                        }
                      }
                    }
                  }
                },
                {
                  $group: {
                    _id: '$monthStart',
                    positiveCounts: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$positivity', true] }, // Check if 'positivity' is true
                          then: 1,
                          else: 0
                        }
                      }
                    },
                    negativeCounts: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$positivity', false] }, // Check if 'positivity' is true
                          then: 1,
                          else: 0
                        }
                      }
                    },
                    createdAt: {
                      $first: '$createdAt'
                    }
                  }
                }
              ];
              const monthlyData = await Mood.aggregate(monthlyQuery);
              const monthRange = [dateFrom];
              for (let x = 0; x <= 5; x++) {
                dateFrom = new Date(dateFrom);
                dateFrom.setMonth(dateFrom.getMonth() + 1);
                monthRange.push(dateFrom);
              }
              let numberOfMonth = 1;
              monthRange.map((date) => {
                const data = monthlyData.filter((x) => x._id.toString() === date.toString());
                const tempObj = {
                  interval: numberOfMonth,
                  positive: data.length > 0 ? data[0].positiveCounts : 0,
                  negative: data.length > 0 ? data[0].negativeCounts : 0,
                };
                moodData.push(tempObj);
                numberOfMonth += 1;
              });
              return Response.successResponseData(
                res,
                moodData,
                SUCCESS,
                res.__('wellbeingListSuccess'),
              );
            case REPORT_TYPE.YEARLY:
              dateFrom.setFullYear(dateFrom.getFullYear() - MOOD_REPORT.NUMBER_OF_YEARS);
              dateFrom = getFirstDayOfMonth(dateFrom);
              const yearlyQuery = [
                {
                  $match: {
                    deletedAt: null,
                    positivity: {
                      $exists: true,
                    },
                    createdAt: {
                      $gte: dateFrom,
                      $lt: dateTo
                    }
                  }
                },
                {
                  $addFields: {
                    year: {
                      $year: '$createdAt'
                    }
                  }
                },
                {
                  $group: {
                    _id: '$year',
                    positiveCounts: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$positivity', true] }, // Check if 'positivity' is true
                          then: 1,
                          else: 0
                        }
                      }
                    },
                    negativeCounts: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$positivity', false] }, // Check if 'positivity' is true
                          then: 1,
                          else: 0
                        }
                      }
                    },
                    createdAt: {
                      $first: '$createdAt'
                    }
                  }
                }
              ];
              const yearlyData = await Mood.aggregate(yearlyQuery);
              const yearRange = [dateFrom.getFullYear()];
              for (let x = 0; x <= 1; x++) {
                dateFrom = new Date(dateFrom);
                dateFrom.setFullYear(dateFrom.getFullYear() + 1);
                yearRange.push(dateFrom.getFullYear());
              }
              let numberOfYears = 1;
              yearRange.map((date) => {
                const data = yearlyData.filter((x) => x._id === date);
                const tempObj = {
                  interval: numberOfYears,
                  positive: data.length > 0 ? data[0].positiveCounts : 0,
                  negative: data.length > 0 ? data[0].negativeCounts : 0,
                };
                moodData.push(tempObj);
                numberOfYears += 1;
              });
              return Response.successResponseData(
                res,
                moodData,
                SUCCESS,
                res.__('wellbeingListSuccess'),
              );
            default:
              return Response.successResponseWithoutData(res, res.__('noTypeCase'), FAIL);
          }
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  overallWellbeingShuruData: (req, res) => {
    try {
      const reqParam = req.query;
      overallMoodReportValidation(reqParam, res, async (validate) => {
        if (validate) {
          let dateFrom = currentDateOnly();
          let dateTo = currentDateOnly();
          const moodData = [];

          dateTo.setDate(dateTo.getDate() + 1);
          switch (parseInt(reqParam.reportType)) {
            case REPORT_TYPE.DAILY:
              dateFrom = currentDateOnly();
              dateTo = currentDateOnly();
              dateTo.setDate(dateFrom.getDate() + 1);
              dateFrom = getFirstDayOfMonth(dateFrom);
              const filterCondition = [
                {
                  $match: {
                    createdAt: {
                      $gte: dateFrom,
                      $lt: dateTo
                    },
                    positivity: {
                      $exists: true,
                    },
                  }
                },
                {
                  $addFields: {
                    date: {
                      $dateToString: {
                        format: '%Y-%m-%d',
                        date: '$createdAt'
                      }
                    }
                  }
                },
                {
                  $group: {
                    _id: '$date',
                    positiveCounts: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$positivity', true] }, // Check if 'positivity' is true
                          then: 1,
                          else: 0
                        }
                      }
                    },
                    negativeCounts: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$positivity', false] }, // Check if 'positivity' is true
                          then: 1,
                          else: 0
                        }
                      }
                    },
                    createdAt: {
                      $first: '$createdAt'
                    }
                  }
                }
              ];
              const dailyMood = await Conversation.aggregate(filterCondition);
              const dayRange = [dateFrom];
              for (let i = 1; i < dateTo.getDate() - 1; i++) {
                dateFrom = new Date(dateFrom);
                dateFrom.setDate(dateFrom.getDate() + 1);
                dayRange.push(dateFrom);
              }
              let numberOfDays = 1;
              dayRange.forEach((date) => {
                const data = dailyMood.filter(
                  (x) => x.createdAt.getDate().toString() === date.getDate().toString()
                );
                const tempObj = {
                  interval: numberOfDays,
                  positive: data.length > 0 ? Math.round(data[0].positiveCounts / 2) : 0,
                  negative: data.length > 0 ? Math.round(data[0].negativeCounts / 2) : 0,
                };
                moodData.push(tempObj);
                numberOfDays += 1;
              });
              return Response.successResponseData(
                res,
                moodData,
                SUCCESS,
                res.__('wellbeingListSuccess'),
              );
            case REPORT_TYPE.WEEKLY:
              dateFrom.setDate(dateFrom.getDate() - MOOD_REPORT.NUMBER_OF_WEEKS * 7);
              dateFrom = getFirstDayOfWeek(dateFrom);
              const weeklyQuery = [
                {
                  $match: {
                    positivity: {
                      $exists: true,
                    },
                    createdAt: {
                      $gte: dateFrom,
                      $lt: dateTo
                    }
                  }
                },
                {
                  $addFields: {
                    weekStart: {
                      $dateFromParts: {
                        isoWeekYear: { $isoWeekYear: '$createdAt' },
                        isoWeek: { $isoWeek: '$createdAt' },
                        isoDayOfWeek: 0
                      }
                    }
                  }
                },
                {
                  $group: {
                    _id: '$weekStart',
                    positiveCounts: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$positivity', true] }, // Check if 'positivity' is true
                          then: 1,
                          else: 0
                        }
                      }
                    },
                    negativeCounts: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$positivity', false] }, // Check if 'positivity' is true
                          then: 1,
                          else: 0
                        }
                      }
                    },
                    createdAt: {
                      $first: '$createdAt'
                    }
                  }
                }
              ];
              const weeklyData = await Conversation.aggregate(weeklyQuery);
              const dateRange = [dateFrom];
              for (let x = 0; x <= 5; x++) {
                dateFrom = new Date(dateFrom);
                dateFrom.setDate(dateFrom.getDate() + 7);
                dateRange.push(dateFrom);
              }
              let numberOfWeek = 1;
              dateRange.map((el) => {
                const data = weeklyData.filter((x) => x._id.toString() === el.toString());
                const tempObj = {
                  interval: numberOfWeek,
                  positive: data.length > 0 ? Math.round(data[0].positiveCounts / 2) : 0,
                  negative: data.length > 0 ? Math.round(data[0].negativeCounts / 2) : 0,
                };
                moodData.push(tempObj);
                numberOfWeek += 1;
              });
              return Response.successResponseData(
                res,
                moodData,
                SUCCESS,
                res.__('wellbeingListSuccess'),
              );
            case REPORT_TYPE.MONTHLY:
              dateFrom.setMonth(dateFrom.getMonth() - MOOD_REPORT.NUMBER_OF_MONTHS);
              dateFrom = getFirstDayOfMonth(dateFrom);
              const monthlyQuery = [
                {
                  $match: {
                    positivity: {
                      $exists: true,
                    },
                    createdAt: {
                      $gte: dateFrom,
                      $lt: dateTo
                    }
                  }
                },
                {
                  $addFields: {
                    monthStart: {
                      $dateFromString: {
                        dateString: {
                          $dateToString: {
                            format: '%Y-%m-01',
                            date: new Date()
                          }
                        }
                      }
                    }
                  }
                },
                {
                  $group: {
                    _id: '$monthStart',
                    positiveCounts: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$positivity', true] }, // Check if 'positivity' is true
                          then: 1,
                          else: 0
                        }
                      }
                    },
                    negativeCounts: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$positivity', false] }, // Check if 'positivity' is true
                          then: 1,
                          else: 0
                        }
                      }
                    },
                    createdAt: {
                      $first: '$createdAt'
                    }
                  }
                }
              ];
              const monthlyData = await Conversation.aggregate(monthlyQuery);
              const monthRange = [dateFrom];
              for (let x = 0; x <= 5; x++) {
                dateFrom = new Date(dateFrom);
                dateFrom.setMonth(dateFrom.getMonth() + 1);
                monthRange.push(dateFrom);
              }
              let numberOfMonth = 1;
              monthRange.map((date) => {
                const data = monthlyData.filter((x) => x._id.toString() === date.toString());
                const tempObj = {
                  interval: numberOfMonth,
                  positive: data.length > 0 ? Math.round(data[0].positiveCounts / 2) : 0,
                  negative: data.length > 0 ? Math.round(data[0].negativeCounts / 2) : 0,
                };
                moodData.push(tempObj);
                numberOfMonth += 1;
              });
              return Response.successResponseData(
                res,
                moodData,
                SUCCESS,
                res.__('wellbeingListSuccess'),
              );
            case REPORT_TYPE.YEARLY:
              dateFrom.setFullYear(dateFrom.getFullYear() - MOOD_REPORT.NUMBER_OF_YEARS);
              dateFrom = getFirstDayOfMonth(dateFrom);
              const yearlyQuery = [
                {
                  $match: {
                    positivity: {
                      $exists: true,
                    },
                    createdAt: {
                      $gte: dateFrom,
                      $lt: dateTo
                    }
                  }
                },
                {
                  $addFields: {
                    year: {
                      $year: '$createdAt'
                    }
                  }
                },
                {
                  $group: {
                    _id: '$year',
                    positiveCounts: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$positivity', true] }, // Check if 'positivity' is true
                          then: 1,
                          else: 0
                        }
                      }
                    },
                    negativeCounts: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$positivity', false] }, // Check if 'positivity' is true
                          then: 1,
                          else: 0
                        }
                      }
                    },
                    createdAt: {
                      $first: '$createdAt'
                    }
                  }
                }
              ];
              const yearlyData = await Conversation.aggregate(yearlyQuery);
              const yearRange = [dateFrom.getFullYear()];
              for (let x = 0; x <= 1; x++) {
                dateFrom = new Date(dateFrom);
                dateFrom.setFullYear(dateFrom.getFullYear() + 1);
                yearRange.push(dateFrom.getFullYear());
              }
              let numberOfYears = 1;
              yearRange.map((date) => {
                const data = yearlyData.filter((x) => x._id === date);
                const tempObj = {
                  interval: numberOfYears,
                  positive: data.length > 0 ? Math.round(data[0].positiveCounts / 2) : 0,
                  negative: data.length > 0 ? Math.round(data[0].negativeCounts / 2) : 0,
                };
                moodData.push(tempObj);
                numberOfYears += 1;
              });
              return Response.successResponseData(
                res,
                moodData,
                SUCCESS,
                res.__('wellbeingListSuccess'),
              );
            default:
              return Response.successResponseWithoutData(res, res.__('noTypeCase'), FAIL);
          }
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  overallWellbeingJournalData: (req, res) => {
    try {
      const reqParam = req.query;
      overallMoodReportValidation(reqParam, res, async (validate) => {
        if (validate) {
          let dateFrom = currentDateOnly();
          let dateTo = currentDateOnly();
          const moodData = [];

          dateTo.setDate(dateTo.getDate() + 1);
          switch (parseInt(reqParam.reportType)) {
            case REPORT_TYPE.DAILY:
              dateFrom = currentDateOnly();
              dateTo = currentDateOnly();
              dateTo.setDate(dateFrom.getDate() + 1);
              dateFrom = getFirstDayOfMonth(dateFrom);
              const filterCondition = [
                {
                  $match: {
                    createdAt: {
                      $gte: dateFrom,
                      $lt: dateTo
                    },
                    positivity: {
                      $exists: true,
                    },
                  }
                },
                {
                  $addFields: {
                    date: {
                      $dateToString: {
                        format: '%Y-%m-%d',
                        date: '$createdAt'
                      }
                    }
                  }
                },
                {
                  $group: {
                    _id: '$date',
                    positiveCounts: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$positivity', true] }, // Check if 'positivity' is true
                          then: 1,
                          else: 0
                        }
                      }
                    },
                    negativeCounts: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$positivity', false] }, // Check if 'positivity' is true
                          then: 1,
                          else: 0
                        }
                      }
                    },
                    createdAt: {
                      $first: '$createdAt'
                    }
                  }
                }
              ];
              const dailyMood = await Cleanse.aggregate(filterCondition);
              const dailyGratitude = await UserGratitude.aggregate(filterCondition);
              const dailyAffirmation = await UserAffirmation.aggregate(filterCondition);
              const dailyNotes = await UserNotes.aggregate(filterCondition);
              const dailyGoals = await Goals.aggregate(filterCondition);

              const dayRange = [dateFrom];
              for (let i = 1; i < dateTo.getDate() - 1; i++) {
                dateFrom = new Date(dateFrom);
                dateFrom.setDate(dateFrom.getDate() + 1);
                dayRange.push(dateFrom);
              }
              let numberOfDays = 1;
              dayRange.forEach((date) => {
                const data1 = dailyMood.filter(
                  (x) => x.createdAt.getDate().toString() === date.getDate().toString()
                );
                const data2 = dailyGratitude.filter(
                  (x) => x.createdAt.getDate().toString() === date.getDate().toString()
                );
                const data3 = dailyAffirmation.filter(
                  (x) => x.createdAt.getDate().toString() === date.getDate().toString()
                );
                const data4 = dailyNotes.filter(
                  (x) => x.createdAt.getDate().toString() === date.getDate().toString()
                );
                const data5 = dailyGoals.filter(
                  (x) => x.createdAt.getDate().toString() === date.getDate().toString()
                );
                const tempObj = {
                  interval: numberOfDays,
                  cleansePositive: data1.length > 0 ? data1[0].positiveCounts : 0,
                  cleanseNegative: data1.length > 0 ? data1[0].negativeCounts : 0,
                  gratitudePositive: data2.length > 0 ? data2[0].positiveCounts : 0,
                  gratitudeNegative: data2.length > 0 ? data2[0].negativeCounts : 0,
                  affirmationsPositive: data3.length > 0 ? data3[0].positiveCounts : 0,
                  affirmationsNegative: data3.length > 0 ? data3[0].negativeCounts : 0,
                  notesPositive: data4.length > 0 ? data4[0].positiveCounts : 0,
                  notesNegative: data4.length > 0 ? data4[0].negativeCounts : 0,
                  goalsPositive: data5.length > 0 ? data5[0].positiveCounts : 0,
                  goalsNegative: data5.length > 0 ? data5[0].negativeCounts : 0,
                };
                moodData.push(tempObj);
                numberOfDays += 1;
              });
              return Response.successResponseData(
                res,
                moodData,
                SUCCESS,
                res.__('wellbeingListSuccess'),
              );
            case REPORT_TYPE.WEEKLY:
              dateFrom.setDate(dateFrom.getDate() - MOOD_REPORT.NUMBER_OF_WEEKS * 7);
              dateFrom = getFirstDayOfWeek(dateFrom);
              const weeklyQuery = [
                {
                  $match: {
                    positivity: {
                      $exists: true,
                    },
                    createdAt: {
                      $gte: dateFrom,
                      $lt: dateTo
                    }
                  }
                },
                {
                  $addFields: {
                    weekStart: {
                      $dateFromParts: {
                        isoWeekYear: { $isoWeekYear: '$createdAt' },
                        isoWeek: { $isoWeek: '$createdAt' },
                        isoDayOfWeek: 0
                      }
                    }
                  }
                },
                {
                  $group: {
                    _id: '$weekStart',
                    positiveCounts: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$positivity', true] }, // Check if 'positivity' is true
                          then: 1,
                          else: 0
                        }
                      }
                    },
                    negativeCounts: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$positivity', false] }, // Check if 'positivity' is true
                          then: 1,
                          else: 0
                        }
                      }
                    },
                    createdAt: {
                      $first: '$createdAt'
                    }
                  }
                }
              ];
              const weeklyMood = await Cleanse.aggregate(weeklyQuery);
              const weeklyGratitude = await UserGratitude.aggregate(weeklyQuery);
              const weeklyAffirmation = await UserAffirmation.aggregate(weeklyQuery);
              const weeklyNotes = await UserNotes.aggregate(weeklyQuery);
              const weeklyGoals = await Goals.aggregate(weeklyQuery);

              const dateRange = [dateFrom];
              for (let x = 0; x <= 5; x++) {
                dateFrom = new Date(dateFrom);
                dateFrom.setDate(dateFrom.getDate() + 7);
                dateRange.push(dateFrom);
              }
              let numberOfWeek = 1;
              dateRange.map((el) => {
                const data1 = weeklyMood.filter((x) => x._id.toString() === el.toString());
                const data2 = weeklyGratitude.filter((x) => x._id.toString() === el.toString());
                const data3 = weeklyAffirmation.filter((x) => x._id.toString() === el.toString());
                const data4 = weeklyNotes.filter((x) => x._id.toString() === el.toString());
                const data5 = weeklyGoals.filter((x) => x._id.toString() === el.toString());

                const tempObj = {
                  interval: numberOfWeek,
                  cleansePositive: data1.length > 0 ? data1[0].positiveCounts : 0,
                  cleanseNegative: data1.length > 0 ? data1[0].negativeCounts : 0,
                  gratitudePositive: data2.length > 0 ? data2[0].positiveCounts : 0,
                  gratitudeNegative: data2.length > 0 ? data2[0].negativeCounts : 0,
                  affirmationsPositive: data3.length > 0 ? data3[0].positiveCounts : 0,
                  affirmationsNegative: data3.length > 0 ? data3[0].negativeCounts : 0,
                  notesPositive: data4.length > 0 ? data4[0].positiveCounts : 0,
                  notesNegative: data4.length > 0 ? data4[0].negativeCounts : 0,
                  goalsPositive: data5.length > 0 ? data5[0].positiveCounts : 0,
                  goalsNegative: data5.length > 0 ? data5[0].negativeCounts : 0,
                };
                moodData.push(tempObj);
                numberOfWeek += 1;
              });
              return Response.successResponseData(
                res,
                moodData,
                SUCCESS,
                res.__('wellbeingListSuccess'),
              );
            case REPORT_TYPE.MONTHLY:
              dateFrom.setMonth(dateFrom.getMonth() - MOOD_REPORT.NUMBER_OF_MONTHS);
              dateFrom = getFirstDayOfMonth(dateFrom);
              const monthlyQuery = [
                {
                  $match: {
                    positivity: {
                      $exists: true,
                    },
                    createdAt: {
                      $gte: dateFrom,
                      $lt: dateTo
                    }
                  }
                },
                {
                  $addFields: {
                    monthStart: {
                      $dateFromString: {
                        dateString: {
                          $dateToString: {
                            format: '%Y-%m-01',
                            date: new Date()
                          }
                        }
                      }
                    }
                  }
                },
                {
                  $group: {
                    _id: '$monthStart',
                    positiveCounts: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$positivity', true] }, // Check if 'positivity' is true
                          then: 1,
                          else: 0
                        }
                      }
                    },
                    negativeCounts: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$positivity', false] }, // Check if 'positivity' is true
                          then: 1,
                          else: 0
                        }
                      }
                    },
                    createdAt: {
                      $first: '$createdAt'
                    }
                  }
                }
              ];
              const monthlyMood = await Cleanse.aggregate(monthlyQuery);
              const monthlyGratitude = await UserGratitude.aggregate(monthlyQuery);
              const monthlyAffirmation = await UserAffirmation.aggregate(monthlyQuery);
              const monthlyNotes = await UserNotes.aggregate(monthlyQuery);
              const monthlyGoals = await Goals.aggregate(monthlyQuery);

              const monthRange = [dateFrom];
              for (let x = 0; x <= 5; x++) {
                dateFrom = new Date(dateFrom);
                dateFrom.setMonth(dateFrom.getMonth() + 1);
                monthRange.push(dateFrom);
              }
              let numberOfMonth = 1;
              monthRange.map((date) => {
                const data1 = monthlyMood.filter((x) => x._id.toString() === date.toString());
                const data2 = monthlyGratitude.filter((x) => x._id.toString() === date.toString());
                const data3 = monthlyAffirmation.filter((x) => x._id.toString() === date.toString());
                const data4 = monthlyNotes.filter((x) => x._id.toString() === date.toString());
                const data5 = monthlyGoals.filter((x) => x._id.toString() === date.toString());

                const tempObj = {
                  interval: numberOfMonth,
                  cleansePositive: data1.length > 0 ? data1[0].positiveCounts : 0,
                  cleanseNegative: data1.length > 0 ? data1[0].negativeCounts : 0,
                  gratitudePositive: data2.length > 0 ? data2[0].positiveCounts : 0,
                  gratitudeNegative: data2.length > 0 ? data2[0].negativeCounts : 0,
                  affirmationsPositive: data3.length > 0 ? data3[0].positiveCounts : 0,
                  affirmationsNegative: data3.length > 0 ? data3[0].negativeCounts : 0,
                  notesPositive: data4.length > 0 ? data4[0].positiveCounts : 0,
                  notesNegative: data4.length > 0 ? data4[0].negativeCounts : 0,
                  goalsPositive: data5.length > 0 ? data5[0].positiveCounts : 0,
                  goalsNegative: data5.length > 0 ? data5[0].negativeCounts : 0,
                };
                moodData.push(tempObj);
                numberOfMonth += 1;
              });
              return Response.successResponseData(
                res,
                moodData,
                SUCCESS,
                res.__('wellbeingListSuccess'),
              );
            case REPORT_TYPE.YEARLY:
              dateFrom.setFullYear(dateFrom.getFullYear() - MOOD_REPORT.NUMBER_OF_YEARS);
              dateFrom = getFirstDayOfMonth(dateFrom);
              const yearlyQuery = [
                {
                  $match: {
                    positivity: {
                      $exists: true,
                    },
                    createdAt: {
                      $gte: dateFrom,
                      $lt: dateTo
                    }
                  }
                },
                {
                  $addFields: {
                    year: {
                      $year: '$createdAt'
                    }
                  }
                },
                {
                  $group: {
                    _id: '$year',
                    positiveCounts: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$positivity', true] }, // Check if 'positivity' is true
                          then: 1,
                          else: 0
                        }
                      }
                    },
                    negativeCounts: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$positivity', false] }, // Check if 'positivity' is true
                          then: 1,
                          else: 0
                        }
                      }
                    },
                    createdAt: {
                      $first: '$createdAt'
                    }
                  }
                }
              ];
              const yearlyMood = await Cleanse.aggregate(yearlyQuery);
              const yearlyGratitude = await UserGratitude.aggregate(yearlyQuery);
              const yearlyAffirmation = await UserAffirmation.aggregate(yearlyQuery);
              const yearlyNotes = await UserNotes.aggregate(yearlyQuery);
              const yearlyGoals = await Goals.aggregate(yearlyQuery);

              const yearRange = [dateFrom.getFullYear()];
              for (let x = 0; x <= 1; x++) {
                dateFrom = new Date(dateFrom);
                dateFrom.setFullYear(dateFrom.getFullYear() + 1);
                yearRange.push(dateFrom.getFullYear());
              }
              let numberOfYears = 1;
              yearRange.map((date) => {
                const data1 = yearlyMood.filter((x) => x._id === date);
                const data2 = yearlyGratitude.filter((x) => x._id === date);
                const data3 = yearlyAffirmation.filter((x) => x._id === date);
                const data4 = yearlyNotes.filter((x) => x._id === date);
                const data5 = yearlyGoals.filter((x) => x._id === date);

                const tempObj = {
                  interval: numberOfYears,
                  cleansePositive: data1.length > 0 ? data1[0].positiveCounts : 0,
                  cleanseNegative: data1.length > 0 ? data1[0].negativeCounts : 0,
                  gratitudePositive: data2.length > 0 ? data2[0].positiveCounts : 0,
                  gratitudeNegative: data2.length > 0 ? data2[0].negativeCounts : 0,
                  affirmationsPositive: data3.length > 0 ? data3[0].positiveCounts : 0,
                  affirmationsNegative: data3.length > 0 ? data3[0].negativeCounts : 0,
                  notesPositive: data4.length > 0 ? data4[0].positiveCounts : 0,
                  notesNegative: data4.length > 0 ? data4[0].negativeCounts : 0,
                  goalsPositive: data5.length > 0 ? data5[0].positiveCounts : 0,
                  goalsNegative: data5.length > 0 ? data5[0].negativeCounts : 0,
                };
                moodData.push(tempObj);
                numberOfYears += 1;
              });
              return Response.successResponseData(
                res,
                moodData,
                SUCCESS,
                res.__('wellbeingListSuccess'),
              );
            default:
              return Response.successResponseWithoutData(res, res.__('noTypeCase'), FAIL);
          }
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  overallWellBeingReport: async (req, res) => {
    try {
      let { journalData, selectedAction, shuruData, personalEmotionData, professionalEmotionData } = req.body;
      let startDate = new Date();
      let totalPositive = 0;
      let totalNegative = 0;
      let chart = 'Daily';

      if (selectedAction == 1) {
        chart = 'Daily';
      } else if (selectedAction == 2) {
        chart = 'Weekly';
      } else if (selectedAction == 3) {
        chart = 'Monthly';
      } else if (selectedAction == 4) {
        chart = 'Yearly';
      }

      journalData.map((data) => {
        let p = data.cleansePositive + data.gratitudePositive + data.affirmationsPositive + data.notesPositive + data.goalsPositive;
        let n = data.cleanseNegative + data.gratitudeNegative + data.affirmationsNegative + data.notesNegative + data.goalsNegative;
        totalPositive += p;
        totalNegative += n;
      });

      shuruData.map((data) => {
        totalPositive += data.positive;
        totalNegative += data.negative;
      });

      personalEmotionData.map((data) => {
        totalPositive += data.positive;
        totalNegative += data.negative;
      });

      professionalEmotionData.map((data) => {
        totalPositive += data.positive;
        totalNegative += data.negative;
      });

      let positivePercentage = calculatePercentage(totalPositive, totalPositive + totalNegative);
      let negativePercentage = calculatePercentage(totalNegative, totalPositive + totalNegative);

      let intervals = journalData.map(function (point) {
        return point.interval;
      });
      let positiveShuruCounts = shuruData.map(function (point) {
        return point.positive;
      });
      let negativeShuruCounts = shuruData.map(function (point) {
        return point.negative;
      });

      let positivePersonalCounts = personalEmotionData.map(function (point) {
        return point.positive;
      });
      let negativePersonalCounts = personalEmotionData.map(function (point) {
        return point.negative;
      });

      let positiveProfessionalCounts = professionalEmotionData.map(function (point) {
        return point.positive;
      });
      let negativeProfessionalCounts = professionalEmotionData.map(function (point) {
        return point.negative;
      });

      let positiveAffirmationCounts = journalData.map(function (point) {
        return point.affirmationsPositive;
      });
      let negativeAffirmationCounts = journalData.map(function (point) {
        return point.affirmationsNegative;
      });

      let positiveCleanseCounts = journalData.map(function (point) {
        return point.cleansePositive;
      });
      let negativeCleanseCounts = journalData.map(function (point) {
        return point.cleanseNegative;
      });

      let positiveGratitudeCounts = journalData.map(function (point) {
        return point.gratitudePositive;
      });
      let negativeGratitudeCounts = journalData.map(function (point) {
        return point.gratitudeNegative;
      });

      let positiveNotesCounts = journalData.map(function (point) {
        return point.notesPositive;
      });
      let negativeNotesCounts = journalData.map(function (point) {
        return point.notesNegative;
      });

      let positiveGoalsCounts = journalData.map(function (point) {
        return point.goalsPositive;
      });
      let negativeGoalsCounts = journalData.map(function (point) {
        return point.goalsNegative;
      });

      const locals = {
        name: "Shoorah",
        graphName: "Overall Well Being Report",
        journalData: journalData,
        chart,
        shuruData,
        intervals,
        positiveShuruCounts,
        negativeShuruCounts,
        negativePersonalCounts,
        positivePersonalCounts,
        positiveProfessionalCounts,
        negativeProfessionalCounts,
        positiveAffirmationCounts,
        negativeAffirmationCounts,
        positiveCleanseCounts,
        negativeCleanseCounts,
        positiveGratitudeCounts,
        negativeGratitudeCounts,
        positiveNotesCounts,
        negativeNotesCounts,
        positiveGoalsCounts,
        negativeGoalsCounts,
        fromDate: new Date(startDate).toLocaleDateString('en-gb', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }),
        happySmallIcon: process.env.PDF_HAPPY_SMALL_ICON,
        sadSmallIcon: process.env.PDF_SAD_SMALL_ICON,
        finalIcon: process.env.PDF_HAPPY_ICON,
        finalIconText: '',
        finalMessage:
          SHURU_REPORT_MESSAGES[Math.floor(Math.random() * SHURU_REPORT_MESSAGES.length)]
      };

      const compiledFunction = pug.compileFile('src/views/well-being-report.pug');
      const html = compiledFunction(locals);
      const browser = await puppeteer.launch({
        executablePath:
          process.env.NODE_ENV === NODE_ENVIRONMENT.DEVELOPMENT ? null : '/usr/bin/google-chrome',
        ignoreDefaultArgs: ['--disable-extensions'],
        headless: true,
        args: ['--no-sandbox', '--disabled-setupid-sandbox']
      });
      const page = await browser.newPage();
      await page.setContent(html);
      const pdf = await page.pdf({
        format: MOOD_PDF_SIZE,
        printBackground: true
      });
      await browser.close();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=file.pdf');
      res.setHeader('Content-Length', pdf.length);

      return res.send(pdf);
    } catch (error) {
      console.error('Error in adding/updating report:', error);
      return Response.internalServerErrorResponse(res);
    }
  }


};
