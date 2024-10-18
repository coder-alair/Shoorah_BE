'use strict';

const { RESPONSE_CODE, FAIL, SUCCESS, CLOUDFRONT_URL } = require('@services/Constant');

const puppeteer = require('puppeteer');
const pug = require('pug');

const fs = require('fs');

const { sendPassword } = require('@services/Mailer');

const {
  getDaysDifference,
  getDatesArray,
  getPositiveMood,
  getNegativeMood,
  calculatePercentage,
  replaceUnderscoreWithSpace,
  convertObjectKeysToCamelCase,
  makeRandomDigit,
  makeRandomString,
  addEditKlaviyoUser,
  getRandomItem,
  toObjectId
} = require('../../../services/Helper');
const { generatePassword } = require('@services/authServices');

const { getUploadURL, removeOldImage } = require('@services/s3Services');

const Response = require('@services/Response');
const {
  COMPANY_MEDIA_PATH,
  PAGE,
  PER_PAGE,
  SORT_ORDER,
  USER_TYPE,
  ACCOUNT_STATUS,
  MOOD_TYPE,
  MOOD_PDF_SIZE,
  NODE_ENVIRONMENT,
  SHURU_REPORT_MESSAGES,
  MOOD_REPORT_POSITIVE_MESSGE,
  MOOD_REPORT_NEGATIVE_MESSGE,
  MOOD_REPORT_NEUTRAL_MESSAGE,
  MAIL_SUBJECT,
  KLAVIYO_LIST,
  GENDER,
  STATUS,
  CONTENT_TYPE,
  BREATHWORK_NOTIFICATION_MESSAGE
} = require('../../../services/Constant');
const Company = require('../../../models/Company');
const CompanyUsers = require('../../../models/CompanyUsers');
const Users = require('../../../models/Users');
const Solution = require('../../../models/solution');
const Mood = require('../../../models/Mood');
const {
  companyUsersListValidation
} = require('../../../services/companyValidations/companyUserValidations');
const csv = require('csv-parser');
const stream = require('stream');
const ProfessionalMood = require('../../../models/ProfessionalMood');
const { default: mongoose } = require('mongoose');
const Reports = require('../../../models/report');
const moment = require('moment');
const { CompanyAdminNotify } = require('../../../services/adminServices/companyStatusNotify');
const { sendB2BPassword } = require('../../../services/Mailer');
const {
  Cleanse,
  UserNotes,
  Goals,
  UserGratitude,
  UserAffirmation,
  Conversation,
  RecentlyPlayed
} = require('../../../models');
const BeforeSleep = require('../../../models/BeforeSleep');
const AfterSleep = require('../../../models/AfterSleep');
const CompanySubscriptions = require('../../../models/CompanySubscription');
const BreathworkInterest = require('../../../models/BreathworkInterests');
const { json } = require('express');

const getOverallScore = async (company_id, reportDate) => {
  try {
    let userFiltering = { company_id };
    let startDate = new Date(reportDate);
    let endDate = new Date(startDate);
    endDate.setHours(23, 59, 59, 999);
    endDate.setDate(startDate.getDate() + 8);

    const foundUsers = await Users.find({ ...userFiltering, deletedAt: null }, { _id: 1 });
    let users = [];
    foundUsers.forEach((user) => {
      users.push(user._id.toString());
    });

    const uniqueValues = [...new Set(users)];
    const userIds = uniqueValues.map((value) => new mongoose.Types.ObjectId(value));

    let totalFilterCondition = {
      user_id: { $in: userIds },
      createdAt: {
        $gte: startDate,
        $lt: endDate
      },
      deletedAt: null
    };

    const totalPersonalAggregation = [
      {
        $match: totalFilterCondition
      },
      {
        $group: {
          _id: null,
          totalMoods: {
            $sum: {
              $add: [
                '$anxious',
                '$calm',
                '$need_support',
                '$demotivated',
                '$motivated',
                '$low',
                '$content',
                '$angry',
                '$happy',
                '$i_can_manage',
                '$helpless',
                '$i_am_in_control',
                '$tired',
                '$stressed',
                '$balanced',
                '$energised',
                '$sad',
                '$relaxed',
                '$great',
                '$not_good'
              ]
            }
          },
          totalPositiveMoods: {
            $sum: {
              $add: [
                '$calm',
                '$motivated',
                '$content',
                '$happy',
                '$i_can_manage',
                '$i_am_in_control',
                '$balanced',
                '$energised',
                '$relaxed',
                '$great'
              ]
            }
          },
          totalNegativeMoods: {
            $sum: {
              $add: [
                '$anxious',
                '$need_support',
                '$demotivated',
                '$low',
                '$angry',
                '$helpless',
                '$tired',
                '$stressed',
                '$sad',
                '$not_good'
              ]
            }
          }
        }
      },
      {
        $project: {
          _id: null,
          totalMoods: 1,
          totalPositiveMoods: 1,
          totalNegativeMoods: 1
        }
      }
    ];

    const totalProfessionalAggregation = [
      {
        $match: totalFilterCondition
      },
      {
        $group: {
          _id: null,
          totalMoods: {
            $sum: {
              $add: [
                '$dissatisfied',
                '$very_satisfied',
                '$unpleasant',
                '$positive',
                '$overwhelming',
                '$comfortable',
                '$poor',
                '$supportive',
                '$unmanageable',
                '$manageable',
                '$lacking',
                '$excellent',
                '$negative',
                '$inclusive',
                '$unsupported',
                '$highly_supported',
                '$insufficient',
                '$well_equipped',
                '$inadequate',
                '$comprehensive'
              ]
            }
          },
          totalPositiveMoods: {
            $sum: {
              $add: [
                '$very_satisfied',
                '$positive',
                '$comfortable',
                '$supportive',
                '$manageable',
                '$excellent',
                '$inclusive',
                '$highly_supported',
                '$well_equipped',
                '$comprehensive'
              ]
            }
          },
          totalNegativeMoods: {
            $sum: {
              $add: [
                '$dissatisfied',
                '$unpleasant',
                '$overwhelming',
                '$poor',
                '$unmanageable',
                '$lacking',
                '$negative',
                '$unsupported',
                '$insufficient',
                '$inadequate'
              ]
            }
          },
          dissatisfied: { $sum: '$dissatisfied' },
          unpleasant: { $sum: '$unpleasant' },
          overwhelming: { $sum: '$overwhelming' },
          poor: { $sum: '$poor' },
          unmanageable: { $sum: '$unmanageable' },
          lacking: { $sum: '$lacking' },
          negative: { $sum: '$negative' },
          unsupported: { $sum: '$unsupported' },
          insufficient: { $sum: '$insufficient' },
          inadequate: { $sum: '$inadequate' },
          positive: { $sum: '$positive' },
          verySatisfied: { $sum: '$very_satisfied' },
          comfortable: { $sum: '$comfortable' },
          supportive: { $sum: '$supportive' },
          manageable: { $sum: '$manageable' },
          excellent: { $sum: '$excellent' },
          inclusive: { $sum: '$inclusive' },
          highlySupported: { $sum: '$highly_supported' },
          wellEquipped: { $sum: '$well_equipped' },
          comprehensive: { $sum: '$comprehensive' }
        }
      },
      {
        $project: {
          _id: null,
          totalMoods: 1,
          totalPositiveMoods: 1,
          totalNegativeMoods: 1
        }
      }
    ];
    const totalAggregationProfessionalCounts = await ProfessionalMood.aggregate(
      totalProfessionalAggregation
    );
    const totalAggregationPersonalCounts = await Mood.aggregate(totalPersonalAggregation);

    if (totalAggregationProfessionalCounts.length && totalAggregationPersonalCounts.length) {
      let theraphyPositivePercent = 0;
      let theraphyNegativePercent = 0;
      let overallMoodsPercent = 0;

      // if (theraphyData) {
      //   theraphyData = JSON.parse(theraphyData);
      //   let theraphyPositiveCategories = theraphyData?.positive?.categories;
      //   let theraphyNegativeCategories = theraphyData?.negative?.categories;
      //   let theraphyPositiveData = theraphyData?.positiveCounts?.series[0]?.data;
      //   let theraphyNegativeData = theraphyData?.negativeCounts?.series[0]?.data;
      //   let positiveCount = theraphyPositiveData?.reduce((sum, count) => sum + count, 0);
      //   let negativeCount = theraphyNegativeData?.reduce((sum, count) => sum + count, 0);
      //   let totalCount = positiveCount + negativeCount;

      //   theraphyPositivePercent = parseFloat((positiveCount / totalCount) * 100).toFixed(2);
      //   theraphyNegativePercent = parseFloat((negativeCount / totalCount) * 100).toFixed(2);
      // }

      const averageCounts = {
        totalMoods:
          totalAggregationProfessionalCounts[0].totalMoods +
          totalAggregationPersonalCounts[0].totalMoods,
        totalPositiveMoods:
          totalAggregationProfessionalCounts[0].totalPositiveMoods +
          totalAggregationPersonalCounts[0].totalPositiveMoods,
        totalNegativeMoods:
          totalAggregationProfessionalCounts[0].totalNegativeMoods +
          totalAggregationPersonalCounts[0].totalNegativeMoods
      };

      const moodsPercentPositive = calculatePercentage(
        averageCounts.totalPositiveMoods,
        averageCounts.totalMoods
      );
      const moodsPercentNegative = calculatePercentage(
        averageCounts.totalNegativeMoods,
        averageCounts.totalMoods
      );
      if (theraphyPositivePercent == 0 && theraphyNegativePercent == 0) {
        overallMoodsPercent = parseFloat(moodsPercentPositive - moodsPercentNegative).toFixed(2);
      } else {
        overallMoodsPercent = parseFloat(
          (moodsPercentPositive + parseFloat(theraphyPositivePercent)) / 2 -
            (moodsPercentNegative + parseFloat(theraphyNegativePercent)) / 2
        ).toFixed(2);
      }

      let moodText = '';
      if (overallMoodsPercent < 0) {
        moodText = 'Negative';
      } else if (overallMoodsPercent > 0) {
        moodText = 'Positive';
      } else if (overallMoodsPercent) {
        moodText = 'Neutral';
      }

      const data = {
        positiveScore: moodsPercentPositive,
        negativeScore: moodsPercentNegative,
        overallMoodPercentage: overallMoodsPercent != 'NaN' ? Math.abs(overallMoodsPercent) : 0,
        overallMood: moodText
      };
      return data;
    } else if (totalAggregationPersonalCounts.length) {
      let theraphyPositivePercent = 0;
      let theraphyNegativePercent = 0;
      let overallMoodsPercent = 0;

      // if (theraphyData) {
      //   theraphyData = JSON.parse(theraphyData);
      //   let theraphyPositiveCategories = theraphyData?.positive?.categories;
      //   let theraphyNegativeCategories = theraphyData?.negative?.categories;
      //   let theraphyPositiveData = theraphyData?.positiveCounts?.series[0]?.data;
      //   let theraphyNegativeData = theraphyData?.negativeCounts?.series[0]?.data;
      //   let positiveCount = theraphyPositiveData?.reduce((sum, count) => sum + count, 0);
      //   let negativeCount = theraphyNegativeData?.reduce((sum, count) => sum + count, 0);
      //   let totalCount = positiveCount + negativeCount;

      //   theraphyPositivePercent = parseFloat((positiveCount / totalCount) * 100).toFixed(2);
      //   theraphyNegativePercent = parseFloat((negativeCount / totalCount) * 100).toFixed(2);
      // }

      const averageCounts = {
        totalMoods: totalAggregationPersonalCounts[0].totalMoods,
        totalPositiveMoods: totalAggregationPersonalCounts[0].totalPositiveMoods,
        totalNegativeMoods: totalAggregationPersonalCounts[0].totalNegativeMoods
      };

      const moodsPercentPositive = calculatePercentage(
        averageCounts.totalPositiveMoods,
        averageCounts.totalMoods
      );
      const moodsPercentNegative = calculatePercentage(
        averageCounts.totalNegativeMoods,
        averageCounts.totalMoods
      );

      if (theraphyPositivePercent == 0 && theraphyNegativePercent == 0) {
        overallMoodsPercent = parseFloat(moodsPercentPositive - moodsPercentNegative).toFixed(2);
      } else {
        overallMoodsPercent = parseFloat(
          (moodsPercentPositive + parseFloat(theraphyPositivePercent)) / 2 -
            (moodsPercentNegative + parseFloat(theraphyNegativePercent)) / 2
        ).toFixed(2);
      }

      let moodText = '';
      if (overallMoodsPercent < 0) {
        moodText = 'Negative';
      } else if (overallMoodsPercent > 0) {
        moodText = 'Positive';
      } else if (overallMoodsPercent) {
        moodText = 'Neutral';
      }

      const data = {
        positiveScore: moodsPercentPositive,
        negativeScore: moodsPercentNegative,
        overallMoodPercentage: overallMoodsPercent,
        overallMood: moodText
      };
      return data;
    } else if (totalAggregationProfessionalCounts.length) {
      let theraphyPositivePercent = 0;
      let theraphyNegativePercent = 0;
      let overallMoodsPercent = 0;

      // if (theraphyData) {
      //   theraphyData = JSON.parse(theraphyData);
      //   let theraphyPositiveCategories = theraphyData?.positive?.categories;
      //   let theraphyNegativeCategories = theraphyData?.negative?.categories;
      //   let theraphyPositiveData = theraphyData?.positiveCounts?.series[0]?.data;
      //   let theraphyNegativeData = theraphyData?.negativeCounts?.series[0]?.data;
      //   let positiveCount = theraphyPositiveData?.reduce((sum, count) => sum + count, 0);
      //   let negativeCount = theraphyNegativeData?.reduce((sum, count) => sum + count, 0);
      //   let totalCount = positiveCount + negativeCount;

      //   theraphyPositivePercent = parseFloat((positiveCount / totalCount) * 100).toFixed(2);
      //   theraphyNegativePercent = parseFloat((negativeCount / totalCount) * 100).toFixed(2);
      // }

      const averageCounts = {
        totalMoods: totalAggregationProfessionalCounts[0].totalMoods,
        totalPositiveMoods: totalAggregationProfessionalCounts[0].totalPositiveMoods,
        totalNegativeMoods: totalAggregationProfessionalCounts[0].totalNegativeMoods
      };

      const moodsPercentPositive = calculatePercentage(
        averageCounts.totalPositiveMoods,
        averageCounts.totalMoods
      );
      const moodsPercentNegative = calculatePercentage(
        averageCounts.totalNegativeMoods,
        averageCounts.totalMoods
      );

      if (theraphyPositivePercent == 0 && theraphyNegativePercent == 0) {
        overallMoodsPercent = parseFloat(moodsPercentPositive - moodsPercentNegative).toFixed(2);
      } else {
        overallMoodsPercent = parseFloat(
          (moodsPercentPositive + parseFloat(theraphyPositivePercent)) / 2 -
            (moodsPercentNegative + parseFloat(theraphyNegativePercent)) / 2
        ).toFixed(2);
      }

      let moodText = '';
      if (overallMoodsPercent < 0) {
        moodText = 'Negative';
      } else if (overallMoodsPercent > 0) {
        moodText = 'Positive';
      } else if (overallMoodsPercent) {
        moodText = 'Neutral';
      }

      const data = {
        positiveScore: moodsPercentPositive,
        negativeScore: moodsPercentNegative,
        overallMoodPercentage: overallMoodsPercent,
        overallMood: moodText
      };
      return data;
    } else {
      const resData = {
        positiveScore: 0,
        negativeScore: 0,
        overallMoodPercentage: '0',
        overallMood: 'Neutral'
      };
      return resData;
    }
  } catch (error) {
    console.error(error);
  }
};

const getPersonalMoodsPercent = async (company_id, reportDate) => {
  try {
    let userFiltering = { company_id };
    let startDate = new Date(reportDate);
    let endDate = new Date(startDate);
    endDate.setHours(23, 59, 59, 999);
    endDate.setDate(startDate.getDate() + 8);

    const foundUsers = await Users.find({ ...userFiltering, deletedAt: null }, { _id: 1 });
    let users = [];
    foundUsers.forEach((user) => {
      users.push(user._id.toString());
    });

    const uniqueValues = [...new Set(users)];
    const userIds = uniqueValues.map((value) => new mongoose.Types.ObjectId(value));

    let filterCondition = {
      user_id: { $in: userIds },
      createdAt: {
        $gte: startDate,
        $lt: endDate
      },
      deletedAt: null
    };

    let totalFilterCondition = {
      user_id: { $in: userIds },
      createdAt: {
        $lt: startDate
      },
      deletedAt: null
    };

    const aggregation = [
      {
        $match: filterCondition
      },
      {
        $group: {
          _id: null,
          totalMoods: {
            $sum: {
              $add: [
                '$anxious',
                '$calm',
                '$need_support',
                '$demotivated',
                '$motivated',
                '$low',
                '$content',
                '$angry',
                '$happy',
                '$i_can_manage',
                '$helpless',
                '$i_am_in_control',
                '$tired',
                '$stressed',
                '$balanced',
                '$energised',
                '$sad',
                '$relaxed',
                '$great',
                '$not_good'
              ]
            }
          },
          totalPositiveMoods: {
            $sum: {
              $add: [
                '$calm',
                '$motivated',
                '$content',
                '$happy',
                '$i_can_manage',
                '$i_am_in_control',
                '$balanced',
                '$energised',
                '$relaxed',
                '$great'
              ]
            }
          },
          totalNegativeMoods: {
            $sum: {
              $add: [
                '$anxious',
                '$need_support',
                '$demotivated',
                '$low',
                '$angry',
                '$helpless',
                '$tired',
                '$stressed',
                '$sad',
                '$not_good'
              ]
            }
          },
          anxious: { $sum: '$anxious' },
          calm: { $sum: '$calm' },
          needSupport: { $sum: '$need_support' },
          demotivated: { $sum: '$demotivated' },
          motivated: { $sum: '$motivated' },
          low: { $sum: '$low' },
          content: { $sum: '$content' },
          angry: { $sum: '$angry' },
          happy: { $sum: '$happy' },
          iCanManage: { $sum: '$i_can_manage' },
          helpless: { $sum: '$helpless' },
          iAmInControl: { $sum: '$i_am_in_control' },
          tired: { $sum: '$tired' },
          stressed: { $sum: '$stressed' },
          balanced: { $sum: '$balanced' },
          energised: { $sum: '$energised' },
          sad: { $sum: '$sad' },
          relaxed: { $sum: '$relaxed' },
          great: { $sum: '$great' },
          notGood: { $sum: '$not_good' }
        }
      },
      {
        $project: {
          _id: null,
          totalMoods: 1,
          totalPositiveMoods: 1,
          totalNegativeMoods: 1,
          anxious: { $ifNull: ['$anxious', 0] },
          calm: { $ifNull: ['$calm', 0] },
          needSupport: { $ifNull: ['$needSupport', 0] },
          demotivated: { $ifNull: ['$demotivated', 0] },
          motivated: { $ifNull: ['$motivated', 0] },
          low: { $ifNull: ['$low', 0] },
          content: { $ifNull: ['$content', 0] },
          angry: { $ifNull: ['$angry', 0] },
          happy: { $ifNull: ['$happy', 0] },
          iCanManage: { $ifNull: ['$iCanManage', 0] },
          helpless: { $ifNull: ['$helpless', 0] },
          iAmInControl: { $ifNull: ['$iAmInControl', 0] },
          tired: { $ifNull: ['$tired', 0] },
          stressed: { $ifNull: ['$stressed', 0] },
          balanced: { $ifNull: ['$balanced', 0] },
          energised: { $ifNull: ['$energised', 0] },
          sad: { $ifNull: ['$sad', 0] },
          relaxed: { $ifNull: ['$relaxed', 0] },
          great: { $ifNull: ['$great', 0] },
          notGood: { $ifNull: ['$notGood', 0] }
        }
      }
    ];

    const totalAggregation = [
      {
        $match: totalFilterCondition
      },
      {
        $group: {
          _id: null,
          totalMoods: {
            $sum: {
              $add: [
                '$anxious',
                '$calm',
                '$need_support',
                '$demotivated',
                '$motivated',
                '$low',
                '$content',
                '$angry',
                '$happy',
                '$i_can_manage',
                '$helpless',
                '$i_am_in_control',
                '$tired',
                '$stressed',
                '$balanced',
                '$energised',
                '$sad',
                '$relaxed',
                '$great',
                '$not_good'
              ]
            }
          },
          totalPositiveMoods: {
            $sum: {
              $add: [
                '$calm',
                '$motivated',
                '$content',
                '$happy',
                '$i_can_manage',
                '$i_am_in_control',
                '$balanced',
                '$energised',
                '$relaxed',
                '$great'
              ]
            }
          },
          totalNegativeMoods: {
            $sum: {
              $add: [
                '$anxious',
                '$need_support',
                '$demotivated',
                '$low',
                '$angry',
                '$helpless',
                '$tired',
                '$stressed',
                '$sad',
                '$not_good'
              ]
            }
          }
        }
      },
      {
        $project: {
          _id: null,
          totalMoods: 1,
          totalPositiveMoods: 1,
          totalNegativeMoods: 1
        }
      }
    ];

    const aggregationPromise = await Mood.aggregate(aggregation);
    const totalAggregationCounts = await Mood.aggregate(totalAggregation);

    if (aggregationPromise.length) {
      const moodsPercentPositive = calculatePercentage(
        aggregationPromise[0].totalPositiveMoods,
        aggregationPromise[0].totalMoods
      );

      const moodsPercentNegative = calculatePercentage(
        aggregationPromise[0].totalNegativeMoods,
        aggregationPromise[0].totalMoods
      );

      let personalMoodBg = 'lightgreen';
      let moodsText = 'Positive';
      let moodPercentage = moodsPercentPositive;

      if (moodsPercentPositive >= moodsPercentNegative) {
        personalMoodBg = 'lightgreen';
        moodsText = 'Positive';
        moodPercentage = moodsPercentPositive;
      }
      if (moodsPercentPositive <= moodsPercentNegative) {
        personalMoodBg = 'darkred';
        moodsText = 'Negative';
        moodPercentage = moodsPercentNegative;
      }
      if (moodsPercentPositive == moodsPercentNegative) {
        personalMoodBg = 'lightgreen';
        moodsText = 'Positive';
        moodPercentage = moodsPercentPositive;
      }

      const data = {
        personalMoodBg,
        moodsText,
        moodPercentage
      };

      return data;
    } else {
      const resData = {
        personalMoodBg: 'lightgreen',
        moodsText: 'Positive',
        moodPercentage: 0
      };
      return resData;
    }
  } catch (error) {
    console.error(error);
  }
};

const getProfessionalMoodsPercent = async (company_id, reportDate) => {
  try {
    let userFiltering = { company_id };
    let startDate = new Date(reportDate);
    let endDate = new Date(startDate);
    endDate.setHours(23, 59, 59, 999);
    endDate.setDate(startDate.getDate() + 8);

    const foundUsers = await Users.find({ ...userFiltering, deletedAt: null }, { _id: 1 });
    let users = [];
    foundUsers.forEach((user) => {
      users.push(user._id.toString());
    });

    const uniqueValues = [...new Set(users)];
    const userIds = uniqueValues.map((value) => new mongoose.Types.ObjectId(value));

    let filterCondition = {
      user_id: { $in: userIds },
      createdAt: {
        $gte: startDate,
        $lt: endDate
      },
      deletedAt: null
    };

    let totalFilterCondition = {
      user_id: { $in: userIds },
      createdAt: {
        $lt: startDate
      },
      deletedAt: null
    };

    const aggregation = [
      {
        $match: filterCondition
      },
      {
        $group: {
          _id: null,
          totalMoods: {
            $sum: {
              $add: [
                '$dissatisfied',
                '$very_satisfied',
                '$unpleasant',
                '$positive',
                '$overwhelming',
                '$comfortable',
                '$poor',
                '$supportive',
                '$unmanageable',
                '$manageable',
                '$lacking',
                '$excellent',
                '$negative',
                '$inclusive',
                '$unsupported',
                '$highly_supported',
                '$insufficient',
                '$well_equipped',
                '$inadequate',
                '$comprehensive'
              ]
            }
          },
          totalPositiveMoods: {
            $sum: {
              $add: [
                '$very_satisfied',
                '$positive',
                '$comfortable',
                '$supportive',
                '$manageable',
                '$excellent',
                '$inclusive',
                '$highly_supported',
                '$well_equipped',
                '$comprehensive'
              ]
            }
          },
          totalNegativeMoods: {
            $sum: {
              $add: [
                '$dissatisfied',
                '$unpleasant',
                '$overwhelming',
                '$poor',
                '$unmanageable',
                '$lacking',
                '$negative',
                '$unsupported',
                '$insufficient',
                '$inadequate'
              ]
            }
          },
          dissatisfied: { $sum: '$dissatisfied' },
          unpleasant: { $sum: '$unpleasant' },
          overwhelming: { $sum: '$overwhelming' },
          poor: { $sum: '$poor' },
          unmanageable: { $sum: '$unmanageable' },
          lacking: { $sum: '$lacking' },
          negative: { $sum: '$negative' },
          unsupported: { $sum: '$unsupported' },
          insufficient: { $sum: '$insufficient' },
          inadequate: { $sum: '$inadequate' },
          positive: { $sum: '$positive' },
          verySatisfied: { $sum: '$very_satisfied' },
          comfortable: { $sum: '$comfortable' },
          supportive: { $sum: '$supportive' },
          manageable: { $sum: '$manageable' },
          excellent: { $sum: '$excellent' },
          inclusive: { $sum: '$inclusive' },
          highlySupported: { $sum: '$highly_supported' },
          wellEquipped: { $sum: '$well_equipped' },
          comprehensive: { $sum: '$comprehensive' }
        }
      },
      {
        $project: {
          _id: null,
          totalMoods: 1,
          totalPositiveMoods: 1,
          totalNegativeMoods: 1,
          dissatisfied: 1,
          unpleasant: 1,
          overwhelming: 1,
          poor: 1,
          unmanageable: 1,
          lacking: 1,
          negative: 1,
          unsupported: 1,
          insufficient: 1,
          inadequate: 1,
          positive: 1,
          verySatisfied: 1,
          comfortable: 1,
          supportive: 1,
          manageable: 1,
          excellent: 1,
          inclusive: 1,
          highlySupported: 1,
          wellEquipped: 1,
          comprehensive: 1
        }
      }
    ];

    const totalAggregation = [
      {
        $match: totalFilterCondition
      },
      {
        $group: {
          _id: null,
          totalMoods: {
            $sum: {
              $add: [
                '$dissatisfied',
                '$very_satisfied',
                '$unpleasant',
                '$positive',
                '$overwhelming',
                '$comfortable',
                '$poor',
                '$supportive',
                '$unmanageable',
                '$manageable',
                '$lacking',
                '$excellent',
                '$negative',
                '$inclusive',
                '$unsupported',
                '$highly_supported',
                '$insufficient',
                '$well_equipped',
                '$inadequate',
                '$comprehensive'
              ]
            }
          },
          totalPositiveMoods: {
            $sum: {
              $add: [
                '$very_satisfied',
                '$positive',
                '$comfortable',
                '$supportive',
                '$manageable',
                '$excellent',
                '$inclusive',
                '$highly_supported',
                '$well_equipped',
                '$comprehensive'
              ]
            }
          },
          totalNegativeMoods: {
            $sum: {
              $add: [
                '$dissatisfied',
                '$unpleasant',
                '$overwhelming',
                '$poor',
                '$unmanageable',
                '$lacking',
                '$negative',
                '$unsupported',
                '$insufficient',
                '$inadequate'
              ]
            }
          },
          dissatisfied: { $sum: '$dissatisfied' },
          unpleasant: { $sum: '$unpleasant' },
          overwhelming: { $sum: '$overwhelming' },
          poor: { $sum: '$poor' },
          unmanageable: { $sum: '$unmanageable' },
          lacking: { $sum: '$lacking' },
          negative: { $sum: '$negative' },
          unsupported: { $sum: '$unsupported' },
          insufficient: { $sum: '$insufficient' },
          inadequate: { $sum: '$inadequate' },
          positive: { $sum: '$positive' },
          verySatisfied: { $sum: '$very_satisfied' },
          comfortable: { $sum: '$comfortable' },
          supportive: { $sum: '$supportive' },
          manageable: { $sum: '$manageable' },
          excellent: { $sum: '$excellent' },
          inclusive: { $sum: '$inclusive' },
          highlySupported: { $sum: '$highly_supported' },
          wellEquipped: { $sum: '$well_equipped' },
          comprehensive: { $sum: '$comprehensive' }
        }
      },
      {
        $project: {
          _id: null,
          totalMoods: 1,
          totalPositiveMoods: 1,
          totalNegativeMoods: 1
        }
      }
    ];

    const aggregationPromise = await ProfessionalMood.aggregate(aggregation);
    const totalAggregationCounts = await ProfessionalMood.aggregate(totalAggregation);

    if (aggregationPromise.length) {
      const moodsPercentPositive = calculatePercentage(
        aggregationPromise[0].totalPositiveMoods,
        aggregationPromise[0].totalMoods
      );

      const moodsPercentNegative = calculatePercentage(
        aggregationPromise[0].totalNegativeMoods,
        aggregationPromise[0].totalMoods
      );

      let professionalMoodBg = 'lightgreen';
      let moodsText = 'Positive';
      let moodPercentage = moodsPercentPositive;

      if (moodsPercentPositive >= moodsPercentNegative) {
        professionalMoodBg = 'lightgreen';
        moodsText = 'Positive';
        moodPercentage = moodsPercentPositive;
      }
      if (moodsPercentPositive <= moodsPercentNegative) {
        professionalMoodBg = 'darkred';
        moodsText = 'Negative';
        moodPercentage = moodsPercentNegative;
      }
      if (moodsPercentPositive == moodsPercentNegative) {
        professionalMoodBg = 'lightgreen';
        moodsText = 'Positive';
        moodPercentage = moodsPercentPositive;
      }

      const data = {
        moodPercentage,
        professionalMoodBg,
        moodsText
      };

      return data;
    } else {
      const resData = {
        professionalMoodBg: 'lightgreen',
        moodsText: 'Positive',
        moodPercentage: 0
      };
      return resData;
    }
  } catch (error) {
    console.error(error);
  }
};

const getUserPersonalMoodsPercent = async (user_id, reportDate) => {
  try {
    let userFiltering = { _id: user_id };
    let startDate = new Date(reportDate);
    let endDate = new Date(startDate);
    endDate.setHours(23, 59, 59, 999);
    endDate.setDate(startDate.getDate() + 8);

    const foundUsers = await Users.find({ ...userFiltering, deletedAt: null }, { _id: 1 });
    let users = [];
    foundUsers.forEach((user) => {
      users.push(user._id.toString());
    });

    const uniqueValues = [...new Set(users)];
    const userIds = uniqueValues.map((value) => new mongoose.Types.ObjectId(value));

    let filterCondition = {
      user_id: { $in: userIds },
      createdAt: {
        $gte: startDate,
        $lt: endDate
      },
      deletedAt: null
    };

    let totalFilterCondition = {
      user_id: { $in: userIds },
      createdAt: {
        $lt: startDate
      },
      deletedAt: null
    };

    const aggregation = [
      {
        $match: filterCondition
      },
      {
        $group: {
          _id: null,
          totalMoods: {
            $sum: {
              $add: [
                '$anxious',
                '$calm',
                '$need_support',
                '$demotivated',
                '$motivated',
                '$low',
                '$content',
                '$angry',
                '$happy',
                '$i_can_manage',
                '$helpless',
                '$i_am_in_control',
                '$tired',
                '$stressed',
                '$balanced',
                '$energised',
                '$sad',
                '$relaxed',
                '$great',
                '$not_good'
              ]
            }
          },
          totalPositiveMoods: {
            $sum: {
              $add: [
                '$calm',
                '$motivated',
                '$content',
                '$happy',
                '$i_can_manage',
                '$i_am_in_control',
                '$balanced',
                '$energised',
                '$relaxed',
                '$great'
              ]
            }
          },
          totalNegativeMoods: {
            $sum: {
              $add: [
                '$anxious',
                '$need_support',
                '$demotivated',
                '$low',
                '$angry',
                '$helpless',
                '$tired',
                '$stressed',
                '$sad',
                '$not_good'
              ]
            }
          },
          anxious: { $sum: '$anxious' },
          calm: { $sum: '$calm' },
          needSupport: { $sum: '$need_support' },
          demotivated: { $sum: '$demotivated' },
          motivated: { $sum: '$motivated' },
          low: { $sum: '$low' },
          content: { $sum: '$content' },
          angry: { $sum: '$angry' },
          happy: { $sum: '$happy' },
          iCanManage: { $sum: '$i_can_manage' },
          helpless: { $sum: '$helpless' },
          iAmInControl: { $sum: '$i_am_in_control' },
          tired: { $sum: '$tired' },
          stressed: { $sum: '$stressed' },
          balanced: { $sum: '$balanced' },
          energised: { $sum: '$energised' },
          sad: { $sum: '$sad' },
          relaxed: { $sum: '$relaxed' },
          great: { $sum: '$great' },
          notGood: { $sum: '$not_good' }
        }
      },
      {
        $project: {
          _id: null,
          totalMoods: 1,
          totalPositiveMoods: 1,
          totalNegativeMoods: 1,
          anxious: { $ifNull: ['$anxious', 0] },
          calm: { $ifNull: ['$calm', 0] },
          needSupport: { $ifNull: ['$needSupport', 0] },
          demotivated: { $ifNull: ['$demotivated', 0] },
          motivated: { $ifNull: ['$motivated', 0] },
          low: { $ifNull: ['$low', 0] },
          content: { $ifNull: ['$content', 0] },
          angry: { $ifNull: ['$angry', 0] },
          happy: { $ifNull: ['$happy', 0] },
          iCanManage: { $ifNull: ['$iCanManage', 0] },
          helpless: { $ifNull: ['$helpless', 0] },
          iAmInControl: { $ifNull: ['$iAmInControl', 0] },
          tired: { $ifNull: ['$tired', 0] },
          stressed: { $ifNull: ['$stressed', 0] },
          balanced: { $ifNull: ['$balanced', 0] },
          energised: { $ifNull: ['$energised', 0] },
          sad: { $ifNull: ['$sad', 0] },
          relaxed: { $ifNull: ['$relaxed', 0] },
          great: { $ifNull: ['$great', 0] },
          notGood: { $ifNull: ['$notGood', 0] }
        }
      }
    ];

    const totalAggregation = [
      {
        $match: totalFilterCondition
      },
      {
        $group: {
          _id: null,
          totalMoods: {
            $sum: {
              $add: [
                '$anxious',
                '$calm',
                '$need_support',
                '$demotivated',
                '$motivated',
                '$low',
                '$content',
                '$angry',
                '$happy',
                '$i_can_manage',
                '$helpless',
                '$i_am_in_control',
                '$tired',
                '$stressed',
                '$balanced',
                '$energised',
                '$sad',
                '$relaxed',
                '$great',
                '$not_good'
              ]
            }
          },
          totalPositiveMoods: {
            $sum: {
              $add: [
                '$calm',
                '$motivated',
                '$content',
                '$happy',
                '$i_can_manage',
                '$i_am_in_control',
                '$balanced',
                '$energised',
                '$relaxed',
                '$great'
              ]
            }
          },
          totalNegativeMoods: {
            $sum: {
              $add: [
                '$anxious',
                '$need_support',
                '$demotivated',
                '$low',
                '$angry',
                '$helpless',
                '$tired',
                '$stressed',
                '$sad',
                '$not_good'
              ]
            }
          }
        }
      },
      {
        $project: {
          _id: null,
          totalMoods: 1,
          totalPositiveMoods: 1,
          totalNegativeMoods: 1
        }
      }
    ];

    const aggregationPromise = await Mood.aggregate(aggregation);
    const totalAggregationCounts = await Mood.aggregate(totalAggregation);

    if (aggregationPromise.length) {
      const moodsPercentPositive = calculatePercentage(
        aggregationPromise[0].totalPositiveMoods,
        aggregationPromise[0].totalMoods
      );

      const moodsPercentNegative = calculatePercentage(
        aggregationPromise[0].totalNegativeMoods,
        aggregationPromise[0].totalMoods
      );

      let personalMoodBg = 'lightgreen';
      let moodsText = 'Positive';
      let moodPercentage = moodsPercentPositive;

      if (moodsPercentPositive >= moodsPercentNegative) {
        personalMoodBg = 'lightgreen';
        moodsText = 'Positive';
        moodPercentage = moodsPercentPositive;
      }
      if (moodsPercentPositive <= moodsPercentNegative) {
        personalMoodBg = 'darkred';
        moodsText = 'Negative';
        moodPercentage = moodsPercentNegative;
      }
      if (moodsPercentPositive == moodsPercentNegative) {
        personalMoodBg = 'lightgreen';
        moodsText = 'Positive';
        moodPercentage = moodsPercentPositive;
      }

      const data = {
        personalMoodBg,
        moodsText,
        moodPercentage
      };

      return data;
    } else {
      const resData = {
        personalMoodBg: 'lightgreen',
        moodsText: 'Positive',
        moodPercentage: 0
      };
      return resData;
    }
  } catch (error) {
    console.error(error);
  }
};

const getUserProfessionalMoodsPercent = async (user_id, reportDate) => {
  try {
    let userFiltering = { _id: user_id };
    let startDate = new Date(reportDate);
    let endDate = new Date(startDate);
    endDate.setHours(23, 59, 59, 999);
    endDate.setDate(startDate.getDate() + 8);

    const foundUsers = await Users.find({ ...userFiltering, deletedAt: null }, { _id: 1 });
    let users = [];
    foundUsers.forEach((user) => {
      users.push(user._id.toString());
    });

    const uniqueValues = [...new Set(users)];
    const userIds = uniqueValues.map((value) => new mongoose.Types.ObjectId(value));

    let filterCondition = {
      user_id: { $in: userIds },
      createdAt: {
        $gte: startDate,
        $lt: endDate
      },
      deletedAt: null
    };

    let totalFilterCondition = {
      user_id: { $in: userIds },
      createdAt: {
        $lt: startDate
      },
      deletedAt: null
    };

    const aggregation = [
      {
        $match: filterCondition
      },
      {
        $group: {
          _id: null,
          totalMoods: {
            $sum: {
              $add: [
                '$dissatisfied',
                '$very_satisfied',
                '$unpleasant',
                '$positive',
                '$overwhelming',
                '$comfortable',
                '$poor',
                '$supportive',
                '$unmanageable',
                '$manageable',
                '$lacking',
                '$excellent',
                '$negative',
                '$inclusive',
                '$unsupported',
                '$highly_supported',
                '$insufficient',
                '$well_equipped',
                '$inadequate',
                '$comprehensive'
              ]
            }
          },
          totalPositiveMoods: {
            $sum: {
              $add: [
                '$very_satisfied',
                '$positive',
                '$comfortable',
                '$supportive',
                '$manageable',
                '$excellent',
                '$inclusive',
                '$highly_supported',
                '$well_equipped',
                '$comprehensive'
              ]
            }
          },
          totalNegativeMoods: {
            $sum: {
              $add: [
                '$dissatisfied',
                '$unpleasant',
                '$overwhelming',
                '$poor',
                '$unmanageable',
                '$lacking',
                '$negative',
                '$unsupported',
                '$insufficient',
                '$inadequate'
              ]
            }
          },
          dissatisfied: { $sum: '$dissatisfied' },
          unpleasant: { $sum: '$unpleasant' },
          overwhelming: { $sum: '$overwhelming' },
          poor: { $sum: '$poor' },
          unmanageable: { $sum: '$unmanageable' },
          lacking: { $sum: '$lacking' },
          negative: { $sum: '$negative' },
          unsupported: { $sum: '$unsupported' },
          insufficient: { $sum: '$insufficient' },
          inadequate: { $sum: '$inadequate' },
          positive: { $sum: '$positive' },
          verySatisfied: { $sum: '$very_satisfied' },
          comfortable: { $sum: '$comfortable' },
          supportive: { $sum: '$supportive' },
          manageable: { $sum: '$manageable' },
          excellent: { $sum: '$excellent' },
          inclusive: { $sum: '$inclusive' },
          highlySupported: { $sum: '$highly_supported' },
          wellEquipped: { $sum: '$well_equipped' },
          comprehensive: { $sum: '$comprehensive' }
        }
      },
      {
        $project: {
          _id: null,
          totalMoods: 1,
          totalPositiveMoods: 1,
          totalNegativeMoods: 1,
          dissatisfied: 1,
          unpleasant: 1,
          overwhelming: 1,
          poor: 1,
          unmanageable: 1,
          lacking: 1,
          negative: 1,
          unsupported: 1,
          insufficient: 1,
          inadequate: 1,
          positive: 1,
          verySatisfied: 1,
          comfortable: 1,
          supportive: 1,
          manageable: 1,
          excellent: 1,
          inclusive: 1,
          highlySupported: 1,
          wellEquipped: 1,
          comprehensive: 1
        }
      }
    ];

    const totalAggregation = [
      {
        $match: totalFilterCondition
      },
      {
        $group: {
          _id: null,
          totalMoods: {
            $sum: {
              $add: [
                '$dissatisfied',
                '$very_satisfied',
                '$unpleasant',
                '$positive',
                '$overwhelming',
                '$comfortable',
                '$poor',
                '$supportive',
                '$unmanageable',
                '$manageable',
                '$lacking',
                '$excellent',
                '$negative',
                '$inclusive',
                '$unsupported',
                '$highly_supported',
                '$insufficient',
                '$well_equipped',
                '$inadequate',
                '$comprehensive'
              ]
            }
          },
          totalPositiveMoods: {
            $sum: {
              $add: [
                '$very_satisfied',
                '$positive',
                '$comfortable',
                '$supportive',
                '$manageable',
                '$excellent',
                '$inclusive',
                '$highly_supported',
                '$well_equipped',
                '$comprehensive'
              ]
            }
          },
          totalNegativeMoods: {
            $sum: {
              $add: [
                '$dissatisfied',
                '$unpleasant',
                '$overwhelming',
                '$poor',
                '$unmanageable',
                '$lacking',
                '$negative',
                '$unsupported',
                '$insufficient',
                '$inadequate'
              ]
            }
          },
          dissatisfied: { $sum: '$dissatisfied' },
          unpleasant: { $sum: '$unpleasant' },
          overwhelming: { $sum: '$overwhelming' },
          poor: { $sum: '$poor' },
          unmanageable: { $sum: '$unmanageable' },
          lacking: { $sum: '$lacking' },
          negative: { $sum: '$negative' },
          unsupported: { $sum: '$unsupported' },
          insufficient: { $sum: '$insufficient' },
          inadequate: { $sum: '$inadequate' },
          positive: { $sum: '$positive' },
          verySatisfied: { $sum: '$very_satisfied' },
          comfortable: { $sum: '$comfortable' },
          supportive: { $sum: '$supportive' },
          manageable: { $sum: '$manageable' },
          excellent: { $sum: '$excellent' },
          inclusive: { $sum: '$inclusive' },
          highlySupported: { $sum: '$highly_supported' },
          wellEquipped: { $sum: '$well_equipped' },
          comprehensive: { $sum: '$comprehensive' }
        }
      },
      {
        $project: {
          _id: null,
          totalMoods: 1,
          totalPositiveMoods: 1,
          totalNegativeMoods: 1
        }
      }
    ];

    const aggregationPromise = await ProfessionalMood.aggregate(aggregation);
    const totalAggregationCounts = await ProfessionalMood.aggregate(totalAggregation);

    if (aggregationPromise.length) {
      const moodsPercentPositive = calculatePercentage(
        aggregationPromise[0].totalPositiveMoods,
        aggregationPromise[0].totalMoods
      );

      const moodsPercentNegative = calculatePercentage(
        aggregationPromise[0].totalNegativeMoods,
        aggregationPromise[0].totalMoods
      );

      let professionalMoodBg = 'lightgreen';
      let moodsText = 'Positive';
      let moodPercentage = moodsPercentPositive;

      if (moodsPercentPositive >= moodsPercentNegative) {
        professionalMoodBg = 'lightgreen';
        moodsText = 'Positive';
        moodPercentage = moodsPercentPositive;
      }
      if (moodsPercentPositive <= moodsPercentNegative) {
        professionalMoodBg = 'darkred';
        moodsText = 'Negative';
        moodPercentage = moodsPercentNegative;
      }
      if (moodsPercentPositive == moodsPercentNegative) {
        professionalMoodBg = 'lightgreen';
        moodsText = 'Positive';
        moodPercentage = moodsPercentPositive;
      }

      const data = {
        moodPercentage,
        professionalMoodBg,
        moodsText
      };

      return data;
    } else {
      const resData = {
        professionalMoodBg: 'lightgreen',
        moodsText: 'Positive',
        moodPercentage: 0
      };
      return resData;
    }
  } catch (error) {
    console.error(error);
  }
};

module.exports = {
  getOverallScore,
  getPersonalMoodsPercent,
  getProfessionalMoodsPercent,
  getUserProfessionalMoodsPercent,
  getUserPersonalMoodsPercent,
  /**
   * @description This function is used for Add new User to company
   * @param {*} req
   * @param {*} res
   * @return {*}
   */

  addUser: async (req, res) => {
    try {
      let {
        name,
        date_of_birth,
        marital_status,
        date_of_marriage,
        contact_number,
        employee_id,
        email_address,
        department,
        designation,
        city,
        state,
        country,
        ethnicity,
        gender
      } = req.body;

      name = name?.toLowerCase();
      city = city?.toLowerCase();
      state = state?.toLowerCase();
      country = country?.toLowerCase();
      email_address = email_address?.toLowerCase();

      let company_id = req.authCompanyId || req.body.company_id;

      if (!company_id) {
        return Response.errorResponseWithoutData(res, "Company ID didn't found", FAIL);
      }

      const company = await Company.findOne({ _id: company_id }).select('no_of_seat_bought');
      const totalCompanyUsers = await Users.find({
        company_id: { $exists: true, $eq: company_id },
        user_type: 2,
        deletedAt: null,
        status: 1
      }).countDocuments();

      if (company.no_of_seat_bought <= totalCompanyUsers) {
        return Response.errorResponseWithoutData(
          res,
          'Seats are fully occupied. Add more seats.',
          FAIL
        );
      }

      const existingUser = await Users.findOne({ email: email_address, deletedAt: { $eq: null } });

      if (existingUser) {
        let profile = {
          email: existingUser.email,
          userType: existingUser.user_type,
          firstName: existingUser.name
        };

        await addEditKlaviyoUser(profile);
        return Response.errorResponseWithoutData(
          res,
          'User with Same email already registered',
          FAIL
        );
      }

      const existing = await CompanyUsers.findOne({
        $or: [{ email_address: email_address, deletedAt: { $eq: null } }]
      });

      if (existing) {
        let profile = {
          email: existing.email_address,
          userType: USER_TYPE.USER,
          firstName: existing.name
        };

        await addEditKlaviyoUser(profile);
        return Response.errorResponseWithoutData(
          res,
          'User with Same email already registered',
          FAIL
        );
      }

      if (!existing) {
        const existingEmployee = await CompanyUsers.findOne({
          employee_id: employee_id,
          company_id: company_id,
          deletedAt: { $eq: null }
        });

        if (existingEmployee) {
          return Response.errorResponseWithoutData(
            res,
            'User with Same employee id already registered in your company',
            FAIL
          );
        }
      }

      let password = makeRandomDigit(2) + makeRandomString(5) + makeRandomDigit(4);

      const hashPassword = await generatePassword(password);
      let createUser = new Users({
        company_id,
        name,
        account_type: 2,
        dob: date_of_birth,
        mobile: contact_number,
        email: email_address,
        is_email_verified: true,
        password: hashPassword,
        ethnicity: ethnicity,
        gender: [0]
      });
      await createUser.save();

      const existingcreateUser = await Users.findOne({
        email: email_address,
        company_id: company_id,
        deletedAt: { $eq: null }
      });

      let newUser = new CompanyUsers({
        name,
        date_of_birth,
        marital_status,
        date_of_marriage,
        contact_number,
        employee_id,
        email_address,
        department,
        designation,
        city,
        state,
        country,
        company_id,
        user_id: existingcreateUser._id
      });
      await newUser.save();

      const user = await CompanyUsers.findOne({
        email_address,
        contact_number,
        employee_id,
        deletedAt: { $eq: null }
      }).populate('user_id');

      let profile = {
        email: user.email_address,
        userType: USER_TYPE.USER,
        firstName: user.name
      };

      await addEditKlaviyoUser(profile);

      const locals = {
        name: user.name,
        email: user.email_address,
        password: password
      };
      await sendPassword(email_address, locals);

      return Response.successResponseData(res, user, SUCCESS, res.__('addUserSuccess'));
    } catch (error) {
      console.log(error);
      if (error?.code == 11000) {
        if (error.message.includes('employee_id_1')) {
          return Response.errorResponseWithoutData(
            res,
            'Employee Id is already registered !',
            RESPONSE_CODE.BAD_REQUEST
          );
        } else if (error.message.includes('email_address_1')) {
          return Response.errorResponseWithoutData(
            res,
            'Company Email is already registered !',
            RESPONSE_CODE.BAD_REQUEST
          );
        } else if (error.message.includes('contact_number_1')) {
          return Response.errorResponseWithoutData(
            res,
            'Contact Number is already registered !',
            RESPONSE_CODE.BAD_REQUEST
          );
        } else {
          return Response.errorResponseWithoutData(res, error.message, RESPONSE_CODE.BAD_REQUEST);
        }
      }
      return Response.internalServerErrorResponse(res);
    }
  },
  updateCompanyData: async (req, res) => {
    try {
      let { seatBought, seatPrice, productId } = req.body;

      let company_id = req.authCompanyId || req.body.company_id;

      if (!company_id) {
        return Response.errorResponseWithoutData(res, "Company ID didn't found", FAIL);
      }

      const company = await Company.findOne({ _id: company_id }).select('no_of_seat_bought');
      const totalCompanyUsers = await Users.find({
        company_id: { $exists: true, $eq: company_id },
        user_type: 2,
        deletedAt: null,
        status: 1
      }).countDocuments();

      if (company.no_of_seat_bought >= seatBought) {
        return Response.errorResponseWithoutData(
          res,
          'Seats are occupied. remove some users to update seats.',
          FAIL
        );
      }

      await Company.updateOne(
        { _id: req.authCompanyId },
        {
          $set: {
            seat_price: seatPrice,
            no_of_seat_bought: seatBought
          }
        }
      );

      await CompanySubscriptions.updateOne(
        { _id: req.authCompanyId },
        {
          $set: {
            product_id: productId
          }
        }
      );

      return Response.successResponseData(res, null, SUCCESS, res.__('addUserSuccess'));
    } catch (error) {
      console.log(error);
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
     * @description This function is used for Add new User to company
      @param {} req
      @param {} res
      @return {}
     */

  importUsers: async (req, res) => {
    try {
      const usersData = [];
      const csvFile = req.files;
      const company_id = req.authCompanyId || req.query.company;

      if (!csvFile || !csvFile[0]) {
        return Response.errorResponseWithoutData(res, 'CSV file is required', FAIL);
      }

      // Convert the buffer into a readable stream
      const bufferStream = new stream.PassThrough();
      bufferStream.end(csvFile[0].buffer);

      // Use the bufferStream instead of fs.createReadStream()
      bufferStream
        .pipe(csv())
        .on('data', (row) => {
          usersData.push(row);
        })

        .on('end', async () => {
          const results = [];
          const user_existed = [];

          for (const userdetail of usersData) {
            const company = await Company.findOne({ _id: req.authCompanyId }).select(
              'no_of_seat_bought'
            );
            const totalCompanyUsers = await Users.find({
              company_id: { $exists: true, $eq: req.authCompanyId },
              user_type: { $in: [2, 4] },
              deletedAt: null,
              status: 1
            }).countDocuments();

            if (company.no_of_seat_bought <= totalCompanyUsers) {
              userdetail.reason = 'Seats are fully occupied. Add more seats.';
              user_existed.push(userdetail);
              continue;
              // return Response.errorResponseWithoutData(res, "Seats are fully occupied. Add more seats.", FAIL);
            }

            const existingEmailUser = await Users.findOne({ email: userdetail.email });

            if (existingEmailUser) {
              userdetail.reason = 'Same email already Exists';
              user_existed.push(userdetail);
              let profile = {
                email: userdetail.email,
                userType: USER_TYPE.USER,
                firstName: userdetail.name
              };

              await addEditKlaviyoUser(profile);
              continue;
            }

            const existing = await CompanyUsers.findOne({ email_address: userdetail.email });

            if (existing) {
              userdetail.reason = 'User with Same email or number already registered';
              user_existed.push(userdetail);
              let profile = {
                email: userdetail.email,
                userType: USER_TYPE.USER,
                firstName: userdetail.name
              };

              await addEditKlaviyoUser(profile);
              continue;
            }

            if (!existing) {
              const existingEmployee = await CompanyUsers.findOne({
                employee_id: userdetail.employee_id,
                company_id: company_id
              });

              if (existingEmployee) {
                userdetail.reason = 'User with Same employee id already registered in your company';
                user_existed.push(userdetail);
                continue;
              }
            }

            let password = makeRandomDigit(2) + makeRandomString(5) + makeRandomDigit(4);
            const hashPassword = await generatePassword(password);

            let createUser = new Users({
              name: userdetail.name ? userdetail.name.toLowerCase() : null,
              company_id: company_id,
              dob: userdetail.date_of_birth && new Date(userdetail.date_of_birth),
              mobile: userdetail.contact_number,
              email: userdetail.email ? userdetail.email.toLowerCase() : null,
              password: hashPassword,
              login_platform: 0,
              account_type: 2,
              gender: GENDER.NOT_PREFERRED,
              country: userdetail.country ? userdetail.country.toLowerCase() : null,
              is_email_verified: userdetail.is_email_verified
                ? userdetail.is_email_verified.toLowerCase()
                : false,
              ethnicity: userdetail.ethnicity ? userdetail.ethnicity.toLowerCase() : null,
              job_role: userdetail.job_role ? userdetail.job_role.toLowerCase() : null
            });
            await createUser.save();

            const existingcreateUser = await Users.findOne({
              email: userdetail.email,
              company_id: company_id
            });

            let newUser = new CompanyUsers({
              name: userdetail.name ? userdetail.name.toLowerCase() : null,
              date_of_birth:
                userdetail.date_of_birth && new Date(userdetail.date_of_birth).toISOString(),
              marital_status: userdetail.marital_status
                ? userdetail.marital_status.toLowerCase()
                : null,
              date_of_marriage:
                userdetail.date_of_marriage && new Date(userdetail.date_of_marriage),
              contact_number: userdetail.contact_number,
              employee_id: userdetail.employee_id,
              email_address: userdetail.email ? userdetail.email.toLowerCase() : null,
              department: userdetail.department ? userdetail.department.toLowerCase() : null,
              designation: userdetail.designation ? userdetail.designation.toLowerCase() : null,
              city: userdetail.city ? userdetail.city.toLowerCase() : null,
              state: userdetail.state ? userdetail.state.toLowerCase() : null,
              country: userdetail.country ? userdetail.country.toLowerCase() : null,
              company_id: company_id,
              user_id: existingcreateUser._id
            });
            await newUser.save();

            const newCompanyUser = await CompanyUsers.findOne({
              email_address: userdetail.email,
              user_id: existingcreateUser._id
            });

            if (!newCompanyUser) {
              await Users.deleteOne({ _id: existingcreateUser._id });
            }

            results.push(userdetail);
            let profile = {
              email: userdetail.email,
              userType: USER_TYPE.USER,
              firstName: userdetail.name
            };

            await addEditKlaviyoUser(profile);
            const locals = {
              name: userdetail.name,
              email: userdetail.email,
              password: password
            };
            await sendPassword(userdetail.email, locals);
          }

          return Response.successResponseData(
            res,
            { results, user_existed },
            SUCCESS,
            res.__('importUsersSuccess')
          );
        });
    } catch (error) {
      console.log(error);
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used for get User
   * @param {*} req
   * @param {*} res
   * @return {*}
   */

  getUser: async (req, res) => {
    try {
      const { id } = req.params;
      let companyUser = await CompanyUsers.findOne({ _id: id })
        .populate({
          path: 'user_id',
          select: 'status account_type user_type is_email_verified login_platform mobile'
        })
        .lean();
      if (!companyUser) {
        return res.status(500).json({ message: 'No Company User Found with this ID' });
      }

      companyUser.status = companyUser?.user_id?.status;

      return Response.successResponseData(
        res,
        companyUser,
        SUCCESS,
        res.__('getCompanyUserSuccess')
      );
    } catch (err) {
      console.log(err);
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used for update User
   * @param {*} req
   * @param {*} res
   * @return {*}
   */

  updateUser: async (req, res) => {
    try {
      let {
        name,
        date_of_birth,
        marital_status,
        date_of_marriage,
        contact_number,
        employee_id,
        email_address,
        department,
        designation,
        city,
        state,
        country,
        password,
        status,
        ethnicity,
        gender
      } = req.body;
      let company_id = req.body.company;
      name = name?.toLowerCase();
      city = city?.toLowerCase();
      state = state?.toLowerCase();
      country = country?.toLowerCase();
      email_address = email_address?.toLowerCase();
      ethnicity = ethnicity?.toLowerCase();

      const { id } = req.params;

      const user = await CompanyUsers.findOne({ user_id: id });

      if (!user)
        return Response.errorResponseWithoutData(
          res,
          'No Company User with this id',
          RESPONSE_CODE.NOT_FOUND
        );

      if (employee_id != user.employee_id) {
        //check for duplicate employee number
        const existingEmployee = await CompanyUsers.findOne({
          employee_id: employee_id,
          company_id: req.authCompanyId || company_id
        });

        if (existingEmployee) {
          return Response.errorResponseWithoutData(
            res,
            'User with Same employee id already registered in your company',
            FAIL
          );
        }
      }

      if (email_address) {
        if (email_address != user.email_address) {
          const hashPassword = await generatePassword(password);
          await Users.findByIdAndUpdate(user.user_id, {
            password: hashPassword,
            email: email_address,
            status: status,
            name: name,
            dob: date_of_birth,
            mobile: contact_number,
            ethnicity: ethnicity,
            gender: gender
          });
          await CompanyUsers.findByIdAndUpdate(id, {
            name,
            email_address,
            date_of_birth,
            marital_status,
            date_of_marriage,
            contact_number,
            employee_id,
            email_address,
            department,
            designation,
            city,
            state,
            country
          });

          let profile = {
            email: email_address,
            userType: USER_TYPE.USER,
            firstName: name
          };

          await addEditKlaviyoUser(profile);

          const locals = {
            name: name,
            email: email_address,
            password: password
          };
          await sendPassword(email_address, locals);

          const updated = await CompanyUsers.findOne({ _id: id });
          return Response.successResponseData(
            res,
            updated,
            SUCCESS,
            res.__('companyUserDetailsUpdated')
          );
        }
      }

      await Users.findByIdAndUpdate(user.user_id, {
        status: status,
        name: name,
        dob: date_of_birth,
        mobile: contact_number,
        ethnicity: ethnicity,
        gender: gender
      });

      await CompanyUsers.updateOne(
        { user_id: id },
        {
          $set: {
            name,
            date_of_birth,
            marital_status,
            date_of_marriage,
            contact_number,
            employee_id,
            department,
            designation,
            city,
            state,
            country
          }
        }
      );

      const updated = await CompanyUsers.findOne({ user_id: id }).populate('user_id');
      return Response.successResponseData(
        res,
        updated,
        SUCCESS,
        res.__('companyUserDetailsUpdated')
      );
    } catch (error) {
      console.log(error);
      if (error?.code == 11000) {
        if (error.message.includes('employee_id_1')) {
          return Response.errorResponseWithoutData(
            res,
            'Employee Id is already registered !',
            RESPONSE_CODE.BAD_REQUEST
          );
        } else if (error.message.includes('email_address_1')) {
          return Response.errorResponseWithoutData(
            res,
            'Company Email is already registered !',
            RESPONSE_CODE.BAD_REQUEST
          );
        } else if (error.message.includes('contact_number_1')) {
          return Response.errorResponseWithoutData(
            res,
            'Contact Number is already registered !',
            RESPONSE_CODE.BAD_REQUEST
          );
        } else {
          return Response.errorResponseWithoutData(res, error.message, RESPONSE_CODE.BAD_REQUEST);
        }
      }
      return Response.internalServerErrorResponse(res);
    }
  },

  deleteUser: async (req, res) => {
    try {
      const { id } = req.query;

      await Users.updateOne(
        { _id: id, user_type: USER_TYPE.USER },
        {
          $set: {
            deletedAt: new Date(),
            status: ACCOUNT_STATUS.DELETED
          }
        }
      );

      await CompanyUsers.updateOne(
        { user_id: id },
        {
          $set: {
            deletedAt: new Date()
          }
        }
      );

      return Response.successResponseWithoutData(res, res.__('userDeleteSuccess'), SUCCESS);
    } catch (err) {
      console.log(err);
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used for get User list by company
   * @param {*} req
   * @param {*} res
   * @return {*}
   */

  companyUsersList: (req, res) => {
    try {
      const reqParam = req.query;
      companyUsersListValidation(reqParam, res, async (validate) => {
        if (validate) {
          const page = reqParam.page ? parseInt(reqParam.page) : PAGE;
          const perPage = reqParam.perPage ? parseInt(reqParam.perPage) : PER_PAGE;
          const skip = (page - 1) * perPage || 0;
          const sortBy = reqParam.sortBy || 'createdAt';
          const sortOrder = reqParam.sortOrder ? parseInt(reqParam.sortOrder) : SORT_ORDER;
          const filterData = {
            company_id: req.authCompanyId || reqParam.company,
            ...(reqParam.searchKey && {
              $or: [
                { name: { $regex: '.*' + reqParam.searchKey + '.*', $options: 'i' } },
                { email: { $regex: '.*' + reqParam.searchKey + '.*', $options: 'i' } }
              ]
            }),
            deletedAt: null,
            status: { $in: [STATUS.ACTIVE, STATUS.INACTIVE] },
            user_type: USER_TYPE.USER
          };

          // const totalRecords = await CompanyUsers.countDocuments(filterData);
          const totalRecords = await Users.countDocuments(filterData);

          // let users = await CompanyUsers.find(filterData)
          //     .sort({ [sortBy]: sortOrder })
          //     .skip(skip)
          //     .limit(perPage)
          //     .populate({
          //         path: 'company_id',
          //         select: 'company_email company_name'
          //     })
          //     .populate({
          //         path: 'user_id',
          //         select: 'status user_profile account_type gender is_email_verified login_platform mobile ethnicity'
          //     })
          //     .lean();

          let users = await Users.find(filterData)
            .sort({ [sortBy]: sortOrder })
            .skip(skip)
            .limit(perPage)
            .populate({
              path: 'company_id',
              select: 'company_email company_name'
            })
            // .populate({
            //     path: 'user_id',
            //     select: 'status user_profile account_type gender is_email_verified login_platform mobile ethnicity'
            // })
            .select('-password')
            .lean();

          for (const user of users) {
            let companyUser = await CompanyUsers.findOne({ user_id: user._id });
            user.company_user_id = companyUser?._id;
            user.date_of_birth = companyUser?.date_of_birth;
            user.marital_status = companyUser?.marital_status;
            user.contact_number = companyUser?.contact_number;
            user.employee_id = companyUser?.employee_id;
            user.email_address = companyUser?.email_address;
            user.department = companyUser?.department;
            user.designation = companyUser?.designation;
            user.city = companyUser?.city;
            user.state = companyUser?.state;
            user.country = companyUser?.country;

            let profile = {
              email: user.email,
              userType: USER_TYPE.USER,
              firstName: user.name
            };

            await addEditKlaviyoUser(profile);
          }

          return Response.successResponseData(
            res,
            users,
            SUCCESS,
            res.__('companyUserListSuccess'),
            {
              page,
              perPage,
              totalRecords
            }
          );
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      console.log(err);

      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to get analytics of personal moods of users
   * @param {*} req
   * @param {*} res
   * @return {*}
   */

  personalMoods: async (req, res) => {
    try {
      let { dataType, minAge, maxAge, department, startDate, endDate, country, ethnicity, gender } =
        req.query;
      const company_id = req.authCompanyId || req.query.company_id;
      if (!company_id) {
        return Response.errorResponseWithoutData(res, 'Company ID not found', FAIL);
      }

      // Define user filtering with company_id
      const userFiltering = { company_id };
      let noOfDays = 0;
      let initialDate;

      // calculate start date
      if (startDate && endDate) {
        noOfDays = getDaysDifference(startDate, endDate);
        initialDate = new Date(startDate);
        initialDate.setDate(initialDate.getDate() - noOfDays);
        endDate = new Date(endDate);
      } else {
        return Response.errorResponseWithoutData(res, 'Date range is missing', FAIL);
      }

      // if min and max age is provided
      if (minAge && maxAge) {
        //startBirthDate
        const startBirthDate = new Date();
        startBirthDate.setFullYear(startBirthDate.getFullYear() - maxAge - 1);
        startBirthDate.setHours(0, 0, 0, 0);
        //endBirthDate
        const endBirthDate = new Date();
        endBirthDate.setFullYear(endBirthDate.getFullYear() - minAge);
        endBirthDate.setHours(23, 59, 59, 999);
        userFiltering['date_of_birth'] = { $gte: startBirthDate, $lte: endBirthDate };
      }

      if (department) userFiltering['department'] = department;
      if (ethnicity) userFiltering['ethnicity'] = ethnicity;
      if (country) userFiltering['country'] = country;
      if (gender) userFiltering['gender'] = parseInt(gender);

      // fetch company users according to condition
      const companyUsers = await CompanyUsers.find(userFiltering, 'user_id').lean();
      let companyUserIdsList = companyUsers.map((user) => user.user_id);

      // fetch users data from users table
      const foundUsers = await Users.find(
        {
          _id: { $in: companyUserIdsList },
          user_type: 2,
          status: STATUS.ACTIVE
        },
        '_id'
      ).lean();
      let activeCompanyusers = foundUsers.map((user) => toObjectId(user._id));

      const startDateMinusOne = new Date(startDate);
      startDateMinusOne.setDate(startDateMinusOne.getDate() - 1);

      // Aggregation pipeline
      const moodsListOfCompanyUsers = await Mood.aggregate([
        {
          $facet: {
            initialToStart: [
              {
                $match: {
                  user_id: { $in: activeCompanyusers },
                  createdAt: { $gte: initialDate, $lte: startDateMinusOne },
                  $or: [
                    { anxious: { $ne: 0 } },
                    { calm: { $ne: 0 } },
                    { need_support: { $ne: 0 } },
                    { demotivated: { $ne: 0 } },
                    { motivated: { $ne: 0 } },
                    { low: { $ne: 0 } },
                    { content: { $ne: 0 } },
                    { angry: { $ne: 0 } },
                    { happy: { $ne: 0 } },
                    { i_can_manage: { $ne: 0 } },
                    { helpless: { $ne: 0 } },
                    { i_am_in_control: { $ne: 0 } },
                    { tired: { $ne: 0 } },
                    { stressed: { $ne: 0 } },
                    { balanced: { $ne: 0 } },
                    { energised: { $ne: 0 } },
                    { sad: { $ne: 0 } },
                    { relaxed: { $ne: 0 } },
                    { great: { $ne: 0 } },
                    { not_good: { $ne: 0 } }
                  ]
                }
              },
              {
                $group: {
                  _id: null,
                  averageAnxious: { $avg: '$anxious' },
                  averageCalm: { $avg: '$calm' },
                  averageNeedSupport: { $avg: '$need_support' },
                  averageDemotivated: { $avg: '$demotivated' },
                  averageMotivated: { $avg: '$motivated' },
                  averageLow: { $avg: '$low' },
                  averageContent: { $avg: '$content' },
                  averageAngry: { $avg: '$angry' },
                  averageHappy: { $avg: '$happy' },
                  averageICanManage: { $avg: '$i_can_manage' },
                  averageHelpless: { $avg: '$helpless' },
                  averageIAmInControl: { $avg: '$i_am_in_control' },
                  averageTired: { $avg: '$tired' },
                  averageStressed: { $avg: '$stressed' },
                  averageBalanced: { $avg: '$balanced' },
                  averageEnergised: { $avg: '$energised' },
                  averageSad: { $avg: '$sad' },
                  averageRelaxed: { $avg: '$relaxed' },
                  averageGreat: { $avg: '$great' },
                  averageNotGood: { $avg: '$not_good' }
                }
              },
              {
                $project: {
                  _id: 0,
                  positiveMoods: {
                    averageCalm: { $round: [{ $ifNull: ['$averageCalm', 0] }, 2] },
                    averageContent: { $round: [{ $ifNull: ['$averageContent', 0] }, 2] },
                    averageEnergised: { $round: [{ $ifNull: ['$averageEnergised', 0] }, 2] },
                    averageGreat: { $round: [{ $ifNull: ['$averageGreat', 0] }, 2] },
                    averageHappy: { $round: [{ $ifNull: ['$averageHappy', 0] }, 2] },
                    averageIAmInControl: {
                      $round: [{ $ifNull: ['$averageIAmInControl', 0] }, 2]
                    },
                    averageICanManage: {
                      $round: [{ $ifNull: ['$averageICanManage', 0] }, 2]
                    },
                    averageMotivated: { $round: [{ $ifNull: ['$averageMotivated', 0] }, 2] },
                    averageRelaxed: { $round: [{ $ifNull: ['$averageRelaxed', 0] }, 2] },
                    averageBalanced: { $round: [{ $ifNull: ['$averageBalanced', 0] }, 2] }
                  },
                  negativeMoods: {
                    averageAnxious: { $round: [{ $ifNull: ['$averageAnxious', 0] }, 2] },
                    averageLow: { $round: [{ $ifNull: ['$averageLow', 0] }, 2] },
                    averageTired: { $round: [{ $ifNull: ['$averageTired', 0] }, 2] },
                    averageNotGood: { $round: [{ $ifNull: ['$averageNotGood', 0] }, 2] },
                    averageSad: { $round: [{ $ifNull: ['$averageSad', 0] }, 2] },
                    averageHelpless: { $round: [{ $ifNull: ['$averageHelpless', 0] }, 2] },
                    averageNeedSupport: {
                      $round: [{ $ifNull: ['$averageNeedSupport', 0] }, 2]
                    },
                    averageDemotivated: {
                      $round: [{ $ifNull: ['$averageDemotivated', 0] }, 2]
                    },
                    averageStressed: { $round: [{ $ifNull: ['$averageStressed', 0] }, 2] },
                    averageAngry: { $round: [{ $ifNull: ['$averageAngry', 0] }, 2] }
                  }
                }
              },
              {
                $project: {
                  totalPositiveMoods: {
                    $add: [
                      '$positiveMoods.averageCalm',
                      '$positiveMoods.averageContent',
                      '$positiveMoods.averageEnergised',
                      '$positiveMoods.averageGreat',
                      '$positiveMoods.averageHappy',
                      '$positiveMoods.averageIAmInControl',
                      '$positiveMoods.averageICanManage',
                      '$positiveMoods.averageMotivated',
                      '$positiveMoods.averageRelaxed',
                      '$positiveMoods.averageBalanced'
                    ]
                  },
                  totalNegativeMoods: {
                    $add: [
                      '$negativeMoods.averageAnxious',
                      '$negativeMoods.averageLow',
                      '$negativeMoods.averageTired',
                      '$negativeMoods.averageNotGood',
                      '$negativeMoods.averageSad',
                      '$negativeMoods.averageHelpless',
                      '$negativeMoods.averageNeedSupport',
                      '$negativeMoods.averageDemotivated',
                      '$negativeMoods.averageStressed',
                      '$negativeMoods.averageAngry'
                    ]
                  }
                }
              },
              {
                $project: {
                  positivePercentage: {
                    $cond: {
                      if: { $eq: [{ $add: ['$totalPositiveMoods', '$totalNegativeMoods'] }, 0] },
                      then: 0,
                      else: {
                        $round: [
                          {
                            $multiply: [
                              {
                                $divide: [
                                  '$totalPositiveMoods',
                                  { $add: ['$totalPositiveMoods', '$totalNegativeMoods'] }
                                ]
                              },
                              100
                            ]
                          },
                          2
                        ]
                      }
                    }
                  },
                  negativePercentage: {
                    $cond: {
                      if: { $eq: [{ $add: ['$totalPositiveMoods', '$totalNegativeMoods'] }, 0] },
                      then: 0,
                      else: {
                        $round: [
                          {
                            $multiply: [
                              {
                                $divide: [
                                  '$totalNegativeMoods',
                                  { $add: ['$totalPositiveMoods', '$totalNegativeMoods'] }
                                ]
                              },
                              100
                            ]
                          },
                          2
                        ]
                      }
                    }
                  }
                }
              }
            ],
            startToEnd: [
              {
                $match: {
                  user_id: { $in: activeCompanyusers },
                  createdAt: { $gte: new Date(startDate), $lte: endDate },
                  $or: [
                    { anxious: { $ne: 0 } },
                    { calm: { $ne: 0 } },
                    { need_support: { $ne: 0 } },
                    { demotivated: { $ne: 0 } },
                    { motivated: { $ne: 0 } },
                    { low: { $ne: 0 } },
                    { content: { $ne: 0 } },
                    { angry: { $ne: 0 } },
                    { happy: { $ne: 0 } },
                    { i_can_manage: { $ne: 0 } },
                    { helpless: { $ne: 0 } },
                    { i_am_in_control: { $ne: 0 } },
                    { tired: { $ne: 0 } },
                    { stressed: { $ne: 0 } },
                    { balanced: { $ne: 0 } },
                    { energised: { $ne: 0 } },
                    { sad: { $ne: 0 } },
                    { relaxed: { $ne: 0 } },
                    { great: { $ne: 0 } },
                    { not_good: { $ne: 0 } }
                  ]
                }
              },
              {
                $addFields: {
                  positiveMoodCount: {
                    $sum: [
                      { $cond: [{ $ne: ['$calm', 0] }, 1, 0] },
                      { $cond: [{ $ne: ['$motivated', 0] }, 1, 0] },
                      { $cond: [{ $ne: ['$content', 0] }, 1, 0] },
                      { $cond: [{ $ne: ['$happy', 0] }, 1, 0] },
                      { $cond: [{ $ne: ['$i_can_manage', 0] }, 1, 0] },
                      { $cond: [{ $ne: ['$i_am_in_control', 0] }, 1, 0] },
                      { $cond: [{ $ne: ['$relaxed', 0] }, 1, 0] },
                      { $cond: [{ $ne: ['$great', 0] }, 1, 0] },
                      { $cond: [{ $ne: ['$energised', 0] }, 1, 0] },
                      { $cond: [{ $ne: ['$balanced', 0] }, 1, 0] }
                    ]
                  },
                  negativeMoodCount: {
                    $sum: [
                      { $cond: [{ $ne: ['$anxious', 0] }, 1, 0] },
                      { $cond: [{ $ne: ['$need_support', 0] }, 1, 0] },
                      { $cond: [{ $ne: ['$demotivated', 0] }, 1, 0] },
                      { $cond: [{ $ne: ['$low', 0] }, 1, 0] },
                      { $cond: [{ $ne: ['$angry', 0] }, 1, 0] },
                      { $cond: [{ $ne: ['$helpless', 0] }, 1, 0] },
                      { $cond: [{ $ne: ['$tired', 0] }, 1, 0] },
                      { $cond: [{ $ne: ['$stressed', 0] }, 1, 0] },
                      { $cond: [{ $ne: ['$sad', 0] }, 1, 0] },
                      { $cond: [{ $ne: ['$not_good', 0] }, 1, 0] }
                    ]
                  }
                }
              },
              {
                $group: {
                  _id: '$user_id',
                  averageAnxious: { $avg: '$anxious' },
                  averageCalm: { $avg: '$calm' },
                  averageNeedSupport: { $avg: '$need_support' },
                  averageDemotivated: { $avg: '$demotivated' },
                  averageMotivated: { $avg: '$motivated' },
                  averageLow: { $avg: '$low' },
                  averageContent: { $avg: '$content' },
                  averageAngry: { $avg: '$angry' },
                  averageHappy: { $avg: '$happy' },
                  averageICanManage: { $avg: '$i_can_manage' },
                  averageHelpless: { $avg: '$helpless' },
                  averageIAmInControl: { $avg: '$i_am_in_control' },
                  averageTired: { $avg: '$tired' },
                  averageStressed: { $avg: '$stressed' },
                  averageBalanced: { $avg: '$balanced' },
                  averageEnergised: { $avg: '$energised' },
                  averageSad: { $avg: '$sad' },
                  averageRelaxed: { $avg: '$relaxed' },
                  averageGreat: { $avg: '$great' },
                  averageNotGood: { $avg: '$not_good' },
                  positiveMoodCount: { $sum: '$positiveMoodCount' },
                  negativeMoodCount: { $sum: '$negativeMoodCount' }
                }
              },
              {
                $group: {
                  _id: null,
                  overallAverageAnxious: { $avg: '$averageAnxious' },
                  overallAverageCalm: { $avg: '$averageCalm' },
                  overallAverageNeedSupport: { $avg: '$averageNeedSupport' },
                  overallAverageDemotivated: { $avg: '$averageDemotivated' },
                  overallAverageMotivated: { $avg: '$averageMotivated' },
                  overallAverageLow: { $avg: '$averageLow' },
                  overallAverageContent: { $avg: '$averageContent' },
                  overallAverageAngry: { $avg: '$averageAngry' },
                  overallAverageHappy: { $avg: '$averageHappy' },
                  overallAverageICanManage: { $avg: '$averageICanManage' },
                  overallAverageHelpless: { $avg: '$averageHelpless' },
                  overallAverageIAmInControl: { $avg: '$overallAverageIAmInControl' },
                  overallAverageTired: { $avg: '$averageTired' },
                  overallAverageStressed: { $avg: '$averageStressed' },
                  overallAverageBalanced: { $avg: '$averageBalanced' },
                  overallAverageEnergised: { $avg: '$averageEnergised' },
                  overallAverageSad: { $avg: '$averageSad' },
                  overallAverageRelaxed: { $avg: '$averageRelaxed' },
                  overallAverageGreat: { $avg: '$averageGreat' },
                  overallAverageNotGood: { $avg: '$averageNotGood' },
                  positiveMoodCount: { $sum: '$positiveMoodCount' },
                  negativeMoodCount: { $sum: '$negativeMoodCount' },
                  uniqueUserCount: { $sum: 1 }
                }
              },
              {
                $project: {
                  _id: 0,
                  positiveMoodCount: 1,
                  negativeMoodCount: 1,
                  uniqueUserCount: 1,
                  positiveMoods: {
                    averageCalm: { $round: [{ $ifNull: ['$overallAverageCalm', 0] }, 2] },
                    averageContent: { $round: [{ $ifNull: ['$overallAverageContent', 0] }, 2] },
                    averageEnergised: { $round: [{ $ifNull: ['$overallAverageEnergised', 0] }, 2] },
                    averageGreat: { $round: [{ $ifNull: ['$overallAverageGreat', 0] }, 2] },
                    averageHappy: { $round: [{ $ifNull: ['$overallAverageHappy', 0] }, 2] },
                    averageIAmInControl: {
                      $round: [{ $ifNull: ['$overallAverageIAmInControl', 0] }, 2]
                    },
                    averageICanManage: {
                      $round: [{ $ifNull: ['$overallAverageICanManage', 0] }, 2]
                    },
                    averageMotivated: { $round: [{ $ifNull: ['$overallAverageMotivated', 0] }, 2] },
                    averageRelaxed: { $round: [{ $ifNull: ['$overallAverageRelaxed', 0] }, 2] },
                    averageBalanced: { $round: [{ $ifNull: ['$overallAverageBalanced', 0] }, 2] }
                  },
                  negativeMoods: {
                    averageAnxious: { $round: [{ $ifNull: ['$overallAverageAnxious', 0] }, 2] },
                    averageLow: { $round: [{ $ifNull: ['$overallAverageLow', 0] }, 2] },
                    averageTired: { $round: [{ $ifNull: ['$overallAverageTired', 0] }, 2] },
                    averageNotGood: { $round: [{ $ifNull: ['$overallAverageNotGood', 0] }, 2] },
                    averageSad: { $round: [{ $ifNull: ['$overallAverageSad', 0] }, 2] },
                    averageHelpless: { $round: [{ $ifNull: ['$overallAverageHelpless', 0] }, 2] },
                    averageNeedSupport: {
                      $round: [{ $ifNull: ['$overallAverageNeedSupport', 0] }, 2]
                    },
                    averageDemotivated: {
                      $round: [{ $ifNull: ['$overallAverageDemotivated', 0] }, 2]
                    },
                    averageStressed: { $round: [{ $ifNull: ['$overallAverageStressed', 0] }, 2] },
                    averageAngry: { $round: [{ $ifNull: ['$overallAverageAngry', 0] }, 2] }
                  }
                }
              },
              {
                $project: {
                  positiveMoodCount: 1,
                  negativeMoodCount: 1,
                  uniqueUserCount: 1,
                  positiveMoods: 1,
                  negativeMoods: 1,
                  totalPositiveMoods: {
                    $add: [
                      '$positiveMoods.averageCalm',
                      '$positiveMoods.averageContent',
                      '$positiveMoods.averageEnergised',
                      '$positiveMoods.averageGreat',
                      '$positiveMoods.averageHappy',
                      '$positiveMoods.averageIAmInControl',
                      '$positiveMoods.averageICanManage',
                      '$positiveMoods.averageMotivated',
                      '$positiveMoods.averageRelaxed',
                      '$positiveMoods.averageBalanced'
                    ]
                  },
                  totalNegativeMoods: {
                    $add: [
                      '$negativeMoods.averageAnxious',
                      '$negativeMoods.averageLow',
                      '$negativeMoods.averageTired',
                      '$negativeMoods.averageNotGood',
                      '$negativeMoods.averageSad',
                      '$negativeMoods.averageHelpless',
                      '$negativeMoods.averageNeedSupport',
                      '$negativeMoods.averageDemotivated',
                      '$negativeMoods.averageStressed',
                      '$negativeMoods.averageAngry'
                    ]
                  }
                }
              },
              {
                $project: {
                  positiveMoodCount: 1,
                  negativeMoodCount: 1,
                  uniqueUserCount: 1,
                  positivePercentage: {
                    $cond: {
                      if: { $eq: [{ $add: ['$totalPositiveMoods', '$totalNegativeMoods'] }, 0] },
                      then: 0,
                      else: {
                        $round: [
                          {
                            $multiply: [
                              {
                                $divide: [
                                  '$totalPositiveMoods',
                                  { $add: ['$totalPositiveMoods', '$totalNegativeMoods'] }
                                ]
                              },
                              100
                            ]
                          },
                          1
                        ]
                      }
                    }
                  },
                  negativePercentage: {
                    $cond: {
                      if: { $eq: [{ $add: ['$totalPositiveMoods', '$totalNegativeMoods'] }, 0] },
                      then: 0,
                      else: {
                        $round: [
                          {
                            $multiply: [
                              {
                                $divide: [
                                  '$totalNegativeMoods',
                                  { $add: ['$totalPositiveMoods', '$totalNegativeMoods'] }
                                ]
                              },
                              100
                            ]
                          },
                          1
                        ]
                      }
                    }
                  },
                  positiveMoodPercentages: {
                    calm: {
                      $round: [
                        { $multiply: [{ $divide: ['$positiveMoods.averageCalm', 5] }, 100] },
                        2
                      ]
                    },
                    content: {
                      $round: [
                        { $multiply: [{ $divide: ['$positiveMoods.averageContent', 5] }, 100] },
                        2
                      ]
                    },
                    energised: {
                      $round: [
                        { $multiply: [{ $divide: ['$positiveMoods.averageEnergised', 5] }, 100] },
                        2
                      ]
                    },
                    great: {
                      $round: [
                        { $multiply: [{ $divide: ['$positiveMoods.averageGreat', 5] }, 100] },
                        2
                      ]
                    },
                    happy: {
                      $round: [
                        { $multiply: [{ $divide: ['$positiveMoods.averageHappy', 5] }, 100] },
                        2
                      ]
                    },
                    iAmInControl: {
                      $round: [
                        {
                          $multiply: [{ $divide: ['$positiveMoods.averageIAmInControl', 5] }, 100]
                        },
                        2
                      ]
                    },
                    iCanManage: {
                      $round: [
                        { $multiply: [{ $divide: ['$positiveMoods.averageICanManage', 5] }, 100] },
                        2
                      ]
                    },
                    motivated: {
                      $round: [
                        { $multiply: [{ $divide: ['$positiveMoods.averageMotivated', 5] }, 100] },
                        2
                      ]
                    },
                    relaxed: {
                      $round: [
                        { $multiply: [{ $divide: ['$positiveMoods.averageRelaxed', 5] }, 100] },
                        2
                      ]
                    },
                    balanced: {
                      $round: [
                        { $multiply: [{ $divide: ['$positiveMoods.averageBalanced', 5] }, 100] },
                        2
                      ]
                    }
                  },
                  negativeMoodPercentages: {
                    anxious: {
                      $round: [
                        { $multiply: [{ $divide: ['$negativeMoods.averageAnxious', 5] }, 100] },
                        2
                      ]
                    },
                    low: {
                      $round: [
                        { $multiply: [{ $divide: ['$negativeMoods.averageLow', 5] }, 100] },
                        2
                      ]
                    },
                    tired: {
                      $round: [
                        { $multiply: [{ $divide: ['$negativeMoods.averageTired', 5] }, 100] },
                        2
                      ]
                    },
                    notGood: {
                      $round: [
                        { $multiply: [{ $divide: ['$negativeMoods.averageNotGood', 5] }, 100] },
                        2
                      ]
                    },
                    sad: {
                      $round: [
                        { $multiply: [{ $divide: ['$negativeMoods.averageSad', 5] }, 100] },
                        2
                      ]
                    },
                    helpless: {
                      $round: [
                        { $multiply: [{ $divide: ['$negativeMoods.averageHelpless', 5] }, 100] },
                        2
                      ]
                    },
                    needSupport: {
                      $round: [
                        { $multiply: [{ $divide: ['$negativeMoods.averageNeedSupport', 5] }, 100] },
                        2
                      ]
                    },
                    demotivated: {
                      $round: [
                        { $multiply: [{ $divide: ['$negativeMoods.averageDemotivated', 5] }, 100] },
                        2
                      ]
                    },
                    stressed: {
                      $round: [
                        { $multiply: [{ $divide: ['$negativeMoods.averageStressed', 5] }, 100] },
                        2
                      ]
                    },
                    angry: {
                      $round: [
                        { $multiply: [{ $divide: ['$negativeMoods.averageAngry', 5] }, 100] },
                        2
                      ]
                    }
                  }
                }
              }
            ]
          }
        }
      ]);

      if (moodsListOfCompanyUsers[0].startToEnd.length) {
        const earlierPositivePercentage =
          moodsListOfCompanyUsers[0].initialToStart[0]?.positivePercentage || 0;
        const earlierNegativePercentage =
          moodsListOfCompanyUsers[0].initialToStart[0]?.negativePercentage || 0;

        const data = moodsListOfCompanyUsers[0].startToEnd[0];

        const resData = {
          totalMoodsCount: data.positiveMoodCount + data.negativeMoodCount,
          totalPositiveMoodsCount: data.positiveMoodCount,
          totalNegativeMoodsCount: data.negativeMoodCount,
          percentageIncrement: {
            moodPercent: Math.abs(data.positivePercentage - earlierPositivePercentage),
            moodIncreased: data.positivePercentage > earlierPositivePercentage,
            moodPercentNegative: Math.abs(data.negativePercentage - earlierNegativePercentage),
            moodNegativeIncreased: data.negativePercentage > earlierNegativePercentage
          },
          averagePositiveMoodsPercentage: [
            {
              name: 'motivated',
              value: data.positiveMoodPercentages.motivated,
              label: 'Motivated'
            },
            {
              name: 'content',
              value: data.positiveMoodPercentages.content,
              label: 'Content'
            },
            {
              name: 'happy',
              value: data.positiveMoodPercentages.happy,
              label: 'Happy'
            },
            {
              name: 'iCanManage',
              value: data.positiveMoodPercentages.iCanManage,
              label: 'I Can Manage'
            },
            {
              name: 'iAmInControl',
              value: data.positiveMoodPercentages.iAmInControl,
              label: 'I Am In Control'
            },
            {
              name: 'energised',
              value: data.positiveMoodPercentages.energised,
              label: 'Energised'
            },
            {
              name: 'calm',
              value: data.positiveMoodPercentages.calm,
              label: 'Calm'
            },
            {
              name: 'relaxed',
              value: data.positiveMoodPercentages.relaxed,
              label: 'Relaxed'
            },
            {
              name: 'balanced',
              value: data.positiveMoodPercentages.balanced,
              label: 'Balanced'
            },
            {
              name: 'great',
              value: data.positiveMoodPercentages.great,
              label: 'Great'
            }
          ],
          averageNegativeMoodsPercentage: [
            {
              name: 'demotivated',
              value: data.negativeMoodPercentages.demotivated,
              label: 'Demotivated'
            },
            {
              name: 'low',
              value: data.negativeMoodPercentages.low,
              label: 'Low'
            },
            {
              name: 'sad',
              value: data.negativeMoodPercentages.sad,
              label: 'Sad'
            },
            {
              name: 'needSupport',
              value: data.negativeMoodPercentages.needSupport,
              label: 'Need Support'
            },
            {
              name: 'helpless',
              value: data.negativeMoodPercentages.helpless,
              label: 'Helpless'
            },
            {
              name: 'tired',
              value: data.negativeMoodPercentages.tired,
              label: 'Tired'
            },
            {
              name: 'angry',
              value: data.negativeMoodPercentages.angry,
              label: 'Angry'
            },
            {
              name: 'anxious',
              value: data.negativeMoodPercentages.anxious,
              label: 'Anxious'
            },
            {
              name: 'stressed',
              value: data.negativeMoodPercentages.stressed,
              label: 'Stressed'
            },
            {
              name: 'notGood',
              value: data.negativeMoodPercentages.notGood,
              label: 'Not Good'
            }
          ],
          moodsPercentPositive: data.positivePercentage,
          moodsPercentNegative: data.negativePercentage,
          userCounts: data.uniqueUserCount
        };

        return Response.successResponseData(
          res,
          resData,
          SUCCESS,
          res.__('companyPersonalMoodListSuccess')
        );
      } else {
        const resData = {
          totalMoodsCount: 0,
          totalPositiveMoodsCount: 0,
          totalNegativeMoodsCount: 0,
          // moodCounts: {
          //   totalMoods: 0,
          //   totalPositiveMoods: 0,
          //   totalNegativeMoods: 0,
          //   anxious: 0,
          //   calm: 0,
          //   needSupport: 0,
          //   demotivated: 0,
          //   motivated: 0,
          //   low: 0,
          //   content: 0,
          //   angry: 0,
          //   happy: 0,
          //   iCanManage: 0,
          //   helpless: 0,
          //   iAmInControl: 0,
          //   tired: 0,
          //   stressed: 0,
          //   balanced: 0,
          //   energised: 0,
          //   sad: 0,
          //   relaxed: 0,
          //   great: 0,
          //   notGood: 0,
          //   _id: null
          // },
          percentageIncrement: {
            moodPercent: 0,
            moodIncreased: false
          },
          averagePositiveMoodsPercentage: [
            {
              name: 'motivated',
              value: 0,
              label: 'Motivated'
            },
            {
              name: 'content',
              value: 0,
              label: 'Content'
            },
            {
              name: 'happy',
              value: 0,
              label: 'Happy'
            },
            {
              name: 'iCanManage',
              value: 0,
              label: 'I Can Manage'
            },
            {
              name: 'iAmInControl',
              value: 0,
              label: 'I Am In Control'
            },
            {
              name: 'energised',
              value: 0,
              label: 'Energised'
            },
            {
              name: 'calm',
              value: 0,
              label: 'Calm'
            },
            {
              name: 'relaxed',
              value: 0,
              label: 'Relaxed'
            },
            {
              name: 'balanced',
              value: 0,
              label: 'Balanced'
            },
            {
              name: 'great',
              value: 0,
              label: 'Great'
            }
          ],
          averageNegativeMoodsPercentage: [
            {
              name: 'demotivated',
              value: 0,
              label: 'Demotivated'
            },
            {
              name: 'low',
              value: 0,
              label: 'Low'
            },
            {
              name: 'sad',
              value: 0,
              label: 'Sad'
            },
            {
              name: 'needSupport',
              value: 0,
              label: 'Need Support'
            },
            {
              name: 'helpless',
              value: 0,
              label: 'Helpless'
            },
            {
              name: 'tired',
              value: 0,
              label: 'Tired'
            },
            {
              name: 'angry',
              value: 0,
              label: 'Angry'
            },
            {
              name: 'anxious',
              value: 0,
              label: 'Anxious'
            },
            {
              name: 'stressed',
              value: 0,
              label: 'Stressed'
            },
            {
              name: 'notGood',
              value: 0,
              label: 'Not Good'
            }
          ],
          moodsPercentPositive: 0,
          moodsPercentNegative: 0,
          userCounts: 0
        };
        return Response.successResponseData(res, resData, FAIL, res.__('noPersonalMoodsFound'));
      }
    } catch (error) {
      console.error(error);
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to get analytics of professionam moods of users in a company
   * @param {*} req
   * @param {*} res
   * @return {*}
   */

  professionalMoods: async (req, res) => {
    try {
      let { dataType, minAge, maxAge, department, startDate, endDate, country, ethnicity, gender } =
        req.query;
      const company_id = req.authCompanyId || req.query.company_id;
      if (!company_id) {
        return Response.errorResponseWithoutData(res, 'Company ID not found', FAIL);
      }

      // Define user filtering with company_id
      const userFiltering = { company_id };
      let noOfDays = 0;
      let initialDate;

      // calculate start date
      if (startDate && endDate) {
        noOfDays = getDaysDifference(startDate, endDate);
        initialDate = new Date(startDate);
        initialDate.setDate(initialDate.getDate() - noOfDays);
        endDate = new Date(endDate);
      } else {
        return Response.errorResponseWithoutData(res, 'Date range is missing', FAIL);
      }

      // if min and max age is provided
      if (minAge && maxAge) {
        //startBirthDate
        const startBirthDate = new Date();
        startBirthDate.setFullYear(startBirthDate.getFullYear() - maxAge - 1);
        startBirthDate.setHours(0, 0, 0, 0);
        //endBirthDate
        const endBirthDate = new Date();
        endBirthDate.setFullYear(endBirthDate.getFullYear() - minAge);
        endBirthDate.setHours(23, 59, 59, 999);
        userFiltering['date_of_birth'] = { $gte: startBirthDate, $lte: endBirthDate };
      }

      if (department) userFiltering['department'] = department;
      if (ethnicity) userFiltering['ethnicity'] = ethnicity;
      if (country) userFiltering['country'] = country;
      if (gender) userFiltering['gender'] = parseInt(gender);

      // fetch company users according to condition
      const companyUsers = await CompanyUsers.find(userFiltering, 'user_id').lean();
      let companyUserIdsList = companyUsers.map((user) => user.user_id);

      // fetch users data from users table
      const foundUsers = await Users.find(
        {
          _id: { $in: companyUserIdsList },
          user_type: 2,
          status: STATUS.ACTIVE
        },
        '_id'
      ).lean();
      let activeCompanyusers = foundUsers.map((user) => toObjectId(user._id));

      const startDateMinusOne = new Date(startDate);
      startDateMinusOne.setDate(startDateMinusOne.getDate() - 1);

      // Aggregation pipeline
      const moodsListOfCompanyUsers = await ProfessionalMood.aggregate([
        {
          $facet: {
            initialToStart: [
              {
                $match: {
                  user_id: { $in: activeCompanyusers },
                  createdAt: { $gte: initialDate, $lte: startDateMinusOne },
                  $or: [
                    { very_satisfied: { $ne: 0 } },
                    { positive: { $ne: 0 } },
                    { comfortable: { $ne: 0 } },
                    { supportive: { $ne: 0 } },
                    { manageable: { $ne: 0 } },
                    { excellent: { $ne: 0 } },
                    { inclusive: { $ne: 0 } },
                    { highly_supported: { $ne: 0 } },
                    { well_equipped: { $ne: 0 } },
                    { comprehensive: { $ne: 0 } },
                    { dissatisfied: { $ne: 0 } },
                    { unpleasant: { $ne: 0 } },
                    { overwhelming: { $ne: 0 } },
                    { poor: { $ne: 0 } },
                    { unmanageable: { $ne: 0 } },
                    { lacking: { $ne: 0 } },
                    { negative: { $ne: 0 } },
                    { unsupported: { $ne: 0 } },
                    { insufficient: { $ne: 0 } },
                    { inadequate: { $ne: 0 } }
                  ]
                }
              },
              {
                $group: {
                  _id: null,
                  averageVerySatisfied: { $avg: '$very_satisfied' },
                  averagePositive: { $avg: '$positive' },
                  averageComfortable: { $avg: '$comfortable' },
                  averageSupportive: { $avg: '$supportive' },
                  averageManageable: { $avg: '$manageable' },
                  averageExcellent: { $avg: '$excellent' },
                  averageInclusive: { $avg: '$inclusive' },
                  averageHighlySupported: { $avg: '$highly_supported' },
                  averageWellEquipped: { $avg: '$well_equipped' },
                  averageComprehensive: { $avg: '$comprehensive' },
                  averageDissatisfied: { $avg: '$dissatisfied' },
                  averageUnpleasant: { $avg: '$unpleasant' },
                  averageOverwhelming: { $avg: '$overwhelming' },
                  averagePoor: { $avg: '$poor' },
                  averageUnmanageable: { $avg: '$unmanageable' },
                  averageLacking: { $avg: '$lacking' },
                  averageNegative: { $avg: '$negative' },
                  averageUnsupported: { $avg: '$unsupported' },
                  averageInsufficient: { $avg: '$insufficient' },
                  averageInadequate: { $avg: '$inadequate' }
                }
              },
              {
                $project: {
                  _id: 0,
                  positiveMoods: {
                    averageVerySatisfied: {
                      $round: [{ $ifNull: ['$overallAverageVerySatisfied', 0] }, 2]
                    },
                    averagePositive: { $round: [{ $ifNull: ['$overallAveragePositive', 0] }, 2] },
                    averageComfortable: {
                      $round: [{ $ifNull: ['$overallAverageComfortable', 0] }, 2]
                    },
                    averageSupportive: {
                      $round: [{ $ifNull: ['$overallAverageSupportive', 0] }, 2]
                    },
                    averageManageable: {
                      $round: [{ $ifNull: ['$overallAverageManageable', 0] }, 2]
                    },
                    averageExcellent: { $round: [{ $ifNull: ['$overallAverageExcellent', 0] }, 2] },
                    averageInclusive: { $round: [{ $ifNull: ['$overallAverageInclusive', 0] }, 2] },
                    averageHighlySupported: {
                      $round: [{ $ifNull: ['$overallAverageHighlySupported', 0] }, 2]
                    },
                    averageWellEquipped: {
                      $round: [{ $ifNull: ['$overallAverageWellEquipped', 0] }, 2]
                    },
                    averageComprehensive: {
                      $round: [{ $ifNull: ['$overallAverageComprehensive', 0] }, 2]
                    }
                  },
                  negativeMoods: {
                    averageDissatisfied: {
                      $round: [{ $ifNull: ['$overallAverageDissatisfied', 0] }, 2]
                    },
                    averageUnpleasant: {
                      $round: [{ $ifNull: ['$overallAverageUnpleasant', 0] }, 2]
                    },
                    averageOverwhelming: {
                      $round: [{ $ifNull: ['$overallAverageOverwhelming', 0] }, 2]
                    },
                    averagePoor: { $round: [{ $ifNull: ['$overallAveragePoor', 0] }, 2] },
                    averageUnmanageable: {
                      $round: [{ $ifNull: ['$overallAverageUnmanageable', 0] }, 2]
                    },
                    averageLacking: { $round: [{ $ifNull: ['$overallAverageLacking', 0] }, 2] },
                    averageNegative: { $round: [{ $ifNull: ['$overallAverageNegative', 0] }, 2] },
                    averageUnsupported: {
                      $round: [{ $ifNull: ['$overallAverageUnsupported', 0] }, 2]
                    },
                    averageInsufficient: {
                      $round: [{ $ifNull: ['$overallAverageInsufficient', 0] }, 2]
                    },
                    averageInadequate: {
                      $round: [{ $ifNull: ['$overallAverageInadequate', 0] }, 2]
                    }
                  }
                }
              },
              {
                $project: {
                  totalPositiveMoods: {
                    $add: [
                      '$positiveMoods.averageVerySatisfied',
                      '$positiveMoods.averagePositive',
                      '$positiveMoods.averageComfortable',
                      '$positiveMoods.averageSupportive',
                      '$positiveMoods.averageManageable',
                      '$positiveMoods.averageExcellent',
                      '$positiveMoods.averageInclusive',
                      '$positiveMoods.averageHighlySupported',
                      '$positiveMoods.averageWellEquipped',
                      '$positiveMoods.averageComprehensive'
                    ]
                  },
                  totalNegativeMoods: {
                    $add: [
                      '$negativeMoods.averageDissatisfied',
                      '$negativeMoods.averageUnpleasant',
                      '$negativeMoods.averageOverwhelming',
                      '$negativeMoods.averagePoor',
                      '$negativeMoods.averageUnmanageable',
                      '$negativeMoods.averageLacking',
                      '$negativeMoods.averageNegative',
                      '$negativeMoods.averageUnsupported',
                      '$negativeMoods.averageInsufficient',
                      '$negativeMoods.averageInadequate'
                    ]
                  }
                }
              },
              {
                $project: {
                  positivePercentage: {
                    $cond: {
                      if: { $eq: [{ $add: ['$totalPositiveMoods', '$totalNegativeMoods'] }, 0] },
                      then: 0,
                      else: {
                        $round: [
                          {
                            $multiply: [
                              {
                                $divide: [
                                  '$totalPositiveMoods',
                                  { $add: ['$totalPositiveMoods', '$totalNegativeMoods'] }
                                ]
                              },
                              100
                            ]
                          },
                          2
                        ]
                      }
                    }
                  },
                  negativePercentage: {
                    $cond: {
                      if: { $eq: [{ $add: ['$totalPositiveMoods', '$totalNegativeMoods'] }, 0] },
                      then: 0,
                      else: {
                        $round: [
                          {
                            $multiply: [
                              {
                                $divide: [
                                  '$totalNegativeMoods',
                                  { $add: ['$totalPositiveMoods', '$totalNegativeMoods'] }
                                ]
                              },
                              100
                            ]
                          },
                          2
                        ]
                      }
                    }
                  }
                }
              }
            ],
            startToEnd: [
              {
                $match: {
                  user_id: { $in: activeCompanyusers },
                  createdAt: { $gte: new Date(startDate), $lte: endDate },
                  $or: [
                    { very_satisfied: { $ne: 0 } },
                    { positive: { $ne: 0 } },
                    { comfortable: { $ne: 0 } },
                    { supportive: { $ne: 0 } },
                    { manageable: { $ne: 0 } },
                    { excellent: { $ne: 0 } },
                    { inclusive: { $ne: 0 } },
                    { highly_supported: { $ne: 0 } },
                    { well_equipped: { $ne: 0 } },
                    { comprehensive: { $ne: 0 } },
                    { dissatisfied: { $ne: 0 } },
                    { unpleasant: { $ne: 0 } },
                    { overwhelming: { $ne: 0 } },
                    { poor: { $ne: 0 } },
                    { unmanageable: { $ne: 0 } },
                    { lacking: { $ne: 0 } },
                    { negative: { $ne: 0 } },
                    { unsupported: { $ne: 0 } },
                    { insufficient: { $ne: 0 } },
                    { inadequate: { $ne: 0 } }
                  ]
                }
              },
              {
                $addFields: {
                  positiveMoodCount: {
                    $sum: [
                      { $cond: [{ $ne: ['$very_satisfied', 0] }, 1, 0] },
                      { $cond: [{ $ne: ['$positive', 0] }, 1, 0] },
                      { $cond: [{ $ne: ['$comfortable', 0] }, 1, 0] },
                      { $cond: [{ $ne: ['$supportive', 0] }, 1, 0] },
                      { $cond: [{ $ne: ['$manageable', 0] }, 1, 0] },
                      { $cond: [{ $ne: ['$excellent', 0] }, 1, 0] },
                      { $cond: [{ $ne: ['$inclusive', 0] }, 1, 0] },
                      { $cond: [{ $ne: ['$highly_supported', 0] }, 1, 0] },
                      { $cond: [{ $ne: ['$well_equipped', 0] }, 1, 0] },
                      { $cond: [{ $ne: ['$comprehensive', 0] }, 1, 0] }
                    ]
                  },
                  negativeMoodCount: {
                    $sum: [
                      { $cond: [{ $ne: ['$dissatisfied', 0] }, 1, 0] },
                      { $cond: [{ $ne: ['$unpleasant', 0] }, 1, 0] },
                      { $cond: [{ $ne: ['$overwhelming', 0] }, 1, 0] },
                      { $cond: [{ $ne: ['$poor', 0] }, 1, 0] },
                      { $cond: [{ $ne: ['$unmanageable', 0] }, 1, 0] },
                      { $cond: [{ $ne: ['$lacking', 0] }, 1, 0] },
                      { $cond: [{ $ne: ['$negative', 0] }, 1, 0] },
                      { $cond: [{ $ne: ['$unsupported', 0] }, 1, 0] },
                      { $cond: [{ $ne: ['$insufficient', 0] }, 1, 0] },
                      { $cond: [{ $ne: ['$inadequate', 0] }, 1, 0] }
                    ]
                  }
                }
              },
              {
                $group: {
                  _id: '$user_id',
                  averageVerySatisfied: { $avg: '$very_satisfied' },
                  averagePositive: { $avg: '$positive' },
                  averageComfortable: { $avg: '$comfortable' },
                  averageSupportive: { $avg: '$supportive' },
                  averageManageable: { $avg: '$manageable' },
                  averageExcellent: { $avg: '$excellent' },
                  averageInclusive: { $avg: '$inclusive' },
                  averageHighlySupported: { $avg: '$highly_supported' },
                  averageWellEquipped: { $avg: '$well_equipped' },
                  averageComprehensive: { $avg: '$comprehensive' },
                  averageDissatisfied: { $avg: '$dissatisfied' },
                  averageUnpleasant: { $avg: '$unpleasant' },
                  averageOverwhelming: { $avg: '$overwhelming' },
                  averagePoor: { $avg: '$poor' },
                  averageUnmanageable: { $avg: '$unmanageable' },
                  averageLacking: { $avg: '$lacking' },
                  averageNegative: { $avg: '$negative' },
                  averageUnsupported: { $avg: '$unsupported' },
                  averageInsufficient: { $avg: '$insufficient' },
                  averageInadequate: { $avg: '$inadequate' },
                  positiveMoodCount: { $sum: '$positiveMoodCount' },
                  negativeMoodCount: { $sum: '$negativeMoodCount' }
                }
              },
              {
                $group: {
                  _id: null,
                  overallAverageVerySatisfied: { $avg: '$averageVerySatisfied' },
                  overallAveragePositive: { $avg: '$averagePositive' },
                  overallAverageComfortable: { $avg: '$averageComfortable' },
                  overallAverageSupportive: { $avg: '$averageSupportive' },
                  overallAverageManageable: { $avg: '$averageManageable' },
                  overallAverageExcellent: { $avg: '$averageExcellent' },
                  overallAverageInclusive: { $avg: '$overallAverageInclusive' },
                  overallAverageHighlySupported: { $avg: '$overallAverageHighlySupported' },
                  overallAverageWellEquipped: { $avg: '$overallAverageWellEquipped' },
                  overallAverageComprehensive: { $avg: '$overallAverageComprehensive' },
                  overallAverageDissatisfied: { $avg: '$averageDissatisfied' },
                  overallAverageUnpleasant: { $avg: '$averageUnpleasant' },
                  overallAverageOverwhelming: { $avg: '$averageOverwhelming' },
                  overallAveragePoor: { $avg: '$averagePoor' },
                  overallAverageUnmanageable: { $avg: '$averageUnmanageable' },
                  overallAverageLacking: { $avg: '$averageLacking' },
                  overallAverageNegative: { $avg: '$averageNegative' },
                  overallAverageUnsupported: { $avg: '$averageUnsupported' },
                  overallAverageInsufficient: { $avg: '$averageInsufficient' },
                  overallAverageInadequate: { $avg: '$averageInadequate' },
                  positiveMoodCount: { $sum: '$positiveMoodCount' },
                  negativeMoodCount: { $sum: '$negativeMoodCount' },
                  uniqueUserCount: { $sum: 1 }
                }
              },
              {
                $project: {
                  _id: 0,
                  positiveMoodCount: 1,
                  negativeMoodCount: 1,
                  uniqueUserCount: 1,
                  positiveMoods: {
                    averageVerySatisfied: {
                      $round: [{ $ifNull: ['$overallAverageVerySatisfied', 0] }, 2]
                    },
                    averagePositive: { $round: [{ $ifNull: ['$overallAveragePositive', 0] }, 2] },
                    averageComfortable: {
                      $round: [{ $ifNull: ['$overallAverageComfortable', 0] }, 2]
                    },
                    averageSupportive: {
                      $round: [{ $ifNull: ['$overallAverageSupportive', 0] }, 2]
                    },
                    averageManageable: {
                      $round: [{ $ifNull: ['$overallAverageManageable', 0] }, 2]
                    },
                    averageExcellent: { $round: [{ $ifNull: ['$overallAverageExcellent', 0] }, 2] },
                    averageInclusive: { $round: [{ $ifNull: ['$overallAverageInclusive', 0] }, 2] },
                    averageHighlySupported: {
                      $round: [{ $ifNull: ['$overallAverageHighlySupported', 0] }, 2]
                    },
                    averageWellEquipped: {
                      $round: [{ $ifNull: ['$overallAverageWellEquipped', 0] }, 2]
                    },
                    averageComprehensive: {
                      $round: [{ $ifNull: ['$overallAverageComprehensive', 0] }, 2]
                    }
                  },
                  negativeMoods: {
                    averageDissatisfied: {
                      $round: [{ $ifNull: ['$overallAverageDissatisfied', 0] }, 2]
                    },
                    averageUnpleasant: {
                      $round: [{ $ifNull: ['$overallAverageUnpleasant', 0] }, 2]
                    },
                    averageOverwhelming: {
                      $round: [{ $ifNull: ['$overallAverageOverwhelming', 0] }, 2]
                    },
                    averagePoor: { $round: [{ $ifNull: ['$overallAveragePoor', 0] }, 2] },
                    averageUnmanageable: {
                      $round: [{ $ifNull: ['$overallAverageUnmanageable', 0] }, 2]
                    },
                    averageLacking: { $round: [{ $ifNull: ['$overallAverageLacking', 0] }, 2] },
                    averageNegative: { $round: [{ $ifNull: ['$overallAverageNegative', 0] }, 2] },
                    averageUnsupported: {
                      $round: [{ $ifNull: ['$overallAverageUnsupported', 0] }, 2]
                    },
                    averageInsufficient: {
                      $round: [{ $ifNull: ['$overallAverageInsufficient', 0] }, 2]
                    },
                    averageInadequate: {
                      $round: [{ $ifNull: ['$overallAverageInadequate', 0] }, 2]
                    }
                  }
                }
              },
              {
                $project: {
                  positiveMoodCount: 1,
                  negativeMoodCount: 1,
                  uniqueUserCount: 1,
                  positiveMoods: 1,
                  negativeMoods: 1,
                  totalPositiveMoods: {
                    $add: [
                      '$positiveMoods.averageVerySatisfied',
                      '$positiveMoods.averagePositive',
                      '$positiveMoods.averageComfortable',
                      '$positiveMoods.averageSupportive',
                      '$positiveMoods.averageManageable',
                      '$positiveMoods.averageExcellent',
                      '$positiveMoods.averageInclusive',
                      '$positiveMoods.averageHighlySupported',
                      '$positiveMoods.averageWellEquipped',
                      '$positiveMoods.averageComprehensive'
                    ]
                  },
                  totalNegativeMoods: {
                    $add: [
                      '$negativeMoods.averageDissatisfied',
                      '$negativeMoods.averageUnpleasant',
                      '$negativeMoods.averageOverwhelming',
                      '$negativeMoods.averagePoor',
                      '$negativeMoods.averageUnmanageable',
                      '$negativeMoods.averageLacking',
                      '$negativeMoods.averageNegative',
                      '$negativeMoods.averageUnsupported',
                      '$negativeMoods.averageInsufficient',
                      '$negativeMoods.averageInadequate'
                    ]
                  }
                }
              },
              {
                $project: {
                  positiveMoodCount: 1,
                  negativeMoodCount: 1,
                  uniqueUserCount: 1,
                  positivePercentage: {
                    $cond: {
                      if: { $eq: [{ $add: ['$totalPositiveMoods', '$totalNegativeMoods'] }, 0] },
                      then: 0,
                      else: {
                        $round: [
                          {
                            $multiply: [
                              {
                                $divide: [
                                  '$totalPositiveMoods',
                                  { $add: ['$totalPositiveMoods', '$totalNegativeMoods'] }
                                ]
                              },
                              100
                            ]
                          },
                          1
                        ]
                      }
                    }
                  },
                  negativePercentage: {
                    $cond: {
                      if: { $eq: [{ $add: ['$totalPositiveMoods', '$totalNegativeMoods'] }, 0] },
                      then: 0,
                      else: {
                        $round: [
                          {
                            $multiply: [
                              {
                                $divide: [
                                  '$totalNegativeMoods',
                                  { $add: ['$totalPositiveMoods', '$totalNegativeMoods'] }
                                ]
                              },
                              100
                            ]
                          },
                          1
                        ]
                      }
                    }
                  },
                  positiveMoodPercentages: {
                    verySatisfied: {
                      $round: [
                        {
                          $multiply: [{ $divide: ['$positiveMoods.averageVerySatisfied', 5] }, 100]
                        },
                        2
                      ]
                    },
                    positive: {
                      $round: [
                        { $multiply: [{ $divide: ['$positiveMoods.averagePositive', 5] }, 100] },
                        2
                      ]
                    },
                    comfortable: {
                      $round: [
                        { $multiply: [{ $divide: ['$positiveMoods.averageComfortable', 5] }, 100] },
                        2
                      ]
                    },
                    supportive: {
                      $round: [
                        { $multiply: [{ $divide: ['$positiveMoods.averageSupportive', 5] }, 100] },
                        2
                      ]
                    },
                    manageable: {
                      $round: [
                        { $multiply: [{ $divide: ['$positiveMoods.averageManageable', 5] }, 100] },
                        2
                      ]
                    },
                    excellent: {
                      $round: [
                        { $multiply: [{ $divide: ['$positiveMoods.averageExcellent', 5] }, 100] },
                        2
                      ]
                    },
                    inclusive: {
                      $round: [
                        { $multiply: [{ $divide: ['$positiveMoods.averageInclusive', 5] }, 100] },
                        2
                      ]
                    },
                    highlySupported: {
                      $round: [
                        {
                          $multiply: [
                            { $divide: ['$positiveMoods.averageHighlySupported', 5] },
                            100
                          ]
                        },
                        2
                      ]
                    },
                    wellEquipped: {
                      $round: [
                        {
                          $multiply: [{ $divide: ['$positiveMoods.averageWellEquipped', 5] }, 100]
                        },
                        2
                      ]
                    },
                    comprehensive: {
                      $round: [
                        {
                          $multiply: [{ $divide: ['$positiveMoods.averageComprehensive', 5] }, 100]
                        },
                        2
                      ]
                    }
                  },
                  negativeMoodPercentages: {
                    dissatisfied: {
                      $round: [
                        {
                          $multiply: [{ $divide: ['$negativeMoods.averageDissatisfied', 5] }, 100]
                        },
                        2
                      ]
                    },
                    unpleasant: {
                      $round: [
                        { $multiply: [{ $divide: ['$negativeMoods.averageUnpleasant', 5] }, 100] },
                        2
                      ]
                    },
                    overwhelming: {
                      $round: [
                        {
                          $multiply: [{ $divide: ['$negativeMoods.averageOverwhelming', 5] }, 100]
                        },
                        2
                      ]
                    },
                    poor: {
                      $round: [
                        { $multiply: [{ $divide: ['$negativeMoods.averagePoor', 5] }, 100] },
                        2
                      ]
                    },
                    unmanageable: {
                      $round: [
                        {
                          $multiply: [{ $divide: ['$negativeMoods.averageUnmanageable', 5] }, 100]
                        },
                        2
                      ]
                    },
                    lacking: {
                      $round: [
                        { $multiply: [{ $divide: ['$negativeMoods.averageLacking', 5] }, 100] },
                        2
                      ]
                    },
                    negative: {
                      $round: [
                        { $multiply: [{ $divide: ['$negativeMoods.averageNegative', 5] }, 100] },
                        2
                      ]
                    },
                    unsupported: {
                      $round: [
                        { $multiply: [{ $divide: ['$negativeMoods.averageUnsupported', 5] }, 100] },
                        2
                      ]
                    },
                    insufficient: {
                      $round: [
                        {
                          $multiply: [{ $divide: ['$negativeMoods.averageInsufficient', 5] }, 100]
                        },
                        2
                      ]
                    },
                    inadequate: {
                      $round: [
                        { $multiply: [{ $divide: ['$negativeMoods.averageInadequate', 5] }, 100] },
                        2
                      ]
                    }
                  }
                }
              }
            ]
          }
        }
      ]);

      if (moodsListOfCompanyUsers[0].startToEnd.length) {
        const earlierPositivePercentage =
          moodsListOfCompanyUsers[0].initialToStart[0]?.positivePercentage || 0;
        const earlierNegativePercentage =
          moodsListOfCompanyUsers[0].initialToStart[0]?.negativePercentage || 0;

        const data = moodsListOfCompanyUsers[0].startToEnd[0];

        const resData = {
          totalMoodsCount: data.positiveMoodCount + data.negativeMoodCount,
          totalPositiveMoodsCount: data.positiveMoodCount,
          totalNegativeMoodsCount: data.negativeMoodCount,
          percentageIncrement: {
            moodPercent: Math.abs(data.positivePercentage - earlierPositivePercentage),
            moodIncreased: data.positivePercentage > earlierPositivePercentage,
            moodPercentNegative: Math.abs(data.negativePercentage - earlierNegativePercentage),
            moodNegativeIncreased: data.negativePercentage > earlierNegativePercentage
          },
          averagePositiveMoodsPercentage: [
            {
              name: 'verySatisfied',
              value: data.positiveMoodPercentages.verySatisfied,
              label: 'Very Satisfied',
              title: 'Job Satisfaction'
            },
            {
              name: 'positive',
              value: data.positiveMoodPercentages.positive,
              label: 'Positive',
              title: 'Working Environment'
            },
            {
              name: 'comfortable',
              value: data.positiveMoodPercentages.comfortable,
              label: 'Comfortable',
              title: 'Workload'
            },
            {
              name: 'supportive',
              value: data.positiveMoodPercentages.supportive,
              label: 'Supportive',
              title: 'Line Manager Relationship'
            },
            {
              name: 'manageable',
              value: data.positiveMoodPercentages.manageable,
              label: 'Manageable',
              title: 'Working Hours'
            },
            {
              name: 'excellent',
              value: data.positiveMoodPercentages.excellent,
              label: 'Excellent',
              title: 'Mental Health Support'
            },
            {
              name: 'inclusive',
              value: data.positiveMoodPercentages.inclusive,
              label: 'Inclusive',
              title: 'Company Culture'
            },
            {
              name: 'highlySupported',
              value: data.positiveMoodPercentages.highlySupported,
              label: 'Highly Supported',
              title: 'Feeling Supported'
            },
            {
              name: 'wellEquipped',
              value: data.positiveMoodPercentages.wellEquipped,
              label: 'Well Equipped',
              title: 'Have Tools for job'
            },
            {
              name: 'comprehensive',
              value: data.positiveMoodPercentages.comprehensive,
              label: 'Comprehensive',
              title: 'On going training'
            }
          ],
          averageNegativeMoodsPercentage: [
            {
              name: 'dissatisfied',
              value: data.negativeMoodPercentages.dissatisfied,
              label: 'Dissatisfied',
              title: 'Job Satisfaction'
            },
            {
              name: 'unpleasant',
              value: data.negativeMoodPercentages.unpleasant,
              label: 'Unpleasant',
              title: 'Working Environment'
            },
            {
              name: 'overwhelming',
              value: data.negativeMoodPercentages.overwhelming,
              label: 'Overwhelming',
              title: 'Workload'
            },
            {
              name: 'poor',
              value: data.negativeMoodPercentages.poor,
              label: 'Poor',
              title: 'Line Manager Relationship'
            },
            {
              name: 'unmanageable',
              value: data.negativeMoodPercentages.unmanageable,
              label: 'Unmanageable',
              title: 'Working Hours'
            },
            {
              name: 'lacking',
              value: data.negativeMoodPercentages.lacking,
              label: 'Lacking',
              title: 'Mental Health Support'
            },
            {
              name: 'negative',
              value: data.negativeMoodPercentages.negative,
              label: 'Negative',
              title: 'Company Culture'
            },
            {
              name: 'unsupported',
              value: data.negativeMoodPercentages.unsupported,
              label: 'Unsupported',
              title: 'Feeling Supported'
            },
            {
              name: 'insufficient',
              value: data.negativeMoodPercentages.insufficient,
              label: 'Insufficient',
              title: 'Have Tools for job'
            },
            {
              name: 'inadequate',
              value: data.negativeMoodPercentages.inadequate,
              label: 'Inadequate',
              title: 'On going training'
            }
          ],
          moodsPercentPositive: data.positivePercentage,
          moodsPercentNegative: data.negativePercentage,
          userCounts: data.uniqueUserCount
        };

        return Response.successResponseData(
          res,
          resData,
          SUCCESS,
          res.__('companyProfessionalMoodListSuccess')
        );
      } else {
        const resData = {
          totalMoodsCount: 0,
          totalPositiveMoodsCount: 0,
          totalNegativeMoodsCount: 0,
          // moodCounts: {
          //   totalMoods: 0,
          //   totalPositiveMoods: 0,
          //   totalNegativeMoods: 0,
          //   dissatisfied: 0,
          //   unpleasant: 0,
          //   overwhelming: 0,
          //   poor: 0,
          //   unmanageable: 0,
          //   lacking: 0,
          //   negative: 0,
          //   unsupported: 0,
          //   insufficient: 0,
          //   inadequate: 0,
          //   positive: 0,
          //   verySatisfied: 0,
          //   comfortable: 0,
          //   supportive: 0,
          //   manageable: 0,
          //   excellent: 0,
          //   inclusive: 0,
          //   highlySupported: 0,
          //   wellEquipped: 0,
          //   comprehensive: 0,
          //   _id: null
          // },
          percentageIncrement: {
            moodPercent: 0,
            moodIncreased: true
          },
          averagePositiveMoodsPercentage: [
            {
              name: 'verySatisfied',
              value: 0,
              label: 'Very Satisfied',
              title: 'Job Satisfaction'
            },
            {
              name: 'positive',
              value: 0,
              label: 'Positive',
              title: 'Working Environment'
            },
            {
              name: 'comfortable',
              value: 0,
              label: 'Comfortable',
              title: 'Workload'
            },
            {
              name: 'supportive',
              value: 0,
              label: 'Supportive',
              title: 'Line Manager Relationship'
            },
            {
              name: 'manageable',
              value: 0,
              label: 'Manageable',
              title: 'Working Hours'
            },
            {
              name: 'excellent',
              value: 0,
              label: 'Excellent',
              title: 'Mental Health Support'
            },
            {
              name: 'inclusive',
              value: 0,
              label: 'Inclusive',
              title: 'Company Culture'
            },
            {
              name: 'highlySupported',
              value: 0,
              label: 'Highly Supported',
              title: 'Feeling Supported'
            },
            {
              name: 'wellEquipped',
              value: 0,
              label: 'Well Equipped',
              title: 'Have Tools for job'
            },
            {
              name: 'comprehensive',
              value: 0,
              label: 'Comprehensive',
              title: 'On going training'
            }
          ],
          averageNegativeMoodsPercentage: [
            {
              name: 'dissatisfied',
              value: 0,
              label: 'Dissatisfied',
              title: 'Job Satisfaction'
            },
            {
              name: 'unpleasant',
              value: 0,
              label: 'Unpleasant',
              title: 'Working Environment'
            },
            {
              name: 'overwhelming',
              value: 0,
              label: 'Overwhelming',
              title: 'Workload'
            },
            {
              name: 'poor',
              value: 0,
              label: 'Poor',
              title: 'Line Manager Relationship'
            },
            {
              name: 'unmanageable',
              value: 0,
              label: 'Unmanageable',
              title: 'Working Hours'
            },
            {
              name: 'lacking',
              value: 0,
              label: 'Lacking',
              title: 'Mental Health Support'
            },
            {
              name: 'negative',
              value: 0,
              label: 'Negative',
              title: 'Company Culture'
            },
            {
              name: 'unsupported',
              value: 0,
              label: 'Unsupported',
              title: 'Feeling Supported'
            },
            {
              name: 'insufficient',
              value: 0,
              label: 'Insufficient',
              title: 'Have Tools for job'
            },
            {
              name: 'inadequate',
              value: 0,
              label: 'Inadequate',
              title: 'On going training'
            }
          ],
          moodsPercentPositive: 0,
          moodsPercentNegative: 0,
          userCounts: 0
        };
        return Response.successResponseData(res, resData, FAIL, res.__('noProfessionalMoodsFound'));
      }
    } catch (error) {
      console.error(error);
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to get analytics of mental of health of a user based on his daily moods
   * @param {*} req
   * @param {*} res
   * @return {*}
   */

  mentalHealth: async (req, res) => {
    try {
      let { minAge, maxAge, department, startDate, endDate, country, ethnicity, gender } =
        req.query;
      const company_id = req.authCompanyId || req.query.company_id;
      if (!company_id) {
        return Response.errorResponseWithoutData(res, 'Company ID not found', FAIL);
      }
      let userFiltering = { company_id };
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

      const { mood } = req.params;

      const companyUsers = await CompanyUsers.aggregate([
        { $match: userFiltering }, // Apply your filtering conditions here
        { $project: { id: '$user_id', _id: 0 } } // Project user_id field as id and exclude _id field
      ]);
      const foundUsers = await Users.find(userFiltering, { _id: 1 });
      let users = [];
      foundUsers.forEach((user) => {
        users.push({
          user_id: user._id
        });
      });
      const uniqueValues = new Set([...users, ...companyUsers]);
      const uniqueUsers = [...uniqueValues];
      const userIds = uniqueUsers.map((user) => user.user_id);

      const providedPositiveMood = getPositiveMood(mood);
      const providedNegativeMood = getNegativeMood(mood);

      const aggregationPipeline = [
        {
          $match: {
            user_id: { $in: userIds },
            createdAt: {
              $gte: startDate,
              $lte: endDate
            }
          }
        },
        {
          $group: {
            _id: '$user_id',
            docs_count: { $sum: 1 },
            positive_sum: {
              $sum: `$${providedPositiveMood}`
            },
            negative_sum: {
              $sum: `$${providedNegativeMood}`
            }
          }
        },
        {
          $project: {
            negative_sum: 1,
            positive_sum: 1,
            net_mood: { $subtract: ['$positive_sum', '$negative_sum'] },
            docs_count: 1
          }
        }
      ];

      const usersWithMoods = await Mood.aggregate(aggregationPipeline).exec();
      const noOfPositiveUsers = usersWithMoods.filter((user) => user.net_mood > 0).length;
      const noOfNegativeUsers = usersWithMoods.filter((user) => user.net_mood < 0).length;
      const noOfNeutralUsers = usersWithMoods.length - (noOfPositiveUsers + noOfNegativeUsers);
      const docs_count = usersWithMoods.reduce((prev, curr) => prev + curr.docs_count, 0);
      const positive_mood = usersWithMoods.reduce((prev, curr) => prev + curr.positive_sum, 0);
      const negative_mood = usersWithMoods.reduce((prev, curr) => prev + curr.negative_sum, 0);
      const data = {
        labels: ['Positive', 'Negative', 'Neutral'],
        values: [noOfPositiveUsers, noOfNegativeUsers, noOfNeutralUsers],
        positiveScore: calculatePercentage(positive_mood, docs_count * 5),
        negativeScore: -calculatePercentage(negative_mood, docs_count * 5)
      };
      return Response.successResponseData(res, data);
    } catch (error) {
      console.error(error);
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to get analytics of mental of health of a user based on his professional moods
   * @param {*} req
   * @param {*} res
   * @return {*}
   */

  mentalHealthByProfessionalMoods: async (req, res) => {
    try {
      const { mood } = req.params;
      let { minAge, maxAge, department, startDate, endDate, country, ethnicity, gender } =
        req.query;
      const company_id = req.authCompanyId || req.query.company_id;
      if (!company_id) {
        return Response.errorResponseWithoutData(res, 'Company ID not found', FAIL);
      }
      let userFiltering = { company_id };
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
      const foundUsers = await Users.find(userFiltering, { _id: 1 });
      let users = [];
      foundUsers.forEach((user) => {
        users.push({
          user_id: user._id
        });
      });
      const uniqueValues = new Set([...users, ...companyUsers]);
      const uniqueUsers = [...uniqueValues];
      const userIds = uniqueUsers.map((user) => user.user_id);

      const aggregationPipeline = [
        {
          $match: {
            user_id: { $in: userIds },
            createdAt: {
              $gte: startDate,
              $lte: endDate
            }
          }
        },
        {
          $group: {
            _id: '$user_id',
            docsCount: { $sum: 1 },
            positive_mood: {
              $sum: {
                $cond: [{ $gt: [`$${mood}`, 0] }, `$${mood}`, 0]
              }
            },
            negative_mood: {
              $sum: {
                $cond: [{ $lt: [`$${mood}`, 0] }, `$${mood}`, 0]
              }
            }
          }
        },
        {
          $project: {
            docsCount: 1,
            positive_mood: 1,
            negative_mood: 1,
            netMood: { $add: ['$positive_mood', '$negative_mood'] }
          }
        }
      ];

      const usersWithMoods = await ProfessionalMood.aggregate(aggregationPipeline).exec();
      let noOfPositiveUsers = 0,
        noOfNegativeUsers = 0,
        noOfNeutralUsers = 0,
        negativeMood = 0,
        positiveMood = 0,
        docsCount = 1;

      if (usersWithMoods.length > 0) {
        noOfPositiveUsers = usersWithMoods.filter((user) => user.netMood > 0).length;
        noOfNegativeUsers = usersWithMoods.filter((user) => user.netMood < 0).length;
        noOfNeutralUsers = usersWithMoods.length - (noOfPositiveUsers + noOfNegativeUsers);
        docsCount = usersWithMoods.reduce((prev, curr) => prev + curr.docsCount, 0);
        negativeMood = usersWithMoods.reduce((prev, curr) => prev + curr.negative_mood, 0);
        positiveMood = usersWithMoods.reduce((prev, curr) => prev + curr.positive_mood, 0);
      }

      const data = {
        labels: ['Positive', 'Negative', 'Neutral'],
        values: [noOfPositiveUsers, noOfNegativeUsers, noOfNeutralUsers],
        negativeScore: calculatePercentage(negativeMood, docsCount * 5),
        positiveScore: calculatePercentage(positiveMood, docsCount * 5)
      };

      return Response.successResponseData(res, data);
    } catch (error) {
      console.error(error);
      return Response.internalServerErrorResponse(res);
    }
  },
  /**
   * @description This function is used to get overall score of professional and personal mood score
   * @param {*} req
   * @param {*} res
   * @return {*}
   */

  getOverallMoodScore: async (req, res) => {
    try {
      let {
        minAge,
        maxAge,
        department,
        startDate,
        endDate,
        country,
        ethnicity,
        gender,
        moodType,
        theraphyData
      } = req.query;
      const company_id = req.authCompanyId || req.query.company_id;
      if (!company_id) {
        return Response.errorResponseWithoutData(res, 'Company ID not found', FAIL);
      }
      let userFiltering = { company_id };

      // -------------------------->   Users Filters   <------------------------------
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

      // -------------------------->  Users Filters   <------------------------------

      startDate = new Date(startDate);
      endDate = new Date(endDate);
      endDate.setHours(23, 59, 59, 999);
      const companyUsers = await CompanyUsers.aggregate([
        { $match: userFiltering }, // Apply your filtering conditions here
        { $project: { id: '$user_id', _id: 0 } } // Project user_id field as id and exclude _id field
      ]);
      const foundUsers = await Users.find(userFiltering, { _id: 1 });
      let users = [];
      foundUsers.forEach((user) => {
        users.push(user._id.toString());
      });
      companyUsers.forEach((user) => {
        users.push(user.id.toString());
      });
      const uniqueValues = [...new Set(users)];
      const userIds = uniqueValues.map((value) => new mongoose.Types.ObjectId(value));

      let totalFilterCondition = {
        user_id: { $in: userIds },
        createdAt: {
          $gte: startDate,
          $lt: endDate
        },
        deletedAt: null
      };

      const totalPersonalAggregation = [
        {
          $match: totalFilterCondition
        },
        {
          $group: {
            _id: null,
            totalMoods: {
              $sum: {
                $add: [
                  '$anxious',
                  '$calm',
                  '$need_support',
                  '$demotivated',
                  '$motivated',
                  '$low',
                  '$content',
                  '$angry',
                  '$happy',
                  '$i_can_manage',
                  '$helpless',
                  '$i_am_in_control',
                  '$tired',
                  '$stressed',
                  '$balanced',
                  '$energised',
                  '$sad',
                  '$relaxed',
                  '$great',
                  '$not_good'
                ]
              }
            },
            totalPositiveMoods: {
              $sum: {
                $add: [
                  '$calm',
                  '$motivated',
                  '$content',
                  '$happy',
                  '$i_can_manage',
                  '$i_am_in_control',
                  '$balanced',
                  '$energised',
                  '$relaxed',
                  '$great'
                ]
              }
            },
            totalNegativeMoods: {
              $sum: {
                $add: [
                  '$anxious',
                  '$need_support',
                  '$demotivated',
                  '$low',
                  '$angry',
                  '$helpless',
                  '$tired',
                  '$stressed',
                  '$sad',
                  '$not_good'
                ]
              }
            }
          }
        },
        {
          $project: {
            _id: null,
            totalMoods: 1,
            totalPositiveMoods: 1,
            totalNegativeMoods: 1
          }
        }
      ];

      const totalProfessionalAggregation = [
        {
          $match: totalFilterCondition
        },
        {
          $group: {
            _id: null,
            totalMoods: {
              $sum: {
                $add: [
                  '$dissatisfied',
                  '$very_satisfied',
                  '$unpleasant',
                  '$positive',
                  '$overwhelming',
                  '$comfortable',
                  '$poor',
                  '$supportive',
                  '$unmanageable',
                  '$manageable',
                  '$lacking',
                  '$excellent',
                  '$negative',
                  '$inclusive',
                  '$unsupported',
                  '$highly_supported',
                  '$insufficient',
                  '$well_equipped',
                  '$inadequate',
                  '$comprehensive'
                ]
              }
            },
            totalPositiveMoods: {
              $sum: {
                $add: [
                  '$very_satisfied',
                  '$positive',
                  '$comfortable',
                  '$supportive',
                  '$manageable',
                  '$excellent',
                  '$inclusive',
                  '$highly_supported',
                  '$well_equipped',
                  '$comprehensive'
                ]
              }
            },
            totalNegativeMoods: {
              $sum: {
                $add: [
                  '$dissatisfied',
                  '$unpleasant',
                  '$overwhelming',
                  '$poor',
                  '$unmanageable',
                  '$lacking',
                  '$negative',
                  '$unsupported',
                  '$insufficient',
                  '$inadequate'
                ]
              }
            },
            dissatisfied: { $sum: '$dissatisfied' },
            unpleasant: { $sum: '$unpleasant' },
            overwhelming: { $sum: '$overwhelming' },
            poor: { $sum: '$poor' },
            unmanageable: { $sum: '$unmanageable' },
            lacking: { $sum: '$lacking' },
            negative: { $sum: '$negative' },
            unsupported: { $sum: '$unsupported' },
            insufficient: { $sum: '$insufficient' },
            inadequate: { $sum: '$inadequate' },
            positive: { $sum: '$positive' },
            verySatisfied: { $sum: '$very_satisfied' },
            comfortable: { $sum: '$comfortable' },
            supportive: { $sum: '$supportive' },
            manageable: { $sum: '$manageable' },
            excellent: { $sum: '$excellent' },
            inclusive: { $sum: '$inclusive' },
            highlySupported: { $sum: '$highly_supported' },
            wellEquipped: { $sum: '$well_equipped' },
            comprehensive: { $sum: '$comprehensive' }
          }
        },
        {
          $project: {
            _id: null,
            totalMoods: 1,
            totalPositiveMoods: 1,
            totalNegativeMoods: 1
          }
        }
      ];
      const totalAggregationProfessionalCounts = await ProfessionalMood.aggregate(
        totalProfessionalAggregation
      );
      const totalAggregationPersonalCounts = await Mood.aggregate(totalPersonalAggregation);

      if (totalAggregationProfessionalCounts.length && totalAggregationPersonalCounts.length) {
        let theraphyPositivePercent = 0;
        let theraphyNegativePercent = 0;
        let overallMoodsPercent = 0;

        if (theraphyData) {
          theraphyData = JSON.parse(theraphyData);
          let theraphyPositiveCategories = theraphyData?.positive?.categories;
          let theraphyNegativeCategories = theraphyData?.negative?.categories;
          let theraphyPositiveData = theraphyData?.positiveCounts?.series[0]?.data;
          let theraphyNegativeData = theraphyData?.negativeCounts?.series[0]?.data;
          let positiveCount = theraphyPositiveData?.reduce((sum, count) => sum + count, 0);
          let negativeCount = theraphyNegativeData?.reduce((sum, count) => sum + count, 0);
          let totalCount = positiveCount + negativeCount;
          theraphyPositivePercent =
            totalCount != 0 ? parseFloat((positiveCount / totalCount) * 100).toFixed(2) : 0;
          theraphyNegativePercent =
            totalCount != 0 ? parseFloat((negativeCount / totalCount) * 100).toFixed(2) : 0;
        }

        const averageCounts = {
          totalMoods:
            totalAggregationProfessionalCounts[0].totalMoods +
            totalAggregationPersonalCounts[0].totalMoods,
          totalPositiveMoods:
            totalAggregationProfessionalCounts[0].totalPositiveMoods +
            totalAggregationPersonalCounts[0].totalPositiveMoods,
          totalNegativeMoods:
            totalAggregationProfessionalCounts[0].totalNegativeMoods +
            totalAggregationPersonalCounts[0].totalNegativeMoods
        };

        const moodsPercentPositive = calculatePercentage(
          averageCounts.totalPositiveMoods,
          averageCounts.totalMoods
        );
        const moodsPercentNegative = calculatePercentage(
          averageCounts.totalNegativeMoods,
          averageCounts.totalMoods
        );

        if (theraphyPositivePercent == 0 && theraphyNegativePercent == 0) {
          overallMoodsPercent = Number(
            parseFloat(moodsPercentPositive - moodsPercentNegative).toFixed(2)
          );
        } else {
          overallMoodsPercent = Number(
            parseFloat(
              (moodsPercentPositive + parseFloat(theraphyPositivePercent)) / 2 -
                (moodsPercentNegative + parseFloat(theraphyNegativePercent)) / 2
            ).toFixed(2)
          );
        }

        let moodText = '';
        if (overallMoodsPercent < 0) {
          moodText = 'Negative';
        } else if (overallMoodsPercent > 0) {
          moodText = 'Positive';
        } else if (overallMoodsPercent) {
          moodText = 'Neutral';
        }

        const data = {
          positiveScore: moodsPercentPositive,
          negativeScore: moodsPercentNegative,
          overallMoodPercentage: overallMoodsPercent,
          overallMood: moodText
        };
        return Response.successResponseData(res, data, SUCCESS, res.__('overallMoodsPercent'));
      } else if (totalAggregationPersonalCounts.length) {
        let theraphyPositivePercent = 0;
        let theraphyNegativePercent = 0;
        let overallMoodsPercent = 0;

        if (theraphyData) {
          theraphyData = JSON.parse(theraphyData);
          let theraphyPositiveCategories = theraphyData?.positive?.categories;
          let theraphyNegativeCategories = theraphyData?.negative?.categories;
          let theraphyPositiveData = theraphyData?.positiveCounts?.series[0]?.data;
          let theraphyNegativeData = theraphyData?.negativeCounts?.series[0]?.data;
          let positiveCount = theraphyPositiveData?.reduce((sum, count) => sum + count, 0);
          let negativeCount = theraphyNegativeData?.reduce((sum, count) => sum + count, 0);
          let totalCount = positiveCount + negativeCount;

          theraphyPositivePercent = parseFloat((positiveCount / totalCount) * 100).toFixed(2);
          theraphyNegativePercent = parseFloat((negativeCount / totalCount) * 100).toFixed(2);
        }

        const averageCounts = {
          totalMoods: totalAggregationPersonalCounts[0].totalMoods,
          totalPositiveMoods: totalAggregationPersonalCounts[0].totalPositiveMoods,
          totalNegativeMoods: totalAggregationPersonalCounts[0].totalNegativeMoods
        };

        const moodsPercentPositive = calculatePercentage(
          averageCounts.totalPositiveMoods,
          averageCounts.totalMoods
        );
        const moodsPercentNegative = calculatePercentage(
          averageCounts.totalNegativeMoods,
          averageCounts.totalMoods
        );

        if (theraphyPositivePercent == 0 && theraphyNegativePercent == 0) {
          overallMoodsPercent = parseFloat(moodsPercentPositive - moodsPercentNegative).toFixed(2);
        } else {
          overallMoodsPercent = parseFloat(
            (moodsPercentPositive + parseFloat(theraphyPositivePercent)) / 2 -
              (moodsPercentNegative + parseFloat(theraphyNegativePercent)) / 2
          ).toFixed(2);
        }

        let moodText = '';
        if (overallMoodsPercent < 0) {
          moodText = 'Negative';
        } else if (overallMoodsPercent > 0) {
          moodText = 'Positive';
        } else if (overallMoodsPercent) {
          moodText = 'Neutral';
        }

        const data = {
          positiveScore: moodsPercentPositive,
          negativeScore: moodsPercentNegative,
          overallMoodPercentage: overallMoodsPercent,
          overallMood: moodText
        };
        return Response.successResponseData(res, data, SUCCESS, res.__('overallMoodsPercent'));
      } else if (totalAggregationProfessionalCounts.length) {
        let theraphyPositivePercent = 0;
        let theraphyNegativePercent = 0;
        let overallMoodsPercent = 0;

        if (theraphyData) {
          theraphyData = JSON.parse(theraphyData);
          let theraphyPositiveCategories = theraphyData?.positive?.categories;
          let theraphyNegativeCategories = theraphyData?.negative?.categories;
          let theraphyPositiveData = theraphyData?.positiveCounts?.series[0]?.data;
          let theraphyNegativeData = theraphyData?.negativeCounts?.series[0]?.data;
          let positiveCount = theraphyPositiveData?.reduce((sum, count) => sum + count, 0);
          let negativeCount = theraphyNegativeData?.reduce((sum, count) => sum + count, 0);
          let totalCount = positiveCount + negativeCount;

          theraphyPositivePercent = parseFloat((positiveCount / totalCount) * 100).toFixed(2);
          theraphyNegativePercent = parseFloat((negativeCount / totalCount) * 100).toFixed(2);
        }

        const averageCounts = {
          totalMoods: totalAggregationProfessionalCounts[0].totalMoods,
          totalPositiveMoods: totalAggregationProfessionalCounts[0].totalPositiveMoods,
          totalNegativeMoods: totalAggregationProfessionalCounts[0].totalNegativeMoods
        };

        const moodsPercentPositive = calculatePercentage(
          averageCounts.totalPositiveMoods,
          averageCounts.totalMoods
        );
        const moodsPercentNegative = calculatePercentage(
          averageCounts.totalNegativeMoods,
          averageCounts.totalMoods
        );

        if (theraphyPositivePercent == 0 && theraphyNegativePercent == 0) {
          overallMoodsPercent = parseFloat(moodsPercentPositive - moodsPercentNegative).toFixed(2);
        } else {
          overallMoodsPercent = parseFloat(
            (moodsPercentPositive + parseFloat(theraphyPositivePercent)) / 2 -
              (moodsPercentNegative + parseFloat(theraphyNegativePercent)) / 2
          ).toFixed(2);
        }

        let moodText = '';
        if (overallMoodsPercent < 0) {
          moodText = 'Negative';
        } else if (overallMoodsPercent > 0) {
          moodText = 'Positive';
        } else if (overallMoodsPercent) {
          moodText = 'Neutral';
        }

        const data = {
          positiveScore: moodsPercentPositive,
          negativeScore: moodsPercentNegative,
          overallMoodPercentage: overallMoodsPercent,
          overallMood: moodText
        };
        return Response.successResponseData(res, data, SUCCESS, res.__('overallMoodsPercent'));
      } else {
        const resData = {
          positiveScore: 0,
          negativeScore: 0,
          overallMoodPercentage: '0',
          overallMood: 'Neutral'
        };
        return Response.successResponseData(res, resData, FAIL, res.__('errorInOverallMoodScore'));
      }
    } catch (error) {
      console.error(error);
      return Response.internalServerErrorResponse(res);
    }
  },

  getContentUserLocation: async (req, res) => {
    let company_id = req.authCompanyId || req.query.company_id;
    try {
      let users = await CompanyUsers.find({ company_id: company_id })
        .populate({
          path: 'user_id',
          select: 'ethnicity'
        })
        .lean();
      let countries = [...new Set(users.map((user) => user.country).filter(Boolean))];
      let departments = [...new Set(users.map((user) => user?.department).filter(Boolean))];
      let ethnicities = [...new Set(users.map((user) => user?.user_id?.ethnicity).filter(Boolean))];

      return res.status(200).json({
        countries: countries,
        departments: departments,
        ethnicities: ethnicities
      });
    } catch (err) {
      console.log(err);
      return Response.internalServerErrorResponse(res);
    }
  },

  addSolution: async (req, res) => {
    try {
      let { solutionData, graphName, department, startDate, endDate } = req.body;

      let newSolution = {
        graph_name: graphName,
        department: department,
        solution_data: solutionData,
        company_id: req.authCompanyId
      };

      solutionData = solutionData.replace(/\n/g, '<br>');

      const locals = {
        name: req.companyName,
        graphName: graphName,
        solutionData: solutionData,
        department: department ? `(${department})` : null,

        fromDate: new Date(startDate).toLocaleDateString('en-gb', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }),
        toDate: new Date(endDate).toLocaleDateString('en-gb', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }),
        happySmallIcon: process.env.PDF_HAPPY_SMALL_ICON,
        sadSmallIcon: process.env.PDF_SAD_SMALL_ICON,
        finalIcon: process.env.PDF_HAPPY_ICON,
        finalIconText: '',
        finalMessage:
          SHURU_REPORT_MESSAGES[Math.floor(Math.random() * SHURU_REPORT_MESSAGES.length)]
      };

      const compiledFunction = pug.compileFile('src/views/solution.pug');
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

      await Solution.create({ ...newSolution, pdf_data: pdf });

      return res.send(pdf);
    } catch (error) {
      console.error('Error in adding/updating solution:', error);
      return Response.internalServerErrorResponse(res);
    }
  },

  getSolutionById: async (req, res) => {
    const { id } = req.query;
    try {
      const solution = await Solution.findById(id);
      if (!solution) {
        return Response.successResponseData(
          res,
          { message: 'No solution found' },
          FAIL,
          res.__('noSolutionFound')
        );
      }
      const pdf = Buffer.from(solution.pdf_data, 'base64'); // Assuming pdf_data is base64 encoded
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=file.pdf');
      res.setHeader('Content-Length', pdf.length);
      return res.send(pdf);
    } catch (error) {
      console.error('Error fetching report:', error);
      return Response.internalServerErrorResponse(res);
    }
  },

  getSolutionByFilter: async (req, res) => {
    const { page = 1, pageSize = 10, searchKey } = req.query;
    try {
      const filterData = {
        ...(searchKey && {
          $or: [{ graph_name: { $regex: '.*' + searchKey + '.*', $options: 'i' } }]
        }),
        deletedAt: null,
        company_id: req.authCompanyId
      };
      const solutions = await Solution.find(filterData)
        .select('graph_name createdAt department')
        .skip((Number(page) - 1) * Number(pageSize))
        .sort({
          createdAt: -1
        })
        .limit(Number(pageSize));

      const totalCount = await Solution.countDocuments();
      const totalPages = Math.ceil(totalCount / pageSize);

      return Response.successResponseData(
        res,
        convertObjectKeysToCamelCase(solutions),
        SUCCESS,
        res.__('getSolutionSuccess'),
        {
          page: Number(page),
          pageSize: Number(pageSize),
          totalPages,
          totalCount
        }
      );
    } catch (error) {
      console.error('Error fetching solutions:', error);
      return Response.internalServerErrorResponse(res);
    }
  },

  addReport: async (req, res) => {
    try {
      let {
        professionalData,
        personalData,
        graphName,
        department,
        startDate,
        endDate,
        moodType,
        theraphy,
        theraphyData
      } = req.body;

      let newReport = {
        graph_name: graphName,
        department: department,
        company_id: req.authCompanyId
      };

      if (graphName != 'Therapy Report') {
        // moodType 1 for personal report
        if (moodType == 1) {
          const locals = {
            name: req.companyName,
            graphName: graphName,
            data: personalData,
            department: department ? `(${department})` : null,

            fromDate: new Date(startDate).toLocaleDateString('en-gb', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            }),
            toDate: new Date(endDate).toLocaleDateString('en-gb', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            }),
            happySmallIcon: process.env.PDF_HAPPY_SMALL_ICON,
            sadSmallIcon: process.env.PDF_SAD_SMALL_ICON,
            finalIcon: process.env.PDF_HAPPY_ICON,
            finalIconText: '',
            finalMessage:
              SHURU_REPORT_MESSAGES[Math.floor(Math.random() * SHURU_REPORT_MESSAGES.length)]
          };
          switch (true) {
            case personalData.moodsPercentPositive > personalData.moodsPercentNegative:
              locals.finalIcon = process.env.PDF_HAPPY_ICON;
              locals.finalIconText = 'Positive';
              switch (true) {
                case personalData.moodsPercentPositive < 30:
                  locals.finalMessage = MOOD_REPORT_POSITIVE_MESSGE.LESS_THEN_30;
                  break;
                case personalData.moodsPercentPositive >= 30 &&
                  personalData.moodsPercentPositive < 60:
                  locals.finalMessage = MOOD_REPORT_POSITIVE_MESSGE.THIRTY_TO_SIXTY;
                  break;
                case personalData.moodsPercentPositive >= 60:
                  locals.finalMessage = MOOD_REPORT_POSITIVE_MESSGE.SIXTY_TO_100;
                  break;
              }
              break;
            case personalData.moodsPercentPositive < personalData.moodsPercentNegative:
              locals.finalIcon = process.env.PDF_SAD_ICON;
              locals.finalIconText = 'Negative';
              switch (true) {
                case personalData.moodsPercentNegative < 30:
                  locals.finalMessage = MOOD_REPORT_NEGATIVE_MESSGE.LESS_THEN_30;
                  break;
                case personalData.moodsPercentNegative >= 30 &&
                  personalData.moodsPercentNegative < 70:
                  locals.finalMessage = MOOD_REPORT_NEGATIVE_MESSGE.THIRTY_TO_SEVENTY;
                  break;
                case personalData.moodsPercentNegative >= 70 &&
                  personalData.moodsPercentNegative < 90:
                  locals.finalMessage = MOOD_REPORT_NEGATIVE_MESSGE.SEVENTY_TO_90;
                  break;
                case personalData.moodsPercentNegative >= 90:
                  locals.finalMessage = MOOD_REPORT_NEGATIVE_MESSGE.MORE_THEN_NINETY;
                  break;
              }
              break;
            case personalData.moodsPercentPositive === personalData.moodsPercentNegative:
              locals.finalIcon = process.env.PDF_NEUTRAL_ICON;
              locals.finalIconText = 'Neutral';
              locals.finalMessage = MOOD_REPORT_NEUTRAL_MESSAGE;
              break;
          }

          const compiledFunction = pug.compileFile('src/views/personal-report.pug');
          const html = compiledFunction(locals);
          const browser = await puppeteer.launch({
            executablePath:
              process.env.NODE_ENV === NODE_ENVIRONMENT.DEVELOPMENT
                ? null
                : '/usr/bin/google-chrome',
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

          await Reports.create({ ...newReport, pdf_data: pdf });

          return res.send(pdf);
        }
        // moodType 2 for Professional report
        else if (moodType == 2) {
          const locals = {
            name: req.companyName,
            graphName: graphName,
            data: professionalData,
            department: department ? `(${department})` : null,

            fromDate: new Date(startDate).toLocaleDateString('en-gb', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            }),
            toDate: new Date(endDate).toLocaleDateString('en-gb', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            }),
            happySmallIcon: process.env.PDF_HAPPY_SMALL_ICON,
            sadSmallIcon: process.env.PDF_SAD_SMALL_ICON,
            finalIcon: process.env.PDF_HAPPY_ICON,
            finalIconText: '',
            finalMessage:
              SHURU_REPORT_MESSAGES[Math.floor(Math.random() * SHURU_REPORT_MESSAGES.length)]
          };
          switch (true) {
            case professionalData.moodsPercentPositive > professionalData.moodsPercentNegative:
              locals.finalIcon = process.env.PDF_HAPPY_ICON;
              locals.finalIconText = 'Positive';
              switch (true) {
                case professionalData.moodsPercentPositive < 30:
                  locals.finalMessage = MOOD_REPORT_POSITIVE_MESSGE.LESS_THEN_30;
                  break;
                case professionalData.moodsPercentPositive >= 30 &&
                  professionalData.moodsPercentPositive < 60:
                  locals.finalMessage = MOOD_REPORT_POSITIVE_MESSGE.THIRTY_TO_SIXTY;
                  break;
                case professionalData.moodsPercentPositive >= 60:
                  locals.finalMessage = MOOD_REPORT_POSITIVE_MESSGE.SIXTY_TO_100;
                  break;
              }
              break;
            case professionalData.moodsPercentPositive < professionalData.moodsPercentNegative:
              locals.finalIcon = process.env.PDF_SAD_ICON;
              locals.finalIconText = 'Negative';
              switch (true) {
                case professionalData.moodsPercentNegative < 30:
                  locals.finalMessage = MOOD_REPORT_NEGATIVE_MESSGE.LESS_THEN_30;
                  break;
                case professionalData.moodsPercentNegative >= 30 &&
                  professionalData.moodsPercentNegative < 70:
                  locals.finalMessage = MOOD_REPORT_NEGATIVE_MESSGE.THIRTY_TO_SEVENTY;
                  break;
                case professionalData.moodsPercentNegative >= 70 &&
                  professionalData.moodsPercentNegative < 90:
                  locals.finalMessage = MOOD_REPORT_NEGATIVE_MESSGE.SEVENTY_TO_90;
                  break;
                case professionalData.moodsPercentNegative >= 90:
                  locals.finalMessage = MOOD_REPORT_NEGATIVE_MESSGE.MORE_THEN_NINETY;
                  break;
              }
              break;
            case professionalData.moodsPercentPositive === professionalData.moodsPercentNegative:
              locals.finalIcon = process.env.PDF_NEUTRAL_ICON;
              locals.finalIconText = 'Neutral';
              locals.finalMessage = MOOD_REPORT_NEUTRAL_MESSAGE;
              break;
          }

          const compiledFunction = pug.compileFile('src/views/professional-report.pug');
          const html = compiledFunction(locals);
          const browser = await puppeteer.launch({
            executablePath:
              process.env.NODE_ENV === NODE_ENVIRONMENT.DEVELOPMENT
                ? null
                : '/usr/bin/google-chrome',
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

          await Reports.create({ ...newReport, pdf_data: pdf });

          return res.send(pdf);
        }
        // overall report
        else {
          let moodPercentPositive, moodPercentNegative;
          if (personalData.moodsPercentPositive > 0 && professionalData.moodsPercentPositive == 0) {
            moodPercentPositive = parseFloat(
              personalData.moodsPercentPositive + professionalData.moodsPercentPositive
            ).toFixed(2);
          } else if (
            professionalData.moodsPercentPositive > 0 &&
            personalData.moodsPercentPositive == 0
          ) {
            moodPercentPositive = parseFloat(
              personalData.moodsPercentPositive + professionalData.moodsPercentPositive
            ).toFixed(2);
          } else {
            moodPercentPositive = parseFloat(
              (personalData.moodsPercentPositive + professionalData.moodsPercentPositive) / 2
            ).toFixed(2);
          }

          if (personalData.moodsPercentNegative > 0 && professionalData.moodsPercentNegative == 0) {
            moodPercentNegative = parseFloat(
              personalData.moodsPercentNegative + professionalData.moodsPercentNegative
            ).toFixed(2);
          } else if (
            professionalData.moodsPercentNegative > 0 &&
            personalData.moodsPercentNegative == 0
          ) {
            moodPercentNegative = parseFloat(
              personalData.moodsPercentNegative + professionalData.moodsPercentNegative
            ).toFixed(2);
          } else {
            moodPercentNegative = parseFloat(
              (personalData.moodsPercentNegative + professionalData.moodsPercentNegative) / 2
            ).toFixed(2);
          }

          let overallData = {
            totalMoodsCount: personalData.totalMoodsCount + professionalData.totalMoodsCount,
            totalPositiveMoodsCount:
              personalData.totalPositiveMoodsCount + professionalData.totalPositiveMoodsCount,
            totalNegativeMoodsCount:
              personalData.totalNegativeMoodsCount + professionalData.totalNegativeMoodsCount,
            moodsPercentPositive: moodPercentPositive,
            moodsPercentNegative: moodPercentNegative
          };

          const locals = {
            name: req.companyName,
            graphName: graphName,
            data: overallData,
            personalData: personalData,
            professionalData: professionalData,
            overallPercentage: Math.abs(
              overallData.moodsPercentPositive - overallData.moodsPercentNegative
            ).toFixed(2),
            department: department ? `(${department})` : null,

            fromDate: new Date(startDate).toLocaleDateString('en-gb', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            }),
            toDate: new Date(endDate).toLocaleDateString('en-gb', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            }),
            happySmallIcon: process.env.PDF_HAPPY_SMALL_ICON,
            sadSmallIcon: process.env.PDF_SAD_SMALL_ICON,
            finalIconSmall:
              overallData.totalPositiveMoodsCount > overallData.totalNegativeMoodsCount
                ? process.env.PDF_HAPPY_SMALL_ICON
                : process.env.PDF_SAD_SMALL_ICON,
            finalIcon: process.env.PDF_HAPPY_ICON,
            finalIconText: '',
            finalMessage:
              SHURU_REPORT_MESSAGES[Math.floor(Math.random() * SHURU_REPORT_MESSAGES.length)]
          };
          switch (true) {
            case overallData.moodsPercentPositive > overallData.moodsPercentNegative:
              locals.finalIcon = process.env.PDF_HAPPY_ICON;
              locals.finalIconText = 'Positive';
              switch (true) {
                case overallData.moodsPercentPositive < 30:
                  locals.finalMessage = MOOD_REPORT_POSITIVE_MESSGE.LESS_THEN_30;
                  break;
                case overallData.moodsPercentPositive >= 30 &&
                  overallData.moodsPercentPositive < 60:
                  locals.finalMessage = MOOD_REPORT_POSITIVE_MESSGE.THIRTY_TO_SIXTY;
                  break;
                case overallData.moodsPercentPositive >= 60:
                  locals.finalMessage = MOOD_REPORT_POSITIVE_MESSGE.SIXTY_TO_100;
                  break;
              }
              break;
            case overallData.moodsPercentPositive < overallData.moodsPercentNegative:
              locals.finalIcon = process.env.PDF_SAD_ICON;

              locals.finalIconText = 'Negative';
              switch (true) {
                case overallData.moodsPercentNegative < 30:
                  locals.finalMessage = MOOD_REPORT_NEGATIVE_MESSGE.LESS_THEN_30;
                  break;
                case overallData.moodsPercentNegative >= 30 &&
                  overallData.moodsPercentNegative < 70:
                  locals.finalMessage = MOOD_REPORT_NEGATIVE_MESSGE.THIRTY_TO_SEVENTY;
                  break;
                case overallData.moodsPercentNegative >= 70 &&
                  overallData.moodsPercentNegative < 90:
                  locals.finalMessage = MOOD_REPORT_NEGATIVE_MESSGE.SEVENTY_TO_90;
                  break;
                case overallData.moodsPercentNegative >= 90:
                  locals.finalMessage = MOOD_REPORT_NEGATIVE_MESSGE.MORE_THEN_NINETY;
                  break;
              }
              break;
            case overallData.moodsPercentPositive === overallData.moodsPercentNegative:
              locals.finalIcon = process.env.PDF_NEUTRAL_ICON;
              locals.finalIconText = 'Neutral';
              locals.finalMessage = MOOD_REPORT_NEUTRAL_MESSAGE;
              break;
          }

          const compiledFunction = pug.compileFile('src/views/overall-report.pug');
          const html = compiledFunction(locals);
          const browser = await puppeteer.launch({
            executablePath:
              process.env.NODE_ENV === NODE_ENVIRONMENT.DEVELOPMENT
                ? null
                : '/usr/bin/google-chrome',
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

          await Reports.create({ ...newReport, pdf_data: pdf });

          return res.send(pdf);
        }
      } else {
        let theraphyPositiveCategories = theraphyData.positive.categories;
        let theraphyNegativeCategories = theraphyData.negative.categories;
        let theraphyPositiveData = theraphyData.positiveCounts.series[0].data;
        let theraphyNegativeData = theraphyData.negativeCounts.series[0].data;

        let positiveCount = Math.abs(theraphyPositiveData.reduce((sum, count) => sum + count, 0));
        let negativeCount = Math.abs(theraphyNegativeData.reduce((sum, count) => sum + count, 0));
        let totalCount = positiveCount + negativeCount;
        let percentagePositive = totalCount
          ? parseFloat((positiveCount / totalCount) * 100).toFixed(2)
          : 0;
        let percentageNegative = totalCount
          ? parseFloat((negativeCount / totalCount) * 100).toFixed(2)
          : 0;

        const locals = {
          name: req.companyName,
          graphName: graphName,
          data: theraphyData,
          theraphyPositiveCategories: theraphyPositiveCategories,
          theraphyNegativeCategories: theraphyNegativeCategories,
          theraphyPositive: theraphyPositiveData,
          theraphyNegative: theraphyNegativeData,
          percentagePositive: percentagePositive ? percentagePositive : 0,
          percentageNegative: percentageNegative ? percentageNegative : 0,
          department: department ? `(${department})` : null,

          fromDate: new Date(startDate).toLocaleDateString('en-gb', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          }),
          toDate: new Date(endDate).toLocaleDateString('en-gb', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          }),
          happySmallIcon: process.env.PDF_HAPPY_SMALL_ICON,
          sadSmallIcon: process.env.PDF_SAD_SMALL_ICON,
          finalIcon: process.env.PDF_HAPPY_ICON,
          finalIconText: '',
          finalMessage:
            SHURU_REPORT_MESSAGES[Math.floor(Math.random() * SHURU_REPORT_MESSAGES.length)]
        };
        switch (true) {
          case percentagePositive > percentageNegative:
            locals.finalIcon = process.env.PDF_HAPPY_ICON;
            locals.finalIconText = 'Positive';
            switch (true) {
              case percentagePositive < 30:
                locals.finalMessage = MOOD_REPORT_POSITIVE_MESSGE.LESS_THEN_30;
                break;
              case percentagePositive >= 30 && percentagePositive < 60:
                locals.finalMessage = MOOD_REPORT_POSITIVE_MESSGE.THIRTY_TO_SIXTY;
                break;
              case percentagePositive >= 60:
                locals.finalMessage = MOOD_REPORT_POSITIVE_MESSGE.SIXTY_TO_100;
                break;
            }
            break;
          case percentagePositive < percentageNegative:
            locals.finalIcon = process.env.PDF_SAD_ICON;
            locals.finalIconText = 'Negative';
            switch (true) {
              case percentageNegative < 30:
                locals.finalMessage = MOOD_REPORT_NEGATIVE_MESSGE.LESS_THEN_30;
                break;
              case percentageNegative >= 30 && percentageNegative < 70:
                locals.finalMessage = MOOD_REPORT_NEGATIVE_MESSGE.THIRTY_TO_SEVENTY;
                break;
              case percentageNegative >= 70 && percentageNegative < 90:
                locals.finalMessage = MOOD_REPORT_NEGATIVE_MESSGE.SEVENTY_TO_90;
                break;
              case percentageNegative >= 90:
                locals.finalMessage = MOOD_REPORT_NEGATIVE_MESSGE.MORE_THEN_NINETY;
                break;
            }
            break;
          case percentagePositive === percentageNegative:
            locals.finalIcon = process.env.PDF_NEUTRAL_ICON;
            locals.finalIconText = 'Neutral';
            locals.finalMessage = MOOD_REPORT_NEUTRAL_MESSAGE;
            break;
        }

        const compiledFunction = pug.compileFile('src/views/theraphy-report.pug');
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

        await Reports.create({ ...newReport, pdf_data: pdf });

        return res.send(pdf);
      }
    } catch (error) {
      console.error('Error in adding/updating report:', error);
      return Response.internalServerErrorResponse(res);
    }
  },

  getReport: async (req, res) => {
    const { id } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid report ID' });
    }
    try {
      const reportdata = await Reports.findById(id);

      if (!reportdata) {
        return Response.successResponseData(
          res,
          { message: 'No report found' },
          FAIL,
          res.__('noReportFound')
        );
      }

      const pdf = Buffer.from(reportdata.pdf_data, 'base64'); // Assuming pdf_data is base64 encoded
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=file.pdf');
      res.setHeader('Content-Length', pdf.length);
      return res.send(pdf);
    } catch (error) {
      console.error('Error fetching report:', error);
      return Response.internalServerErrorResponse(res);
    }
  },

  getAllReport: async (req, res) => {
    const { page = 1, pageSize = 10, searchKey } = req.query;
    try {
      const filterData = {
        ...(searchKey && {
          $or: [{ graph_name: { $regex: '.*' + searchKey + '.*', $options: 'i' } }]
        }),
        deletedAt: null,
        company_id: req.authCompanyId
      };
      const reports = await Reports.find(filterData)
        .select('graph_name createdAt department')
        .sort({
          createdAt: -1
        })
        .skip((Number(page) - 1) * Number(pageSize))
        .limit(Number(pageSize));

      const totalCount = await Reports.countDocuments();
      const totalPages = Math.ceil(totalCount / pageSize);

      if (!reports.length) {
        return Response.successResponseData(
          res,
          { message: 'No report found' },
          FAIL,
          res.__('noReportFound')
        );
      }

      return Response.successResponseData(
        res,
        convertObjectKeysToCamelCase(reports),
        SUCCESS,
        res.__('getReportsSuccess'),
        {
          page: Number(page),
          pageSize: Number(pageSize),
          totalPages,
          totalCount
        }
      );
    } catch (error) {
      console.error('Error fetching reports:', error);
      return Response.internalServerErrorResponse(res);
    }
  },

  getShuruTheraphyData: async function (req, res) {
    try {
      let { dataType, minAge, maxAge, department, startDate, endDate, country, ethnicity, gender } =
        req.query;
      const company_id = req.authCompanyId || req.query.companyId;
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
      const foundUsers = await Users.find(userFiltering, { _id: 1 });
      let users = [];
      foundUsers.forEach((user) => {
        users.push({
          user_id: user._id
        });
      });

      const uniqueValues = new Set([...users, ...companyUsers]);
      const uniqueUsers = [...uniqueValues];
      const uniqueuserIds = uniqueUsers.map((user) => user.user_id);
      let userIds = uniqueuserIds.map((id) => id.toString());
      let totalUsers = userIds.length;

      const collectedData = {
        positive: {
          'I love this job': 0,
          'I get on well with my manager': 0,
          'I love my colleagues': 0,
          "I enjoy the tasks I'm given": 0,
          'I feel fulfilled by my work': 0,
          'I never plan to leave this job': 0,
          "There's so much opportunity for development": 0,
          'My workplace cares about me': 0,
          'I always try my best at work': 0,
          'I get paid fairly for what I do': 0,
          'There are opportunities for me to earn more': 0,
          'I love my working environment': 0,
          'I love how I spend my time at work': 0,
          'I feel valued at work': 0,
          'I have clarity over my role': 0,
          'Morale in my workplace is high': 0,
          'I get lots of extra perks with my job': 0,
          'My workload is achievable and realistic': 0,
          'I am not under much pressure at work': 0,
          'My manager is well organised and clear': 0,
          'My manager respects my time': 0,
          "I'm always given notice of new projects": 0,
          "There's lots of flexibility in my working hours": 0,
          'My manager is a great communicator': 0,
          'My workplace supports my mental health': 0
        },
        negative: {
          'I hate this job': 0,
          "I can't stand my manager": 0,
          "I don't like my colleagues": 0,
          "I hate the tasks I'm given": 0,
          'I am bored at work': 0,
          'I want a new job': 0,
          "There's no opportunity for development": 0,
          "My workplace doesn't care about me": 0,
          'I do as little as possible at work': 0,
          "I don't get paid enough": 0,
          'My earning opportunities are limited': 0,
          'I hate my working environment': 0,
          "I feel like I'm wasting my time at work": 0,
          'Nobody values what I do at work': 0,
          'My role is very unclear': 0,
          'Morale in my workplace is very low': 0,
          'There are no perks to my job': 0,
          'My workload is unrealistic and not achievable': 0,
          'I am under too much pressure at work': 0,
          'My manager is disorganised and chaotic': 0,
          'My manager has no respect for my time': 0,
          'New projects are landed on me at short notice': 0,
          'My manager is terrible at communication': 0,
          "There's no flexibility in my working hours": 0,
          "My mental health isn't supported at all": 0
        }
      };

      const collections = {
        cleanses: Cleanse,
        notes: UserNotes,
        goals: Goals,
        gratitudes: UserGratitude,
        affirmations: UserAffirmation,
        conversation: Conversation
      };

      const uniquePositiveUsers = {};
      const uniqueNegativeUsers = {};

      for (const [collectionName, Model] of Object.entries(collections)) {
        let documents = [];
        if (collectionName == 'conversation') {
          documents = await Model.find({
            userId: { $in: userIds },
            updatedAt: { $gte: startDate, $lte: endDate }
          });
        } else {
          documents = await Model.find({
            user_id: { $in: userIds },
            updatedAt: { $gte: startDate, $lte: endDate },
            deletedAt: null
          });
        }

        documents.forEach((document) => {
          const positiveSentiments = (document.sentiments && document.sentiments.positive) || {};
          const negativeSentiments = (document.sentiments && document.sentiments.negative) || {};
          for (const [key, value] of Object.entries(positiveSentiments)) {
            collectedData.positive[key] = (collectedData.positive[key] || 0) + value;
            uniquePositiveUsers[key] = uniquePositiveUsers[key] || new Set();
            uniquePositiveUsers[key].add(document.userId || document.user_id); // Add unique user to the set
          }

          for (const [key, value] of Object.entries(negativeSentiments)) {
            collectedData.negative[key] = Math.abs((collectedData.negative[key] || 0) + value);
            uniqueNegativeUsers[key] = uniqueNegativeUsers[key] || new Set();
            uniqueNegativeUsers[key].add(document.userId || document.user_id); // Add unique user to the set
          }
        });
      }

      let negative = [];
      let positive = [];

      Object.entries(collectedData?.positive).map((key, value) => {
        let percent =
          parseFloat((uniquePositiveUsers[key[0]]?.size / totalUsers) * 100).toFixed(2) || 0;
        if (percent != 'NaN') {
          positive.push(percent);
        } else {
          positive.push(0);
        }
      });

      Object.entries(collectedData?.negative).map((key, value) => {
        let percent =
          parseFloat((uniqueNegativeUsers[key[0]]?.size / totalUsers) * 100).toFixed(2) || 0;
        if (percent != 'NaN') {
          negative.push(percent);
        } else {
          negative.push(0);
        }
      });

      const data = {
        negative: {
          series: [{ data: negative }],
          categories: Object.keys(collectedData.negative)
        },
        positive: {
          series: [{ data: positive }],
          categories: Object.keys(collectedData.positive)
        },
        negativeCounts: {
          series: [{ data: Object.values(collectedData.negative) }],
          categories: Object.keys(collectedData.negative)
        },
        positiveCounts: {
          series: [{ data: Object.values(collectedData.positive) }],
          categories: Object.keys(collectedData.positive)
        },
        totalUsers
      };

      return Response.successResponseData(
        res,
        convertObjectKeysToCamelCase(data),
        SUCCESS,
        res.__('totalShuruTheraphySuccessfully')
      );
    } catch (err) {
      console.log(err);
      return Response.internalServerErrorResponse(res);
    }
  },
  /**
   * @description This function is used to get analytics of befoer sleep logs of users
   * @param {*} req
   * @param {*} res
   * @return {*}
   */

  getBeforeSleepData: async (req, res) => {
    try {
      let { dataType, minAge, maxAge, department, startDate, endDate, country, ethnicity, gender } =
        req.query;
      const company_id = req.authCompanyId || req.query.company_id;
      if (!company_id) {
        return Response.errorResponseWithoutData(res, 'Company ID not found', FAIL);
      }

      // Define user filtering with company_id
      const userFiltering = { company_id };
      let noOfDays = 0;
      let initialDate;

      // calculate start date
      if (startDate && endDate) {
        noOfDays = getDaysDifference(startDate, endDate);
        initialDate = new Date(startDate);
        initialDate.setDate(initialDate.getDate() - noOfDays);
        endDate = new Date(endDate);
      } else {
        return Response.errorResponseWithoutData(res, 'Date range is missing', FAIL);
      }

      // if min and max age is provided
      if (minAge && maxAge) {
        //startBirthDate
        const startBirthDate = new Date();
        startBirthDate.setFullYear(startBirthDate.getFullYear() - maxAge - 1);
        startBirthDate.setHours(0, 0, 0, 0);
        //endBirthDate
        const endBirthDate = new Date();
        endBirthDate.setFullYear(endBirthDate.getFullYear() - minAge);
        endBirthDate.setHours(23, 59, 59, 999);
        userFiltering['date_of_birth'] = { $gte: startBirthDate, $lte: endBirthDate };
      }

      if (department) userFiltering['department'] = department;
      if (ethnicity) userFiltering['ethnicity'] = ethnicity;
      if (country) userFiltering['country'] = country;
      if (gender) userFiltering['gender'] = parseInt(gender);

      // fetch company users according to condition
      const companyUsers = await CompanyUsers.find(userFiltering, 'user_id').lean();
      let companyUserIdsList = companyUsers.map((user) => user.user_id);

      // fetch users data from users table
      const foundUsers = await Users.find(
        {
          _id: { $in: companyUserIdsList },
          user_type: 2,
          status: STATUS.ACTIVE
        },
        '_id'
      ).lean();
      let activeCompanyusers = foundUsers.map((user) => toObjectId(user._id));

      const startDateMinusOne = new Date(startDate);
      startDateMinusOne.setDate(startDateMinusOne.getDate() - 1);

      // Aggregation pipeline
      const moodsListOfCompanyUsers = await BeforeSleep.aggregate([
        {
          $facet: {
            initialToStart: [
              {
                $match: {
                  user_id: { $in: activeCompanyusers },
                  createdAt: { $gte: initialDate, $lte: startDateMinusOne },
                  $or: [
                    { anxious: { $ne: 0 } },
                    { calm: { $ne: 0 } },
                    { sad: { $ne: 0 } },
                    { happy: { $ne: 0 } },
                    { noisy: { $ne: 0 } },
                    { quiet: { $ne: 0 } },
                    { cold: { $ne: 0 } },
                    { warm: { $ne: 0 } },
                    { agitated: { $ne: 0 } },
                    { peaceful: { $ne: 0 } },
                    { uneasy: { $ne: 0 } },
                    { settled: { $ne: 0 } },
                    { worried: { $ne: 0 } },
                    { atEase: { $ne: 0 } },
                    { overwhelmed: { $ne: 0 } },
                    { inControl: { $ne: 0 } }
                  ]
                }
              },
              {
                $group: {
                  _id: null,
                  averageAnxious: { $avg: '$anxious' },
                  averageCalm: { $avg: '$calm' },
                  averageSad: { $avg: '$sad' },
                  averageHappy: { $avg: '$happy' },
                  averageNoisy: { $avg: '$noisy' },
                  averageQuiet: { $avg: '$quiet' },
                  averageCold: { $avg: '$cold' },
                  averageWarm: { $avg: '$warm' },
                  averageAgitated: { $avg: '$agitated' },
                  averagePeaceful: { $avg: '$peaceful' },
                  averageUneasy: { $avg: '$uneasy' },
                  averageSettled: { $avg: '$settled' },
                  averageWorried: { $avg: '$worried' },
                  averageAtEase: { $avg: '$at_ease' },
                  averageOverwhelmed: { $avg: '$overwhelmed' },
                  averageInControl: { $avg: '$in_control' }
                }
              },
              {
                $project: {
                  _id: 0,
                  positiveMoods: {
                    averageCalm: { $round: [{ $ifNull: ['$averageCalm', 0] }, 2] },
                    averageHappy: { $round: [{ $ifNull: ['$averageHappy', 0] }, 2] },
                    averageWarm: { $round: [{ $ifNull: ['$averageWarm', 0] }, 2] },
                    averagePeaceful: { $round: [{ $ifNull: ['$averagePeaceful', 0] }, 2] },
                    averageSettled: { $round: [{ $ifNull: ['$averageSettled', 0] }, 2] },
                    averageAtEase: { $round: [{ $ifNull: ['$averageAtEase', 0] }, 2] },
                    averageInControl: { $round: [{ $ifNull: ['$averageInControl', 0] }, 2] },
                    averageQuiet: { $round: [{ $ifNull: ['$averageQuiet', 0] }, 2] }
                  },
                  negativeMoods: {
                    averageAnxious: { $round: [{ $ifNull: ['$averageAnxious', 0] }, 2] },
                    averageSad: { $round: [{ $ifNull: ['$averageSad', 0] }, 2] },
                    averageNoisy: { $round: [{ $ifNull: ['$averageNoisy', 0] }, 2] },
                    averageCold: { $round: [{ $ifNull: ['$averageCold', 0] }, 2] },
                    averageAgitated: { $round: [{ $ifNull: ['$averageAgitated', 0] }, 2] },
                    averageUneasy: { $round: [{ $ifNull: ['$averageUneasy', 0] }, 2] },
                    averageWorried: { $round: [{ $ifNull: ['$averageWorried', 0] }, 2] },
                    averageOverwhelmed: {
                      $round: [{ $ifNull: ['$averageOverwhelmed', 0] }, 2]
                    }
                  }
                }
              },
              {
                $project: {
                  totalPositiveMoods: {
                    $add: [
                      '$positiveMoods.averageCalm',
                      '$positiveMoods.averageHappy',
                      '$positiveMoods.averageWarm',
                      '$positiveMoods.averagePeaceful',
                      '$positiveMoods.averageSettled',
                      '$positiveMoods.averageAtEase',
                      '$positiveMoods.averageInControl',
                      '$positiveMoods.averageQuiet'
                    ]
                  },
                  totalNegativeMoods: {
                    $add: [
                      '$negativeMoods.averageAnxious',
                      '$negativeMoods.averageSad',
                      '$negativeMoods.averageNoisy',
                      '$negativeMoods.averageCold',
                      '$negativeMoods.averageAgitated',
                      '$negativeMoods.averageUneasy',
                      '$negativeMoods.averageWorried',
                      '$negativeMoods.averageOverwhelmed'
                    ]
                  }
                }
              },
              {
                $project: {
                  positivePercentage: {
                    $cond: {
                      if: { $eq: [{ $add: ['$totalPositiveMoods', '$totalNegativeMoods'] }, 0] },
                      then: 0,
                      else: {
                        $round: [
                          {
                            $multiply: [
                              {
                                $divide: [
                                  '$totalPositiveMoods',
                                  { $add: ['$totalPositiveMoods', '$totalNegativeMoods'] }
                                ]
                              },
                              100
                            ]
                          },
                          2
                        ]
                      }
                    }
                  },
                  negativePercentage: {
                    $cond: {
                      if: { $eq: [{ $add: ['$totalPositiveMoods', '$totalNegativeMoods'] }, 0] },
                      then: 0,
                      else: {
                        $round: [
                          {
                            $multiply: [
                              {
                                $divide: [
                                  '$totalNegativeMoods',
                                  { $add: ['$totalPositiveMoods', '$totalNegativeMoods'] }
                                ]
                              },
                              100
                            ]
                          },
                          2
                        ]
                      }
                    }
                  }
                }
              }
            ],
            startToEnd: [
              {
                $match: {
                  user_id: { $in: activeCompanyusers },
                  createdAt: { $gte: new Date(startDate), $lte: endDate },
                  $or: [
                    { anxious: { $ne: 0 } },
                    { calm: { $ne: 0 } },
                    { sad: { $ne: 0 } },
                    { happy: { $ne: 0 } },
                    { noisy: { $ne: 0 } },
                    { quiet: { $ne: 0 } },
                    { cold: { $ne: 0 } },
                    { warm: { $ne: 0 } },
                    { agitated: { $ne: 0 } },
                    { peaceful: { $ne: 0 } },
                    { uneasy: { $ne: 0 } },
                    { settled: { $ne: 0 } },
                    { worried: { $ne: 0 } },
                    { atEase: { $ne: 0 } },
                    { overwhelmed: { $ne: 0 } },
                    { inControl: { $ne: 0 } }
                  ]
                }
              },
              {
                $addFields: {
                  positiveMoodCount: {
                    $sum: [
                      { $cond: [{ $ne: ['$calm', 0] }, 1, 0] },
                      { $cond: [{ $ne: ['$happy', 0] }, 1, 0] },
                      { $cond: [{ $ne: ['$warm', 0] }, 1, 0] },
                      { $cond: [{ $ne: ['$peaceful', 0] }, 1, 0] },
                      { $cond: [{ $ne: ['$settled', 0] }, 1, 0] },
                      { $cond: [{ $ne: ['$at_ease', 0] }, 1, 0] },
                      { $cond: [{ $ne: ['$in_control', 0] }, 1, 0] },
                      { $cond: [{ $ne: ['$quiet', 0] }, 1, 0] }
                    ]
                  },
                  negativeMoodCount: {
                    $sum: [
                      { $cond: [{ $ne: ['$anxious', 0] }, 1, 0] },
                      { $cond: [{ $ne: ['$sad', 0] }, 1, 0] },
                      { $cond: [{ $ne: ['$noisy', 0] }, 1, 0] },
                      { $cond: [{ $ne: ['$cold', 0] }, 1, 0] },
                      { $cond: [{ $ne: ['$agitated', 0] }, 1, 0] },
                      { $cond: [{ $ne: ['$uneasy', 0] }, 1, 0] },
                      { $cond: [{ $ne: ['$worried', 0] }, 1, 0] },
                      { $cond: [{ $ne: ['$overwhelmed', 0] }, 1, 0] }
                    ]
                  }
                }
              },
              {
                $group: {
                  _id: '$user_id',
                  averageAnxious: { $avg: '$anxious' },
                  averageCalm: { $avg: '$calm' },
                  averageSad: { $avg: '$sad' },
                  averageHappy: { $avg: '$happy' },
                  averageNoisy: { $avg: '$noisy' },
                  averageQuiet: { $avg: '$quiet' },
                  averageCold: { $avg: '$cold' },
                  averageWarm: { $avg: '$warm' },
                  averageAgitated: { $avg: '$agitated' },
                  averagePeaceful: { $avg: '$peaceful' },
                  averageUneasy: { $avg: '$uneasy' },
                  averageSettled: { $avg: '$settled' },
                  averageWorried: { $avg: '$worried' },
                  averageAtEase: { $avg: '$at_ease' },
                  averageOverwhelmed: { $avg: '$overwhelmed' },
                  averageInControl: { $avg: '$in_control' },
                  positiveMoodCount: { $sum: '$positiveMoodCount' },
                  negativeMoodCount: { $sum: '$negativeMoodCount' }
                }
              },
              {
                $group: {
                  _id: null,
                  overallAverageAnxious: { $avg: '$averageAnxious' },
                  overallAverageCalm: { $avg: '$averageCalm' },
                  overallAverageSad: { $avg: '$averageSad' },
                  overallAverageHappy: { $avg: '$averageHappy' },
                  overallAverageNoisy: { $avg: '$averageNoisy' },
                  overallAverageQuiet: { $avg: '$averageQuiet' },
                  overallAverageCold: { $avg: '$averageCold' },
                  overallAverageWarm: { $avg: '$overallAverageWarm' },
                  overallAverageAgitated: { $avg: '$averageAgitated' },
                  overallAveragePeaceful: { $avg: '$overallAveragePeaceful' },
                  overallAverageUneasy: { $avg: '$overallAverageUneasy' },
                  overallAverageSettled: { $avg: '$overallAverageSettled' },
                  overallAverageWorried: { $avg: '$overallAverageWorried' },
                  overallAverageAtEase: { $avg: '$overallAverageAtEase' },
                  overallAverageOverwhelmed: { $avg: '$overallAverageOverwhelmed' },
                  overallAverageInControl: { $avg: '$overallAverageInControl' },
                  positiveMoodCount: { $sum: '$positiveMoodCount' },
                  negativeMoodCount: { $sum: '$negativeMoodCount' },
                  uniqueUserCount: { $sum: 1 }
                }
              },
              {
                $project: {
                  _id: 0,
                  positiveMoodCount: 1,
                  negativeMoodCount: 1,
                  uniqueUserCount: 1,
                  positiveMoods: {
                    averageCalm: { $round: [{ $ifNull: ['$overallAverageCalm', 0] }, 2] },
                    averageHappy: { $round: [{ $ifNull: ['$overallAverageHappy', 0] }, 2] },
                    averageWarm: { $round: [{ $ifNull: ['$overallAverageWarm', 0] }, 2] },
                    averagePeaceful: { $round: [{ $ifNull: ['$overallAveragePeaceful', 0] }, 2] },
                    averageSettled: { $round: [{ $ifNull: ['$overallAverageSettled', 0] }, 2] },
                    averageAtEase: { $round: [{ $ifNull: ['$overallAverageAtEase', 0] }, 2] },
                    averageInControl: { $round: [{ $ifNull: ['$overallAverageInControl', 0] }, 2] },
                    averageQuiet: { $round: [{ $ifNull: ['$overallAverageQuiet', 0] }, 2] }
                  },
                  negativeMoods: {
                    averageAnxious: { $round: [{ $ifNull: ['$overallAverageAnxious', 0] }, 2] },
                    averageSad: { $round: [{ $ifNull: ['$overallAverageSad', 0] }, 2] },
                    averageNoisy: { $round: [{ $ifNull: ['$overallAverageNoisy', 0] }, 2] },
                    averageCold: { $round: [{ $ifNull: ['$overallAverageCold', 0] }, 2] },
                    averageAgitated: { $round: [{ $ifNull: ['$overallAverageAgitated', 0] }, 2] },
                    averageUneasy: { $round: [{ $ifNull: ['$overallAverageUneasy', 0] }, 2] },
                    averageWorried: { $round: [{ $ifNull: ['$overallAverageWorried', 0] }, 2] },
                    averageOverwhelmed: {
                      $round: [{ $ifNull: ['$overallAverageOverwhelmed', 0] }, 2]
                    }
                  }
                }
              },
              {
                $project: {
                  positiveMoodCount: 1,
                  negativeMoodCount: 1,
                  uniqueUserCount: 1,
                  positiveMoods: 1,
                  negativeMoods: 1,
                  totalPositiveMoods: {
                    $add: [
                      '$positiveMoods.averageCalm',
                      '$positiveMoods.averageHappy',
                      '$positiveMoods.averageWarm',
                      '$positiveMoods.averagePeaceful',
                      '$positiveMoods.averageSettled',
                      '$positiveMoods.averageAtEase',
                      '$positiveMoods.averageInControl',
                      '$positiveMoods.averageQuiet'
                    ]
                  },
                  totalNegativeMoods: {
                    $add: [
                      '$negativeMoods.averageAnxious',
                      '$negativeMoods.averageSad',
                      '$negativeMoods.averageNoisy',
                      '$negativeMoods.averageCold',
                      '$negativeMoods.averageAgitated',
                      '$negativeMoods.averageUneasy',
                      '$negativeMoods.averageWorried',
                      '$negativeMoods.averageOverwhelmed'
                    ]
                  }
                }
              },
              {
                $project: {
                  positiveMoodCount: 1,
                  negativeMoodCount: 1,
                  uniqueUserCount: 1,
                  positivePercentage: {
                    $cond: {
                      if: { $eq: [{ $add: ['$totalPositiveMoods', '$totalNegativeMoods'] }, 0] },
                      then: 0,
                      else: {
                        $round: [
                          {
                            $multiply: [
                              {
                                $divide: [
                                  '$totalPositiveMoods',
                                  { $add: ['$totalPositiveMoods', '$totalNegativeMoods'] }
                                ]
                              },
                              100
                            ]
                          },
                          2
                        ]
                      }
                    }
                  },
                  negativePercentage: {
                    $cond: {
                      if: { $eq: [{ $add: ['$totalPositiveMoods', '$totalNegativeMoods'] }, 0] },
                      then: 0,
                      else: {
                        $round: [
                          {
                            $multiply: [
                              {
                                $divide: [
                                  '$totalNegativeMoods',
                                  { $add: ['$totalPositiveMoods', '$totalNegativeMoods'] }
                                ]
                              },
                              100
                            ]
                          },
                          2
                        ]
                      }
                    }
                  },
                  positiveMoodPercentages: {
                    calm: {
                      $round: [
                        { $multiply: [{ $divide: ['$positiveMoods.averageCalm', 5] }, 100] },
                        2
                      ]
                    },
                    happy: {
                      $round: [
                        { $multiply: [{ $divide: ['$positiveMoods.averageHappy', 5] }, 100] },
                        2
                      ]
                    },
                    warm: {
                      $round: [
                        { $multiply: [{ $divide: ['$positiveMoods.averageWarm', 5] }, 100] },
                        2
                      ]
                    },
                    peaceful: {
                      $round: [
                        { $multiply: [{ $divide: ['$positiveMoods.averagePeaceful', 5] }, 100] },
                        2
                      ]
                    },
                    settled: {
                      $round: [
                        { $multiply: [{ $divide: ['$positiveMoods.averageSettled', 5] }, 100] },
                        2
                      ]
                    },
                    atEase: {
                      $round: [
                        { $multiply: [{ $divide: ['$positiveMoods.averageAtEase', 5] }, 100] },
                        2
                      ]
                    },
                    inControl: {
                      $round: [
                        { $multiply: [{ $divide: ['$positiveMoods.averageInControl', 5] }, 100] },
                        2
                      ]
                    },
                    quiet: {
                      $round: [
                        { $multiply: [{ $divide: ['$positiveMoods.averageQuiet', 5] }, 100] },
                        2
                      ]
                    }
                  },
                  negativeMoodPercentages: {
                    anxious: {
                      $round: [
                        { $multiply: [{ $divide: ['$negativeMoods.averageAnxious', 5] }, 100] },
                        2
                      ]
                    },
                    sad: {
                      $round: [
                        { $multiply: [{ $divide: ['$negativeMoods.averageSad', 5] }, 100] },
                        2
                      ]
                    },
                    noisy: {
                      $round: [
                        { $multiply: [{ $divide: ['$negativeMoods.averageNoisy', 5] }, 100] },
                        2
                      ]
                    },
                    cold: {
                      $round: [
                        { $multiply: [{ $divide: ['$negativeMoods.averageCold', 5] }, 100] },
                        2
                      ]
                    },
                    agitated: {
                      $round: [
                        { $multiply: [{ $divide: ['$negativeMoods.averageAgitated', 5] }, 100] },
                        2
                      ]
                    },
                    uneasy: {
                      $round: [
                        { $multiply: [{ $divide: ['$negativeMoods.averageUneasy', 5] }, 100] },
                        2
                      ]
                    },
                    worried: {
                      $round: [
                        { $multiply: [{ $divide: ['$negativeMoods.averageWorried', 5] }, 100] },
                        2
                      ]
                    },
                    overwhelmed: {
                      $round: [
                        { $multiply: [{ $divide: ['$negativeMoods.averageOverwhelmed', 5] }, 100] },
                        2
                      ]
                    }
                  }
                }
              }
            ]
          }
        }
      ]);

      if (moodsListOfCompanyUsers[0].startToEnd.length) {
        const earlierPositivePercentage =
          moodsListOfCompanyUsers[0].initialToStart[0]?.positivePercentage || 0;
        const earlierNegativePercentage =
          moodsListOfCompanyUsers[0].initialToStart[0]?.negativePercentage || 0;

        const data = moodsListOfCompanyUsers[0].startToEnd[0];

        const resData = {
          totalMoodsCount: data.positiveMoodCount + data.negativeMoodCount,
          totalPositiveMoodsCount: data.positiveMoodCount,
          totalNegativeMoodsCount: data.negativeMoodCount,
          percentageIncrement: {
            moodPercent: Math.abs(data.positivePercentage - earlierPositivePercentage),
            moodIncreased: data.positivePercentage > earlierPositivePercentage,
            moodPercentNegative: Math.abs(data.negativePercentage - earlierNegativePercentage),
            moodNegativeIncreased: data.negativePercentage > earlierNegativePercentage
          },
          averagePositiveMoodsPercentage: [
            {
              name: 'calm',
              value: data.positiveMoodPercentages.calm,
              label: 'Calm'
            },
            {
              name: 'happy',
              value: data.positiveMoodPercentages.happy,
              label: 'Happy'
            },
            {
              name: 'quiet',
              value: data.positiveMoodPercentages.quiet,
              label: 'Quiet'
            },
            {
              name: 'warm',
              value: data.positiveMoodPercentages.warm,
              label: 'Warm'
            },
            {
              name: 'peaceful',
              value: data.positiveMoodPercentages.peaceful,
              label: 'Peaceful'
            },
            {
              name: 'settled',
              value: data.positiveMoodPercentages.settled,
              label: 'Settled'
            },
            {
              name: 'atEase',
              value: data.positiveMoodPercentages.atEase,
              label: 'At Ease'
            },
            {
              name: 'inControl',
              value: data.positiveMoodPercentages.inControl,
              label: 'In Control'
            }
          ],
          averageNegativeMoodsPercentage: [
            {
              name: 'anxious',
              value: data.negativeMoodPercentages.anxious,
              label: 'Anxious'
            },
            {
              name: 'sad',
              value: data.negativeMoodPercentages.sad,
              label: 'Sad'
            },
            {
              name: 'noisy',
              value: data.negativeMoodPercentages.noisy,
              label: 'Noisy'
            },
            {
              name: 'cold',
              value: data.negativeMoodPercentages.cold,
              label: 'Cold'
            },
            {
              name: 'agitated',
              value: data.negativeMoodPercentages.agitated,
              label: 'Agitated'
            },
            {
              name: 'uneasy',
              value: data.negativeMoodPercentages.uneasy,
              label: 'Uneasy'
            },
            {
              name: 'worried',
              value: data.negativeMoodPercentages.worried,
              label: 'Worried'
            },
            {
              name: 'overwhelmed',
              value: data.negativeMoodPercentages.overwhelmed,
              label: 'Overwhelmed'
            }
          ],
          moodsPercentPositive: data.positivePercentage,
          moodsPercentNegative: data.negativePercentage,
          userCounts: data.uniqueUserCount
        };

        return Response.successResponseData(
          res,
          resData,
          SUCCESS,
          res.__('companyBeforeSleepListSuccess')
        );
      } else {
        const resData = {
          totalMoodsCount: 0,
          totalPositiveMoodsCount: 0,
          totalNegativeMoodsCount: 0,
          // moodCounts: {
          //   totalMoods: 0,
          //   totalPositiveMoods: 0,
          //   totalNegativeMoods: 0,
          //   _id: null,
          //   anxious: 0,
          //   calm: 0,
          //   sad: 0,
          //   happy: 0,
          //   noisy: 0,
          //   quiet: 0,
          //   cold: 0,
          //   warm: 0,
          //   agitated: 0,
          //   peaceful: 0,
          //   uneasy: 0,
          //   settled: 0,
          //   worried: 0,
          //   atEase: 0,
          //   overwhelmed: 0,
          //   inControl: 0
          // },
          percentageIncrement: {
            moodPercent: 0,
            moodIncreased: false
          },
          averagePositiveMoodsPercentage: [
            {
              name: 'calm',
              value: 0,
              label: 'Calm'
            },
            {
              name: 'happy',
              value: 0,
              label: 'Happy'
            },
            {
              name: 'quiet',
              value: 0,
              label: 'Quiet'
            },
            {
              name: 'warm',
              value: 0,
              label: 'Warm'
            },
            {
              name: 'peaceful',
              value: 0,
              label: 'Peaceful'
            },
            {
              name: 'settled',
              value: 0,
              label: 'Settled'
            },
            {
              name: 'atEase',
              value: 0,
              label: 'At Ease'
            },
            {
              name: 'inControl',
              value: 0,
              label: 'In Control'
            }
          ],
          averageNegativeMoodsPercentage: [
            {
              name: 'anxious',
              value: 0,
              label: 'Anxious'
            },
            {
              name: 'sad',
              value: 0,
              label: 'Sad'
            },
            {
              name: 'noisy',
              value: 0,
              label: 'Noisy'
            },
            {
              name: 'cold',
              value: 0,
              label: 'Cold'
            },
            {
              name: 'agitated',
              value: 0,
              label: 'Agitated'
            },
            {
              name: 'uneasy',
              value: 0,
              label: 'Uneasy'
            },
            {
              name: 'worried',
              value: 0,
              label: 'Worried'
            },
            {
              name: 'overwhelmed',
              value: 0,
              label: 'Overwhelmed'
            }
          ],
          moodsPercentPositive: 0,
          moodsPercentNegative: 0,
          userCounts: 0
        };
        return Response.successResponseData(res, resData, FAIL, res.__('noBeforeSleepLogsFound'));
      }
    } catch (error) {
      console.error(error);
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to get analytics of befoer sleep logs of users
   * @param {*} req
   * @param {*} res
   * @return {*}
   */

  getAfterSleepData: async (req, res) => {
    try {
      let { dataType, minAge, maxAge, department, startDate, endDate, country, ethnicity, gender } =
        req.query;
      const company_id = req.authCompanyId || req.query.company_id;
      if (!company_id) {
        return Response.errorResponseWithoutData(res, 'Company ID not found', FAIL);
      }

      // Define user filtering with company_id
      const userFiltering = { company_id };
      let noOfDays = 0;
      let initialDate;

      // calculate start date
      if (startDate && endDate) {
        noOfDays = getDaysDifference(startDate, endDate);
        initialDate = new Date(startDate);
        initialDate.setDate(initialDate.getDate() - noOfDays);
        endDate = new Date(endDate);
      } else {
        return Response.errorResponseWithoutData(res, 'Date range is missing', FAIL);
      }

      // if min and max age is provided
      if (minAge && maxAge) {
        //startBirthDate
        const startBirthDate = new Date();
        startBirthDate.setFullYear(startBirthDate.getFullYear() - maxAge - 1);
        startBirthDate.setHours(0, 0, 0, 0);
        //endBirthDate
        const endBirthDate = new Date();
        endBirthDate.setFullYear(endBirthDate.getFullYear() - minAge);
        endBirthDate.setHours(23, 59, 59, 999);
        userFiltering['date_of_birth'] = { $gte: startBirthDate, $lte: endBirthDate };
      }

      if (department) userFiltering['department'] = department;
      if (ethnicity) userFiltering['ethnicity'] = ethnicity;
      if (country) userFiltering['country'] = country;
      if (gender) userFiltering['gender'] = parseInt(gender);

      // fetch company users according to condition
      const companyUsers = await CompanyUsers.find(userFiltering, 'user_id').lean();
      let companyUserIdsList = companyUsers.map((user) => user.user_id);

      // fetch users data from users table
      const foundUsers = await Users.find(
        {
          _id: { $in: companyUserIdsList },
          user_type: 2,
          status: STATUS.ACTIVE
        },
        '_id'
      ).lean();
      let activeCompanyusers = foundUsers.map((user) => toObjectId(user._id));

      const startDateMinusOne = new Date(startDate);
      startDateMinusOne.setDate(startDateMinusOne.getDate() - 1);

      // Aggregation pipeline
      const moodsListOfCompanyUsers = await AfterSleep.aggregate([
        {
          $facet: {
            initialToStart: [
              {
                $match: {
                  user_id: { $in: activeCompanyusers },
                  createdAt: { $gte: initialDate, $lte: startDateMinusOne },
                  $or: [
                    { tossing_and_turning: { $ne: 0 } },
                    { light_sleep: { $ne: 0 } },
                    { nightmare: { $ne: 0 } },
                    { restless: { $ne: 0 } },
                    { sweaty: { $ne: 0 } },
                    { sleepwalking: { $ne: 0 } },
                    { snoring: { $ne: 0 } },
                    { need_more_sleep: { $ne: 0 } },
                    { nocturnal_eating: { $ne: 0 } },
                    { sleep_soundly: { $ne: 0 } },
                    { deep_sleep: { $ne: 0 } },
                    { lovely_dream: { $ne: 0 } },
                    { still: { $ne: 0 } },
                    { cool: { $ne: 0 } },
                    { staying_put: { $ne: 0 } },
                    { silent: { $ne: 0 } },
                    { rested: { $ne: 0 } },
                    { no_midnight_snacks: { $ne: 0 } }
                  ]
                }
              },
              {
                $group: {
                  _id: null,
                  averageTossingAndTurning: { $avg: '$tossing_and_turning' },
                  averageLightSleep: { $avg: '$light_sleep' },
                  averageNightmare: { $avg: '$nightmare' },
                  averageRestless: { $avg: '$restless' },
                  averageSweaty: { $avg: '$sweaty' },
                  averageSleepwalking: { $avg: '$sleepwalking' },
                  averageSnoring: { $avg: '$snoring' },
                  averageNeedMoreSleep: { $avg: '$need_more_sleep' },
                  averageNocturnalEating: { $avg: '$nocturnal_eating' },
                  averageSleepSoundly: { $avg: '$sleep_soundly' },
                  averageDeepSleep: { $avg: '$deep_sleep' },
                  averageLovelyDream: { $avg: '$lovely_dream' },
                  averageStill: { $avg: '$still' },
                  averageCool: { $avg: '$cool' },
                  averageStayingPut: { $avg: '$staying_put' },
                  averageSilent: { $avg: '$silent' },
                  averageRested: { $avg: '$rested' },
                  averageNoMidnightSnacks: { $avg: '$no_midnight_snacks' }
                }
              },
              {
                $project: {
                  _id: 0,
                  positiveMoods: {
                    averageSleepSoundly: { $round: [{ $ifNull: ['$averageSleepSoundly', 0] }, 2] },
                    averageDeepSleep: { $round: [{ $ifNull: ['$averageDeepSleep', 0] }, 2] },
                    averageLovelyDream: { $round: [{ $ifNull: ['$averageLovelyDream', 0] }, 2] },
                    averageStill: { $round: [{ $ifNull: ['$averageStill', 0] }, 2] },
                    averageCool: { $round: [{ $ifNull: ['$averageCool', 0] }, 2] },
                    averageStayingPut: { $round: [{ $ifNull: ['$averageStayingPut', 0] }, 2] },
                    averageSilent: { $round: [{ $ifNull: ['$averageSilent', 0] }, 2] },
                    averageRested: { $round: [{ $ifNull: ['$averageRested', 0] }, 2] },
                    averageNoMidnightSnacks: {
                      $round: [{ $ifNull: ['$averageNoMidnightSnacks', 0] }, 2]
                    }
                  },
                  negativeMoods: {
                    averageTossingAndTurning: {
                      $round: [{ $ifNull: ['$averageTossingAndTurning', 0] }, 2]
                    },
                    averageLightSleep: { $round: [{ $ifNull: ['$averageLightSleep', 0] }, 2] },
                    averageNightmare: { $round: [{ $ifNull: ['$averageNightmare', 0] }, 2] },
                    averageRestless: { $round: [{ $ifNull: ['$averageRestless', 0] }, 2] },
                    averageSweaty: { $round: [{ $ifNull: ['$averageSweaty', 0] }, 2] },
                    averageSleepwalking: { $round: [{ $ifNull: ['$averageSleepwalking', 0] }, 2] },
                    averageSnoring: { $round: [{ $ifNull: ['$averageSnoring', 0] }, 2] },
                    averageNeedMoreSleep: {
                      $round: [{ $ifNull: ['$averageNeedMoreSleep', 0] }, 2]
                    },
                    averageNocturnalEating: {
                      $round: [{ $ifNull: ['$averageNocturnalEating', 0] }, 2]
                    }
                  }
                }
              },
              {
                $project: {
                  totalPositiveMoods: {
                    $add: [
                      '$positiveMoods.averageSleepSoundly',
                      '$positiveMoods.averageDeepSleep',
                      '$positiveMoods.averageLovelyDream',
                      '$positiveMoods.averageStill',
                      '$positiveMoods.averageCool',
                      '$positiveMoods.averageStayingPut',
                      '$positiveMoods.averageSilent',
                      '$positiveMoods.averageRested',
                      '$positiveMoods.averageNoMidnightSnacks'
                    ]
                  },
                  totalNegativeMoods: {
                    $add: [
                      '$negativeMoods.averageTossingAndTurning',
                      '$negativeMoods.averageLightSleep',
                      '$negativeMoods.averageNightmare',
                      '$negativeMoods.averageRestless',
                      '$negativeMoods.averageSweaty',
                      '$negativeMoods.averageSleepwalking',
                      '$negativeMoods.averageSnoring',
                      '$negativeMoods.averageNeedMoreSleep',
                      '$negativeMoods.averageNocturnalEating'
                    ]
                  }
                }
              },
              {
                $project: {
                  positivePercentage: {
                    $cond: {
                      if: { $eq: [{ $add: ['$totalPositiveMoods', '$totalNegativeMoods'] }, 0] },
                      then: 0,
                      else: {
                        $round: [
                          {
                            $multiply: [
                              {
                                $divide: [
                                  '$totalPositiveMoods',
                                  { $add: ['$totalPositiveMoods', '$totalNegativeMoods'] }
                                ]
                              },
                              100
                            ]
                          },
                          2
                        ]
                      }
                    }
                  },
                  negativePercentage: {
                    $cond: {
                      if: { $eq: [{ $add: ['$totalPositiveMoods', '$totalNegativeMoods'] }, 0] },
                      then: 0,
                      else: {
                        $round: [
                          {
                            $multiply: [
                              {
                                $divide: [
                                  '$totalNegativeMoods',
                                  { $add: ['$totalPositiveMoods', '$totalNegativeMoods'] }
                                ]
                              },
                              100
                            ]
                          },
                          2
                        ]
                      }
                    }
                  }
                }
              }
            ],
            startToEnd: [
              {
                $match: {
                  user_id: { $in: activeCompanyusers },
                  createdAt: { $gte: new Date(startDate), $lte: endDate },
                  $or: [
                    { tossing_and_turning: { $ne: 0 } },
                    { light_sleep: { $ne: 0 } },
                    { nightmare: { $ne: 0 } },
                    { restless: { $ne: 0 } },
                    { sweaty: { $ne: 0 } },
                    { sleepwalking: { $ne: 0 } },
                    { snoring: { $ne: 0 } },
                    { need_more_sleep: { $ne: 0 } },
                    { nocturnal_eating: { $ne: 0 } },
                    { sleep_soundly: { $ne: 0 } },
                    { deep_sleep: { $ne: 0 } },
                    { lovely_dream: { $ne: 0 } },
                    { still: { $ne: 0 } },
                    { cool: { $ne: 0 } },
                    { staying_put: { $ne: 0 } },
                    { silent: { $ne: 0 } },
                    { rested: { $ne: 0 } },
                    { no_midnight_snacks: { $ne: 0 } }
                  ]
                }
              },
              {
                $addFields: {
                  positiveMoodCount: {
                    $sum: [
                      { $cond: [{ $ne: ['$sleep_soundly', 0] }, 1, 0] },
                      { $cond: [{ $ne: ['$deep_sleep', 0] }, 1, 0] },
                      { $cond: [{ $ne: ['$lovely_dream', 0] }, 1, 0] },
                      { $cond: [{ $ne: ['$still', 0] }, 1, 0] },
                      { $cond: [{ $ne: ['$cool', 0] }, 1, 0] },
                      { $cond: [{ $ne: ['$staying_put', 0] }, 1, 0] },
                      { $cond: [{ $ne: ['$silent', 0] }, 1, 0] },
                      { $cond: [{ $ne: ['$rested', 0] }, 1, 0] },
                      { $cond: [{ $ne: ['$no_midnight_snacks', 0] }, 1, 0] }
                    ]
                  },
                  negativeMoodCount: {
                    $sum: [
                      { $cond: [{ $ne: ['$tossing_and_turning', 0] }, 1, 0] },
                      { $cond: [{ $ne: ['$light_sleep', 0] }, 1, 0] },
                      { $cond: [{ $ne: ['$nightmare', 0] }, 1, 0] },
                      { $cond: [{ $ne: ['$restless', 0] }, 1, 0] },
                      { $cond: [{ $ne: ['$sweaty', 0] }, 1, 0] },
                      { $cond: [{ $ne: ['$sleepwalking', 0] }, 1, 0] },
                      { $cond: [{ $ne: ['$snoring', 0] }, 1, 0] },
                      { $cond: [{ $ne: ['$need_more_sleep', 0] }, 1, 0] },
                      { $cond: [{ $ne: ['$nocturnal_eating', 0] }, 1, 0] }
                    ]
                  }
                }
              },
              {
                $group: {
                  _id: '$user_id',
                  averageTossingAndTurning: { $avg: '$tossing_and_turning' },
                  averageLightSleep: { $avg: '$light_sleep' },
                  averageNightmare: { $avg: '$nightmare' },
                  averageRestless: { $avg: '$restless' },
                  averageSweaty: { $avg: '$sweaty' },
                  averageSleepwalking: { $avg: '$sleepwalking' },
                  averageSnoring: { $avg: '$snoring' },
                  averageNeedMoreSleep: { $avg: '$need_more_sleep' },
                  averageNocturnalEating: { $avg: '$nocturnal_eating' },
                  averageSleepSoundly: { $avg: '$sleep_soundly' },
                  averageDeepSleep: { $avg: '$deep_sleep' },
                  averageLovelyDream: { $avg: '$lovely_dream' },
                  averageStill: { $avg: '$still' },
                  averageCool: { $avg: '$cool' },
                  averageStayingPut: { $avg: '$staying_put' },
                  averageSilent: { $avg: '$silent' },
                  averageRested: { $avg: '$rested' },
                  averageNoMidnightSnacks: { $avg: '$no_midnight_snacks' },
                  positiveMoodCount: { $sum: '$positiveMoodCount' },
                  negativeMoodCount: { $sum: '$negativeMoodCount' }
                }
              },
              {
                $group: {
                  _id: null,
                  overallAverageTossingAndTurning: { $avg: '$averageTossingAndTurning' },
                  overallAverageLightSleep: { $avg: '$averageLightSleep' },
                  overallAverageNightmare: { $avg: '$averageNightmare' },
                  overallAverageRestless: { $avg: '$averageRestless' },
                  overallAverageSweaty: { $avg: '$averageSweaty' },
                  overallAverageSleepwalking: { $avg: '$averageSleepwalking' },
                  overallAverageSnoring: { $avg: '$averageSnoring' },
                  overallAverageNeedMoreSleep: { $avg: '$averageNeedMoreSleep' },
                  overallAverageNocturnalEating: { $avg: '$averageNocturnalEating' },
                  overallAverageSleepSoundly: { $avg: '$averageSleepSoundly' },
                  overallAverageDeepSleep: { $avg: '$averageDeepSleep' },
                  overallAverageLovelyDream: { $avg: '$averageLovelyDream' },
                  overallAverageStill: { $avg: '$averageStill' },
                  overallAverageCool: { $avg: '$averageCool' },
                  overallAverageStayingPut: { $avg: '$averageStayingPut' },
                  overallAverageSilent: { $avg: '$averageSilent' },
                  overallAverageRested: { $avg: '$averageRested' },
                  overallAverageNoMidnightSnacks: { $avg: '$averageNoMidnightSnacks' },
                  positiveMoodCount: { $sum: '$positiveMoodCount' },
                  negativeMoodCount: { $sum: '$negativeMoodCount' },
                  uniqueUserCount: { $sum: 1 }
                }
              },
              {
                $project: {
                  _id: 0,
                  positiveMoodCount: 1,
                  negativeMoodCount: 1,
                  uniqueUserCount: 1,
                  positiveMoods: {
                    sleepSoundly: { $round: [{ $ifNull: ['$overallAverageSleepSoundly', 0] }, 2] },
                    deepSleep: { $round: [{ $ifNull: ['$overallAverageDeepSleep', 0] }, 2] },
                    lovelyDream: { $round: [{ $ifNull: ['$overallAverageLovelyDream', 0] }, 2] },
                    still: { $round: [{ $ifNull: ['$overallAverageStill', 0] }, 2] },
                    cool: { $round: [{ $ifNull: ['$overallAverageCool', 0] }, 2] },
                    stayingPut: { $round: [{ $ifNull: ['$overallAverageStayingPut', 0] }, 2] },
                    silent: { $round: [{ $ifNull: ['$overallAverageSilent', 0] }, 2] },
                    rested: { $round: [{ $ifNull: ['$overallAverageRested', 0] }, 2] },
                    noMidnightSnacks: {
                      $round: [{ $ifNull: ['$overallAverageNoMidnightSnacks', 0] }, 2]
                    }
                  },
                  negativeMoods: {
                    tossingAndTurning: {
                      $round: [{ $ifNull: ['$overallAverageTossingAndTurning', 0] }, 2]
                    },
                    lightSleep: { $round: [{ $ifNull: ['$overallAverageLightSleep', 0] }, 2] },
                    nightmare: { $round: [{ $ifNull: ['$overallAverageNightmare', 0] }, 2] },
                    restless: { $round: [{ $ifNull: ['$overallAverageRestless', 0] }, 2] },
                    sweaty: { $round: [{ $ifNull: ['$overallAverageSweaty', 0] }, 2] },
                    sleepwalking: { $round: [{ $ifNull: ['$overallAverageSleepwalking', 0] }, 2] },
                    snoring: { $round: [{ $ifNull: ['$overallAverageSnoring', 0] }, 2] },
                    needMoreSleep: {
                      $round: [{ $ifNull: ['$overallAverageNeedMoreSleep', 0] }, 2]
                    },
                    nocturnalEating: {
                      $round: [{ $ifNull: ['$overallAverageNocturnalEating', 0] }, 2]
                    }
                  }
                }
              },
              {
                $project: {
                  positiveMoodCount: 1,
                  negativeMoodCount: 1,
                  uniqueUserCount: 1,
                  positiveMoods: 1,
                  negativeMoods: 1,
                  totalPositiveMoods: {
                    $add: [
                      '$positiveMoods.sleepSoundly',
                      '$positiveMoods.deepSleep',
                      '$positiveMoods.lovelyDream',
                      '$positiveMoods.still',
                      '$positiveMoods.cool',
                      '$positiveMoods.stayingPut',
                      '$positiveMoods.silent',
                      '$positiveMoods.rested',
                      '$positiveMoods.noMidnightSnacks'
                    ]
                  },
                  totalNegativeMoods: {
                    $add: [
                      '$negativeMoods.tossingAndTurning',
                      '$negativeMoods.lightSleep',
                      '$negativeMoods.nightmare',
                      '$negativeMoods.restless',
                      '$negativeMoods.sweaty',
                      '$negativeMoods.sleepwalking',
                      '$negativeMoods.snoring',
                      '$negativeMoods.needMoreSleep',
                      '$negativeMoods.nocturnalEating'
                    ]
                  }
                }
              },
              {
                $project: {
                  positiveMoodCount: 1,
                  negativeMoodCount: 1,
                  uniqueUserCount: 1,
                  positivePercentage: {
                    $cond: {
                      if: { $eq: [{ $add: ['$totalPositiveMoods', '$totalNegativeMoods'] }, 0] },
                      then: 0,
                      else: {
                        $round: [
                          {
                            $multiply: [
                              {
                                $divide: [
                                  '$totalPositiveMoods',
                                  { $add: ['$totalPositiveMoods', '$totalNegativeMoods'] }
                                ]
                              },
                              100
                            ]
                          },
                          1
                        ]
                      }
                    }
                  },
                  negativePercentage: {
                    $cond: {
                      if: { $eq: [{ $add: ['$totalPositiveMoods', '$totalNegativeMoods'] }, 0] },
                      then: 0,
                      else: {
                        $round: [
                          {
                            $multiply: [
                              {
                                $divide: [
                                  '$totalNegativeMoods',
                                  { $add: ['$totalPositiveMoods', '$totalNegativeMoods'] }
                                ]
                              },
                              100
                            ]
                          },
                          1
                        ]
                      }
                    }
                  },
                  positiveMoodPercentages: {
                    sleepSoundly: {
                      $round: [
                        { $multiply: [{ $divide: ['$positiveMoods.sleepSoundly', 5] }, 100] },
                        2
                      ]
                    },
                    deepSleep: {
                      $round: [
                        { $multiply: [{ $divide: ['$positiveMoods.deepSleep', 5] }, 100] },
                        2
                      ]
                    },
                    lovelyDream: {
                      $round: [
                        { $multiply: [{ $divide: ['$positiveMoods.lovelyDream', 5] }, 100] },
                        2
                      ]
                    },
                    still: {
                      $round: [{ $multiply: [{ $divide: ['$positiveMoods.still', 5] }, 100] }, 2]
                    },
                    cool: {
                      $round: [{ $multiply: [{ $divide: ['$positiveMoods.cool', 5] }, 100] }, 2]
                    },
                    stayingPut: {
                      $round: [
                        { $multiply: [{ $divide: ['$positiveMoods.stayingPut', 5] }, 100] },
                        2
                      ]
                    },
                    silent: {
                      $round: [{ $multiply: [{ $divide: ['$positiveMoods.silent', 5] }, 100] }, 2]
                    },
                    rested: {
                      $round: [{ $multiply: [{ $divide: ['$positiveMoods.rested', 5] }, 100] }, 2]
                    },
                    noMidnightSnacks: {
                      $round: [
                        { $multiply: [{ $divide: ['$positiveMoods.noMidnightSnacks', 5] }, 100] },
                        2
                      ]
                    }
                  },
                  negativeMoodPercentages: {
                    tossingAndTurning: {
                      $round: [
                        { $multiply: [{ $divide: ['$negativeMoods.tossingAndTurning', 5] }, 100] },
                        2
                      ]
                    },
                    lightSleep: {
                      $round: [
                        { $multiply: [{ $divide: ['$negativeMoods.lightSleep', 5] }, 100] },
                        2
                      ]
                    },
                    nightmare: {
                      $round: [
                        { $multiply: [{ $divide: ['$negativeMoods.nightmare', 5] }, 100] },
                        2
                      ]
                    },
                    restless: {
                      $round: [{ $multiply: [{ $divide: ['$negativeMoods.restless', 5] }, 100] }, 2]
                    },
                    sweaty: {
                      $round: [{ $multiply: [{ $divide: ['$negativeMoods.sweaty', 5] }, 100] }, 2]
                    },
                    sleepwalking: {
                      $round: [
                        { $multiply: [{ $divide: ['$negativeMoods.sleepwalking', 5] }, 100] },
                        2
                      ]
                    },
                    snoring: {
                      $round: [{ $multiply: [{ $divide: ['$negativeMoods.snoring', 5] }, 100] }, 2]
                    },
                    needMoreSleep: {
                      $round: [
                        { $multiply: [{ $divide: ['$negativeMoods.needMoreSleep', 5] }, 100] },
                        2
                      ]
                    },
                    nocturnalEating: {
                      $round: [
                        { $multiply: [{ $divide: ['$negativeMoods.nocturnalEating', 5] }, 100] },
                        2
                      ]
                    }
                  }
                }
              }
            ]
          }
        }
      ]);

      if (moodsListOfCompanyUsers[0].startToEnd.length) {
        const earlierPositivePercentage =
          moodsListOfCompanyUsers[0].initialToStart[0]?.positivePercentage || 0;
        const earlierNegativePercentage =
          moodsListOfCompanyUsers[0].initialToStart[0]?.negativePercentage || 0;

        const data = moodsListOfCompanyUsers[0].startToEnd[0];

        const resData = {
          totalMoodsCount: data.positiveMoodCount + data.negativeMoodCount,
          totalPositiveMoodsCount: data.positiveMoodCount,
          totalNegativeMoodsCount: data.negativeMoodCount,
          percentageIncrement: {
            moodPercent: Math.abs(data.positivePercentage - earlierPositivePercentage),
            moodIncreased: data.positivePercentage > earlierPositivePercentage,
            moodPercentNegative: Math.abs(data.negativePercentage - earlierNegativePercentage),
            moodNegativeIncreased: data.negativePercentage > earlierNegativePercentage
          },
          averagePositiveMoodsPercentage: [
            {
              name: 'sleepSoundly',
              value: data.positiveMoodPercentages.sleepSoundly,
              label: 'Sleep Soundly'
            },
            {
              name: 'deepSleep',
              value: data.positiveMoodPercentages.deepSleep,
              label: 'Deep Sleep'
            },
            {
              name: 'lovelyDream',
              value: data.positiveMoodPercentages.lovelyDream,
              label: 'Lovely Dream'
            },
            {
              name: 'still',
              value: data.positiveMoodPercentages.still,
              label: 'Still'
            },
            {
              name: 'cool',
              value: data.positiveMoodPercentages.cool,
              label: 'Cool'
            },
            {
              name: 'stayingPut',
              value: data.positiveMoodPercentages.stayingPut,
              label: 'Staying Put'
            },
            {
              name: 'silent',
              value: data.positiveMoodPercentages.silent,
              label: 'Silent'
            },
            {
              name: 'rested',
              value: data.positiveMoodPercentages.rested,
              label: 'Rested'
            },
            {
              name: 'noMidnightSnacks',
              value: data.positiveMoodPercentages.noMidnightSnacks,
              label: 'No Midnight Snacks'
            }
          ],
          averageNegativeMoodsPercentage: [
            {
              name: 'tossingTurning',
              value: data.negativeMoodPercentages.tossingTurning,
              label: 'Tossing & Turning'
            },
            {
              name: 'lightSleep',
              value: data.negativeMoodPercentages.lightSleep,
              label: 'Light Sleep'
            },
            {
              name: 'lovelyDream',
              value: data.negativeMoodPercentages.lovelyDream,
              label: 'Lovely Dream'
            },
            {
              name: 'restless',
              value: data.negativeMoodPercentages.restless,
              label: 'Restless'
            },
            {
              name: 'sweaty',
              value: data.negativeMoodPercentages.sweaty,
              label: 'Sweaty'
            },
            {
              name: 'sleepwalking',
              value: data.negativeMoodPercentages.sleepwalking,
              label: 'Sleepwalking'
            },
            {
              name: 'snoring',
              value: data.negativeMoodPercentages.snoring,
              label: 'Snoring'
            },
            {
              name: 'needMoreSleep',
              value: data.negativeMoodPercentages.needMoreSleep,
              label: 'Need More Sleep'
            },
            {
              name: 'nocturnalEating',
              value: data.negativeMoodPercentages.nocturnalEating,
              label: 'Nocturnal Eating'
            }
          ],
          moodsPercentPositive: data.positivePercentage,
          moodsPercentNegative: data.negativePercentage,
          userCounts: data.uniqueUserCount
        };

        return Response.successResponseData(
          res,
          resData,
          SUCCESS,
          res.__('companyAfterSleepListSuccess')
        );
      } else {
        const resData = {
          totalMoodsCount: 0,
          totalPositiveMoodsCount: 0,
          totalNegativeMoodsCount: 0,
          // moodCounts: {
          //   totalMoods: 0,
          //   totalPositiveMoods: 0,
          //   totalNegativeMoods: 0,
          //   _id: null,
          //   tossingTurning: 0,
          //   sleepSoundly: 0,
          //   lightSleep: 0,
          //   deepSleep: 0,
          //   nightmare: 0,
          //   lovelyDream: 0,
          //   restless: 0,
          //   still: 0,
          //   sweaty: 0,
          //   cool: 0,
          //   sleepwalking: 0,
          //   stayingPut: 0,
          //   snoring: 0,
          //   silent: 0,
          //   needMoreSleep: 0,
          //   rested: 0,
          //   nocturnalEating: 0,
          //   noMidnightSnacks: 0
          // },
          percentageIncrement: {
            moodPercent: 0,
            moodIncreased: false
          },
          averagePositiveMoodsPercentage: [
            {
              name: 'sleepSoundly',
              value: 0,
              label: 'Sleep Soundly'
            },
            {
              name: 'deepSleep',
              value: 0,
              label: 'Deep Sleep'
            },
            {
              name: 'lovelyDream',
              value: 0,
              label: 'Lovely Dream'
            },
            {
              name: 'still',
              value: 0,
              label: 'Still'
            },
            {
              name: 'cool',
              value: 0,
              label: 'Cool'
            },
            {
              name: 'stayingPut',
              value: 0,
              label: 'Staying Put'
            },
            {
              name: 'silent',
              value: 0,
              label: 'Silent'
            },
            {
              name: 'rested',
              value: 0,
              label: 'Rested'
            },
            {
              name: 'noMidnightSnacks',
              value: 0,
              label: 'No Midnight Snacks'
            }
          ],
          averageNegativeMoodsPercentage: [
            {
              name: 'tossingTurning',
              value: 0,
              label: 'Tossing & Turning'
            },
            {
              name: 'lightSleep',
              value: 0,
              label: 'Light Sleep'
            },
            {
              name: 'nightmare',
              value: 0,
              label: 'Nightmare'
            },
            {
              name: 'restless',
              value: 0,
              label: 'Restless'
            },
            {
              name: 'sweaty',
              value: 0,
              label: 'Sweaty'
            },
            {
              name: 'sleepwalking',
              value: 0,
              label: 'Sleepwalking'
            },
            {
              name: 'snoring',
              value: 0,
              label: 'Snoring'
            },
            {
              name: 'needMoreSleep',
              value: 0,
              label: 'Need More Sleep'
            },
            {
              name: 'nocturnalEating',
              value: 0,
              label: 'Nocturnal Eating'
            }
          ],
          moodsPercentPositive: 0,
          moodsPercentNegative: 0,
          userCounts: 0
        };
        return Response.successResponseData(res, resData, FAIL, res.__('noAfterSleepLogsFound'));
      }
    } catch (error) {
      console.error(error);
      return Response.internalServerErrorResponse(res);
    }
  },

  addSleepReport: async (req, res) => {
    try {
      let { afterSleepData, beforeSleepData, graphName, department, startDate, endDate, moodType } =
        req.body;

      let newReport = {
        graph_name: graphName,
        department: department,
        company_id: req.authCompanyId
      };

      // moodType 1 for before sleep report
      if (moodType == 1) {
        const locals = {
          name: req.companyName,
          graphName: graphName,
          data: beforeSleepData,
          department: department ? `(${department})` : null,

          fromDate: new Date(startDate).toLocaleDateString('en-gb', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          }),
          toDate: new Date(endDate).toLocaleDateString('en-gb', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          }),
          happySmallIcon: process.env.PDF_HAPPY_SMALL_ICON,
          sadSmallIcon: process.env.PDF_SAD_SMALL_ICON,
          finalIcon: process.env.PDF_HAPPY_ICON,
          finalIconText: '',
          finalMessage:
            SHURU_REPORT_MESSAGES[Math.floor(Math.random() * SHURU_REPORT_MESSAGES.length)]
        };
        switch (true) {
          case beforeSleepData.moodsPercentPositive > beforeSleepData.moodsPercentNegative:
            locals.finalIcon = process.env.PDF_HAPPY_ICON;
            locals.finalIconText = 'Positive';
            switch (true) {
              case beforeSleepData.moodsPercentPositive < 30:
                locals.finalMessage = MOOD_REPORT_POSITIVE_MESSGE.LESS_THEN_30;
                break;
              case beforeSleepData.moodsPercentPositive >= 30 &&
                beforeSleepData.moodsPercentPositive < 60:
                locals.finalMessage = MOOD_REPORT_POSITIVE_MESSGE.THIRTY_TO_SIXTY;
                break;
              case beforeSleepData.moodsPercentPositive >= 60:
                locals.finalMessage = MOOD_REPORT_POSITIVE_MESSGE.SIXTY_TO_100;
                break;
            }
            break;
          case beforeSleepData.moodsPercentPositive < beforeSleepData.moodsPercentNegative:
            locals.finalIcon = process.env.PDF_SAD_ICON;
            locals.finalIconText = 'Negative';
            switch (true) {
              case beforeSleepData.moodsPercentNegative < 30:
                locals.finalMessage = MOOD_REPORT_NEGATIVE_MESSGE.LESS_THEN_30;
                break;
              case beforeSleepData.moodsPercentNegative >= 30 &&
                beforeSleepData.moodsPercentNegative < 70:
                locals.finalMessage = MOOD_REPORT_NEGATIVE_MESSGE.THIRTY_TO_SEVENTY;
                break;
              case beforeSleepData.moodsPercentNegative >= 70 &&
                beforeSleepData.moodsPercentNegative < 90:
                locals.finalMessage = MOOD_REPORT_NEGATIVE_MESSGE.SEVENTY_TO_90;
                break;
              case beforeSleepData.moodsPercentNegative >= 90:
                locals.finalMessage = MOOD_REPORT_NEGATIVE_MESSGE.MORE_THEN_NINETY;
                break;
            }
            break;
          case beforeSleepData.moodsPercentPositive === beforeSleepData.moodsPercentNegative:
            locals.finalIcon = process.env.PDF_NEUTRAL_ICON;
            locals.finalIconText = 'Neutral';
            locals.finalMessage = MOOD_REPORT_NEUTRAL_MESSAGE;
            break;
        }

        const compiledFunction = pug.compileFile('src/views/before-sleep-report.pug');
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

        await Reports.create({ ...newReport, pdf_data: pdf });

        return res.send(pdf);
      }
      // moodType 2 for after sleep report
      else if (moodType == 2) {
        const locals = {
          name: req.companyName,
          graphName: graphName,
          data: afterSleepData,
          department: department ? `(${department})` : null,

          fromDate: new Date(startDate).toLocaleDateString('en-gb', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          }),
          toDate: new Date(endDate).toLocaleDateString('en-gb', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          }),
          happySmallIcon: process.env.PDF_HAPPY_SMALL_ICON,
          sadSmallIcon: process.env.PDF_SAD_SMALL_ICON,
          finalIcon: process.env.PDF_HAPPY_ICON,
          finalIconText: '',
          finalMessage:
            SHURU_REPORT_MESSAGES[Math.floor(Math.random() * SHURU_REPORT_MESSAGES.length)]
        };
        switch (true) {
          case afterSleepData.moodsPercentPositive > afterSleepData.moodsPercentNegative:
            locals.finalIcon = process.env.PDF_HAPPY_ICON;
            locals.finalIconText = 'Positive';
            switch (true) {
              case afterSleepData.moodsPercentPositive < 30:
                locals.finalMessage = MOOD_REPORT_POSITIVE_MESSGE.LESS_THEN_30;
                break;
              case afterSleepData.moodsPercentPositive >= 30 &&
                afterSleepData.moodsPercentPositive < 60:
                locals.finalMessage = MOOD_REPORT_POSITIVE_MESSGE.THIRTY_TO_SIXTY;
                break;
              case afterSleepData.moodsPercentPositive >= 60:
                locals.finalMessage = MOOD_REPORT_POSITIVE_MESSGE.SIXTY_TO_100;
                break;
            }
            break;
          case afterSleepData.moodsPercentPositive < afterSleepData.moodsPercentNegative:
            locals.finalIcon = process.env.PDF_SAD_ICON;
            locals.finalIconText = 'Negative';
            switch (true) {
              case afterSleepData.moodsPercentNegative < 30:
                locals.finalMessage = MOOD_REPORT_NEGATIVE_MESSGE.LESS_THEN_30;
                break;
              case afterSleepData.moodsPercentNegative >= 30 &&
                afterSleepData.moodsPercentNegative < 70:
                locals.finalMessage = MOOD_REPORT_NEGATIVE_MESSGE.THIRTY_TO_SEVENTY;
                break;
              case afterSleepData.moodsPercentNegative >= 70 &&
                afterSleepData.moodsPercentNegative < 90:
                locals.finalMessage = MOOD_REPORT_NEGATIVE_MESSGE.SEVENTY_TO_90;
                break;
              case afterSleepData.moodsPercentNegative >= 90:
                locals.finalMessage = MOOD_REPORT_NEGATIVE_MESSGE.MORE_THEN_NINETY;
                break;
            }
            break;
          case afterSleepData.moodsPercentPositive === afterSleepData.moodsPercentNegative:
            locals.finalIcon = process.env.PDF_NEUTRAL_ICON;
            locals.finalIconText = 'Neutral';
            locals.finalMessage = MOOD_REPORT_NEUTRAL_MESSAGE;
            break;
        }

        const compiledFunction = pug.compileFile('src/views/after-sleep-report.pug');
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

        await Reports.create({ ...newReport, pdf_data: pdf });

        return res.send(pdf);
      }
    } catch (error) {
      console.error('Error in adding/updating report:', error);
      return Response.internalServerErrorResponse(res);
    }
  },

  getBreathworkInsights: async (req, res) => {
    try {
      let { minAge, maxAge, department, startDate, endDate, country, ethnicity, gender } =
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
      const foundUsers = await Users.find(userFiltering, { _id: 1 });
      let users = [];
      foundUsers.forEach((user) => {
        users.push({
          user_id: user._id
        });
      });
      const uniqueValues = new Set([...users, ...companyUsers]);
      const uniqueUsers = [...uniqueValues];
      const userIds = uniqueUsers.map((user) => user.user_id);

      const filterCondition = {
        content_type: CONTENT_TYPE.BREATHWORK,
        user_id: { $in: userIds },
        deletedAt: null
      };

      let sessions = await RecentlyPlayed.find(filterCondition).countDocuments();
      let usersBreathworks = await BreathworkInterest.find({ user_id: { $in: userIds } });
      let duration = 0;
      if (usersBreathworks.length) {
        for (const i of usersBreathworks) {
          duration += i.sessions_durations;
        }
      }

      let resObj = {
        sessions,
        duration
      };

      return Response.successResponseData(
        res,
        resObj,
        SUCCESS,
        res.__('breathworkInsightsSuccess')
      );
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  addReportBreathworkB2B: async (req, res) => {
    try {
      let { reportData, startDate, graphName, department, endDate } = req.body;

      let newReport = {
        graph_name: graphName,
        department: department,
        company_id: req.authCompanyId
      };

      const breathworkMessage = getRandomItem(BREATHWORK_NOTIFICATION_MESSAGE);
      const breathworkMessage2 = getRandomItem(BREATHWORK_NOTIFICATION_MESSAGE);

      const locals = {
        name: 'Shoorah',
        graphName: 'Breathwork Report',
        reportData: reportData,
        breathworkMessage,
        breathworkMessage2,
        fromDate: new Date(startDate).toLocaleDateString('en-gb', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }),
        // toDate: new Date(endDate).toLocaleDateString('en-gb', {
        //   year: 'numeric',
        //   month: 'short',
        //   day: 'numeric'
        // }),
        happySmallIcon: process.env.PDF_HAPPY_SMALL_ICON,
        sadSmallIcon: process.env.PDF_SAD_SMALL_ICON,
        finalIcon: process.env.PDF_HAPPY_ICON,
        finalIconText: '',
        finalMessage:
          SHURU_REPORT_MESSAGES[Math.floor(Math.random() * SHURU_REPORT_MESSAGES.length)]
      };

      const compiledFunction = pug.compileFile('src/views/breathwork-report.pug');
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

      await Reports.create({ ...newReport, pdf_data: pdf });

      return res.send(pdf);
    } catch (error) {
      console.error('Error in adding/updating report:', error);
      return Response.internalServerErrorResponse(res);
    }
  }
};
