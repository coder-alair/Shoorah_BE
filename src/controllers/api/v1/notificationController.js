/* eslint-disable no-unused-expressions */
'use strict';

const { Notification, Users } = require('@models');
const Response = require('@services/Response');
const {
  listUserNotificationValidation,
  deleteNotificationValidation
} = require('@services/userValidations/notificationValidations');
const {
  PAGE,
  PER_PAGE,
  SUCCESS,
  FAIL,
  SENT_TO_USER_TYPE,
  ACCOUNT_TYPE,
  CLOUDFRONT_URL,
  USER_MEDIA_PATH
} = require('@services/Constant');
const { toObjectId } = require('@services/Helper');
const { CompanyNotification, ContentCounts } = require('../../../models');
const { ADMIN_MEDIA_PATH } = require('../../../services/Constant');

module.exports = {
  /**
   * @description This function is used to get login user notification list
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  listUserNotification: (req, res) => {
    try {
      const reqParam = req.query;
      listUserNotificationValidation(reqParam, res, async (validate) => {
        if (validate) {
          let page = PAGE;
          let perPage = PER_PAGE;
          if (reqParam.page) {
            page = parseInt(reqParam.page);
          }
          if (reqParam.perPage) {
            perPage = parseInt(reqParam.perPage) / 2;
          }
          const skip = (page - 1) * perPage || 0;
          const userCreatedDate = await Users.findById(req.authUserId).select('createdAt');

          let filterCondition = {
            deleted_by: {
              $ne: toObjectId(req.authUserId)
            },
            createdAt: {
              $gte: userCreatedDate?.createdAt
            },
            $or: [
              {
                sent_to_user_type: SENT_TO_USER_TYPE.ALL
              },
              {
                sent_to_user_type: SENT_TO_USER_TYPE.CUSTOM_LIST,
                to_user_ids: toObjectId(req.authUserId)
              }
            ],
            deletedAt: null
          };

          if (req.userCompanyId) {
            filterCondition = {
              ...filterCondition,
              company_id: toObjectId(req.userCompanyId)
            };
          } else {
            filterCondition = {
              ...filterCondition,
              company_id: null
            };
          }

          filterCondition.$or.push({
            sent_to_user_type: req.isUnderTrial
              ? SENT_TO_USER_TYPE.IN_TRIAL
              : req.accountType === ACCOUNT_TYPE.PAID && !req.isUnderTrial
                ? SENT_TO_USER_TYPE.PAID
                : req.accountType === ACCOUNT_TYPE.EXPIRED
                  ? SENT_TO_USER_TYPE.EXPIRED
                  : SENT_TO_USER_TYPE.NOT_SUBSCRIBED
          });

          const aggregateQuery = [
            {
              $match: filterCondition
            },
            {
              $lookup: {
                from: 'users',
                let: {
                  createdAt: '$createdAt'
                },
                pipeline: [
                  {
                    $match: {
                      _id: toObjectId(req.authUserId)
                      // $expr: {
                      //   $gte: ['$$createdAt', '$createdAt']
                      // }
                    }
                  },
                  {
                    $limit: 1
                  },
                  {
                    $project: {
                      _id: 1
                    }
                  }
                ],
                as: 'toUser'
              }
            },
            {
              $unwind: {
                path: '$toUser',
                preserveNullAndEmptyArrays: false
              }
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
                    $limit: 1
                  },
                  {
                    $project: {
                      name: 1,
                      user_profile: {
                        $concat: [
                          CLOUDFRONT_URL,
                          USER_MEDIA_PATH.USER_PROFILE,
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
                      $in: [toObjectId(req.authUserId), '$is_read_by']
                    },
                    then: true,
                    else: false
                  }
                }
              }
            },
            {
              $sort: {
                createdAt: -1,
                isRead: 1
              }
            },
            {
              $facet: {
                metadata: [{ $count: 'totalNotifications' }, { $addFields: { page, perPage } }],
                data: [{ $skip: skip }, { $limit: perPage }]
              }
            }
          ];

          const notificationDetailedData = await Notification.aggregate(aggregateQuery);

          let totalNotify = await Notification.find({
            deleted_by: {
              $ne: toObjectId(req.authUserId)
            },
            $or: [
              {
                sent_to_user_type: SENT_TO_USER_TYPE.ALL
              },
              {
                sent_to_user_type: SENT_TO_USER_TYPE.CUSTOM_LIST,
                to_user_ids: toObjectId(req.authUserId)
              }
            ]
          });

          let existingCount = await ContentCounts.findOne({ user_id: req.authUserId });
          if (existingCount) {
            await ContentCounts.updateOne(
              { user_id: req.authUserId },
              {
                $set: {
                  notifications: totalNotify.length
                }
              }
            );
          } else {
            await ContentCounts.create({
              notifications: totalNotify.length,
              user_id: req.authUserId
            });
          }

          if (notificationDetailedData.length > 0) {
            const notificationIds = notificationDetailedData[0].data.map((x) => x.id);

            await Notification.updateMany(
              { _id: { $in: notificationIds } },
              { $addToSet: { is_read_by: req.authUserId } }
            );

            let notifications = [...notificationDetailedData[0].data];
            let metadata = {
              totalNotifications: notifications.length,
              page: page,
              perPage: reqParam.perPage
            };

            Response.successResponseData(
              res,
              notifications,
              SUCCESS,
              res.__('notificationListSuccess'),
              notificationDetailedData[0].metadata[0] || metadata
            );
          } else {
            return Response.successResponseWithoutData(res, res.__('noNotificationFound'), FAIL);
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
   * @description This function is used to delete notification by logged in user
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  deleteNotification: (req, res) => {
    try {
      const reqParam = req.query;
      deleteNotificationValidation(reqParam, res, async (validate) => {
        if (validate) {
          const deleteCondition = {
            $addToSet: { deleted_by: req.authUserId }
          };
          await Notification.findByIdAndUpdate(reqParam.notificationId, deleteCondition);
          return Response.successResponseWithoutData(res, res.__('notificationDeleted'), SUCCESS);
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to get unread notification count of user.
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  unreadUserNotificationCount: async (req, res) => {
    try {
      const userCreatedDate = await Users.findById(req.authUserId).select('createdAt');
      let filterCondition = {
        createdAt: {
          $gte: userCreatedDate?.createdAt
        },
        deleted_by: {
          $ne: toObjectId(req.authUserId)
        },
        $or: [
          {
            sent_to_user_type: SENT_TO_USER_TYPE.ALL
          },
          {
            sent_to_user_type: SENT_TO_USER_TYPE.CUSTOM_LIST,
            to_user_ids: toObjectId(req.authUserId)
          }
        ],
        deletedAt: null,
        is_read_by: { $ne: toObjectId(req.authUserId) }
      };

      if (req.userCompanyId) {
        filterCondition = {
          ...filterCondition,
          company_id: toObjectId(req.userCompanyId)
        };
      } else {
        filterCondition = {
          ...filterCondition,
          company_id: null
        };
      }

      filterCondition.$or.push({
        sent_to_user_type: req.isUnderTrial
          ? SENT_TO_USER_TYPE.IN_TRIAL
          : req.accountType === ACCOUNT_TYPE.PAID && !req.isUnderTrial
            ? SENT_TO_USER_TYPE.PAID
            : req.accountType === ACCOUNT_TYPE.EXPIRED
              ? SENT_TO_USER_TYPE.EXPIRED
              : SENT_TO_USER_TYPE.NOT_SUBSCRIBED
      });
      const unreadNotificationCount = await Notification.countDocuments(filterCondition);
      return Response.successResponseData(
        res,
        unreadNotificationCount,
        SUCCESS,
        res.__('userNotificationCount')
      );
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  }
};
