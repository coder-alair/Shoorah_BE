'use strict';

const { Notification, Users } = require('@models');
const Response = require('@services/Response');
const {
  addNotificationValidation,
  notificationDetailedListValidation,
  usersEmailListValidation,
  deleteMyNotificationValidation
} = require('@services/adminValidations/notificationValidations');
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
const { toObjectId, makeRandomDigit, unixTimeStamp } = require('@services/Helper');
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
            type: NOTIFICATION_TYPE.SHOORAH_NOTIFICATION,
            sent_on_date: reqParam.sentOnDate,
            cron_sent: reqParam.cronSent
          };

          if (reqParam.toUserIds) {
            newData = {
              ...newData,
              to_user_ids: reqParam.toUserIds
            };
          }

          let notifyImageUrl;
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

          if (reqParam.reminder) {
            newData = {
              ...newData,
              reminder: reqParam.reminder
            };
          }

          const notificationData = await Notification.create(newData);

          if (!notificationData.sent_on_date) {
            let filterCondition = {
              user_type: USER_TYPE.USER,
              status: ACCOUNT_STATUS.ACTIVE
            };
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
                notificationType: NOTIFICATION_TYPE.SHOORAH_NOTIFICATION
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
              notifyImageUrl
            );
          }

          if (notificationData.sent_on_date) {
            return Response.successResponseWithoutData(
              res,
              res.__('notificationAddSuccess'),
              SUCCESS,
              notifyImageUrl
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
            type: { $ne: NOTIFICATION_TYPE.SHURU_WARM_NOTIFICATION },
            company_id: { $eq: null }
          };
          const userCreatedDate = await Users.findById(req.authAdminId).select('createdAt');
          if (parseInt(reqParam.notificationListType) === NOTIFICATION_LIST_TYPE.ALL_NOTIFICATION) {
            filterCondition = {
              ...filterCondition,
              type: NOTIFICATION_TYPE.SHOORAH_NOTIFICATION
            };
            if (reqParam.searchKey) {
              filterCondition = {
                ...filterCondition,
                $or: [{ title: { $regex: '.*' + reqParam.searchKey + '.*', $options: 'i' } }]
              };
            }
          } else if (
            parseInt(reqParam.notificationListType) === NOTIFICATION_LIST_TYPE.MY_NOTIFICATION
          ) {
            filterCondition = {
              ...filterCondition,
              createdAt: {
                $gte: userCreatedDate?.createdAt
              },
              deleted_by: {
                $ne: toObjectId(req.authAdminId)
              },
              type: { $eq: NOTIFICATION_TYPE.SHOORAH_NOTIFICATION },
              $or: [
                {
                  sent_to_user_type: SENT_TO_USER_TYPE.ALL
                },
                {
                  sent_to_user_type: SENT_TO_USER_TYPE.CUSTOM_LIST,
                  to_user_ids: toObjectId(req.authUserId)
                }
              ]
            };
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
                          ADMIN_MEDIA_PATH.ADMIN_PROFILE,
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
                reminder: 1,
                type:1,
                image: 1,
                imageUrl: {
                  $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.NOTIFICATION, '/', '$image']
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
          const totalNotifications = await Notification.countDocuments(filterCondition);
          const notificationDetailedData = await Notification.aggregate(aggregateQuery);
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
            user_type: USER_TYPE.USER
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
      const filterCondition = {
        deletedAt: null,
        is_read_by: { $ne: toObjectId(req.authAdminId) },
        sent_to_user_type: SENT_TO_USER_TYPE.CUSTOM_LIST,
        to_user_ids: toObjectId(req.authAdminId),
        deleted_by: {
          $ne: toObjectId(req.authAdminId)
        },
        company_id: { $eq: null, $exists: true }
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
            let notify = await Notification.find(filterCondition);
            console.log({ notify });
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
