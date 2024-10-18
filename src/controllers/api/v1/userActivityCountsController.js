'use strict';

const { UserActivityCounts } = require('@models');
const Response = require('@services/Response');
const {
  updateUserActivityCountValidation
} = require('@services/userValidations/userActivityCountsValidations');
const { FEATURE_TYPE, CATEGORY_TYPE, BADGE_TYPE, SUCCESS } = require('@services/Constant');
const { updateBadges, sendBadgeNotification } = require('@services/userServices/badgeServices');
const { ContentCounts } = require('../../../models');

module.exports = {
  /**
   * @description This function is used to update user activity count
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  updateUserActivityCount: (req, res) => {
    try {
      const reqParam = req.body;
      updateUserActivityCountValidation(reqParam, res, async (validate) => {
        if (validate) {
          const filterData = {
            user_id: req.authUserId,
            feature_type: reqParam.featureType,
            deletedAt: null
          };
          const updateData = {
            $inc: {
              count: 1
            }
          };
          let totalCount;
          const UserActivityCount = await UserActivityCounts.findOneAndUpdate(
            filterData,
            updateData,
            {
              upsert: true,
              new: true
            }
          ).select('feature_type count');
          let badgeReceived = false;
          let existingCount = await ContentCounts.findOne({ user_id: req.authUserId });
          if (UserActivityCount.feature_type === FEATURE_TYPE.AFFIRMATION) {
            totalCount = UserActivityCount.count;
            if (existingCount) {
              await ContentCounts.updateOne(
                { user_id: req.authUserId },
                {
                  $set: {
                    affirmations: totalCount
                  }
                }
              );
            } else {
              await ContentCounts.create({
                $set: {
                  affirmations: totalCount,
                  user_id: req.authUserId
                }
              });
            }
            switch (UserActivityCount.count) {
              case 1:
                badgeReceived = await updateBadges(
                  req.authUserId,
                  CATEGORY_TYPE.AFFIRMATION,
                  BADGE_TYPE.BRONZE
                );

                badgeReceived &&
                  (await sendBadgeNotification(
                    req.authUserId,
                    CATEGORY_TYPE.AFFIRMATION,
                    BADGE_TYPE.BRONZE
                  ));
                break;
              case 5:
                badgeReceived = await updateBadges(
                  req.authUserId,
                  CATEGORY_TYPE.AFFIRMATION,
                  BADGE_TYPE.SILVER
                );
                badgeReceived &&
                  (await sendBadgeNotification(
                    req.authUserId,
                    CATEGORY_TYPE.AFFIRMATION,
                    BADGE_TYPE.SILVER
                  ));
                break;
              case 10:
                badgeReceived = await updateBadges(
                  req.authUserId,
                  CATEGORY_TYPE.AFFIRMATION,
                  BADGE_TYPE.GOLD
                );
                badgeReceived &&
                  (await sendBadgeNotification(
                    req.authUserId,
                    CATEGORY_TYPE.AFFIRMATION,
                    BADGE_TYPE.GOLD
                  ));
                break;
              case 15:
                badgeReceived = await updateBadges(
                  req.authUserId,
                  CATEGORY_TYPE.AFFIRMATION,
                  BADGE_TYPE.PLATINUM
                );
                badgeReceived &&
                  (await sendBadgeNotification(
                    req.authUserId,
                    CATEGORY_TYPE.AFFIRMATION,
                    BADGE_TYPE.PLATINUM
                  ));
                break;
              case 25:
                badgeReceived = await updateBadges(
                  req.authUserId,
                  CATEGORY_TYPE.AFFIRMATION,
                  BADGE_TYPE.DIAMOND
                );
                badgeReceived &&
                  (await sendBadgeNotification(
                    req.authUserId,
                    CATEGORY_TYPE.AFFIRMATION,
                    BADGE_TYPE.DIAMOND
                  ));
                break;
            }
          } else if (UserActivityCount.feature_type === FEATURE_TYPE.LISTEN_MEDITATION) {
            totalCount = UserActivityCount.count;
            if (existingCount) {
              await ContentCounts.updateOne(
                { user_id: req.authUserId },
                {
                  $set: {
                    meditation: totalCount
                  }
                }
              );
            } else {
              await ContentCounts.create({
                meditation: totalCount,
                user_id: req.authUserId
              });
            }
            switch (UserActivityCount.count) {
              case 1:
                badgeReceived = await updateBadges(
                  req.authUserId,
                  CATEGORY_TYPE.LISTEN_MEDITATION,
                  BADGE_TYPE.BRONZE
                );
                badgeReceived &&
                  (await sendBadgeNotification(
                    req.authUserId,
                    CATEGORY_TYPE.LISTEN_MEDITATION,
                    BADGE_TYPE.BRONZE
                  ));
                break;
              case 10:
                badgeReceived = await updateBadges(
                  req.authUserId,
                  CATEGORY_TYPE.LISTEN_MEDITATION,
                  BADGE_TYPE.SILVER
                );
                badgeReceived &&
                  (await sendBadgeNotification(
                    req.authUserId,
                    CATEGORY_TYPE.LISTEN_MEDITATION,
                    BADGE_TYPE.SILVER
                  ));
                break;
              case 15:
                badgeReceived = await updateBadges(
                  req.authUserId,
                  CATEGORY_TYPE.LISTEN_MEDITATION,
                  BADGE_TYPE.GOLD
                );
                badgeReceived &&
                  (await sendBadgeNotification(
                    req.authUserId,
                    CATEGORY_TYPE.LISTEN_MEDITATION,
                    BADGE_TYPE.GOLD
                  ));
                break;
              case 25:
                badgeReceived = await updateBadges(
                  req.authUserId,
                  CATEGORY_TYPE.LISTEN_MEDITATION,
                  BADGE_TYPE.PLATINUM
                );
                badgeReceived &&
                  (await sendBadgeNotification(
                    req.authUserId,
                    CATEGORY_TYPE.LISTEN_MEDITATION,
                    BADGE_TYPE.PLATINUM
                  ));
                break;
              case 50:
                badgeReceived = await updateBadges(
                  req.authUserId,
                  CATEGORY_TYPE.LISTEN_MEDITATION,
                  BADGE_TYPE.DIAMOND
                );
                badgeReceived &&
                  (await sendBadgeNotification(
                    req.authUserId,
                    CATEGORY_TYPE.LISTEN_MEDITATION,
                    BADGE_TYPE.DIAMOND
                  ));
                break;
            }
          } else if (UserActivityCount.feature_type === FEATURE_TYPE.LISTEN_SOUND) {
            totalCount = UserActivityCount.count;
            if (existingCount) {
              await ContentCounts.updateOne(
                { user_id: req.authUserId },
                {
                  $set: {
                    sleeps: totalCount
                  }
                }
              );
            } else {
              await ContentCounts.create({
                sleeps: totalCount,
                user_id: req.authUserId
              });
            }
            switch (UserActivityCount.count) {
              case 1:
                badgeReceived = await updateBadges(
                  req.authUserId,
                  CATEGORY_TYPE.LISTEN_SOUND,
                  BADGE_TYPE.BRONZE
                );
                badgeReceived &&
                  (await sendBadgeNotification(
                    req.authUserId,
                    CATEGORY_TYPE.LISTEN_SOUND,
                    BADGE_TYPE.BRONZE
                  ));
                break;
              case 10:
                badgeReceived = await updateBadges(
                  req.authUserId,
                  CATEGORY_TYPE.LISTEN_SOUND,
                  BADGE_TYPE.SILVER
                );
                badgeReceived &&
                  (await sendBadgeNotification(
                    req.authUserId,
                    CATEGORY_TYPE.LISTEN_SOUND,
                    BADGE_TYPE.SILVER
                  ));
                break;
              case 15:
                badgeReceived = await updateBadges(
                  req.authUserId,
                  CATEGORY_TYPE.LISTEN_SOUND,
                  BADGE_TYPE.GOLD
                );
                badgeReceived &&
                  (await sendBadgeNotification(
                    req.authUserId,
                    CATEGORY_TYPE.LISTEN_SOUND,
                    BADGE_TYPE.GOLD
                  ));
                break;
              case 25:
                badgeReceived = await updateBadges(
                  req.authUserId,
                  CATEGORY_TYPE.LISTEN_SOUND,
                  BADGE_TYPE.PLATINUM
                );
                badgeReceived &&
                  (await sendBadgeNotification(
                    req.authUserId,
                    CATEGORY_TYPE.LISTEN_SOUND,
                    BADGE_TYPE.PLATINUM
                  ));
                break;
              case 50:
                badgeReceived = await updateBadges(
                  req.authUserId,
                  CATEGORY_TYPE.LISTEN_SOUND,
                  BADGE_TYPE.DIAMOND
                );
                badgeReceived &&
                  (await sendBadgeNotification(
                    req.authUserId,
                    CATEGORY_TYPE.LISTEN_SOUND,
                    BADGE_TYPE.DIAMOND
                  ));
                break;
            }
          } else if (UserActivityCount.feature_type === FEATURE_TYPE.COMPLETED_RITUALS) {
            totalCount = UserActivityCount.count;
            if (existingCount) {
              await ContentCounts.updateOne(
                { user_id: req.authUserId },
                {
                  $set: {
                    rituals_complete_days: totalCount
                  }
                }
              );
            } else {
              await ContentCounts.create({
                rituals_complete_days: totalCount,
                user_id: req.authUserId
              });
            }
            switch (UserActivityCount.count) {
              case 30:
                badgeReceived = await updateBadges(
                  req.authUserId,
                  CATEGORY_TYPE.USER_RITUALS,
                  BADGE_TYPE.SILVER
                );
                badgeReceived &&
                  (await sendBadgeNotification(
                    req.authUserId,
                    CATEGORY_TYPE.USER_RITUALS,
                    BADGE_TYPE.SILVER
                  ));
                break;
              case 60:
                badgeReceived = await updateBadges(
                  req.authUserId,
                  CATEGORY_TYPE.USER_RITUALS,
                  BADGE_TYPE.GOLD
                );
                badgeReceived &&
                  (await sendBadgeNotification(
                    req.authUserId,
                    CATEGORY_TYPE.USER_RITUALS,
                    BADGE_TYPE.GOLD
                  ));
                break;
              case 90:
                badgeReceived = await updateBadges(
                  req.authUserId,
                  CATEGORY_TYPE.USER_RITUALS,
                  BADGE_TYPE.PLATINUM
                );
                badgeReceived &&
                  (await sendBadgeNotification(
                    req.authUserId,
                    CATEGORY_TYPE.USER_RITUALS,
                    BADGE_TYPE.PLATINUM
                  ));
                break;
              case 120:
                badgeReceived = await updateBadges(
                  req.authUserId,
                  CATEGORY_TYPE.USER_RITUALS,
                  BADGE_TYPE.DIAMOND
                );
                badgeReceived &&
                  (await sendBadgeNotification(
                    req.authUserId,
                    CATEGORY_TYPE.USER_RITUALS,
                    BADGE_TYPE.DIAMOND
                  ));
                break;
            }
          } else if (UserActivityCount.feature_type === FEATURE_TYPE.SHOORAH_POD) {
            totalCount = UserActivityCount.count;
            if (existingCount) {
              await ContentCounts.updateOne(
                { user_id: req.authUserId },
                {
                  $set: {
                    pods: totalCount
                  }
                }
              );
            } else {
              await ContentCounts.create({
                pods: totalCount,
                user_id: req.authUserId
              });
            }
            switch (UserActivityCount.count) {
              case 3:
                badgeReceived = await updateBadges(
                  req.authUserId,
                  CATEGORY_TYPE.SHOORAH_POD,
                  BADGE_TYPE.BRONZE
                );
                badgeReceived &&
                  (await sendBadgeNotification(
                    req.authUserId,
                    CATEGORY_TYPE.SHOORAH_POD,
                    BADGE_TYPE.BRONZE
                  ));
                break;
              case 5:
                badgeReceived = await updateBadges(
                  req.authUserId,
                  CATEGORY_TYPE.SHOORAH_POD,
                  BADGE_TYPE.SILVER
                );
                badgeReceived &&
                  (await sendBadgeNotification(
                    req.authUserId,
                    CATEGORY_TYPE.SHOORAH_POD,
                    BADGE_TYPE.SILVER
                  ));
                break;
              case 15:
                badgeReceived = await updateBadges(
                  req.authUserId,
                  CATEGORY_TYPE.SHOORAH_POD,
                  BADGE_TYPE.GOLD
                );
                badgeReceived &&
                  (await sendBadgeNotification(
                    req.authUserId,
                    CATEGORY_TYPE.SHOORAH_POD,
                    BADGE_TYPE.GOLD
                  ));
                break;
              case 20:
                badgeReceived = await updateBadges(
                  req.authUserId,
                  CATEGORY_TYPE.SHOORAH_POD,
                  BADGE_TYPE.PLATINUM
                );
                badgeReceived &&
                  (await sendBadgeNotification(
                    req.authUserId,
                    CATEGORY_TYPE.SHOORAH_POD,
                    BADGE_TYPE.PLATINUM
                  ));
                break;
              case 25:
                badgeReceived = await updateBadges(
                  req.authUserId,
                  CATEGORY_TYPE.SHOORAH_POD,
                  BADGE_TYPE.DIAMOND
                );
                badgeReceived &&
                  (await sendBadgeNotification(
                    req.authUserId,
                    CATEGORY_TYPE.SHOORAH_POD,
                    BADGE_TYPE.DIAMOND
                  ));
                break;
            }
          }
          const resObject = {
            featureType: reqParam.featureType,
            totalCount
          };
          return Response.successResponseData(
            res,
            resObject,
            SUCCESS,
            res.__('updateUserActivity')
          );
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  }
};
