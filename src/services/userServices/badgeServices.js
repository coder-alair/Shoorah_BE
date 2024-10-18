'use strict';

const { internalServerErrorResponse } = require('@services/Response');
const { UserBadges, DeviceTokens } = require('@models');
const {
  NOTIFICATION_TYPE,
  NOTIFICATION_ACTION,
  BRONZE_CATEGORY_DESCRIPTION,
  SILVER_CATEGORY_DESCRIPTION,
  GOLD_CATEGORY_DESCRIPTION,
  PLATINUM_CATEGORY_DESCRIPTION,
  DIAMOND_CATEGORY_DESCRIPTION,
  BADGE_TYPE,
  CATEGORY_TYPE,
  CATEGORY_TITLE
} = require('@services/Constant');
const { sendNotification } = require('@services/Notify');

module.exports = {
  /**
   * @description This function is used to update user badges
   * @param {*} userId
   * @param {*} categoryType
   * @param {*} badgeType
   * @param {*} res
   * @returns {*}
   */
  updateBadges: async (userId, categoryType, badgeType, res) => {
    try {
      const filterCondition = {
        user_id: userId,
        category_type: categoryType,
        badge_type: badgeType,
        deletedAt: null
      };
      const badgeDetails = await UserBadges.findOne(filterCondition).select('badge_type');
      if (badgeDetails) {
        return false;
      } else {
        const updateCondition = {
          badge_type: badgeType
        };
        await UserBadges.updateOne(filterCondition, updateCondition, { upsert: true });
        return true;
      }
    } catch (err) {
      return internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to send badge received notification
   * @param {*} userId
   * @param {*} badgeType
   */
  sendBadgeNotification: async (userId, categoryType, badgeType) => {
    let description;
    switch (badgeType) {
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
    const reqData = {
      title: CATEGORY_TITLE.CLEANSE,
      description: description.CLEANSE,
      notificationType: NOTIFICATION_TYPE.BADGE_NOTIFICATION,
      badgeType
    };
    switch (categoryType) {
      case CATEGORY_TYPE.CLEANSE:
        reqData.title = CATEGORY_TITLE.CLEANSE;
        reqData.description = description.CLEANSE;
        break;
      case CATEGORY_TYPE.NOTES:
        reqData.title = CATEGORY_TITLE.NOTES;
        reqData.description = description.NOTES;
        break;
      case CATEGORY_TYPE.USER_GRATITUDE:
        reqData.title = CATEGORY_TITLE.USER_GRATITUDE;
        reqData.description = description.USER_GRATITUDE;
        break;
      case CATEGORY_TYPE.GOALS:
        reqData.title = CATEGORY_TITLE.GOALS;
        reqData.description = description.GOALS;
        break;
      case CATEGORY_TYPE.USER_RITUALS:
        reqData.title = CATEGORY_TITLE.USER_RITUALS;
        reqData.description = description.USER_RITUALS;
        break;
      case CATEGORY_TYPE.AFFIRMATION:
        reqData.title = CATEGORY_TITLE.AFFIRMATION;
        reqData.description = description.AFFIRMATION;
        break;
      case CATEGORY_TYPE.FEATURE_USED:
        reqData.title = CATEGORY_TITLE.FEATURE_USED;
        reqData.description = description.FEATURE_USED;
        break;
      case CATEGORY_TYPE.LISTEN_MEDITATION:
        reqData.title = CATEGORY_TITLE.LISTEN_MEDITATION;
        reqData.description = description.LISTEN_MEDITATION;
        break;
      case CATEGORY_TYPE.LISTEN_SOUND:
        reqData.title = CATEGORY_TITLE.LISTEN_SOUND;
        reqData.description = description.LISTEN_SOUND;
        break;
      case CATEGORY_TYPE.RECEIVED_NOTIFICATION:
        reqData.title = CATEGORY_TITLE.RECEIVED_NOTIFICATION;
        reqData.description = description.RECEIVED_NOTIFICATION;
        break;
      case CATEGORY_TYPE.TIME_SUBSCRIBED_ON_APP:
        reqData.title = CATEGORY_TITLE.TIME_SUBSCRIBED_ON_APP;
        reqData.description = description.TIME_SUBSCRIBED_ON_APP;
        break;
      case CATEGORY_TYPE.SHOORAH_POD:
        reqData.title = CATEGORY_TITLE.SHOORAH_PODS;
        reqData.description = description.SHOORAH_PODS;
        break;
      case CATEGORY_TYPE.SHURU_USAGE:
        reqData.title = CATEGORY_TITLE.SHURU_TIME_SPENT;
        reqData.description = description.SHURU_TIME;
        break;
    }
    const deviceTokenData = await DeviceTokens.find(
      { user_id: userId, deletedAt: null },
      { device_token: 1 }
    );
    const deviceTokens = deviceTokenData.map((x) => x.device_token);
    await sendNotification(
      deviceTokens,
      reqData.title,
      reqData,
      NOTIFICATION_ACTION.BADGE_RECEIVED
    );
  }
};
