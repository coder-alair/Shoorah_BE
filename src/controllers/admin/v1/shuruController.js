'use strict';

const Response = require('@services/Response');
const { Users, DeviceTokens, ModuleAccess, Notification } = require('@models');
const {
  USER_TYPE,
  ACCOUNT_STATUS,
  FAIL,
  SUCCESS,
  PAGE,
  PER_PAGE,
  RESPONSE_CODE,
  PASSWORD_LENGTH,
  ADMIN_MEDIA_PATH,
  CLOUDFRONT_URL,
  SENT_TO_USER_TYPE,
  SORT_BY,
  SORT_ORDER
} = require('@services/Constant');
const {
  toObjectId,
  makeRandomString,
  unixTimeStamp,
  makeRandomDigit
} = require('@services/Helper');
const { Conversation } = require('../../../models');



const getUserShuruUsageTime = async (user_id, reportDate) => {
  try {
    let startDate = new Date(reportDate);
    let endDate = new Date(startDate);
    endDate.setHours(23, 59, 59, 999);
    endDate.setDate(startDate.getDate() + 8);

    let filterCondition = {
      userId: user_id.toString(),
      isSessionStart: true,
      to: 'BOT',
      createdAt: {
        $gte: startDate,
        $lte: endDate
      }
    };

    const totalShuruUsageTime = await Conversation.aggregate([
      {
        $match: filterCondition
      },
      {
        $sort: { userId: 1, _id: 1 }
      },
      {
        $group: {
          _id: { userId: '$userId', day: { $dayOfYear: '$createdAt' } },
          message: { $first: '$message' },
          sessionStartId: { $first: '$_id' },
          sessionStart: { $first: '$createdAt' },
          nextSessionStartId: { $last: '$_id' },
          nextSessionStart: { $last: '$createdAt' }
        }
      },
      {
        $project: {
          _id: 0,
          userId: '$_id.userId',
          message: '$message',
          day: '$_id.day',
          sessionStartId: '$sessionStartId',
          sessionStart: '$sessionStart',
          nextSessionStartId: '$nextSessionStartId',
          nextSessionStart: '$nextSessionStart',
          sessionDurationInHours: {
            $sum: {
              $divide: [{ $subtract: ['$nextSessionStart', '$sessionStart'] }, 60000 * 60]
            }
          }
        }
      },
      {
        $facet: {
          totalCount: [{ $count: 'count' }]
        }
      },
      {
        $unwind: '$totalCount'
      },
      {
        $project: {
          paginatedResult: 1,
          totalCount: '$totalCount.count'
        }
      }
    ]);

    const obj = {
      totalShuruUsageTimeInHours:
        typeof totalShuruUsageTime[0] !== 'undefined' ? totalShuruUsageTime[0].totalCount : 0
    };

    return obj;
  } catch (err) {
    console.error(err);
  }
};

module.exports = {
  getUserShuruUsageTime,
  /**
   * @description This function is used to get total shuru usage time for all users
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  getShuruUsageTime: async (req, res) => {
    try {
      const reqParam = req.query;
      let startDate = new Date();
      let endDate = startDate.setDate(startDate.getDate() + 1);

      if (reqParam.startDate) {
        startDate = new Date(reqParam.startDate);
        endDate = new Date();
      }
      if (reqParam.endDate) {
        endDate = new Date(reqParam.endDate);
        startDate.setDate(startDate.getDate() - 1);
      }
      if (reqParam.startDate && reqParam.endDate) {
        startDate = new Date(reqParam.startDate);
        endDate = new Date(reqParam.endDate);
      }

      let filterCondition = {
        isSessionStart: true,
        to: 'BOT'
      };

      if (reqParam.startDate || reqParam.endDate) {
        filterCondition = {
          ...filterCondition,
          createdAt: {
            $gte: startDate,
            $lte: endDate
          }
        };
      }

      const totalShuruUsageTime = await Conversation.aggregate([
        {
          $match: filterCondition
        },
        {
          $sort: { userId: 1, _id: 1 }
        },
        {
          $group: {
            _id: { userId: '$userId', day: { $dayOfYear: '$createdAt' } },
            message: { $first: '$message' },
            sessionStartId: { $first: '$_id' },
            sessionStart: { $first: '$createdAt' },
            nextSessionStartId: { $last: '$_id' },
            nextSessionStart: { $last: '$createdAt' }
          }
        },
        {
          $project: {
            _id: 0,
            userId: '$_id.userId',
            message: '$message',
            day: '$_id.day',
            sessionStartId: '$sessionStartId',
            sessionStart: '$sessionStart',
            nextSessionStartId: '$nextSessionStartId',
            nextSessionStart: '$nextSessionStart',
            sessionDurationInHours: {
              $sum: {
                $divide: [{ $subtract: ['$nextSessionStart', '$sessionStart'] }, 60000 * 60]
              }
            }
          }
        },
        {
          $facet: {
            totalCount: [{ $count: 'count' }]
          }
        },
        {
          $unwind: '$totalCount'
        },
        {
          $project: {
            paginatedResult: 1,
            totalCount: '$totalCount.count'
          }
        }
      ]);

      const obj = {
        totalShuruUsageTimeInHours:
          typeof totalShuruUsageTime[0] !== 'undefined' ? totalShuruUsageTime[0].totalCount : 0
      };

      return Response.successResponseData(res, obj, SUCCESS, res.__('shuruTotalUsageTime'));
    } catch (err) {
      console.error(err);
      return Response.internalServerErrorResponse(res);
    }
  },



};
