'use strict';

const Admin = require('@config/firebase').default;
const { FirebaseMessagingError } = require('firebase-admin').messaging;
const { DeviceTokens } = require('@models');
module.exports = {
  /**
   * @description This function is used to send push notification
   * @param {*} to
   * @param {*} reqBody
   * @param {*} reqdata
   * @param {*} action
   */
  sendNotification: async (to, reqBody, reqData, reqAction) => {
    console.log('to', to);
    for (const token of to) {
      const payload = {
        tokens: [token],
        notification: {
          title: reqData.title || process.env.APP_NAME,
          body: reqBody
        },
        data: {
          data: JSON.stringify(reqData),
          action: reqAction
        },
        'content-available': true,
        webpush: {
          fcmOptions: {
            link: `${process.env.ADMIN_DOMAIN}/notifications`
          },
          headers: {
            Urgency: 'high'
          }
        },

        apns: {
          payload: {
            aps: {
              'mutable-content': 1,
              sound: 'default',
              alert: {},
              click_action: reqAction
            },
            CustomData: {
              click_action: reqAction
            }
          }
        }
      };
      // console.log('payload', payload);
      try {
        const response = await Admin.messaging().sendEachForMulticast(payload);

        if (response.successCount > 0) {
          console.log('Notification Successfully sent', response.successCount);
        }
        if (response.failureCount > 0) {
          if (
            response.responses[0].error.errorInfo.code ===
              'messaging/registration-token-not-registered' ||
            response.responses[0].error.errorInfo.code === 'messaging/invalid-argument'
          ) {
            await DeviceTokens.deleteOne({ device_token: token })
              .then(() => console.log('device token deleted'))
              .catch((e) => {
                console.log('Unable to delete Device Token:', e);
              });
            console.log('Invalid recipient:', token);
          }
          console.log('response:', response.responses[0]);
          console.log('Sent notification fail', response.failureCount);
        }
        return response;
      } catch (err) {
        return { success: false, error: err };
      }
    }
  }
};
