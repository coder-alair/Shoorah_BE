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
const { Conversation, RippleConversation, RippleUser } = require('../../../models');
const { MOOD_PDF_SIZE, NODE_ENVIRONMENT } = require('../../../services/Constant');
const puppeteer = require('puppeteer');
const pug = require('pug');

const getUserRippleUsageTime = async (user_id, reportDate) => {
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
  getUserRippleUsageTime,
  /**
   * @description This function is used to get total ripple usage time for all users
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  getRippleUsageTime: async (req, res) => {
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

      const timeConstants = {
        1: { startHour: 1, endHour: 3 },
        2: { startHour: 3, endHour: 6 },
        3: { startHour: 6, endHour: 9 },
        4: { startHour: 9, endHour: 12 },
        5: { startHour: 12, endHour: 15 },
        6: { startHour: 15, endHour: 18 },
        7: { startHour: 18, endHour: 21 },
        8: { startHour: 21, endHour: 23 },
        9: { startHour: 0, endHour: 23 }
      };

      if (reqParam.timeConstant) {
        const { startHour, endHour } = timeConstants[reqParam.timeConstant];
        startDate = new Date(startDate.setHours(startHour, 0, 0, 0));
        endDate = new Date(endDate.setHours(endHour, 59, 59, 999));
      }

      let filterCondition = {
        isSessionStart: true,
        to: 'BOT'
      };

      let moodSelectionFilter = {
        mood_id: { $exists: true }
      };

      if (reqParam.startDate || reqParam.endDate) {
        filterCondition = {
          ...filterCondition,
          createdAt: {
            $gte: startDate,
            $lte: endDate
          }
        };
        moodSelectionFilter = {
          ...filterCondition,
          createdAt: {
            $gte: startDate,
            $lte: endDate
          }
        };
      }

      const totalMoodCounts = await RippleConversation.countDocuments(moodSelectionFilter);

      const totalShuruUsageTime = await RippleConversation.aggregate([
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

      const activatedUsers = await RippleUser.aggregate([
        {
          $match: {
            createdAt: {
              $gte: startDate,
              $lte: endDate
            }
          }
        },
        {
          $group: {
            _id: null,
            activatedUsers: {
              $sum: { $cond: [{ $eq: ['$trial_activated', true] }, 1, 0] }
            },
            notActivatedUsers: {
              $sum: {
                $cond: [
                  {
                    $or: [
                      { $eq: ['$trial_activated', false] },
                      { $not: { $ifNull: ['$trial_activated', false] } }
                    ]
                  },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]);

      const obj = {
        totalRippleUsageTimeInHours:
          typeof totalShuruUsageTime[0] !== 'undefined' ? totalShuruUsageTime[0].totalCount : 0,
        totalMoodCounts,
        activatedUsers:
          typeof activatedUsers[0] !== 'undefined' ? activatedUsers[0].activatedUsers : 0,
        notActivatedUsers:
          typeof activatedUsers[0] !== 'undefined' ? activatedUsers[0].notActivatedUsers : 0
      };

      return Response.successResponseData(res, obj, SUCCESS, res.__('rippleStats'));
    } catch (err) {
      console.error(err);
      return Response.internalServerErrorResponse(res);
    }
  },

  downloadRippleReport: async (req, res) => {
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
      let dateFrom = startDate.toLocaleDateString('en-gb', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      let dateEnd = endDate.toLocaleDateString('en-gb', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });

      const timeConstants = {
        1: { startHour: 1, endHour: 3, text: `From ${dateFrom} 1 AM To ${dateEnd} 3 AM` },
        2: { startHour: 3, endHour: 6, text: `From ${dateFrom} 3 AM To ${dateEnd} 6 AM'` },
        3: { startHour: 6, endHour: 9, text: `From ${dateFrom} 6 AM To ${dateEnd} 9 AM` },
        4: { startHour: 9, endHour: 12, text: `From ${dateFrom} 9 AM To ${dateEnd} 12 PM` },
        5: { startHour: 12, endHour: 15, text: `From ${dateFrom} 12 PM To ${dateEnd} 3 PM` },
        6: { startHour: 15, endHour: 18, text: `From ${dateFrom} 3 PM To ${dateEnd} 6 PM` },
        7: { startHour: 18, endHour: 21, text: `From ${dateFrom} 6 PM To ${dateEnd} 9 PM` },
        8: { startHour: 21, endHour: 23, text: `From ${dateFrom} 9 PM To ${dateEnd} 12 AM` },
        9: { startHour: 0, endHour: 23, text: `Full Day` }
      };
      if (reqParam.timeConstant) {
        const { startHour, endHour } = timeConstants[reqParam.timeConstant];
        startDate = new Date(startDate.setHours(startHour, 0, 0, 0));
        endDate = new Date(endDate.setHours(endHour, 59, 59, 999));
      }

      let filterCondition = {
        isSessionStart: true,
        to: 'BOT'
      };

      let moodSelectionFilter = {
        mood_id: { $exists: true }
      };

      if (reqParam.startDate || reqParam.endDate) {
        filterCondition = {
          ...filterCondition,
          createdAt: {
            $gte: startDate,
            $lte: endDate
          }
        };
        moodSelectionFilter = {
          ...filterCondition,
          createdAt: {
            $gte: startDate,
            $lte: endDate
          }
        };
      }
      const totalMoodCounts = await RippleConversation.countDocuments(moodSelectionFilter);
      const totalShuruUsageTime = await RippleConversation.aggregate([
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
      const activatedUsers = await RippleUser.aggregate([
        {
          $match: {
            createdAt: {
              $gte: startDate,
              $lte: endDate
            }
          }
        },
        {
          $group: {
            _id: null,
            activatedUsers: {
              $sum: { $cond: [{ $eq: ['$trial_activated', true] }, 1, 0] }
            },
            notActivatedUsers: {
              $sum: {
                $cond: [
                  {
                    $or: [
                      { $eq: ['$trial_activated', false] },
                      { $not: { $ifNull: ['$trial_activated', false] } }
                    ]
                  },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]);
      const data = {
        totalRippleUsageTimeInHours:
          typeof totalShuruUsageTime[0] !== 'undefined' ? totalShuruUsageTime[0].totalCount : 0,
        totalMoodCounts,
        activatedUsers:
          typeof activatedUsers[0] !== 'undefined' ? activatedUsers[0].activatedUsers : 0,
        notActivatedUsers:
          typeof activatedUsers[0] !== 'undefined' ? activatedUsers[0].notActivatedUsers : 0
      };

      let timeText = 'Full Day';
      if (reqParam.timeConstant) {
        const { text } = timeConstants[reqParam.timeConstant];
        timeText = text;
      }
      const locals = {
        name: req.authName,
        data,
        timeText,
        fromDate: startDate.toLocaleDateString('en-gb', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }),
        toDate: endDate.toLocaleDateString('en-gb', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }),
        happySmallIcon: process.env.PDF_HAPPY_SMALL_ICON,
        sadSmallIcon: process.env.PDF_SAD_SMALL_ICON
      };

      const compiledFunction = pug.compileFile('src/views/ripple-report.pug');
      const html = compiledFunction(locals);
      const browser = await puppeteer.launch({
        executablePath:
          process.env.NODE_ENV === NODE_ENVIRONMENT.DEVELOPMENT ? null : '/usr/bin/google-chrome',
        ignoreDefaultArgs: ['--disable-extensions'],
        headless: true,
        args: ['--no-sandbox', '--disabled-setupid-sandbox']
      });
      const page = await browser.newPage();
      await page.setContent(html);
      const pdf = await page.pdf({
        format: MOOD_PDF_SIZE,
        printBackground: true
      });
      await browser.close();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=file.pdf');
      res.setHeader('Content-Length', pdf.length);
      res.send(pdf);
    } catch (err) {
      console.log(err);
      return Response.internalServerErrorResponse(res);
    }
  }
};
