'use strict';

const { Notification, Users } = require('@models');
const { SENT_TO_USER_TYPE, NOTIFICATION_TYPE } = require('@services/Constant');
const { sendNotification } = require('@services/Notify');
const { TRIAL_ADDED, TRIAL_NOTIFICATION, NOTIFICATION_ACTION } = require('../Constant');
const { toObjectId } = require('../Helper');

module.exports = {
  /**
   * @description This function is used to send free trial notify to users
   * @param {*} days
   * @param {*} fromUserId
   * @param {*} toUserId
   */
  trialNotification: async (fromUserId, days, toUserId) => {
    const userTokens = await Users.aggregate([
      {
        $match: {
          _id: toObjectId(toUserId),
          deletedAt: null
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
    if (userTokens.length > 0 && userTokens[0].toUserIds && userTokens[0].deviceTokens.length > 0) {
      const reqData = {
        title: TRIAL_ADDED,
        message: `Shoorah sent ` + `${days}` + TRIAL_NOTIFICATION.APPROVED,
        notificationType: NOTIFICATION_TYPE.TRAIL
      };
      const newData = {
        title: TRIAL_ADDED,
        message: `Shoorah sent ` + `${days}` + TRIAL_NOTIFICATION.APPROVED,
        sent_to_user_type: SENT_TO_USER_TYPE.CUSTOM_LIST,
        from_user_id: fromUserId,
        type: NOTIFICATION_TYPE.TRAIL,
        to_user_ids: userTokens[0].toUserIds
      };
      await Notification.create(newData);
      await sendNotification(
        userTokens[0].deviceTokens,
        reqData.message,
        reqData,
        NOTIFICATION_ACTION.TRIAL
      );
    }
  }
};
