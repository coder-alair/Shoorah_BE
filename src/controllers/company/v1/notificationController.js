'use strict';

const { Notification, Users } = require('@models');
const Response = require('@services/Response');
const {
  addNotificationValidation,
  notificationDetailedListValidation,
  usersEmailListValidation,
  deleteMyNotificationValidation
} = require('@services/companyValidations/notificationValidations');
const {
  NOTIFICATION_TYPE,
  SUCCESS,
  FAIL,
  PAGE,
  PER_PAGE,
  SENT_TO_USER_TYPE,
  ACCOUNT_TYPE,
  NOTIFICATION_LIST_TYPE,
  NOTIFICATION_ACTION,
  USER_TYPE,
  ACCOUNT_STATUS,
  CLOUDFRONT_URL,
  ADMIN_MEDIA_PATH
} = require('@services/Constant');
const { sendNotification } = require('@services/Notify');
const { toObjectId } = require('@services/Helper');
const { COMPANY_MEDIA_PATH } = require('../../../services/Constant');
const { CompanyNotification, CompanyUsers } = require('../../../models');
const { unixTimeStamp, makeRandomDigit } = require('../../../services/Helper');
const { getUploadURL } = require('@services/s3Services');

module.exports = {
  /**
   * @description This function is used to add and sent notification
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  addNotification: (req, res) => {
    try {
      const reqParam = req.body;
      addNotificationValidation(reqParam, res, async (validate) => {
        if (validate) {
          let newData = {
            title: reqParam.title.trim(),
            message: reqParam.message.trim(),
            sent_to_user_type: reqParam.sentToUser,
            from_user_id: req.authAdminId,
            type: NOTIFICATION_TYPE.B2B_ADMIN_NOTIFY,
            sent_on_date: reqParam.sentOnDate,
            cron_sent: reqParam.cronSent,
            company_id: req.authCompanyId,
            department: reqParam.sentToDepartment
          };

          if (reqParam.sentToUser == SENT_TO_USER_TYPE.ALL) {
            let users = await Users.find({ company_id: toObjectId(req.authCompanyId) }).select(
              '_id'
            );
            let ids = users.map((i) => i._id);
            newData = {
              ...newData,
              to_user_ids: ids
            };
          }

          if (reqParam.toUserIds) {
            newData = {
              ...newData,
              to_user_ids: reqParam.toUserIds
            };
          }

          let notifyImageUrl;
          let notifyaudioUrl;

          if (reqParam.image) {
            const imageExtension = reqParam.image.split('/')[1];
            const notfymage = `${unixTimeStamp(new Date())}-${makeRandomDigit(
              4
            )}.${imageExtension}`;
            notifyImageUrl = await getUploadURL(
              reqParam.image,
              notfymage,
              ADMIN_MEDIA_PATH.NOTIFICATION
            );
            newData = {
              ...newData,
              image: notfymage
            };
          }

          if (reqParam.audioUrl) {
            const audioExtension = reqParam.audioUrl.split('/')[1];
            const audioName = `${unixTimeStamp(new Date())}-${makeRandomDigit(
              4
            )}.${audioExtension}`;
            notifyaudioUrl = await getUploadURL(
              reqParam.audioUrl,
              audioName,
              ADMIN_MEDIA_PATH.NOTIFICATION_AUDIO
            );
            newData = {
              ...newData,
              audio_url: audioName
            };
          }

          if (reqParam.reminder) {
            newData = {
              ...newData,
              reminder: reqParam.reminder
            };
          }

          const notificationData = await Notification.create(newData);

          const presignedData = {
            audioUrl: notifyaudioUrl || null,
            notifyImageUrl: notifyImageUrl || null
          };

          if (!notificationData.sent_on_date) {
            let filterCondition = {
              user_type: USER_TYPE.USER,
              status: ACCOUNT_STATUS.ACTIVE,
              company_id: { $eq: req.authCompanyId, $exists: true }
            };
            if (reqParam.sentToUser == SENT_TO_USER_TYPE.ALL) {
              filterCondition = {
                ...filterCondition,
                _id: { $in: newData.to_user_ids }
              };
            }
            switch (reqParam.sentToUser) {
              case SENT_TO_USER_TYPE.IN_TRIAL:
                filterCondition = {
                  ...filterCondition,
                  is_under_trial: true
                };
                break;
              case SENT_TO_USER_TYPE.PAID:
                filterCondition = {
                  ...filterCondition,
                  account_type: ACCOUNT_TYPE.PAID,
                  is_under_trial: false
                };
                break;
              case SENT_TO_USER_TYPE.EXPIRED:
                filterCondition = {
                  ...filterCondition,
                  account_type: ACCOUNT_TYPE.EXPIRED
                };
                break;
              case SENT_TO_USER_TYPE.CUSTOM_LIST:
                filterCondition = {
                  ...filterCondition,
                  _id: {
                    $in: reqParam.toUserIds.map((x) => toObjectId(x))
                  }
                };
                break;
              case SENT_TO_USER_TYPE.NOT_SUBSCRIBED:
                filterCondition = {
                  ...filterCondition,
                  account_type: ACCOUNT_TYPE.FREE
                };
                break;
            }

            if (reqParam.sentToDepartment) {
              let departmentIds = await CompanyUsers.find({
                company_id: req.authCompanyId,
                department: req.sentToDepartment
              }).select('user_id');
              departmentIds = departmentIds.map((departmentId) => departmentId.user_id);
              filterCondition = {
                ...filterCondition,
                _id: { $in: departmentIds }
              };
            }

            const users = await Users.aggregate([
              {
                $match: filterCondition
              },
              {
                $lookup: {
                  from: 'device_tokens',
                  localField: '_id',
                  foreignField: 'user_id',
                  as: 'result'
                }
              },
              {
                $unwind: {
                  path: '$result',
                  preserveNullAndEmptyArrays: false
                }
              },
              {
                $group: {
                  _id: null,
                  device_tokens: {
                    $addToSet: '$result.device_token'
                  }
                }
              }
            ]);
            if (users.length > 0 && users[0].device_tokens.length > 0) {
              const reqData = {
                title: process.env.APP_NAME,
                message: notificationData.message,
                notificationType: NOTIFICATION_TYPE.B2B_ADMIN_NOTIFY
              };
              sendNotification(
                users[0].device_tokens,
                notificationData.message,
                reqData,
                NOTIFICATION_ACTION.MAIN_ACTIVITY
              );
            }
            return Response.successResponseWithoutData(
              res,
              res.__('notificationAddSuccess'),
              SUCCESS,
              presignedData
            );
          }

          if (notificationData.sent_on_date) {
            return Response.successResponseWithoutData(
              res,
              res.__('notificationAddSuccess'),
              SUCCESS,
              presignedData
            );
          } else {
            return Response.successResponseWithoutData(res, res.__('addNotificationFail'), FAIL);
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
   * @description This function is used to get detailed list of all notification or Logged in user notifications
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  notificationDetailedList: (req, res) => {
    try {
      const reqParam = req.query;
      notificationDetailedListValidation(reqParam, res, async (validate) => {
        if (validate) {
          const page = reqParam.page ? parseInt(reqParam.page) : PAGE;
          const perPage = reqParam.perPage ? parseInt(reqParam.perPage) : PER_PAGE;
          const skip = (page - 1) * perPage || 0;
          let filterCondition = {
            deletedAt: null,
            type: { $eq: NOTIFICATION_TYPE.SHOORAH_NOTIFICATION }
          };
          const userCreatedDate = await Users.findById(req.authAdminId).select('createdAt');

          if (parseInt(reqParam.notificationListType) == NOTIFICATION_LIST_TYPE.ALL_NOTIFICATION) {
            filterCondition = {
              ...filterCondition,
              type: parseInt(NOTIFICATION_TYPE.B2B_ADMIN_NOTIFY),
              company_id: toObjectId(req.authCompanyId)
            };
            if (reqParam.searchKey) {
              filterCondition = {
                ...filterCondition,
                $or: [{ title: { $regex: '.*' + reqParam.searchKey + '.*', $options: 'i' } }]
              };
            }
          } else if (
            parseInt(reqParam.notificationListType) == NOTIFICATION_LIST_TYPE.MY_NOTIFICATION
          ) {
            if (req.userType === USER_TYPE.COMPANY_ADMIN) {
              filterCondition = {
                ...filterCondition,
                deletedAt: null,
                createdAt: {
                  $gte: userCreatedDate.createdAt
                },
                type: {
                  $in: [
                    NOTIFICATION_TYPE.SHOORAH_NOTIFICATION,
                    NOTIFICATION_TYPE.B2B_CONTENT_APPROVAL_REQUEST,
                    NOTIFICATION_TYPE.B2B_CONTENT_APPROVAL_STATUS
                  ]
                },
                $or: [
                  {
                    sent_to_user_type: SENT_TO_USER_TYPE.ALL
                  },
                  {
                    sent_to_user_type: SENT_TO_USER_TYPE.CUSTOM_LIST,
                    to_user_ids: toObjectId(req.authAdminId)
                  }
                ],
                deleted_by: {
                  $ne: toObjectId(req.authAdminId)
                }
              };
            } else {
              filterCondition = {
                ...filterCondition,
                company_id: toObjectId(req.authCompanyId),
                createdAt: {
                  $gte: userCreatedDate.createdAt
                },
                type: {
                  $in: [
                    NOTIFICATION_TYPE.SHOORAH_NOTIFICATION,
                    NOTIFICATION_TYPE.B2B_ADMIN_NOTIFY,
                    NOTIFICATION_TYPE.B2B_CONTENT_APPROVAL_STATUS
                  ]
                },
                $or: [
                  {
                    sent_to_user_type: SENT_TO_USER_TYPE.ALL
                  },
                  {
                    sent_to_user_type: SENT_TO_USER_TYPE.CUSTOM_LIST,
                    to_user_ids: toObjectId(req.authAdminId)
                  }
                ],
                deleted_by: {
                  $ne: toObjectId(req.authAdminId)
                }
              };
            }
          }

          const aggregateQuery = [
            {
              $match: filterCondition
            },
            {
              $sort: {
                createdAt: -1,
                isRead: 1
              }
            },
            {
              $skip: skip
            },
            {
              $limit: perPage
            },
            {
              $lookup: {
                from: 'users',
                let: {
                  from_user_id: '$from_user_id'
                },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $eq: ['$_id', '$$from_user_id']
                      }
                    }
                  },
                  {
                    $project: {
                      name: 1,
                      userProfile: {
                        $concat: [
                          CLOUDFRONT_URL,
                          COMPANY_MEDIA_PATH.COMPANY_PROFILE,
                          '/',
                          '$user_profile'
                        ]
                      }
                    }
                  }
                ],
                as: 'fromUser'
              }
            },
            {
              $unwind: {
                path: '$fromUser',
                preserveNullAndEmptyArrays: true
              }
            },
            {
              $project: {
                id: '$_id',
                _id: 0,
                title: 1,
                from_user_id: 1,
                message: 1,
                createdAt: 1,
                fromUser: 1,
                type: 1,
                image: 1,
                imageUrl: {
                  $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.NOTIFICATION, '/', '$image']
                },
                audioUrl: {
                  $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.NOTIFICATION_AUDIO, '/', '$audio_url']
                },
                isRead: {
                  $cond: {
                    if: {
                      $in: [toObjectId(req.authAdminId), '$is_read_by']
                    },
                    then: true,
                    else: false
                  }
                },
                readCounts: {
                  $cond: {
                    if: { $gte: [{ $size: '$is_read_by' }, 1] },
                    then: { $subtract: [{ $size: '$is_read_by' }, 1] },
                    else: 0
                  }
                },
                sentToUserType: '$sent_to_user_type',
                toUserIds: '$to_user_ids'
              }
            }
          ];
          console.log(JSON.stringify(aggregateQuery));

          const totalNotifications = await Notification.countDocuments(filterCondition);
          const notificationDetailedData = await Notification.aggregate(aggregateQuery);
          console.log(notificationDetailedData);
          const notificationIds = notificationDetailedData.map((x) => x?.id);

          await Notification.updateMany(
            { _id: { $in: notificationIds } },
            { $addToSet: { is_read_by: req.authAdminId } }
          );
          Response.successResponseData(
            res,
            notificationDetailedData,
            SUCCESS,
            res.__('notificationListSuccess'),
            {
              page,
              perPage,
              totalNotifications
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
   * @description This function is used to get list of users
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  usersEmailList: (req, res) => {
    try {
      const reqParam = req.query;
      usersEmailListValidation(reqParam, res, async (validate) => {
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
            status: ACCOUNT_STATUS.ACTIVE,
            user_type: USER_TYPE.USER,
            company_id: { $eq: req.authCompanyId, $exists: true }
          };
          if (reqParam.searchKey) {
            filterCondition = {
              ...filterCondition,
              $or: [
                {
                  email: { $regex: '.*' + reqParam.searchKey + '.*', $options: 'i' }
                },
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
            };
          }
          const userData = await Users.find(filterCondition, {
            id: '$_id',
            _id: 1,
            email: {
              $cond: [
                {
                  $gt: ['$email', null]
                },
                '$email',
                {
                  $concat: ['+', '$country_code', '$mobile']
                }
              ]
            }
          })
            .limit(perPage)
            .skip(skip);
          const totalRecords = await Users.countDocuments(filterCondition);
          if (userData.length > 0) {
            return Response.successResponseData(res, userData, SUCCESS, res.__('userListSuccess'), {
              page,
              perPage,
              totalRecords
            });
          } else {
            return Response.successResponseWithoutData(res, res.__('noUserFound'), SUCCESS);
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
   * @description This function is used to send logged in user unread notification count
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  unreadNotificationCount: async (req, res) => {
    try {
      const userCreatedDate = await Users.findById(req.authAdminId).select('createdAt');

      const filterCondition = {
        deletedAt: null,
        company_id: toObjectId(req.authCompanyId),
        is_read_by: { $ne: toObjectId(req.authAdminId) },
        $or: [
          {
            sent_to_user_type: SENT_TO_USER_TYPE.ALL
          },
          {
            sent_to_user_type: SENT_TO_USER_TYPE.CUSTOM_LIST,
            to_user_ids: toObjectId(req.authAdminId)
          }
        ],
        deleted_by: {
          $ne: toObjectId(req.authAdminId)
        },
        createdAt: {
          $gte: userCreatedDate.createdAt
        },
        type: {
          $in: [
            NOTIFICATION_TYPE.SHOORAH_NOTIFICATION,
            NOTIFICATION_TYPE.B2B_CONTENT_APPROVAL_REQUEST,
            NOTIFICATION_TYPE.B2B_CONTENT_APPROVAL_STATUS,
            NOTIFICATION_TYPE.B2B_ADMIN_NOTIFY
          ]
        }
      };

      const unreadNotificationCount = await Notification.countDocuments(filterCondition);
      return Response.successResponseData(
        res,
        unreadNotificationCount,
        SUCCESS,
        res.__('adminNotificationsSuccess')
      );
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to delete all or selected notification.
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  deleteMyNotification: (req, res) => {
    try {
      const reqParam = req.query;
      deleteMyNotificationValidation(reqParam, res, async (validate) => {
        if (validate) {
          const deleteType = parseInt(reqParam.deleteType);
          if (deleteType === 1) {
            const deleteCondition = {
              $addToSet: { deleted_by: req.authAdminId }
            };
            await Notification.findByIdAndUpdate(reqParam.notificationId, deleteCondition);
          } else {
            const filterCondition = {
              deletedAt: null,
              sent_to_user_type: SENT_TO_USER_TYPE.CUSTOM_LIST,
              to_user_ids: req.authAdminId
            };
            const deleteCondition = {
              $addToSet: { deleted_by: req.authAdminId }
            };
            await Notification.updateMany(filterCondition, deleteCondition);
          }
          return Response.successResponseWithoutData(res, res.__('notificationDeleted'), SUCCESS);
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  }
};
