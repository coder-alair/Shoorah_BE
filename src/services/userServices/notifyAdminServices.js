'use strict';

const { Notification, Users } = require('@models');
const {
  SENT_TO_USER_TYPE,
  NOTIFICATION_TYPE,
  USER_TYPE,
  ACCOUNT_STATUS,
  INTRODUCE_COMPANY_APPROVAL_MESSAGE,
  NOTIFICATION_ACTION,
  INTRODUCE_COMPANY_APPROVAL
} = require('@services/Constant');
const { sendNotification } = require('@services/Notify');
const {
  APP_ISSUE_REPORTED,
  APP_ISSUE_USER_REPORTED,
  COMPANY_AUTO_RENEW_STATUS,
  NEW_SURVEY_REPORTED,
  SURVEY_REPORTED,
  SURVEY_SCOPE
} = require('../Constant');
const { toObjectId } = require('../Helper');

module.exports = {
  /**
   * @description This function is used to send new introduced companies uploaded notification to super admins
   * @param {*} userName
   * @param {*} fromUserId
   * @param {*} contentId
   * @param {*} contentType
   */
  newAppIssue: async (userName, fromUserId) => {
    const superAdminTokens = await Users.aggregate([
      {
        $match: {
          user_type: USER_TYPE.SUPER_ADMIN,
          status: ACCOUNT_STATUS.ACTIVE
        }
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
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: null,
          deviceTokens: {
            $addToSet: '$result.device_token'
          },
          toUserIds: {
            $addToSet: '$_id'
          }
        }
      }
    ]);
    if (
      superAdminTokens.length > 0 &&
      superAdminTokens[0].toUserIds &&
      superAdminTokens[0].deviceTokens.length > 0
    ) {
      const reqData = {
        title: APP_ISSUE_REPORTED,
        message: `${userName}` + APP_ISSUE_USER_REPORTED.REQUEST,
        notificationType: NOTIFICATION_TYPE.APP_ISSUE
      };
      const newData = {
        title: APP_ISSUE_REPORTED,
        message: `${userName}` + APP_ISSUE_USER_REPORTED.REQUEST,
        sent_to_user_type: SENT_TO_USER_TYPE.CUSTOM_LIST,
        from_user_id: fromUserId,
        type: NOTIFICATION_TYPE.APP_ISSUE,
        to_user_ids: superAdminTokens[0].toUserIds
      };
      await Notification.create(newData);
      await sendNotification(
        superAdminTokens[0].deviceTokens,
        reqData.message,
        reqData,
        NOTIFICATION_ACTION.APP_ISSUE
      );
    }
  },

  companyAutoRenewStatus: async (userName, fromUserId) => {
    const superAdminTokens = await Users.aggregate([
      {
        $match: {
          user_type: USER_TYPE.SUPER_ADMIN,
          status: ACCOUNT_STATUS.ACTIVE
        }
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
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: null,
          deviceTokens: {
            $addToSet: '$result.device_token'
          },
          toUserIds: {
            $addToSet: '$_id'
          }
        }
      }
    ]);
    if (
      superAdminTokens.length > 0 &&
      superAdminTokens[0].toUserIds &&
      superAdminTokens[0].deviceTokens.length > 0
    ) {
      const reqData = {
        title: COMPANY_AUTO_RENEW_STATUS.NOTIFY,
        message: `${userName}` + COMPANY_AUTO_RENEW_STATUS.CANCELLED,
        notificationType: NOTIFICATION_TYPE.COMPANY_STATS_REMINDER
      };
      const newData = {
        title: COMPANY_AUTO_RENEW_STATUS.NOTIFY,
        message: `${userName}` + COMPANY_AUTO_RENEW_STATUS.CANCELLED,
        sent_to_user_type: SENT_TO_USER_TYPE.CUSTOM_LIST,
        from_user_id: fromUserId,
        type: NOTIFICATION_TYPE.COMPANY_STATS_REMINDER,
        to_user_ids: superAdminTokens[0].toUserIds
      };
      await Notification.create(newData);
      await sendNotification(
        superAdminTokens[0].deviceTokens,
        reqData.message,
        reqData,
        NOTIFICATION_ACTION.COMPANY_STATUS
      );
    }
  },

  sendSurveyNotificationsToUsers: async (sentBy, fromUserId, type) => {
    let filterCondition = {
      user_type: USER_TYPE.USER,
      status: ACCOUNT_STATUS.ACTIVE
    };

    switch (type) {
      case SURVEY_SCOPE.B2B:
        filterCondition = {
          ...filterCondition,
          company_id: {
            $ne: null
          }
        };
        break;
      case SURVEY_SCOPE.B2C:
        filterCondition = {
          ...filterCondition,
          company_id: {
            $eq: null
          }
        };
        break;
      default:
        null;
    }

    const userTokens = await Users.aggregate([
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
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: null,
          deviceTokens: {
            $addToSet: '$result.device_token'
          },
          toUserIds: {
            $addToSet: '$_id'
          }
        }
      }
    ]);
    if (userTokens.length > 0 && userTokens[0].toUserIds && userTokens[0].deviceTokens.length > 0) {
      const reqData = {
        title: NEW_SURVEY_REPORTED,
        message: `${sentBy}` + SURVEY_REPORTED.SEND,
        notificationType: NOTIFICATION_TYPE.NEW_SURVEY
      };
      const newData = {
        title: NEW_SURVEY_REPORTED,
        message: `${sentBy}` + SURVEY_REPORTED.SEND,
        sent_to_user_type: SENT_TO_USER_TYPE.CUSTOM_LIST,
        from_user_id: fromUserId,
        type: NOTIFICATION_TYPE.NEW_SURVEY,
        to_user_ids: userTokens[0].toUserIds
      };
      await Notification.create(newData);
      await sendNotification(
        userTokens[0].deviceTokens,
        reqData.message,
        reqData,
        NOTIFICATION_ACTION.NEW_SURVEY_NOTIFY
      );
    }
  },

  sendSurveyB2BNotificationsToUsers: async (sentBy, fromUserId, fromCompanyId) => {
    let filterCondition = {
      user_type: USER_TYPE.USER,
      company_id: toObjectId(fromCompanyId),
      status: ACCOUNT_STATUS.ACTIVE
    };

    const userTokens = await Users.aggregate([
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
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: null,
          deviceTokens: {
            $addToSet: '$result.device_token'
          },
          toUserIds: {
            $addToSet: '$_id'
          }
        }
      }
    ]);
    if (userTokens.length > 0 && userTokens[0].toUserIds && userTokens[0].deviceTokens.length > 0) {
      const reqData = {
        title: NEW_SURVEY_REPORTED,
        message: `${sentBy}` + SURVEY_REPORTED.SEND,
        notificationType: NOTIFICATION_TYPE.NEW_SURVEY
      };
      const newData = {
        title: NEW_SURVEY_REPORTED,
        message: `${sentBy}` + SURVEY_REPORTED.SEND,
        sent_to_user_type: SENT_TO_USER_TYPE.CUSTOM_LIST,
        from_user_id: fromUserId,
        type: NOTIFICATION_TYPE.NEW_SURVEY,
        to_user_ids: userTokens[0].toUserIds
      };
      await Notification.create(newData);
      await sendNotification(
        userTokens[0].deviceTokens,
        reqData.message,
        reqData,
        NOTIFICATION_ACTION.NEW_SURVEY_NOTIFY
      );
    }
  },

  expertApproval: async (userName, fromUserId) => {
    const superAdminTokens = await Users.aggregate([
      {
        $match: {
          user_type: USER_TYPE.SUPER_ADMIN,
          status: ACCOUNT_STATUS.ACTIVE
        }
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
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: null,
          deviceTokens: {
            $addToSet: '$result.device_token'
          },
          toUserIds: {
            $addToSet: '$_id'
          }
        }
      }
    ]);
    if (
      superAdminTokens.length > 0 &&
      superAdminTokens[0].toUserIds &&
      superAdminTokens[0].deviceTokens.length > 0
    ) {
      const reqData = {
        title: 'please approve profile..',
        message: `${userName}` + COMPANY_AUTO_RENEW_STATUS.CANCELLED,
        notificationType: NOTIFICATION_TYPE.COMPANY_STATS_REMINDER
      };
      const newData = {
        title: 'please approve..',
        message: `${userName}` + COMPANY_AUTO_RENEW_STATUS.CANCELLED,
        sent_to_user_type: SENT_TO_USER_TYPE.CUSTOM_LIST,
        from_user_id: fromUserId,
        type: NOTIFICATION_TYPE.COMPANY_STATS_REMINDER,
        to_user_ids: superAdminTokens[0].toUserIds
      };
      await Notification.create(newData);
      await sendNotification(
        superAdminTokens[0].deviceTokens,
        reqData.message,
        reqData,
        NOTIFICATION_ACTION.COMPANY_STATUS
      );
    }
  }
};
