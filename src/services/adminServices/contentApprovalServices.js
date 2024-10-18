'use strict';

const { Notification, Users } = require('@models');
const {
  SENT_TO_USER_TYPE,
  NOTIFICATION_TYPE,
  USER_TYPE,
  ACCOUNT_STATUS,
  CONTENT_APPROVAL_MESSAGE,
  NOTIFICATION_ACTION,
  CONTENT_APPROVAL_REQUEST,
  CONTENT_TYPE_MAPPING
} = require('@services/Constant');
const { sendNotification } = require('@services/Notify');
const { CONTENT_UPDATE_NOTIFY } = require('../Constant');
const { sendReusableTemplate } = require('../Mailer');

module.exports = {
  /**
   * @description This function is used to send new content uploaded notification to super admins
   * @param {*} userName
   * @param {*} fromUserId
   * @param {*} contentId
   * @param {*} contentType
   */
  newContentUploadedNotification: async (userName, fromUserId, contentId, contentType) => {
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
        title: CONTENT_APPROVAL_REQUEST(CONTENT_TYPE_MAPPING[contentType]),
        message:
          `${userName}` + CONTENT_APPROVAL_MESSAGE.REQUEST(CONTENT_TYPE_MAPPING[contentType]),
        notificationType: NOTIFICATION_TYPE.CONTENT_APPROVAL_REQUEST
      };
      const newData = {
        title: CONTENT_APPROVAL_REQUEST(CONTENT_TYPE_MAPPING[contentType]),
        message:
          `${userName}` + CONTENT_APPROVAL_MESSAGE.REQUEST(CONTENT_TYPE_MAPPING[contentType]),
        sent_to_user_type: SENT_TO_USER_TYPE.CUSTOM_LIST,
        from_user_id: fromUserId,
        type: NOTIFICATION_TYPE.CONTENT_APPROVAL_REQUEST,
        to_user_ids: superAdminTokens[0].toUserIds,
        content_id: contentId,
        content_type: contentType
      };
      await Notification.create(newData);
      await sendNotification(
        superAdminTokens[0].deviceTokens,
        reqData.message,
        reqData,
        NOTIFICATION_ACTION.CONTENT_APPROVAL_REQUEST
      );
    }
  },

  /**
   * @description This function is used to add notifiation
   * @param {*} notifyObj
   * @returns {*}
   */
  createContentApprovalStatusNotification: async (notifyObj) => {
    notifyObj = {
      ...notifyObj,
      sent_to_user_type: SENT_TO_USER_TYPE.CUSTOM_LIST,
      type: NOTIFICATION_TYPE.CONTENT_APPROVAL_STATUS,
      content_type: notifyObj.content_type,
      content_id: notifyObj.content_id
    };
    const newNotification = await Notification.create(notifyObj);
    return newNotification;
  },

  updateContentUploadedNotification: async (
    userName,
    fromUserId,
    contentId,
    contentType,
    customData
  ) => {
    const adminTokens = await Users.aggregate([
      {
        $match: {
          user_type: customData?.userType || USER_TYPE.SUPER_ADMIN,
          status: ACCOUNT_STATUS.ACTIVE,
          ...(customData.userId ? { _id: customData.userId } : {})
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
          },
          emails: {
            $addToSet: '$email'
          }
        }
      }
    ]);
    if (
      adminTokens.length > 0 &&
      adminTokens[0].toUserIds &&
      adminTokens[0].deviceTokens.length > 0
    ) {
      const reqData = {
        title: customData?.title || CONTENT_UPDATE_NOTIFY,
        message: customData?.message || `${userName}` + CONTENT_APPROVAL_MESSAGE.UPDATE(),
        notificationType: customData?.notificationType || NOTIFICATION_TYPE.CONTENT_UPDATE_NOTIFY
      };
      const newData = {
        title: customData?.title || CONTENT_UPDATE_NOTIFY,
        message: customData?.message || `${userName}` + CONTENT_APPROVAL_MESSAGE.UPDATE(),
        sent_to_user_type: SENT_TO_USER_TYPE.CUSTOM_LIST,
        from_user_id: fromUserId,
        type: customData?.notificationType || NOTIFICATION_TYPE.CONTENT_UPDATE_NOTIFY,
        to_user_ids: adminTokens[0].toUserIds,
        content_id: contentId,
        content_type: contentType
      };
      await Notification.create(newData);
      await sendNotification(
        adminTokens[0].deviceTokens,
        reqData.message,
        reqData,
        customData?.notificationType || NOTIFICATION_ACTION.CONTENT_UPDATE_NOTIFY
      );

      if (adminTokens[0]?.emails) {
        for await (const email of adminTokens[0].emails) {
          let user = await Users.findOne({
            email: email,
            user_type: customData?.userType || USER_TYPE.SUPER_ADMIN,
            deletedAt: null
          });
          let locals = {
            title: customData?.email?.title || customData?.title || 'Content Update Alert',
            titleSubtitle: customData?.email?.subTitle || customData?.message || '',
            titleButton: customData?.email?.titleButton || 'Go to dashboard',
            titleButtonUrl: customData?.email?.titleButtonUrl || 'https://admin.shoorah.io',
            titleImage:
              customData?.email?.titleImage ||
              'https://staging-media.shoorah.io/email_assets/Shoorah_brain.png',
            name: customData?.email?.name || user.name,
            firstLine:
              customData?.email?.firstLine ||
              " We're thrilled to have you join our community dedicated to mental wellness and self-care. Remember, you're not alone on this journey.",
            secondLine:
              customData?.email?.secondLine ||
              'Pause for a moment and take a deep breath. Bring your attention to the present moment. Embrace the here and now, letting go of worries about the past or future. You are exactly where you need to be.',
            thirdLine:
              customData?.email?.thirdLine ||
              'One of the Contents is updated by admins on shoorah admin panel. click the go to dashboard button to go to website.',
            regards: 'The Shoorah Team'
          };

          await sendReusableTemplate(
            user.email,
            locals,
            customData?.email?.subject || 'Content Updated'
          );
        }
      }
    }
  }
};
