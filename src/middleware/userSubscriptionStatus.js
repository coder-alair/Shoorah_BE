'use strict';

const {
  Users,
  RecentlyPlayed,
  UserNotes,
  UserGratitude,
  VisionBoard,
  Cleanse,
  Goals
} = require('@models');
const { successResponseWithoutData } = require('@services/Response');
const {
  USER_TRIAL_LIMIT,
  ACCOUNT_TYPE,
  CONFIG_TYPE,
  USER_RESTRICTED
} = require('@services/Constant');
const { Config } = require('@models');
const UserAffirmation = require('../models/UserAffirmations');

module.exports = {
  userSubscriptionStatus: async (req, res, next) => {
    let isNotSubscribed;
    if (req.isUnderTrial) {
      if (
        (new Date().getTime() - req.trialDate.getTime()) / (1000 * 3600 * 24) <
        USER_TRIAL_LIMIT
      ) {
        next();
      } else {
        isNotSubscribed = true;
        await Users.findByIdAndUpdate(req.authUserId, { is_under_trial: false });
        req.accountType === ACCOUNT_TYPE.PAID ? next() : (isNotSubscribed = true);
      }
    } else {
      req.accountType === ACCOUNT_TYPE.PAID ? next() : (isNotSubscribed = true);
    }
    if (isNotSubscribed) {
      let noAccess;
      const freeAccessConfig = await Config.findOne({
        config_key: CONFIG_TYPE.USER_RESTRICTION
      }).select('config_value');
      switch (true) {
        case req._parsedUrl.pathname.startsWith('/content-detail') && req.method === 'GET':
          // const reqParam = req.params;
          const filterCondition = {
            user_id: req.authUserId,
            // content_type: parseInt(reqParam.contentType),
            deletedAt: null
          };
          // const isRecentlyPlayed
          const playedCount = await RecentlyPlayed.countDocuments(filterCondition);
          playedCount >= freeAccessConfig.config_value.playCount && (noAccess = true);
          break;
        case req._parsedUrl.pathname.startsWith('/explore') && req.method === 'GET':
          !freeAccessConfig.config_value.exploreAccess && (noAccess = true);
          break;
        case req._parsedUrl.pathname.startsWith('/trendings') && req.method === 'GET':
          !freeAccessConfig.config_value.trendingAccess && (noAccess = true);
          break;
        case req._parsedUrl.pathname.startsWith('/rituals'):
        case req._parsedUrl.pathname.startsWith('/my-rituals'):
        case req._parsedUrl.pathname.startsWith('/my-rituals-status'):
          !freeAccessConfig.config_value.ritualAccess && (noAccess = true);
          break;
        case req._parsedUrl.pathname === '/mood':
        case req._parsedUrl.pathname.startsWith('/mood?'):
        case req._parsedUrl.pathname.startsWith('/today-mood'):
          !freeAccessConfig.config_value.moodAccess && (noAccess = true);
          break;
        case req._parsedUrl.pathname.startsWith('/mood-report'):
          !freeAccessConfig.config_value.moodReportAccess && (noAccess = true);
          break;
        case req._parsedUrl.pathname.startsWith('/notes') &&
          req.method === 'POST' &&
          !req.body.notesId:
          const userNotesCount = await UserNotes.countDocuments({
            user_id: req.authUserId,
            deletedAt: null
          });
          userNotesCount >= freeAccessConfig.config_value.notepadCount && (noAccess = true);
          break;
        case req._parsedUrl.pathname === '/my-gratitude' &&
          req.method === 'POST' &&
          !req.body.userGratitudeId:
          const userGratitudeCount = await UserGratitude.countDocuments({
            user_id: req.authUserId,
            deletedAt: null
          });
          userGratitudeCount >= freeAccessConfig.config_value.gratitudeCount && (noAccess = true);
          break;
        case req._parsedUrl.pathname === '/add-edit-vision' &&
          req.method === 'POST' &&
          !req.body.visionId:
          const userVisionCount = await VisionBoard.countDocuments({
            user_id: req.authUserId,
            deletedAt: null
          });
          userVisionCount >= freeAccessConfig.config_value.gratitudeCount && (noAccess = true);
          break;
        case req._parsedUrl.pathname === '/cleanse' && req.method === 'POST' && !req.body.cleanseId:
          const cleanseCount = await Cleanse.countDocuments({
            user_id: req.authUserId,
            deletedAt: null
          });
          cleanseCount >= freeAccessConfig.config_value.cleanseCount && (noAccess = true);
          break;
        case req._parsedUrl.pathname === '/goals' && req.method === 'POST' && !req.body.goalId:
          const goalsCount = await Goals.countDocuments({
            user_id: req.authUserId,
            deletedAt: null
          });
          goalsCount >= freeAccessConfig.config_value.goalsCount && (noAccess = true);
          break;
      }
      return noAccess
        ? successResponseWithoutData(res, res.__('subscriptionExpired'), USER_RESTRICTED)
        : next();
    }
  }
};
