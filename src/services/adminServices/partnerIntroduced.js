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

module.exports = {
  /**
   * @description This function is used to send new introduced companies uploaded notification to super admins
   * @param {*} userName
   * @param {*} fromUserId
   * @param {*} contentId
   * @param {*} contentType
   */
  newIntroduceCompany: async (userName, fromUserId) => {
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

    if (superAdminTokens.length > 0 && superAdminTokens[0].toUserIds) {
      const reqData = {
        title: INTRODUCE_COMPANY_APPROVAL,
        message: `${userName}` + INTRODUCE_COMPANY_APPROVAL_MESSAGE.REQUEST,
        notificationType: NOTIFICATION_TYPE.INTRODUCED_COMPANY_NOTIFICATION
      };
      const newData = {
        title: INTRODUCE_COMPANY_APPROVAL,
        message: `${userName}` + INTRODUCE_COMPANY_APPROVAL_MESSAGE.REQUEST,
        sent_to_user_type: SENT_TO_USER_TYPE.CUSTOM_LIST,
        from_user_id: fromUserId,
        type: NOTIFICATION_TYPE.INTRODUCED_COMPANY_NOTIFICATION,
        to_user_ids: superAdminTokens[0].toUserIds
      };

      await Notification.create(newData);

      if (superAdminTokens[0].deviceTokens.length > 0) {
        await sendNotification(
          superAdminTokens[0].deviceTokens,
          reqData.message,
          reqData,
          NOTIFICATION_ACTION.INTRODUCE_COMPANY_NOTIFY
        );
      }
    }
  }
};
