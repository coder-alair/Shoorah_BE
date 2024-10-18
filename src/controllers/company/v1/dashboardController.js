'use strict';

const { DeviceTokens } = require('@models');

const { FAIL, SUCCESS, CLOUDFRONT_URL } = require('@services/Constant');
const { getUploadURL, removeOldImage } = require('@services/s3Services');
const { generatePassword } = require('@services/authServices');

const { sendNotification } = require('@services/Notify');

const Response = require('@services/Response');
const {
  COMPANY_MEDIA_PATH,
  STATUS,
  ACCOUNT_TYPE,
  USER_TYPE,
  CONTENT_TYPE,
  PAGE,
  PER_PAGE,
  SORT_ORDER,
  NOTIFICATION_TYPE,
  NOTIFICATION_ACTION,
  ADMIN_MEDIA_PATH,
  RESPONSE_CODE,
  PASSWORD_LENGTH,
  MAIL_SUBJECT,
  ACCOUNT_STATUS,
  SORT_BY
} = require('../../../services/Constant');
const {
  Users,
  Trending,
  RecentlyPlayed,
  Conversation,
  UserGratitude,
  UserAffirmation,
  Cleanse,
  Goals,
  UserNotes,
  B2BMoods,
  Notification,
  Company,
  CompanyUsers,
  ContentCounts,
  Usage
} = require('../../../models');
const {
  convertObjectKeysToCamelCase,
  unixTimeStamp,
  makeRandomDigit,
  makeRandomString,
  toObjectId,
  getDaysDifference,
  calculatePercentage
} = require('../../../services/Helper');
const { sendB2BPassword, sendPraise } = require('../../../services/Mailer');
const { updateB2BSubsStatus } = require('../../admin/v1/companyController');

function getDayIntervals(startDate) {
  const startDateTime = new Date(startDate);
  const intervals = [];

  for (let i = 0; i < 4; i++) {
    const endDateTime = new Date(startDateTime);
    endDateTime.setHours(startDateTime.getHours() + 6);

    const formattedStartTime = startDateTime.toISOString();
    const formattedEndTime = endDateTime.toISOString();

    intervals.push({
      startDate: formattedStartTime,
      endDate: formattedEndTime
    });

    startDateTime.setHours(startDateTime.getHours() + 6);
  }

  return intervals;
}

const formatTime = (date) => {
  const options = { hour: 'numeric', minute: 'numeric', hour12: true };
  return new Intl.DateTimeFormat('en-US', options).format(date);
};

function calculatePercentageChange(newValue, oldValue) {
  if (oldValue === 0) {
    return newValue === 0 ? 0 : 100; // Handle division by zero
  }

  return parseFloat((((newValue - oldValue) / Math.abs(oldValue)) * 100).toFixed(2));
}

const employeeActivity = async (reportDate, companyId) => {
  try {
    const weekStartDate = new Date(reportDate.toISOString().split('T')[0]);
    let endDate = new Date(weekStartDate);
    endDate.setHours(23, 59, 59, 999);
    endDate.setDate(weekStartDate.getDate() + 8);

    let lastWeekStartDate = new Date(reportDate.toISOString().split('T')[0]);
    lastWeekStartDate.setDate(lastWeekStartDate.getDate() - 7);
    let lastWeekEndDate = new Date(reportDate);

    let weekActivityCondition = {
      last_login: {
        $gt: weekStartDate,
        $lt: endDate
      },
      status: STATUS.ACTIVE,
      user_type: { $eq: USER_TYPE.USER },
      deletedAt: { $eq: null },
      company_id: companyId
    };

    let lastweekActivityCondition = {
      last_login: {
        $gt: lastWeekStartDate,
        $lt: lastWeekEndDate
      },
      status: STATUS.ACTIVE,
      user_type: { $eq: USER_TYPE.USER },
      deletedAt: { $eq: null },
      company_id: companyId
    };

    let weekUsers = await Users.find(weekActivityCondition).countDocuments();
    let lastweekUsers = await Users.find(lastweekActivityCondition).countDocuments();

    let totalUsers = await Users.find({
      company_id: companyId,
      user_type: 2,
      deletedAt: null
    }).countDocuments();
    let weekPercent = calculatePercentage(weekUsers, totalUsers);
    let lastweekPercent = calculatePercentage(lastweekUsers, totalUsers);
    let bgColor = 'lightgreen';
    let arrowColor = 'forestgreen';
    let emplArrow = '↗';
    if (weekPercent > lastweekPercent) {
      bgColor = 'lightgreen';
      emplArrow = '↗';
      arrowColor = 'forestgreen';
    } else {
      bgColor = 'indianred';
      emplArrow = '↘';
      arrowColor = 'darkred';
    }

    let data = {
      weekUsers,
      totalUsers,
      weekPercent,
      emplArrow,
      bgColor,
      arrowColor
    };
    return data;
  } catch (err) {
    console.log(err);
  }
};

const timeSpentUsers = async (companyId) => {
  try {
    let totalTimeSpent = 0;
    let users = await Users.find({ company_id: companyId, user_type: 2, deletedAt: null }).select(
      '_id'
    );
    let userIds = users.length ? users.map((i) => i._id) : [];

    let contents = await ContentCounts.find({ user_id: { $in: userIds } }).select('app_durations');
    if (contents.length) {
      contents.map((i) => {
        totalTimeSpent += i.app_durations;
      });
    }

    let data = {
      totalTimeSpent
    };
    return data;
  } catch (err) {
    console.log(err);
  }
};

module.exports = {
  employeeActivity,
  timeSpentUsers,
  /**
   * @description This function is used for getting active users and the peak time
   * @param {*} req
   * @param {*} res
   * @return {*}
   */

  getActiveUsersAndTime: async (req, res) => {
    try {
      const reqParam = req.query;
      let currentDate = new Date();
      currentDate.setHours(23, 59, 59, 0);
      const startDate = new Date(currentDate.toISOString().split('T')[0]);
      let endDate = new Date();
      endDate.setDate(endDate.getDate() + 1);
      endDate = new Date(endDate.toISOString().split('T')[0]);

      let activeUserCondition = {
        last_login: {
          $gt: startDate,
          $lt: endDate
        },
        status: STATUS.ACTIVE,
        user_type: { $eq: USER_TYPE.USER },
        deletedAt: { $eq: null },
        company_id: reqParam.companyId
      };

      let totalUserCondition = {
        status: STATUS.ACTIVE,
        deletedAt: { $eq: null },
        user_type: { $eq: USER_TYPE.USER },
        company_id: reqParam.companyId
      };

      let totalUsers = await Users.find(totalUserCondition).countDocuments();
      let users = await Users.find(activeUserCondition).countDocuments();
      let activeUserPercentage = (users / totalUsers) * 100;
      activeUserPercentage = parseFloat(
        (isNaN(activeUserPercentage) ? 0 : activeUserPercentage).toFixed(2)
      ); // Handle division by zero

      let intervals = getDayIntervals(startDate);
      let intervalCount = [];
      let highestCountInterval = null;
      let highestCount = 0;

      for (const interval of intervals) {
        let filterCondition = {
          last_login: {
            $gt: new Date(interval.startDate),
            $lt: new Date(interval.endDate)
          },
          status: STATUS.ACTIVE,
          user_type: { $eq: USER_TYPE.USER },
          deletedAt: { $eq: null },
          company_id: reqParam.companyId
        };
        const users = await Users.find(filterCondition).countDocuments();
        intervalCount.push(users);

        if (users > highestCount) {
          highestCount = users;
          highestCountInterval = {
            startDate: formatTime(new Date(interval.startDate)),
            endDate: formatTime(new Date(interval.endDate))
          };
        }
      }

      await updateB2BSubsStatus(toObjectId(reqParam.companyId));

      let resObj = {
        users,
        activeUserPercentage,
        highestCountInterval
      };

      return Response.successResponseData(
        res,
        convertObjectKeysToCamelCase(resObj),
        SUCCESS,
        res.__('getActiveUsersAndTime')
      );
    } catch (err) {
      console.log(err);
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used for get recent employees
   * @param {*} req
   * @param {*} res
   * @return {*}
   */

  getRecentJoinedEmployees: async (req, res) => {
    try {
      const reqParam = req.query;

      let recentJoinedConditions = {
        status: STATUS.ACTIVE,
        user_type: { $eq: USER_TYPE.USER },
        deletedAt: { $eq: null },
        company_id: reqParam.companyId
      };

      let employees = await Users.find(recentJoinedConditions)
        .select('name email is_email_verified createdAt phone')
        .sort({ createdAt: -1 })
        .limit(5);

      let resObj = {
        employees
      };

      return Response.successResponseData(
        res,
        convertObjectKeysToCamelCase(resObj),
        SUCCESS,
        res.__('getRecentEmployeesSuccess')
      );
    } catch (err) {
      console.log(err);
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used for get employee activity
   * @param {*} req
   * @param {*} res
   * @return {*}
   */

  getEmployeeActivity: async (req, res) => {
    try {
      const reqParam = req.query;
      const currentDate = new Date();

      const todayStartDate = new Date(currentDate.toISOString().split('T')[0]);
      let todayEndDate = new Date();
      todayEndDate.setDate(todayEndDate.getDate() + 1);
      todayEndDate = new Date(todayEndDate.toISOString().split('T')[0]);

      let yesterdayStartDate = new Date();
      yesterdayStartDate.setDate(yesterdayStartDate.getDate() - 2);
      yesterdayStartDate = new Date(yesterdayStartDate.toISOString().split('T')[0]);
      let yesterdayEndDate = new Date();
      yesterdayEndDate.setDate(yesterdayEndDate.getDate() - 1);
      yesterdayEndDate = new Date(yesterdayEndDate.toISOString().split('T')[0]);

      let monthStartDate = new Date();
      monthStartDate.setDate(monthStartDate.getDate() - 31);
      monthStartDate = new Date(monthStartDate.toISOString().split('T')[0]);
      let monthEndDate = new Date();
      monthEndDate.setDate(monthEndDate.getDate() + 1);
      monthEndDate = new Date(monthEndDate.toISOString().split('T')[0]);

      let prevMonthStartDate = new Date();
      prevMonthStartDate.setDate(prevMonthStartDate.getDate() - 62);
      prevMonthStartDate = new Date(prevMonthStartDate.toISOString().split('T')[0]);
      let prevMonthEndDate = new Date();
      prevMonthEndDate.setDate(prevMonthEndDate.getDate() - 31);
      prevMonthEndDate = new Date(prevMonthEndDate.toISOString().split('T')[0]);

      let yearStartDate = new Date();
      yearStartDate.setDate(yearStartDate.getDate() - 365);
      yearStartDate = new Date(yearStartDate.toISOString().split('T')[0]);
      let yearEndDate = new Date();
      yearEndDate.setDate(yearEndDate.getDate() + 1);
      yearEndDate = new Date(yearEndDate.toISOString().split('T')[0]);

      let prevYearStartDate = new Date();
      prevYearStartDate.setDate(prevYearStartDate.getDate() - 730);
      prevYearStartDate = new Date(prevYearStartDate.toISOString().split('T')[0]);
      let prevYearEndDate = new Date();
      prevYearEndDate.setDate(prevYearEndDate.getDate() - 365);
      prevYearEndDate = new Date(prevYearEndDate.toISOString().split('T')[0]);

      let todayActivityCondition = {
        last_login: {
          $gt: todayStartDate,
          $lt: todayEndDate
        },
        status: STATUS.ACTIVE,
        user_type: { $eq: USER_TYPE.USER },
        deletedAt: { $eq: null },
        company_id: reqParam.companyId
      };

      let yesterdayActivityCondition = {
        last_login: {
          $gt: yesterdayStartDate,
          $lt: yesterdayEndDate
        },
        status: STATUS.ACTIVE,
        user_type: { $eq: USER_TYPE.USER },
        deletedAt: { $eq: null },
        company_id: reqParam.companyId
      };

      let monthActivityCondition = {
        last_login: {
          $gt: monthStartDate,
          $lt: monthEndDate
        },
        status: STATUS.ACTIVE,
        user_type: { $eq: USER_TYPE.USER },
        deletedAt: { $eq: null },
        company_id: reqParam.companyId
      };

      let prevMonthActivityCondition = {
        last_login: {
          $gt: prevMonthStartDate,
          $lt: prevMonthEndDate
        },
        status: STATUS.ACTIVE,
        user_type: { $eq: USER_TYPE.USER },
        deletedAt: { $eq: null },
        company_id: reqParam.companyId
      };

      let yearActivityCondition = {
        last_login: {
          $gt: yearStartDate,
          $lt: yearEndDate
        },
        status: STATUS.ACTIVE,
        user_type: { $eq: USER_TYPE.USER },
        deletedAt: { $eq: null },
        company_id: reqParam.companyId
      };

      let prevYearActivityCondition = {
        last_login: {
          $gt: prevYearStartDate,
          $lt: prevYearEndDate
        },
        status: STATUS.ACTIVE,
        user_type: { $eq: USER_TYPE.USER },
        deletedAt: { $eq: null },
        company_id: reqParam.companyId
      };

      let todayUsers = await Users.find(todayActivityCondition).countDocuments();
      let monthUsers = await Users.find(monthActivityCondition).countDocuments();
      let yearUsers = await Users.find(yearActivityCondition).countDocuments();
      let yesterdayUsers = await Users.find(yesterdayActivityCondition).countDocuments();
      let prevMonthUsers = await Users.find(prevMonthActivityCondition).countDocuments();
      let prevYearUsers = await Users.find(prevYearActivityCondition).countDocuments();

      let todayUsersChangePercentage = calculatePercentageChange(todayUsers, yesterdayUsers);
      let monthUsersChangePercentage = calculatePercentageChange(monthUsers, prevMonthUsers);
      let yearUsersChangePercentage = calculatePercentageChange(yearUsers, prevYearUsers);

      let resObj = {
        todayUsers,
        // yesterdayUsers,
        monthUsers,
        // prevMonthUsers,
        yearUsers,
        // prevYearUsers,
        todayUsersChangePercentage,
        monthUsersChangePercentage,
        yearUsersChangePercentage
      };

      return Response.successResponseData(
        res,
        convertObjectKeysToCamelCase(resObj),
        SUCCESS,
        res.__('getEmployeeActivitySuccess')
      );
    } catch (err) {
      console.log(err);
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used for get trending contents of company users
   * @param {*} req
   * @param {*} res
   * @return {*}
   */

  getTrendingContent: async (req, res) => {
    try {
      const reqParam = req.query;
      let filterDate = new Date();
      filterDate.setMonth(filterDate.getMonth() - 1);
      const matchingUserIds = await Users.distinct('_id', {
        status: STATUS.ACTIVE,
        deletedAt: { $eq: null },
        user_type: 2,
        company_id: reqParam.companyId
      });

      const meditationAggregation = [
        {
          $match: {
            content_type: CONTENT_TYPE.MEDITATION,
            trending_date: {
              $gte: filterDate
            },
            user_id: { $in: matchingUserIds }
          }
        },
        {
          $group: {
            _id: '$content_id',
            totalDuration: {
              $sum: '$duration'
            },
            totalViews: {
              $sum: '$views'
            }
          }
        },
        {
          $lookup: {
            from: 'meditations',
            let: {
              contentId: '$_id'
            },
            pipeline: [
              {
                $match: {
                  status: STATUS.ACTIVE,
                  approved_by: {
                    $ne: null
                  },
                  $expr: {
                    $eq: ['$_id', '$$contentId']
                  }
                }
              },
              {
                $project: {
                  contentId: '$_id',
                  contentName: '$display_name',
                  description: 1,
                  duration: 1,
                  // url: {
                  //     $concat: [
                  //         CLOUDFRONT_URL,
                  //         ADMIN_MEDIA_PATH.MEDITATION_AUDIO,
                  //         '/',
                  //         '$meditation_url'
                  //     ]
                  // },
                  // srtUrl: {
                  //     $concat: [
                  //         CLOUDFRONT_URL,
                  //         'admins/meditations/srt/',
                  //         '$meditation_srt'
                  //     ]
                  // },
                  image: {
                    $concat: [
                      CLOUDFRONT_URL,
                      ADMIN_MEDIA_PATH.MEDITATION_IMAGE,
                      '/',
                      '$meditation_image'
                    ]
                  },
                  expertName: '$expert_name',
                  // expertImage: {
                  //     $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.EXPERT_IMAGES, '/', '$expert_image']
                  // },
                  _id: 0
                }
              }
            ],
            as: 'content'
          }
        },
        {
          $unwind: {
            path: '$content',
            preserveNullAndEmptyArrays: false
          }
        },
        {
          $sort: {
            totalDuration: -1,
            totalViews: -1
          }
        },
        {
          $limit: 5
        }
      ];
      const soundAggregation = [
        {
          $match: {
            content_type: CONTENT_TYPE.SOUND,
            trending_date: {
              $gte: filterDate
            },
            user_id: { $in: matchingUserIds }
          }
        },
        {
          $group: {
            _id: '$content_id',
            totalDuration: {
              $sum: '$duration'
            },
            totalViews: {
              $sum: '$views'
            }
          }
        },
        {
          $lookup: {
            from: 'sounds',
            let: {
              contentId: '$_id'
            },
            pipeline: [
              {
                $match: {
                  status: STATUS.ACTIVE,
                  approved_by: {
                    $ne: null
                  },
                  $expr: {
                    $eq: ['$_id', '$$contentId']
                  }
                }
              },
              {
                $project: {
                  contentId: '$_id',
                  contentName: '$display_name',
                  description: 1,
                  duration: 1,
                  // url: {
                  //     $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.SOUND_AUDIO, '/', '$sound_url']
                  // },
                  // srtUrl: {
                  //     $concat: [
                  //         CLOUDFRONT_URL,
                  //         'admins/sounds/srt/',
                  //         '$sound_srt'
                  //     ]
                  // },
                  image: {
                    $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.SOUND_IMAGES, '/', '$sound_image']
                  },
                  expertName: '$expert_name',
                  // expertImage: {
                  //     $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.EXPERT_IMAGES, '/', '$expert_image']
                  // },
                  _id: 0
                }
              }
            ],
            as: 'content'
          }
        },
        {
          $unwind: {
            path: '$content',
            preserveNullAndEmptyArrays: false
          }
        },
        {
          $sort: {
            totalDuration: -1,
            totalViews: -1
          }
        },
        {
          $limit: 5
        }
      ];
      const podsAggregation = [
        {
          $match: {
            content_type: CONTENT_TYPE.SHOORAH_PODS,
            trending_date: {
              $gte: filterDate
            },
            user_id: { $in: matchingUserIds }
          }
        },
        {
          $group: {
            _id: '$content_id',
            totalDuration: {
              $sum: '$duration'
            },
            totalViews: {
              $sum: '$views'
            }
          }
        },
        {
          $lookup: {
            from: 'shoorah_pods',
            let: {
              contentId: '$_id'
            },
            pipeline: [
              {
                $match: {
                  status: STATUS.ACTIVE,
                  approved_by: {
                    $ne: null
                  },
                  $expr: {
                    $eq: ['$_id', '$$contentId']
                  }
                }
              },
              {
                $project: {
                  contentId: '$_id',
                  contentName: '$display_name',
                  description: 1,
                  duration: 1,
                  // url: {
                  //     $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.SHOORAH_PODS_AUDIO, '/', '$pods_url']
                  // },
                  image: {
                    $concat: [
                      CLOUDFRONT_URL,
                      ADMIN_MEDIA_PATH.SHOORAH_PODS_IMAGE,
                      '/',
                      '$pods_image'
                    ]
                  },
                  // srtUrl: {
                  //     $concat: [
                  //         CLOUDFRONT_URL,
                  //         'admins/shoorah_pods/srt/',
                  //         '$pods_srt'
                  //     ]
                  // },
                  expertName: '$expert_name',
                  // expertImage: {
                  //     $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.EXPERT_IMAGES, '/', '$expert_image']
                  // },
                  _id: 0
                }
              }
            ],
            as: 'content'
          }
        },
        {
          $unwind: {
            path: '$content',
            preserveNullAndEmptyArrays: false
          }
        },
        {
          $sort: {
            totalDuration: -1,
            totalViews: -1
          }
        },
        {
          $limit: 5
        }
      ];

      const trendingMeditation = await Trending.aggregate(meditationAggregation);
      const trendingSound = await Trending.aggregate(soundAggregation);
      const trendingPods = await Trending.aggregate(podsAggregation);

      const trendingData = [];
      if (trendingMeditation.length > 0) {
        trendingMeditation.map((el) => {
          el.content.contentType = CONTENT_TYPE.MEDITATION;
          el.content.totalViews = el?.totalViews;
          trendingData.push(el);
        });
      }
      if (trendingSound.length > 0) {
        trendingSound.map((el) => {
          el.content.contentType = CONTENT_TYPE.SOUND;
          el.content.totalViews = el?.totalViews;
          trendingData.push(el);
        });
      }
      if (trendingPods.length > 0) {
        trendingPods.map((el) => {
          el.content.contentType = CONTENT_TYPE.SHOORAH_PODS;
          el.content.totalViews = el?.totalViews;
          trendingData.push(el);
        });
      }

      trendingData.sort((a, b) =>
        a.totalDuration > b.totalDuration ? -1 : b.totalDuration > a.totalDuration ? 1 : 0
      );

      let resData = [...trendingData.map((el) => el.content)];

      resData.map((i) => {
        const [minutes, seconds] = i.duration.split(':').map(Number);
        const totalMinutes = parseFloat(minutes + seconds / 60).toFixed(2);
        i.totalHours = totalMinutes;
      });

      resData = resData.slice(0, 5);

      return Response.successResponseData(
        res,
        convertObjectKeysToCamelCase(resData),
        SUCCESS,
        res.__('getTrendsSuccess')
      );
    } catch (err) {
      console.log(err);
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used for journal contents usage
   * @param {*} req
   * @param {*} res
   * @return {*}
   */

  getJournalContentUsage: async (req, res) => {
    try {
      const reqParam = req.query;
      let { dataType, minAge, maxAge, department, startDate, endDate, country, ethnicity, gender } =
        req.query;

      const company_id = req.authCompanyId || req.query.company_id;
      if (!company_id) {
        return Response.errorResponseWithoutData(res, 'Company ID not found', FAIL);
      }

      const userFiltering = { company_id };
      const noOfDays = getDaysDifference(startDate, endDate);
      const startBirthDate = new Date();
      startBirthDate.setFullYear(startBirthDate.getFullYear() - maxAge - 1);
      startBirthDate.setHours(0, 0, 0, 0);

      const endBirthDate = new Date();
      endBirthDate.setFullYear(endBirthDate.getFullYear() - minAge);
      endBirthDate.setHours(23, 59, 59, 999);

      if (minAge && maxAge)
        userFiltering['date_of_birth'] = { $gte: startBirthDate, $lte: endBirthDate };
      if (department) userFiltering['department'] = department;
      if (ethnicity) userFiltering['ethnicity'] = ethnicity;
      if (country) userFiltering['country'] = country;
      if (gender) userFiltering['gender'] = parseInt(gender);
      startDate = new Date(startDate);
      endDate = new Date(endDate);
      endDate.setHours(23, 59, 59, 999);
      const companyUsers = await CompanyUsers.aggregate([
        { $match: userFiltering }, // Apply your filtering conditions here
        { $project: { id: '$user_id', _id: 0 } } // Project user_id field as id and exclude _id field
      ]);
      const foundUsers = await Users.find(
        { ...userFiltering, user_type: USER_TYPE.USER },
        { _id: 1 }
      );
      let users = [];
      foundUsers.forEach((user) => {
        users.push({
          user_id: user._id
        });
      });
      const uniqueValues = new Set([...users, ...companyUsers]);
      const uniqueUsers = [...uniqueValues];
      const userIds = uniqueUsers.map((user) => user.user_id);

      const matchingUserIds = uniqueUsers
        .map((user) => user.id || user.user_id)
        .filter((userId) => userId !== undefined);
      const totalUsers = matchingUserIds.length;

      switch (parseInt(reqParam.type)) {
        case 1:
          startDate.setDate(startDate.getDate() - 1);
          break;
        case 2:
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 3:
          startDate.setDate(startDate.getDate() - 30);
          break;
        case 4:
          startDate.setDate(startDate.getDate() - 365);
          break;
        default:
          return Response.successResponseWithoutData(res, res.__('wrongType'), FAIL);
      }

      let restoreConditions = {
        deletedAt: null,
        createdAt: {
          $gte: startDate,
          $lt: endDate
        },
        content_type: { $in: [3, 4] },
        user_id: { $in: matchingUserIds }
      };
      let podsConditions = {
        deletedAt: null,
        createdAt: {
          $gte: startDate,
          $lt: endDate
        },
        content_type: { $in: [5] },
        user_id: { $in: matchingUserIds }
      };
      let shuruConditions = {
        createdAt: {
          $gte: startDate,
          $lt: endDate
        },
        isSessionStart: true,
        to: 'BOT',
        userId: { $in: matchingUserIds }
      };
      let journalConditions = {
        deletedAt: null,
        createdAt: {
          $gte: startDate,
          $lt: endDate
        },
        user_id: { $in: matchingUserIds }
      };

      const restoreCount = await RecentlyPlayed.find(restoreConditions).distinct('user_id');
      const restoreCounts = restoreCount.length;
      const podsCount = await RecentlyPlayed.find(podsConditions).distinct('user_id');
      const podsCounts = podsCount.length;
      const shuruCount = await Conversation.find(shuruConditions).distinct('userId');
      const shuruCounts = shuruCount.length;
      const gratitudeCount = await UserGratitude.find(journalConditions).distinct('user_id');
      const affirmationCount = await UserAffirmation.find(journalConditions).distinct('user_id');
      const cleanseCount = await Cleanse.find(journalConditions).distinct('user_id');
      const goalCount = await Goals.find(journalConditions).distinct('user_id');
      const noteCount = await UserNotes.find(journalConditions).distinct('user_id');

      let gratitudeCountStr = gratitudeCount.map((id) => id.toString());
      let cleanseCountStr = cleanseCount.map((id) => id.toString());
      let noteCountStr = noteCount.map((id) => id.toString());
      let affirmationCountStr = affirmationCount.map((id) => id.toString());
      let goalCountStr = goalCount.map((id) => id.toString());

      let journalUsers = new Set([
        ...gratitudeCountStr,
        ...cleanseCountStr,
        ...noteCountStr,
        ...affirmationCountStr,
        ...goalCountStr
      ]);

      let unqJournal = [...journalUsers];
      let totalJournalUsers = unqJournal.length;

      // Calculate percentages
      const restorePercentage = restoreCounts
        ? parseFloat((restoreCounts / totalUsers) * 100).toFixed(2)
        : 0;
      const shuruPercentage = shuruCounts
        ? parseFloat((shuruCounts / totalUsers) * 100).toFixed(2)
        : 0;
      const journalPercentage = totalJournalUsers
        ? parseFloat((totalJournalUsers / totalUsers) * 100).toFixed(2)
        : 0;
      const podsPercentage = podsCounts
        ? parseFloat((podsCounts / totalUsers) * 100).toFixed(2)
        : 0;

      let resObj = {
        restoreCounts: restorePercentage,
        shuruCounts: shuruPercentage,
        journalCounts: journalPercentage,
        podsCounts: podsPercentage
      };

      return Response.successResponseData(
        res,
        convertObjectKeysToCamelCase(resObj),
        SUCCESS,
        res.__('getJournalContentsCount')
      );
    } catch (err) {
      console.log(err);
      return Response.internalServerErrorResponse(res);
    }
  },

  addEditAdmin: async (req, res) => {
    try {
      const reqParam = req.body;
      let admin = await Users.findOne({ _id: req.authAdminId });
      if (admin.user_type == 3) {
        const reqEmail = reqParam.email.toLowerCase().trim();
        let findCondition = {
          email: reqEmail,
          status: {
            $ne: ACCOUNT_STATUS.DELETED
          },
          user_type: {
            $ne: USER_TYPE.USER
          },
          company_id: req.authCompanyId
        };
        if (reqParam.userId) {
          findCondition = {
            ...findCondition,
            _id: {
              $ne: reqParam.userId
            }
          };
        }
        const user = await Users.findOne(findCondition).select('_id');
        if (user) {
          return Response.successResponseWithoutData(res, res.__('adminAleadyExists'), FAIL);
        } else {
          let updateData = {
            name: reqParam.name?.trim(),
            email: reqEmail,
            user_type: reqParam.userType,
            company_id: req.authCompanyId,
            status: reqParam.accountStatus,
            is_email_verified: true
          };
          let userProfileUrl;
          if (reqParam.userId) {
            const filterData = {
              _id: reqParam.userId,
              status: {
                $ne: ACCOUNT_STATUS.DELETED
              }
            };
            if (reqParam.profile) {
              const existingProfile = await Users.findOne(filterData).select('user_profile');
              if (existingProfile && existingProfile.user_profile) {
                await removeOldImage(
                  existingProfile.user_profile,
                  COMPANY_MEDIA_PATH.COMPANY_PROFILE,
                  res
                );
              }
              const imageExtension = reqParam.profile.split('/')[1];
              const profileImage = `${unixTimeStamp(new Date())}-${makeRandomDigit(
                4
              )}.${imageExtension}`;
              userProfileUrl = await getUploadURL(
                reqParam.imageUrl,
                profileImage,
                COMPANY_MEDIA_PATH.COMPANY_PROFILE
              );
              updateData = {
                ...updateData,
                user_profile: profileImage
              };
            }
            const adminData = await Users.findByIdAndUpdate(filterData, updateData, {
              new: true
            }).select('_id');
            if (adminData) {
              return Response.successResponseWithoutData(
                res,
                res.__('adminDataUpdated'),
                SUCCESS,
                userProfileUrl || null
              );
            } else {
              return Response.successResponseWithoutData(res, res.__('invalidAdminId'), FAIL);
            }
          } else {
            if (reqParam.profile) {
              const imageExtension = reqParam.profile.split('/')[1];
              const profileImage = `${unixTimeStamp(new Date())}-${makeRandomDigit(
                4
              )}.${imageExtension}`;
              userProfileUrl = await getUploadURL(
                reqParam.imageUrl,
                profileImage,
                COMPANY_MEDIA_PATH.COMPANY_PROFILE
              );
              updateData = {
                ...updateData,
                user_profile: profileImage
              };
            }
            const randomPassword = await makeRandomString(PASSWORD_LENGTH);
            const hasPassword = await generatePassword(randomPassword);
            updateData = {
              ...updateData,
              password: hasPassword
            };
            let company = await Company.findOne({ _id: req.authCompanyId });
            let companyUsers = await CompanyUsers.find({
              company_id: req.authCompanyId,
              deletedAt: { $eq: null },
              user_type: { $in: [USER_TYPE.USER, USER_TYPE.COMPANY_SUB_ADMIN] }
            }).countDocuments();

            if (company.no_of_seat_bought <= companyUsers) {
              return Response.successResponseWithoutData(res, res.__('noOfSeatsExceed'), FAIL);
            } else {
              const newUser = await Users.create(updateData);
              const locals = {
                name: reqParam.name?.trim(),
                email: reqParam.email,
                password: randomPassword,
                subject: 'Welcome to Shoorah'
              };
              await sendB2BPassword(reqEmail, MAIL_SUBJECT.B2B_WELCOME, locals);
              // await sendPassword(reqEmail, locals);

              return Response.successResponseWithoutData(
                res,
                res.__('adminAddedSuccessfull'),
                SUCCESS,
                userProfileUrl || null
              );
            }
          }
        }
      } else {
        return Response.successResponseWithoutData(res, res.__('accessDenied'), FAIL);
      }
    } catch (err) {
      console.error(err);
      return Response.internalServerErrorResponse(res);
    }
  },

  adminsList: async (req, res) => {
    try {
      const reqParam = req.query;
      let admin = await Users.findOne({ _id: req.authAdminId });
      if (admin.user_type == 3) {
        const page = reqParam.page ? parseInt(reqParam.page) : PAGE;
        const perPage = reqParam.perPage ? parseInt(reqParam.perPage) : PER_PAGE;
        const skip = (page - 1) * perPage || 0;
        const sortBy = reqParam.sortBy || SORT_BY;
        const sortOrder = reqParam.sortOrder ? parseInt(reqParam.sortOrder) : SORT_ORDER;
        const filterData = {
          _id: { $ne: toObjectId(req.authAdminId) },
          status: {
            $ne: ACCOUNT_STATUS.DELETED
          },
          company_id: toObjectId(req.authCompanyId),
          user_type: {
            $in: [USER_TYPE.COMPANY_ADMIN, USER_TYPE.COMPANY_SUB_ADMIN]
          },
          ...(reqParam.id && { _id: toObjectId(reqParam.id) }),
          ...(reqParam.searchKey && {
            $or: [
              { name: { $regex: '.*' + reqParam.searchKey + '.*', $options: 'i' } },
              { email: { $regex: '.*' + reqParam.searchKey + '.*', $options: 'i' } }
            ]
          }),
          ...(reqParam.userType && { user_type: parseInt(reqParam.userType) }),
          ...(reqParam.accountStatus && { status: parseInt(reqParam.accountStatus) })
        };
        const aggregationPipeline = [
          {
            $match: filterData
          },
          {
            $sort: {
              [sortBy]: sortOrder
            }
          },
          {
            $skip: skip
          },
          {
            $limit: perPage
          },
          {
            $project: {
              id: '$_id',
              name: '$name',
              profile: {
                $concat: [CLOUDFRONT_URL, COMPANY_MEDIA_PATH.COMPANY_PROFILE, '/', '$user_profile']
              },
              email: '$email',
              userType: '$user_type',
              accountStatus: '$status',
              createdAt: 1,
              _id: 0
            }
          }
        ];
        const totalRecords = await Users.countDocuments(filterData);
        const adminsData = await Users.aggregate(aggregationPipeline);
        return Response.successResponseData(res, adminsData, SUCCESS, res.__('adminsListSuccess'), {
          page,
          perPage,
          totalRecords
        });
      } else {
        return Response.successResponseWithoutData(res, res.__('accessDenied'), FAIL);
      }
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  deleteAdmin: async (req, res) => {
    try {
      const reqParam = req.query;
      let admin = await Users.findOne({ _id: req.authAdminId });
      if (admin.user_type == 3) {
        await Users.findByIdAndUpdate(reqParam.userId, {
          status: ACCOUNT_STATUS.DELETED,
          deletedAt: new Date()
        });
        await CompanyUsers.findOneAndUpdate(
          { user_id: reqParam.userId },
          { deletedAt: new Date() }
        );
        await DeviceTokens.deleteMany({ user_id: reqParam.userId });
        return Response.successResponseWithoutData(res, res.__('adminDeleteSuccess'), SUCCESS);
      }
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  getB2BAdminList: async (req, res) => {
    try {
      const reqParam = req.query;
      const page = reqParam.page ? parseInt(reqParam.page) : PAGE;
      const companyId = req.authCompanyId;
      const perPage = reqParam.perPage ? parseInt(reqParam.perPage) : PER_PAGE;
      const skip = (page - 1) * perPage || 0;
      const sortBy = reqParam.sortBy || 'createdAt';
      const sortOrder = reqParam.sortOrder ? parseInt(reqParam.sortOrder) : SORT_ORDER;

      let userFilter = {
        deletedAt: null,
        _id: { $ne: req.authAdminId },
        user_type: { $in: [3, 4] },
        status: STATUS.ACTIVE,
        company_id: { $eq: companyId, $exists: true }
      };

      const totalRecords = await Users.countDocuments(userFilter);

      let users = await Users.find(userFilter, {
        _id: 1,
        name: 1,
        email: 1,
        dob: 1,
        gender: 1,
        user_profile: 1,
        first_name: 1,
        lastLogin: '$last_login',
        last_login: 1,
        last_name: 1,
        country: 1,
        job_role: 1,
        account_type: 1,
        last_login: 1
      })
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(perPage)
        .populate({
          path: 'company_id',
          select: 'company_email company_name contact_number'
        })
        .lean();

      if (users.length > 0) {
        users.map((i) => {
          i.user_profile =
            CLOUDFRONT_URL + COMPANY_MEDIA_PATH.COMPANY_PROFILE + '/' + i.user_profile;
          i.companyName = i.company_id.company_name;
        });
      }

      return Response.successResponseData(
        res,
        convertObjectKeysToCamelCase(users),
        SUCCESS,
        res.__('getAdminListSuccess'),
        {
          page,
          perPage,
          totalRecords
        }
      );
    } catch (err) {
      console.log(err);
      return Response.internalServerErrorResponse(res);
    }
  },

  addB2BMood: async (req, res) => {
    try {
      const reqParam = req.body;
      const companyId = req.authCompanyId;

      if (reqParam.moodType > 4) {
        return Response.successResponseWithoutData(res, res.__('wrongMoodType'), FAIL);
      }

      let payload = {
        user_id: req.authAdminId,
        mood_type: reqParam.moodType,
        companyId: companyId
      };

      let mood = await B2BMoods.create(payload);

      return Response.successResponseData(
        res,
        convertObjectKeysToCamelCase(mood),
        SUCCESS,
        res.__('addB2BAdminMood')
      );
    } catch (err) {
      console.log(err);
      return Response.internalServerErrorResponse(res);
    }
  },

  getB2BAdminMood: async (req, res) => {
    try {
      const companyId = req.authCompanyId;
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      let filterCondition = {
        user_id: req.authAdminId,
        companyId: companyId,
        deletedAt: null,
        createdAt: { $gte: todayStart, $lte: todayEnd }
      };

      let mood = await B2BMoods.findOne(filterCondition).sort({ createdAt: -1 }).limit(1);

      return Response.successResponseData(
        res,
        convertObjectKeysToCamelCase(mood),
        SUCCESS,
        res.__('getB2BAdminMoodSuccess')
      );
    } catch (err) {
      console.log(err);
      return Response.internalServerErrorResponse(res);
    }
  },

  getB2BUsers: async (req, res) => {
    try {
      const companyId = req.authCompanyId;

      let filterCondition = {
        company_id: { $eq: companyId, $exists: true },
        user_type: USER_TYPE.USER,
        deletedAt: null,
        status: STATUS.ACTIVE
      };

      let users = await Users.find(filterCondition)
        .sort({ createdAt: -1 })
        .select('name first_name last_name email mobile');

      return Response.successResponseData(
        res,
        convertObjectKeysToCamelCase(users),
        SUCCESS,
        res.__('getB2BUsersSuccess')
      );
    } catch (err) {
      console.log(err);
      return Response.internalServerErrorResponse(res);
    }
  },

  sendPraiseToUsers: async (req, res) => {
    try {
      const reqParam = req.body;
      const companyId = req.authCompanyId;

      let newData = {
        title: reqParam.title.trim(),
        message: reqParam.message.trim(),
        sent_to_user_type: 4,
        from_user_id: req.authAdminId,
        type: NOTIFICATION_TYPE.B2B_USER_PRAISE,
        sent_on_date: reqParam.sentOnDate,
        cron_sent: reqParam.cronSent
      };

      if (reqParam.toUserIds) {
        newData = {
          ...newData,
          to_user_ids: reqParam.toUserIds
        };
      }
      const notificationData = await Notification.create(newData);

      if (!notificationData.sent_on_date) {
        let filterCondition = {
          company_id: { $eq: companyId, $exists: true },
          deletedAt: null,
          _id: { $in: reqParam.toUserIds },
          user_type: USER_TYPE.USER,
          status: STATUS.ACTIVE
        };

        const users = await Users.aggregate([
          {
            $match: filterCondition
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
              preserveNullAndEmptyArrays: false
            }
          },
          {
            $group: {
              _id: null,
              device_tokens: {
                $addToSet: '$result.device_token'
              }
            }
          }
        ]);

        reqParam.toUserIds.map(async (i) => {
          const user = await Users.findOne({ _id: i });
          if (user) {
            const locals = {
              company_name: req.companyName,
              user_name: user.name,
              admin_name: req.authAdminName,
              subject: 'Congratulations! You got a praise from shoorah'
            };
            sendPraise(user.email, 'Praise Employees', locals);
          }
        });

        if (users.length > 0 && users[0].device_tokens.length > 0) {
          const reqData = {
            title: process.env.APP_NAME,
            message: notificationData.message,
            notificationType: NOTIFICATION_TYPE.B2B_USER_PRAISE
          };

          sendNotification(
            users[0].device_tokens,
            notificationData.message,
            reqData,
            NOTIFICATION_ACTION.B2B_USER_PRAISE_NOTIFY
          );
        }
        return Response.successResponseWithoutData(res, res.__('notificationAddSuccess'), SUCCESS);
      } else if (notificationData.sent_on_date) {
        return Response.successResponseWithoutData(res, res.__('notificationAddSuccess'), SUCCESS);
      } else {
        return Response.successResponseWithoutData(res, res.__('addNotificationFail'), FAIL);
      }
    } catch (err) {
      console.log(err);
      return Response.internalServerErrorResponse(res);
    }
  },

  countUsersAndUsageB2B: async (req, res) => {
    try {
      let reqParam = req.query;
      const company_id = req.authCompanyId || req.query.company_id;
      if (!company_id) {
        return Response.errorResponseWithoutData(res, 'Company ID not found', FAIL);
      }

      let totalUserCondition = {
        status: STATUS.ACTIVE,
        deletedAt: { $eq: null },
        user_type: { $in: [USER_TYPE.USER, USER_TYPE.COMPANY_ADMIN, USER_TYPE.COMPANY_SUB_ADMIN] },
        company_id: toObjectId(company_id)
      };

      let currentDate = new Date();
      let todayStartDate = new Date();
      todayStartDate.setHours(0, 0, 0, 0);
      let todayEndDate = new Date();
      todayEndDate.setHours(23, 59, 59, 0);

      let weeklyStartDate = new Date();
      weeklyStartDate.setDate(weeklyStartDate.getDate() - 7);
      weeklyStartDate.setHours(0, 0, 0, 0);
      let weeklyEndDate = new Date();
      weeklyEndDate.setHours(23, 59, 59, 999);

      let monthlyStartDate = new Date();
      monthlyStartDate.setDate(monthlyStartDate.getDate() - 30);
      monthlyStartDate.setHours(0, 0, 0, 0);
      let monthlyEndDate = new Date();
      monthlyEndDate.setHours(23, 59, 59, 999);

      let annuallyStartDate = new Date();
      annuallyStartDate.setDate(annuallyStartDate.getDate() - 365);
      annuallyStartDate.setHours(0, 0, 0, 0);
      let annuallyEndDate = new Date();
      annuallyEndDate.setHours(23, 59, 59, 999);

      let customStartDate;
      let customEndDate;
      if (reqParam.startDate || reqParam.endDate) {
        customStartDate = new Date(reqParam.startDate);
        customStartDate.setHours(0, 0, 0, 0);

        customEndDate = new Date(reqParam.endDate);
        customEndDate.setDate(customEndDate.getDate() + 1);
        customEndDate.setHours(0, 0, 0, 0);
      } else {
        customStartDate = new Date();
        customStartDate.setHours(0, 0, 0, 0);
        customEndDate = new Date();
        customEndDate.setDate(customEndDate.getDate() + 1);
        customStartDate.setHours(23, 59, 59, 999);
      }

      let totalUsers = await Users.find(totalUserCondition).select('_id');
      let totalUsersIds = totalUsers.map((user) => user._id);

      //  logic here for users login count and app durations
      let todayUsers = await Users.find({
        deletedAt: null,
        _id: {
          $in: totalUsersIds
        },
        last_login: {
          $gte: todayStartDate,
          $lt: todayEndDate
        }
      }).select('_id');

      let weeklyUsers = await Users.find({
        deletedAt: null,
        _id: {
          $in: totalUsersIds
        },
        last_login: {
          $gte: weeklyStartDate,
          $lt: weeklyEndDate
        }
      }).select('_id');

      let monthlyUsers = await Users.find({
        deletedAt: null,
        _id: {
          $in: totalUsersIds
        },
        last_login: {
          $gte: monthlyStartDate,
          $lt: monthlyEndDate
        }
      }).select('_id');

      let annuallyUsers = await Users.find({
        deletedAt: null,
        _id: {
          $in: totalUsersIds
        },
        last_login: {
          $gte: annuallyStartDate,
          $lt: annuallyEndDate
        }
      }).select('_id');

      let customUsers = await Users.find({
        deletedAt: null,
        _id: {
          $in: totalUsersIds
        },
        last_login: {
          $gte: customStartDate,
          $lt: customEndDate
        }
      }).select('_id');

      let todayUsersIds = todayUsers.map((user) => user._id);
      let weeklyUsersIds = weeklyUsers.map((user) => user._id);
      let monthlyUsersIds = monthlyUsers.map((user) => user._id);
      let annuallyUsersIds = annuallyUsers.map((user) => user._id);
      let customUsersIds = customUsers.map((user) => user._id);

      let dailyUsage = await Usage.aggregate([
        {
          $match: {
            user_id: {
              $in: todayUsersIds
            },
            createdAt: {
              $gte: todayStartDate,
              $lt: todayEndDate
            }
          }
        },
        {
          $group: {
            _id: null,
            totalAppDuration: { $sum: '$app_durations' }
          }
        },
        {
          $project: {
            totalAppDuration: { $divide: ['$totalAppDuration', 60] } // Convert milliseconds to hours
          }
        },
        {
          $project: {
            totalAppDuration: { $round: ['$totalAppDuration', 2] } // Round to two decimal points
          }
        }
      ]);

      let weeklyUsage = await Usage.aggregate([
        {
          $match: {
            user_id: {
              $in: weeklyUsersIds
            },
            createdAt: {
              $gte: weeklyStartDate,
              $lt: weeklyEndDate
            }
          }
        },
        {
          $group: {
            _id: null,
            totalAppDuration: { $sum: '$app_durations' }
          }
        },
        {
          $project: {
            totalAppDuration: { $divide: ['$totalAppDuration', 60] } // Convert milliseconds to hours
          }
        },
        {
          $project: {
            totalAppDuration: { $round: ['$totalAppDuration', 2] } // Round to two decimal points
          }
        }
      ]);

      let monthlyUsage = await Usage.aggregate([
        {
          $match: {
            user_id: {
              $in: monthlyUsersIds
            },
            createdAt: {
              $gte: monthlyStartDate,
              $lt: monthlyEndDate
            }
          }
        },
        {
          $group: {
            _id: null,
            totalAppDuration: { $sum: '$app_durations' }
          }
        },
        {
          $project: {
            totalAppDuration: { $divide: ['$totalAppDuration', 60] } // Convert milliseconds to hours
          }
        },
        {
          $project: {
            totalAppDuration: { $round: ['$totalAppDuration', 2] } // Round to two decimal points
          }
        }
      ]);

      let annuallyUsage = await Usage.aggregate([
        {
          $match: {
            user_id: {
              $in: annuallyUsersIds
            },
            createdAt: {
              $gte: annuallyStartDate,
              $lt: annuallyEndDate
            }
          }
        },
        {
          $group: {
            _id: null,
            totalAppDuration: { $sum: '$app_durations' }
          }
        },
        {
          $project: {
            totalAppDuration: { $divide: ['$totalAppDuration', 60] } // Convert milliseconds to hours
          }
        },
        {
          $project: {
            totalAppDuration: { $round: ['$totalAppDuration', 2] } // Round to two decimal points
          }
        }
      ]);

      let customUsage = await Usage.aggregate([
        {
          $match: {
            user_id: {
              $in: customUsersIds
            },
            createdAt: {
              $gte: customStartDate,
              $lt: customEndDate
            }
          }
        },
        {
          $group: {
            _id: null,
            totalAppDuration: { $sum: '$app_durations' }
          }
        },
        {
          $project: {
            totalAppDuration: { $divide: ['$totalAppDuration', 60] } // Convert milliseconds to hours
          }
        },
        {
          $project: {
            totalAppDuration: { $round: ['$totalAppDuration', 2] } // Round to two decimal points
          }
        }
      ]);

      let result = [
        {
          name: 'Day',
          users: todayUsersIds.length,
          duration: dailyUsage.length ? dailyUsage[0].totalAppDuration : 0,
          durationHours: dailyUsage.length ? Math.round(dailyUsage[0].totalAppDuration / 60) : 0
        },
        {
          name: 'Weekly',
          users: weeklyUsersIds.length,
          duration: weeklyUsage.length ? weeklyUsage[0].totalAppDuration : 0,
          durationHours: weeklyUsage.length ? Math.round(weeklyUsage[0].totalAppDuration / 60) : 0
        },
        {
          name: 'Monthly',
          users: monthlyUsersIds.length,
          durationHours: monthlyUsage.length
            ? Math.round(monthlyUsage[0].totalAppDuration / 60)
            : 0,
          duration: monthlyUsage.length ? monthlyUsage[0].totalAppDuration : 0
        },
        {
          name: 'Yearly',
          users: annuallyUsersIds.length,
          durationHours: annuallyUsage.length
            ? Math.round(annuallyUsage[0].totalAppDuration / 60)
            : 0,
          duration: annuallyUsage.length ? annuallyUsage[0].totalAppDuration : 0
        },
        {
          name: 'Custom',
          users: customUsersIds.length,
          durationHours: customUsage.length ? Math.round(customUsage[0].totalAppDuration / 60) : 0,
          duration: customUsage.length ? customUsage[0].totalAppDuration : 0
        }
      ];

      return Response.successResponseData(res, result, SUCCESS, res.__('userUsageSuccess'));
    } catch (err) {
      console.error(err);
      return Response.internalServerErrorResponse(res);
    }
  }
};
