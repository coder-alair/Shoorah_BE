'use strict';

const { Notification, Users } = require('@models');
const {
  SENT_TO_USER_TYPE,
  NOTIFICATION_TYPE,
  USER_TYPE,
  ACCOUNT_STATUS,
  CONTENT_APPROVAL_MESSAGE,
  NOTIFICATION_ACTION
} = require('@services/Constant');
const { sendNotification } = require('@services/Notify');
const {
  COMPANY_UPDATE_NOTIFY,
  COMPANY_UPDATE_NOTIFY_MESSAGE,
  NEW_SURVEY_REPORTED,
  SURVEY_REPORTED,
  CONTENT_TYPE,
  SURVEY_APPROVAL_UPDATE_NOTIFY
} = require('../Constant');
const { toObjectId } = require('../Helper');
const { sendReusableTemplate } = require('../Mailer');

module.exports = {
  /**
   * @description This function is used to send new content uploaded notification to super admins
   * @param {*} userName
   * @param {*} fromUserId
   * @param {*} contentId
   * @param {*} contentType
   */
  newCompanyNotify: async (userName, fromUserId, companyId, message) => {
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
        title: COMPANY_UPDATE_NOTIFY,
        message: `${userName}` + `${message}`,
        notificationType: NOTIFICATION_TYPE.COMPANY_UPDATE_NOTIFY
      };
      const newData = {
        title: COMPANY_UPDATE_NOTIFY,
        message: `${userName}` + `${message}`,
        sent_to_user_type: SENT_TO_USER_TYPE.CUSTOM_LIST,
        from_user_id: fromUserId,
        type: NOTIFICATION_TYPE.COMPANY_UPDATE_NOTIFY,
        to_user_ids: superAdminTokens[0].toUserIds,
        company_id: companyId
      };
      await Notification.create(newData);
      await sendNotification(
        superAdminTokens[0].deviceTokens,
        reqData.message,
        reqData,
        NOTIFICATION_ACTION.COMPANY_UPDATE_NOTIFY
      );
    }
  },

  CompanyAdminNotify: async (userName, companyId, message) => {
    try {
      // Find company admins for the given companyId
      const companyAdminTokens = await Users.aggregate([
        {
          $match: {
            user_type: USER_TYPE.COMPANY_ADMIN, // Now targeting COMPANY_ADMIN
            status: ACCOUNT_STATUS.ACTIVE,
            company_id: mongoose.Types.ObjectId(companyId) // Match by company ID
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
        companyAdminTokens.length > 0 &&
        companyAdminTokens[0].toUserIds &&
        companyAdminTokens[0].deviceTokens.length > 0
      ) {
        const reqData = {
          title: COMPANY_UPDATE_NOTIFY,
          message: `${userName}` + `${message}`,
          notificationType: NOTIFICATION_TYPE.COMPANY_UPDATE_NOTIFY
        };
        const newData = {
          title: COMPANY_UPDATE_NOTIFY,
          message: `${userName}` + `${message}`,
          sent_to_user_type: SENT_TO_USER_TYPE.CUSTOM_LIST,
          from_user_id: 'Shoorah',
          type: NOTIFICATION_TYPE.COMPANY_UPDATE_NOTIFY,
          to_user_ids: companyAdminTokens[0].toUserIds,
          company_id: companyId
        };
        await Notification.create(newData);
        await sendNotification(
          companyAdminTokens[0].deviceTokens,
          reqData.message,
          reqData,
          NOTIFICATION_ACTION.COMPANY_UPDATE_NOTIFY
        );
      }
    } catch (error) {
      console.error('Error sending notification to company admin:', error);
      // You might want to handle the error more gracefully or even throw it, depending on your needs
    }
  },

  /**
   * @description This function is used to send new survey uploaded notification to B2b admins
   * @param {*} userName
   * @param {*} fromUserId
   * @param {*} contentId
   * @param {*} contentType
   */
  newSurveyUploadedNotification: async (userName, fromUserId, companyId, surveyId) => {
    const b2bAdmins = await Users.aggregate([
      {
        $match: {
          company_id: toObjectId(companyId),
          user_type: USER_TYPE.COMPANY_ADMIN,
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
    if (b2bAdmins.length > 0 && b2bAdmins[0].toUserIds && b2bAdmins[0].deviceTokens.length > 0) {
      const reqData = {
        title: NEW_SURVEY_REPORTED,
        message: `${userName}` + SURVEY_REPORTED.REQUEST,
        notificationType: NOTIFICATION_TYPE.B2B_CONTENT_APPROVAL_REQUEST
      };
      const newData = {
        title: NEW_SURVEY_REPORTED,
        message: `${userName}` + SURVEY_REPORTED.REQUEST,
        sent_to_user_type: SENT_TO_USER_TYPE.CUSTOM_LIST,
        from_user_id: fromUserId,
        type: NOTIFICATION_TYPE.B2B_CONTENT_APPROVAL_REQUEST,
        to_user_ids: b2bAdmins[0].toUserIds,
        content_id: surveyId,
        content_type: CONTENT_TYPE.SURVEY,
        company_id: toObjectId(companyId)
      };
      await Notification.create(newData);
      await sendNotification(
        b2bAdmins[0].deviceTokens,
        reqData.message,
        reqData,
        NOTIFICATION_ACTION.SURVEY_APPROVAL_REQUEST
      );
    }
  },

  /**
   * @description This function is used to add notifiation
   * @param {*} notifyObj
   * @returns {*}
   */

  createB2BContentApprovalStatusNotification: async (notifyObj) => {
    notifyObj = {
      ...notifyObj,
      sent_to_user_type: SENT_TO_USER_TYPE.CUSTOM_LIST,
      type: NOTIFICATION_TYPE.B2B_CONTENT_APPROVAL_STATUS,
      content_type: notifyObj.content_type,
      content_id: notifyObj.content_id,
      company_id: notifyObj.company_id
    };
    const newNotification = await Notification.create(notifyObj);
    return newNotification;
  },

  updateB2BContentUploadedNotification: async (
    userName,
    fromUserId,
    companyId,
    contentId,
    contentType,
    customData
  ) => {
    const b2bAdmins = await Users.aggregate([
      {
        $match: {
          company_id: toObjectId(companyId),
          user_type: customData?.userType || USER_TYPE.COMPANY_ADMIN,
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
    if (b2bAdmins.length > 0 && b2bAdmins[0].toUserIds && b2bAdmins[0].deviceTokens.length > 0) {
      const reqData = {
        title: customData?.title || SURVEY_APPROVAL_UPDATE_NOTIFY,
        message: customData?.message || `${userName}` + CONTENT_APPROVAL_MESSAGE.UPDATE(),
        notificationType: customData?.notificationType || NOTIFICATION_TYPE.CONTENT_UPDATE_NOTIFY
      };
      const newData = {
        title: customData?.title || SURVEY_APPROVAL_UPDATE_NOTIFY,
        message: customData?.message || `${userName}` + CONTENT_APPROVAL_MESSAGE.UPDATE(),
        sent_to_user_type: SENT_TO_USER_TYPE.CUSTOM_LIST,
        from_user_id: fromUserId,
        type: customData?.notificationType || NOTIFICATION_TYPE.CONTENT_UPDATE_NOTIFY,
        to_user_ids: b2bAdmins[0].toUserIds,
        content_id: contentId,
        content_type: contentType,
        company_id: toObjectId(companyId)
      };
      await Notification.create(newData);
      await sendNotification(
        b2bAdmins[0].deviceTokens,
        reqData.message,
        reqData,
        customData?.notificationType || NOTIFICATION_ACTION.CONTENT_UPDATE_NOTIFY
      );

      if (b2bAdmins[0]?.emails) {
        for await (const email of b2bAdmins[0].emails) {
          let user = await Users.findOne({
            email: email,
            user_type: customData?.userType || USER_TYPE.COMPANY_ADMIN,
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
              'One of the Contents is updated by sub admin on your company. click the go to dashboard button to go to website.',
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
