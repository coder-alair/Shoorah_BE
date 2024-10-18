'use strict';

const { UserBadges } = require('@models');
const Response = require('@services/Response');
const { toObjectId } = require('@services/Helper');
const {
  BADGE_TYPE,
  SHOORAH_GURU,
  SUCCESS,
  CATEGORY_TYPE,
  CATEGORY_TITLE,
  BRONZE_CATEGORY_DESCRIPTION,
  SILVER_CATEGORY_DESCRIPTION,
  GOLD_CATEGORY_DESCRIPTION,
  PLATINUM_CATEGORY_DESCRIPTION,
  DIAMOND_CATEGORY_DESCRIPTION,
  BADGE_INFO
} = require('@services/Constant');
const { badgeDetailsListValidation } = require('@services/userValidations/userBadgeValidations');
const { ContentCounts } = require('../../../models');
const {
  BRONZE_CATEGORY_LIMIT,
  SILVER_CATEGORY_LIMIT,
  GOLD_CATEGORY_LIMIT,
  PLATINUM_CATEGORY_LIMIT,
  DIAMOND_CATEGORY_LIMIT
} = require('../../../services/Constant');

module.exports = {
  /**
   * @description This function is used to get total Badges Count
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  totalBadgesCount: async (req, res) => {
    try {
      const aggregatePipeline = [
        {
          $match: {
            user_id: toObjectId(req.authUserId),
            deletedAt: null
          }
        },
        {
          $group: {
            _id: '$badge_type',
            badgeCount: {
              $sum: 1
            }
          }
        },
        {
          $project: {
            badgeType: '$_id',
            badgeCount: 1,
            _id: 0
          }
        }
      ];
      const totalBadgeData = await UserBadges.aggregate(aggregatePipeline);
      const remainingBadges = Object.values(BADGE_TYPE).filter(
        (x) => !totalBadgeData.some((y) => y.badgeType === x)
      );
      if (remainingBadges.length > 0) {
        remainingBadges.map((badge) => {
          const tempObj = {
            badgeCount: 0,
            badgeType: badge
          };
          totalBadgeData.push(tempObj);
        });
      }
      const diamondBadge = totalBadgeData.find((x) => x.badgeType === BADGE_TYPE.DIAMOND);
      const tempObj = {
        badgeCount: diamondBadge.badgeCount >= 3 ? 1 : 0,
        badgeType: SHOORAH_GURU
      };
      totalBadgeData.push(tempObj);
      return Response.successResponseData(
        res,
        totalBadgeData,
        SUCCESS,
        res.__('userBadgesCountSuccess')
      );
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to get badge detail list
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  badgeDetailsList: (req, res) => {
    try {
      const reqParam = req.params;
      badgeDetailsListValidation(reqParam, res, async (validate) => {
        if (validate) {
          const filterCondition = {
            user_id: req.authUserId,
            badge_type: parseInt(reqParam.badgeType),
            deletedAt: null
          };
          const badgeDetails = await UserBadges.find(filterCondition)
            .select('category_type badge_type -_id')
            .lean();
          let description = BRONZE_CATEGORY_DESCRIPTION;
          let limit = BRONZE_CATEGORY_LIMIT;
          let contentCounts = await ContentCounts.findOne({ user_id: req.authUserId });
          switch (parseInt(reqParam.badgeType)) {
            case BADGE_TYPE.BRONZE:
              description = BRONZE_CATEGORY_DESCRIPTION;
              limit = BRONZE_CATEGORY_LIMIT;
              break;
            case BADGE_TYPE.SILVER:
              description = SILVER_CATEGORY_DESCRIPTION;
              limit = SILVER_CATEGORY_LIMIT;
              break;
            case BADGE_TYPE.GOLD:
              description = GOLD_CATEGORY_DESCRIPTION;
              limit = GOLD_CATEGORY_LIMIT;
              break;
            case BADGE_TYPE.PLATINUM:
              description = PLATINUM_CATEGORY_DESCRIPTION;
              limit = PLATINUM_CATEGORY_LIMIT;
              break;
            case BADGE_TYPE.DIAMOND:
              description = DIAMOND_CATEGORY_DESCRIPTION;
              limit = DIAMOND_CATEGORY_LIMIT;
              break;
          }
          const resObj = {
            'App Consistency': [
              {
                title: CATEGORY_TITLE.TIME_SUBSCRIBED_ON_APP,
                description: description.TIME_SUBSCRIBED_ON_APP,
                isUnlocked: false,
                counts: 0,
                limit: limit.TIME_SUBSCRIBED_ON_APP
              }
            ],
            Rituals: [
              {
                title: CATEGORY_TITLE.USER_RITUALS,
                description: description.USER_RITUALS,
                isUnlocked: false,
                counts: 0,
                limit: limit.USER_RITUALS,
                competedDays: contentCounts?.rituals_complete_days
              }
            ],
            Restore: [
              {
                title: CATEGORY_TITLE.LISTEN_MEDITATION,
                description: description.LISTEN_MEDITATION,
                isUnlocked: false,
                counts: 0,
                limit: limit.LISTEN_MEDITATION
              },
              {
                title: CATEGORY_TITLE.LISTEN_SOUND,
                description: description.LISTEN_SOUND,
                isUnlocked: false,
                counts: 0,
                limit: limit.LISTEN_SOUND
              }
            ],
            Journal: [
              {
                title: CATEGORY_TITLE.CLEANSE,
                description: description.CLEANSE,
                isUnlocked: false,
                counts: 0,
                limit: limit.CLEANSE
              },
              {
                title: CATEGORY_TITLE.USER_GRATITUDE,
                description: description.USER_GRATITUDE,
                isUnlocked: false,
                counts: 0,
                limit: limit.USER_GRATITUDE
              },
              {
                title: CATEGORY_TITLE.NOTES,
                description: description.NOTES,
                isUnlocked: false,
                counts: 0,
                limit: limit.NOTES
              }
            ],
            'Shoorah Pods': [
              {
                title: CATEGORY_TITLE.SHOORAH_PODS,
                description: description.SHOORAH_PODS,
                isUnlocked: false,
                counts: 0,
                limit: limit.SHOORAH_PODS
              }
            ],
            Goals: [
              {
                title: CATEGORY_TITLE.GOALS,
                description: description.GOALS,
                isUnlocked: false,
                counts: 0,
                limit: limit.GOALS
              }
            ],
            Affirmations: [
              {
                title: CATEGORY_TITLE.AFFIRMATION,
                description: description.AFFIRMATION,
                isUnlocked: false,
                counts: 0,
                limit: limit.AFFIRMATION
              }
            ],
            Notifications: [
              {
                title: CATEGORY_TITLE.RECEIVED_NOTIFICATION,
                description: description.RECEIVED_NOTIFICATION,
                isUnlocked: false,
                counts: 0,
                limit: limit.RECEIVED_NOTIFICATION
              }
            ],
            'Shuru Usage': [
              {
                title: CATEGORY_TITLE.SHURU_TIME_SPENT,
                description: description.SHURU_TIME,
                isUnlocked: false,
                counts: 0,
                limit: limit.SHURU_TIME
              }
            ]
          };
          await badgeDetails.forEach((el) => {
            switch (el.category_type) {
              case CATEGORY_TYPE.USER_RITUALS:
                resObj.Rituals[
                  resObj.Rituals.findIndex((x) => x.title === CATEGORY_TITLE.USER_RITUALS)
                ].isUnlocked = true;
                break;
              case CATEGORY_TYPE.LISTEN_MEDITATION:
                resObj.Restore[
                  resObj.Restore.findIndex((x) => x.title === CATEGORY_TITLE.LISTEN_MEDITATION)
                ].isUnlocked = true;
                break;
              case CATEGORY_TYPE.LISTEN_SOUND:
                resObj.Restore[
                  resObj.Restore.findIndex((x) => x.title === CATEGORY_TITLE.LISTEN_SOUND)
                ].isUnlocked = true;
                break;
              case CATEGORY_TYPE.CLEANSE:
                resObj.Journal[
                  resObj.Journal.findIndex((x) => x.title === CATEGORY_TITLE.CLEANSE)
                ].isUnlocked = true;
                break;
              case CATEGORY_TYPE.USER_GRATITUDE:
                resObj.Journal[
                  resObj.Journal.findIndex((x) => x.title === CATEGORY_TITLE.USER_GRATITUDE)
                ].isUnlocked = true;
                break;
              case CATEGORY_TYPE.NOTES:
                resObj.Journal[
                  resObj.Journal.findIndex((x) => x.title === CATEGORY_TITLE.NOTES)
                ].isUnlocked = true;
                break;
              case CATEGORY_TYPE.AFFIRMATION:
                resObj.Affirmations[
                  resObj.Affirmations.findIndex((x) => x.title === CATEGORY_TITLE.AFFIRMATION)
                ].isUnlocked = true;
                break;
              case CATEGORY_TYPE.GOALS:
                resObj.Goals[
                  resObj.Goals.findIndex((x) => x.title === CATEGORY_TITLE.GOALS)
                ].isUnlocked = true;
                break;
              case CATEGORY_TYPE.RECEIVED_NOTIFICATION:
                resObj.Notifications[
                  resObj.Notifications.findIndex(
                    (x) => x.title === CATEGORY_TITLE.RECEIVED_NOTIFICATION
                  )
                ].isUnlocked = true;
                break;
              case CATEGORY_TYPE.TIME_SUBSCRIBED_ON_APP:
                resObj['App Consistency'][
                  resObj['App Consistency'].findIndex(
                    (x) => x.title === CATEGORY_TITLE.TIME_SUBSCRIBED_ON_APP
                  )
                ].isUnlocked = true;
                break;
              case CATEGORY_TYPE.SHOORAH_POD:
                resObj['Shoorah Pods'][
                  resObj['Shoorah Pods'].findIndex((x) => x.title === CATEGORY_TITLE.SHOORAH_PODS)
                ].isUnlocked = true;
                break;
              case CATEGORY_TYPE.SHURU_TIME_SPENT:
                resObj['Shuru Usage'][
                  resObj['Shuru Usage'].findIndex(
                    (x) => x.title === CATEGORY_TITLE.SHURU_TIME_SPENT
                  )
                ].isUnlocked = true;
                break;
            }
          });

          if (contentCounts) {
            resObj.Rituals[
              resObj.Rituals.findIndex((x) => x.title === CATEGORY_TITLE.USER_RITUALS)
            ].counts = contentCounts?.rituals;
            resObj.Rituals[
              resObj.Rituals.findIndex((x) => x.title === CATEGORY_TITLE.USER_RITUALS)
            ].counts = contentCounts?.rituals;
            resObj.Restore[
              resObj.Restore.findIndex((x) => x.title === CATEGORY_TITLE.LISTEN_MEDITATION)
            ].counts = contentCounts?.meditation;
            resObj.Restore[
              resObj.Restore.findIndex((x) => x.title === CATEGORY_TITLE.LISTEN_SOUND)
            ].counts = contentCounts?.sleeps;
            resObj.Journal[
              resObj.Journal.findIndex((x) => x.title === CATEGORY_TITLE.CLEANSE)
            ].counts = contentCounts?.cleanse;
            resObj.Journal[
              resObj.Journal.findIndex((x) => x.title === CATEGORY_TITLE.USER_GRATITUDE)
            ].counts = contentCounts?.gratitudes;
            resObj.Journal[
              resObj.Journal.findIndex((x) => x.title === CATEGORY_TITLE.NOTES)
            ].counts = contentCounts?.notes;
            resObj.Affirmations[
              resObj.Affirmations.findIndex((x) => x.title === CATEGORY_TITLE.AFFIRMATION)
            ].counts = contentCounts?.affirmations;
            resObj.Goals[resObj.Goals.findIndex((x) => x.title === CATEGORY_TITLE.GOALS)].counts =
              contentCounts?.goals;
            resObj.Notifications[
              resObj.Notifications.findIndex(
                (x) => x.title === CATEGORY_TITLE.RECEIVED_NOTIFICATION
              )
            ].counts = contentCounts?.notifications;
            resObj['App Consistency'][
              resObj['App Consistency'].findIndex(
                (x) => x.title === CATEGORY_TITLE.TIME_SUBSCRIBED_ON_APP
              )
            ].counts = contentCounts?.consistency;
            resObj['Shoorah Pods'][
              resObj['Shoorah Pods'].findIndex((x) => x.title === CATEGORY_TITLE.SHOORAH_PODS)
            ].counts = contentCounts.pods;
            resObj['Shuru Usage'][
              resObj['Shuru Usage'].findIndex((x) => x.title === CATEGORY_TITLE.SHURU_TIME_SPENT)
            ].counts = contentCounts.shuru_time;
          }

          return Response.successResponseData(
            res,
            resObj,
            SUCCESS,
            res.__('userBadgeDetailSuccess'),
            {
              badgeInfo: BADGE_INFO
            }
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
