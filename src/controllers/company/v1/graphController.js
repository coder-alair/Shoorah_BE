'use strict';

const Bcrypt = require('bcrypt');
const { DeviceTokens } = require('@models');
const {
  removeAdminDeviceTokenValidation,
  addEditDeviceTokenValidation
} = require('@services/companyValidations/companyValidations');
const { RESPONSE_CODE, FAIL, SUCCESS, CLOUDFRONT_URL } = require('@services/Constant');
const {
  issueCompanyToken,
  verifyCompanyRefreshToken,
  issueCompanyRefreshToken
} = require('@services/JwToken');
const Response = require('@services/Response');
const { makeRandomDigit } = require('@services/Helper');
const { storeDeviceToken } = require('@services/authServices');
const { COMPANY_MEDIA_PATH, BADGE_TYPE } = require('../../../services/Constant');
const Company = require('../../../models/Company');
const {
  companyLoginValidations
} = require('../../../services/companyValidations/companyLoginValidations');
const { Users, UserBadges } = require('../../../models');
const {
  convertObjectKeysToCamelCase,
  toObjectId,
  currentDateOnly
} = require('../../../services/Helper');

module.exports = {
  /**
   * @description This function is used for badges graph
   * @param {*} req
   * @param {*} res
   * @return {*}
   */

  getBadgesStats: async function (req, res) {
    try {
      const reqParam = req.query;

      if (!reqParam.companyId) {
        return Response.successResponseWithoutData(res, res.__('noCompanyIdFound'), SUCCESS);
      }

      let fromDate = currentDateOnly();
      let toDate = currentDateOnly();
      if (reqParam.startDate) {
        fromDate = new Date(reqParam.startDate);
      }
      if (reqParam.endDate) {
        toDate = new Date(reqParam.endDate);
      }
      toDate.setDate(toDate.getDate() + 1);
      fromDate.setDate(fromDate.getDate() - 1);

      let userFilterConditon = {};
      if (reqParam.gender >= 0 && reqParam.gender < 6) {
        userFilterConditon = {
          deletedAt: null,
          status: 1,
          user_type: 2,
          company_id: toObjectId(reqParam.companyId),
          gender: { $in: [parseInt(reqParam.gender)] },
          createdAt: {
            $gte: fromDate,
            $lte: toDate
          }
        };
      } else {
        userFilterConditon = {
          deletedAt: null,
          status: 1,
          user_type: 2,
          company_id: toObjectId(reqParam.companyId),
          createdAt: {
            $gte: fromDate,
            $lte: toDate
          }
        };
      }

      const users = await Users.find(userFilterConditon);
      const totalUsers = users.length;

      let totalBadgesCount = 0;
      const badges = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Daimond', 'Guru'];
      let badgeName = 'All';

      for (const user of users) {
        let badgesFilter = {};
        if (reqParam.badgeType < 7 && reqParam.badgeType > 0) {
          badgesFilter = {
            deletedAt: null,
            badge_type: reqParam.badgeType,
            user_id: user._id,
            createdAt: {
              $gte: fromDate,
              $lte: toDate
            }
          };
          badgeName = badges[reqParam.badgeType - 1];
        } else {
          badgesFilter = {
            deletedAt: null,
            user_id: user._id,
            createdAt: {
              $gte: fromDate,
              $lte: toDate
            }
          };
        }

        totalBadgesCount += await UserBadges.find(badgesFilter).countDocuments();
      }

      let result = {
        totalBadgesCount: totalBadgesCount,
        totalUsers,
        badgeName
      };

      return Response.successResponseData(
        res,
        convertObjectKeysToCamelCase(result),
        SUCCESS,
        res.__('badgesStatsSuccessfull')
      );
    } catch (err) {
      console.log(err);
      return Response.internalServerErrorResponse(res);
    }
  },

  getB2BbadgesStatsByGender: async function (req, res) {
    try {
      const reqParam = req.query;

      if (!reqParam.companyId) {
        return Response.successResponseWithoutData(res, res.__('noCompanyIdFound'), SUCCESS);
      }

      let fromDate = currentDateOnly();
      let toDate = currentDateOnly();
      if (reqParam.startDate) {
        fromDate = new Date(reqParam.startDate);
      }
      if (reqParam.endDate) {
        toDate = new Date(reqParam.endDate);
      }
      toDate.setDate(toDate.getDate() + 1);
      fromDate.setDate(fromDate.getDate() - 1);

      let userFilterConditon = {};
      userFilterConditon = {
        deletedAt: null,
        status: 1,
        user_type: 2,
        company_id: toObjectId(reqParam.companyId)
      };

      const users = await Users.find(userFilterConditon);
      const totalUsers = users.length;

      let totalBadgesCount = 0;
      const badges = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Daimond', 'Guru'];
      let maleBadgesCount = 0;
      let femaleBadgesCount = 0;
      let nonBinaryBadgesCount = 0;
      let interSexBadgesCount = 0;
      let transgenderBadgesCount = 0;
      let notPreferBadgesCount = 0;

      for (const user of users) {
        let badgesFilter = {};

        badgesFilter = {
          deletedAt: null,
          user_id: user._id
        };

        if (reqParam.badges > 0) {
          badgesFilter = {
            ...badgesFilter,
            badge_type: reqParam.badges
          };
        }

        totalBadgesCount += await UserBadges.find(badgesFilter).countDocuments();

        if (user.gender[0] == 1) {
          maleBadgesCount += await UserBadges.find(badgesFilter).countDocuments();
        }
        if (user.gender[0] == 2) {
          femaleBadgesCount += await UserBadges.find(badgesFilter).countDocuments();
        }
        if (user.gender[0] == 3) {
          nonBinaryBadgesCount += await UserBadges.find(badgesFilter).countDocuments();
        }
        if (user.gender[0] == 4) {
          interSexBadgesCount += await UserBadges.find(badgesFilter).countDocuments();
        }
        if (user.gender[0] == 5) {
          transgenderBadgesCount += await UserBadges.find(badgesFilter).countDocuments();
        }
        if (user.gender[0] == 0 || user.gender[0] > 5 || user.gender == ['']) {
          notPreferBadgesCount += await UserBadges.find(badgesFilter).countDocuments();
        }
      }

      let result = {
        totalUsers,
        totalBadgesCount,
        maleBadgesCount,
        femaleBadgesCount,
        nonBinaryBadgesCount,
        interSexBadgesCount,
        transgenderBadgesCount,
        notPreferBadgesCount
      };

      return Response.successResponseData(
        res,
        convertObjectKeysToCamelCase(result),
        SUCCESS,
        res.__('badgesStatsByGenderSuccessfull')
      );
    } catch (err) {
      console.log(err);
      return Response.internalServerErrorResponse(res);
    }
  },

  getTotalBadges: async function (req, res) {
    try {
      const reqParam = req.query;

      if (!reqParam.companyId) {
        return Response.successResponseWithoutData(res, res.__('noCompanyIdFound'), SUCCESS);
      }

      const companyId = toObjectId(reqParam.companyId);

      const userFilterCondition = {
        deletedAt: null,
        user_type: 2,
        status: 1,
        company_id: companyId
      };

      const users = await Users.find(userFilterCondition);
      const totalUsers = users.length;

      const badgeCounts = await UserBadges.aggregate([
        { $match: { deletedAt: null, user_id: { $in: users.map((user) => user._id) } } },
        {
          $group: {
            _id: '$badge_type',
            count: { $sum: 1 }
          }
        }
      ]);

      const result = {
        totalBadges: badgeCounts.reduce((total, count) => total + count.count, 0),
        bronzeCount: badgeCounts.find((count) => count._id === 1)?.count || 0,
        silverCount: badgeCounts.find((count) => count._id === 2)?.count || 0,
        goldCount: badgeCounts.find((count) => count._id === 3)?.count || 0,
        platinumCount: badgeCounts.find((count) => count._id === 4)?.count || 0,
        daimondCount: badgeCounts.find((count) => count._id === 5)?.count || 0,
        guruCount: badgeCounts.find((count) => count._id === 6)?.count || 0
      };

      return Response.successResponseData(
        res,
        convertObjectKeysToCamelCase(result),
        SUCCESS,
        res.__('totalBadgesSuccessfully')
      );
    } catch (err) {
      console.log(err);
      return Response.internalServerErrorResponse(res);
    }
  }
};
