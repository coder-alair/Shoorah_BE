/* eslint-disable camelcase */
'use strict';

const {
  Users,
  Mood,
} = require('@models');
const { default: mongoose } = require('mongoose');
const Response = require('@services/Response');
const OpenAI = require('openai');

const {
  USER_TYPE,
  ACCOUNT_STATUS,
  PAGE,
  PER_PAGE,
  SUCCESS,
  FAIL,
  CONTENT_STATUS,
  REPORT_TYPE,
  CLOUDFRONT_URL,
  USER_MEDIA_PATH,
  STATUS,
  ACCOUNT_TYPE
} = require('@services/Constant');
const {
  toObjectId,
  currentDateOnly,
  getFirstDayOfWeek,
  getFirstDayOfMonth
} = require('@services/Helper');
const { getUploadURL, removeOldImage } = require('@services/s3Services');

const {
  makeRandomDigit,
  makeRandomString,
  convertObjectKeysToCamelCase,
  unixTimeStamp,
  addEditKlaviyoUser,
  calculatePercentage
} = require('../../../services/Helper');
const { sendPassword, sendB2BPassword, sendPartnerPassword } = require('../../../services/Mailer');
const { RESPONSE_CODE, MAIL_SUBJECT, SHOORAH_NOTIFICATION_MESSAGES } = require('../../../services/Constant');
const { Company, Cleanse, UserNotes, Goals, UserGratitude, UserAffirmation, Conversation } = require('../../../models');
const ProfessionalMood = require('../../../models/ProfessionalMood');
const openai = new OpenAI(process.env.OPENAI_API_KEY);


const getPersonalMoodsData = async (company_id, reportDate) => {
  try {
    let userFiltering = { company_id };
    let startDate = new Date(reportDate);
    let endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    const foundUsers = await Users.find(
      { ...userFiltering, user_type: 2, deletedAt: null },
      { _id: 1 }
    );
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
        moodsText,
        moodPercentage,
        totalMoodsCollected: aggregationPromise[0].totalMoods,
        totalPositiveMoods: aggregationPromise[0].totalPositiveMoods,
        totalNegativeMoods: aggregationPromise[0].totalNegativeMoods,
        totalAnxiousCount: aggregationPromise[0].anxious,
        totalCalmCount: aggregationPromise[0].calm,
        totalNeedSupportCount: aggregationPromise[0].needSupport,
        totalDemotivatedCount: aggregationPromise[0].demotivated,
        totalMotivatedCount: aggregationPromise[0].motivated,
        totalLowCount: aggregationPromise[0].low,
        totalContentCount: aggregationPromise[0].content,
        totalAngryCount: aggregationPromise[0].angry,
        totalHappyCount: aggregationPromise[0].happy,
        totalICanManageCount: aggregationPromise[0].iCanManage,
        totalHelplessCount: aggregationPromise[0].helpless,
        totalIAmInControlCount: aggregationPromise[0].iAmInControl,
        totalTiredCount: aggregationPromise[0].tired,
        totalStressedCount: aggregationPromise[0].stressed,
        totalBalancedCount: aggregationPromise[0].balanced,
        totalEnergisedCount: aggregationPromise[0].energised,
        totalSadCount: aggregationPromise[0].sad,
        totalRelaxedCount: aggregationPromise[0].relaxed,
        totalGreatCount: aggregationPromise[0].great,
        totalNotGoodCount: aggregationPromise[0].notGood,
      };

      return data;
    } else {
      const resData = {
        moodsText: 'Positive',
        moodPercentage: 0,
        totalMoodsCollected: 0,
        totalPositiveMoods: 0,
        totalNegativeMoods: 0,
        totalAnxiousCount: 0,
        totalCalmCount: 0,
        totalNeedSupportCount: 0,
        totalDemotivatedCount: 0,
        totalMotivatedCount: 0,
        totalLowCount: 0,
        totalContentCount: 0,
        totalAngryCount: 0,
        totalHappyCount: 0,
        totalICanManageCount: 0,
        totalHelplessCount: 0,
        totalIAmInControlCount: 0,
        totalTiredCount: 0,
        totalStressedCount: 0,
        totalBalancedCount: 0,
        totalEnergisedCount: 0,
        totalSadCount: 0,
        totalRelaxedCount: 0,
        totalGreatCount: 0,
        totalNotGoodCount: 0,
      };
      return resData;
    }
  } catch (error) {
    console.error(error);
  }
};

const getProfessionalMoodsData = async (company_id, reportDate) => {
  try {
    let userFiltering = { company_id };
    let startDate = new Date(reportDate);
    let endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    const foundUsers = await Users.find(
      { ...userFiltering, user_type: 2, deletedAt: null },
      { _id: 1 }
    );
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
        moodsText,
        dissatisfied: aggregationPromise[0].dissatisfied,
        unpleasant: aggregationPromise[0].unpleasant,
        overwhelming: aggregationPromise[0].overwhelming,
        poor: aggregationPromise[0].poor,
        unmanageable: aggregationPromise[0].unmanageable,
        lacking: aggregationPromise[0].lacking,
        negative: aggregationPromise[0].negative,
        unsupported: aggregationPromise[0].unsupported,
        insufficient: aggregationPromise[0].insufficient,
        inadequate: aggregationPromise[0].inadequate,
        positive: aggregationPromise[0].positive,
        verySatisfied: aggregationPromise[0].verySatisfied,
        comfortable: aggregationPromise[0].comfortable,
        supportive: aggregationPromise[0].supportive,
        manageable: aggregationPromise[0].manageable,
        excellent: aggregationPromise[0].excellent,
        inclusive: aggregationPromise[0].inclusive,
        highlySupported: aggregationPromise[0].highlySupported,
        wellEquipped: aggregationPromise[0].wellEquipped,
        comprehensive: aggregationPromise[0].comprehensive
      };

      return data;
    } else {
      const resData = {
        moodsText: 'Positive',
        moodPercentage: 0,
        dissatisfied: 0,
        unpleasant: 0,
        overwhelming: 0,
        poor: 0,
        unmanageable: 0,
        lacking: 0,
        negative: 0,
        unsupported: 0,
        insufficient: 0,
        inadequate: 0,
        positive: 0,
        verySatisfied: 0,
        comfortable: 0,
        supportive: 0,
        manageable: 0,
        excellent: 0,
        inclusive: 0,
        highlySupported: 0,
        wellEquipped: 0,
        comprehensive: 0
      };
      return resData;
    }
  } catch (error) {
    console.error(error);
  }
};

const getOverallScore = async (company_id, reportDate) => {
  try {
    let userFiltering = { company_id };
    let startDate = new Date(reportDate);
    let endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    const foundUsers = await Users.find(
      { ...userFiltering, user_type: 2, deletedAt: null },
      { _id: 1 }
    );
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

const getShuruTheraphyData = async (company_id, reportDate) => {
  try {
    let userFiltering = { company_id };
    let startDate = new Date(reportDate);
    let endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    const foundUsers = await Users.find(
      { ...userFiltering, user_type: 2, deletedAt: null },
      { _id: 1 }
    );
    let users = [];
    foundUsers.forEach((user) => {
      users.push(user._id.toString());
    });

    const uniqueValues = [...new Set(users)];
    const userIds = uniqueValues.map((value) => new mongoose.Types.ObjectId(value));
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

    let totalNegativeSum = 0;
    let totalPositiveSum = 0;

    let totalCounts = negative.length;
    for (const i of negative) {
      totalNegativeSum += i;
    }
    for (const i of positive) {
      totalPositiveSum += i;
    }
    let avgNegative = Number(totalNegativeSum / totalCounts).toFixed(2);
    let avgPositive = Number(totalPositiveSum / totalCounts).toFixed(2);


    const data = {
      negative: {
        series: negative,
        negativeCategories: Object.keys(collectedData.negative)
      },
      positive: {
        series: [{ data: positive }],
        positiveCategories: Object.keys(collectedData.positive)
      },
      averageNegativePercentage: avgNegative,
      averagePositivePercentage: avgPositive
    };

    return data;
  } catch (error) {
    console.error(error);
  }
};

module.exports = {
  /**
   * @description This function is used to get random nudges
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  getDailyNudges: async (req, res) => {
    try {
      const randomIndex = Math.floor(Math.random() * SHOORAH_NOTIFICATION_MESSAGES.length);
      let alert = SHOORAH_NOTIFICATION_MESSAGES[randomIndex];
      return res.send({ alert });
    } catch (err) {
      console.error(err);
      return res.send(err);
    }
  },

  getPersonalMoodsReports: async (req, res) => {
    try {
      let reqParam = req.query;
      let currentDate = new Date();
      let startDate = new Date(currentDate)
      startDate.setHours(0, 0, 0, 0);
      startDate.setDate(currentDate.getDate() - parseInt(reqParam.days));
      const data = await getPersonalMoodsData(req.authCompanyId, startDate);
      return res.send({ data });
    } catch (err) {
      console.error(err);
      return res.send(err);
    }
  },

  getProfessionalMoodsReports: async (req, res) => {
    try {
      let reqParam = req.query;
      let currentDate = new Date();
      let startDate = new Date(currentDate)
      startDate.setHours(0, 0, 0, 0);
      startDate.setDate(currentDate.getDate() - parseInt(reqParam.days));
      const data = await getProfessionalMoodsData(req.authCompanyId, startDate);
      return res.send({ data });
    } catch (err) {
      console.error(err);
      return res.send(err);
    }
  },

  getOverallMoodsReports: async (req, res) => {
    try {
      let reqParam = req.query;
      let currentDate = new Date();
      let startDate = new Date(currentDate)
      startDate.setHours(0, 0, 0, 0);
      startDate.setDate(currentDate.getDate() - parseInt(reqParam.days));
      const data = await getOverallScore(req.authCompanyId, startDate);
      return res.send({ data });
    } catch (err) {
      console.error(err);
      return res.send(err);
    }
  },

  getShuruTheraphyData: async function (req, res) {
    try {
      let reqParam = req.query;
      let currentDate = new Date();
      let startDate = new Date(currentDate)
      startDate.setHours(0, 0, 0, 0);
      startDate.setDate(currentDate.getDate() - parseInt(reqParam.days));
      const data = await getShuruTheraphyData(req.authCompanyId, startDate);
      return res.send({ data: convertObjectKeysToCamelCase(data) });
    } catch (err) {
      console.log(err);
      return Response.internalServerErrorResponse(res);
    }
  },

  solutionCreation: async (req, res) => {
    try {
      const { solutionType } = req.query;
      // for personal moods and emotions score
      if (solutionType == 1) {
        let currentDate = new Date();
        let startDate = new Date(currentDate)
        startDate.setHours(0, 0, 0, 0);
        startDate.setDate(currentDate.getDate() - 7);
        const data = await getPersonalMoodsData(req.authCompanyId, startDate);
        let companyData = await Company.findOne({ _id: req.authCompanyId });

        let prependText = '';
        let countryText = '';
        let ethnicityText = '';
        let genderText = '';
        let emotionText = '';
        let ageGroupText = '';

        let mood = data.moodsText == 'Positive' ? true : false;

        if (mood) {
          if (data.moodPercentage >= 0 && data.moodPercentage <= 20) {
            prependText =
              'Your employees moods and emotions has recorded a Very Positive Poor score which indicates a substantial need for improvement or a complete reevaluation of the situation to rectify the underlying issues and move towards a more satisfactory or successful outcome. Check out our Shoorah moods and emotions solutions to help you move forward from here.';
          } else if (data.moodPercentage >= 21 && data.moodPercentage <= 40) {
            prependText =
              'Your employees moods and emotions has recorded a Poor Positive score which signifies that there are significant issues or drawbacks that detract from the overall quality or satisfaction. This rating suggests that improvements are needed to raise the level of performance or experience to a more acceptable standard within your workplace. Visit Shoorah’s moods and emotions solutions to help you make the necessary improvements going forwards';
          } else if (data.moodPercentage >= 41 && data.moodPercentage <= 60) {
            prependText =
              'Your employees moods and emotions recorded an Average Positive rating, which represents a neutral position, suggesting that you are meeting basic expectations without surpassing them. There is still much room for improvement so check out Shoorah’s moods and emotions solutions to begin implementing actions that will help improve this score.';
          } else if (data.moodPercentage >= 61 && data.moodPercentage <= 80) {
            prependText =
              'Your employees moods and emotions has recorded a Good Positive rating which represents a strong performance that has exceeded expectations and is highly satisfactory. While there might be slight room for improvement, this rating reflects a level of quality that is indicative of a strong effort and a job well done. For a continued focus on constantly learning and improving, visit our Shoorah moods and emotions solutions to learn how to keep building from here.';
          } else if (data.moodPercentage >= 81 && data.moodPercentage <= 100) {
            prependText =
              'Your employees moods and emotions has recorded a Very Good Positive rating. This represents an exceptionally high level of excellence and signifies a level of performance or quality that is truly outstanding and that sets a high very standard. Visit our Shoorah moods and emotions solutions for ideas on how to maintain this rating into the future.';
          }
        } else {
          if (data.moodPercentage >= 0 && data.moodPercentage <= 20) {
            prependText =
              'Your employees moods and emotions has recorded a significant Negative score which indicates a substantial need for improvement or a complete reevaluation of the situation to rectify the underlying issues and move towards a more satisfactory or successful outcome. Check out our Shoorah moods and emotions solutions to help you move forward from here.';
          } else if (data.moodPercentage >= 21 && data.moodPercentage <= 40) {
            prependText =
              'Your employees moods and emotions has recorded a Negative score which signifies that there are significant issues or drawbacks that detract from the overall quality or satisfaction. This rating suggests that improvements are needed to raise the level of performance or experience to a more acceptable standard within your workplace. Visit Shoorah’s moods and emotions solutions to help you make the necessary improvements going forwards';
          } else if (data.moodPercentage >= 41 && data.moodPercentage <= 60) {
            prependText =
              'Your employees moods and emotions recorded an Average Negative rating, which represents a neutral position, suggesting that you are meeting basic expectations without surpassing them. There is still much room for improvement so check out Shoorah’s moods and emotions solutions to begin implementing actions that will help improve this score.';
          } else if (data.moodPercentage >= 61 && data.moodPercentage <= 80) {
            prependText =
              'Your employees moods and emotions has recorded a Poor Negative rating which represents a strong performance that has exceeded expectations and is highly satisfactory. While there might be slight room for improvement, this rating reflects a level of quality that is indicative of a strong effort and a job well done. For a continued focus on constantly learning and improving, visit our Shoorah moods and emotions solutions to learn how to keep building from here.';
          } else if (data.moodPercentage >= 81 && data.moodPercentage <= 100) {
            prependText =
              'Your employees moods and emotions has recorded a Very Poor Negative rating. This represents an exceptionally high level of excellence and signifies a level of performance or quality that is truly outstanding and that sets a high very standard. Visit our Shoorah moods and emotions solutions for ideas on how to maintain this rating into the future.';
          }
        }

        const systemMessage = {
          role: 'system',
          content: 'You are a helpful assistant.'
        };

        const userMessage = {
          role: 'user',
          content: `${companyData?.company_type} COMPANY, 
          MOODS & EMOTIONS SCORE IS ${data?.moodPercentage}% for all employees that don't like the work. 
          Previous solution used by company owner that did not work".
          can we give a solution to the company owners to help them with this overcome situation and help their company to grow with happy mindset and good mental health?`
        };

        const completion = await openai.chat.completions.create({
          messages: [systemMessage, userMessage],
          model: 'gpt-3.5-turbo'
        });

        const openaiResponse =
          completion.choices &&
          completion.choices[0] &&
          completion.choices[0].message &&
          completion.choices[0].message.content;

        return res.status(200).send({
          solution: `${prependText}\n ${openaiResponse}`
        });
      }

      // for professional moods and emotions score
      if (solutionType == 2) {
        let currentDate = new Date();
        let startDate = new Date(currentDate)
        startDate.setHours(0, 0, 0, 0);
        startDate.setDate(currentDate.getDate() - 7);
        const data = await getProfessionalMoodsData(req.authCompanyId, startDate);
        let companyData = await Company.findOne({ _id: req.authCompanyId });

        let prependText = '';
        let countryText = '';
        let ethnicityText = '';
        let genderText = '';
        let emotionText = '';
        let ageGroupText = '';

        let mood = data.moodsText == 'Positive' ? true : false;

        if (mood) {
          if (data.moodPercentage >= 0 && data.moodPercentage <= 20) {
            prependText =
              'Your employees professional moods and emotions has recorded a Very Positive Poor score which indicates a substantial need for improvement or a complete reevaluation of the situation to rectify the underlying issues and move towards a more satisfactory or successful outcome. Check out our Shoorah moods and emotions solutions to help you move forward from here.';
          } else if (data.moodPercentage >= 21 && data.moodPercentage <= 40) {
            prependText =
              'Your employees professional moods and emotions has recorded a Poor Positive score which signifies that there are significant issues or drawbacks that detract from the overall quality or satisfaction. This rating suggests that improvements are needed to raise the level of performance or experience to a more acceptable standard within your workplace. Visit Shoorah’s moods and emotions solutions to help you make the necessary improvements going forwards';
          } else if (data.moodPercentage >= 41 && data.moodPercentage <= 60) {
            prependText =
              'Your employees professional moods and emotions recorded an Average Positive rating, which represents a neutral position, suggesting that you are meeting basic expectations without surpassing them. There is still much room for improvement so check out Shoorah’s moods and emotions solutions to begin implementing actions that will help improve this score.';
          } else if (data.moodPercentage >= 61 && data.moodPercentage <= 80) {
            prependText =
              'Your employees professional moods and emotions has recorded a Good Positive rating which represents a strong performance that has exceeded expectations and is highly satisfactory. While there might be slight room for improvement, this rating reflects a level of quality that is indicative of a strong effort and a job well done. For a continued focus on constantly learning and improving, visit our Shoorah moods and emotions solutions to learn how to keep building from here.';
          } else if (data.moodPercentage >= 81 && data.moodPercentage <= 100) {
            prependText =
              'Your employees professional moods and emotions has recorded a Very Good Positive rating. This represents an exceptionally high level of excellence and signifies a level of performance or quality that is truly outstanding and that sets a high very standard. Visit our Shoorah moods and emotions solutions for ideas on how to maintain this rating into the future.';
          }
        } else {
          if (data.moodPercentage >= 0 && data.moodPercentage <= 20) {
            prependText =
              'Your employees professional moods and emotions has recorded a significant Negative score which indicates a substantial need for improvement or a complete reevaluation of the situation to rectify the underlying issues and move towards a more satisfactory or successful outcome. Check out our Shoorah moods and emotions solutions to help you move forward from here.';
          } else if (data.moodPercentage >= 21 && data.moodPercentage <= 40) {
            prependText =
              'Your employees professional moods and emotions has recorded a Negative score which signifies that there are significant issues or drawbacks that detract from the overall quality or satisfaction. This rating suggests that improvements are needed to raise the level of performance or experience to a more acceptable standard within your workplace. Visit Shoorah’s moods and emotions solutions to help you make the necessary improvements going forwards';
          } else if (data.moodPercentage >= 41 && data.moodPercentage <= 60) {
            prependText =
              'Your employees professional moods and emotions recorded an Average Negative rating, which represents a neutral position, suggesting that you are meeting basic expectations without surpassing them. There is still much room for improvement so check out Shoorah’s moods and emotions solutions to begin implementing actions that will help improve this score.';
          } else if (data.moodPercentage >= 61 && data.moodPercentage <= 80) {
            prependText =
              'Your employees professional moods and emotions has recorded a Poor Negative rating which represents a strong performance that has exceeded expectations and is highly satisfactory. While there might be slight room for improvement, this rating reflects a level of quality that is indicative of a strong effort and a job well done. For a continued focus on constantly learning and improving, visit our Shoorah moods and emotions solutions to learn how to keep building from here.';
          } else if (data.moodPercentage >= 81 && data.moodPercentage <= 100) {
            prependText =
              'Your employees professional moods and emotions has recorded a Very Poor Negative rating. This represents an exceptionally high level of excellence and signifies a level of performance or quality that is truly outstanding and that sets a high very standard. Visit our Shoorah moods and emotions solutions for ideas on how to maintain this rating into the future.';
          }
        }

        const systemMessage = {
          role: 'system',
          content: 'You are a helpful assistant.'
        };

        const userMessage = {
          role: 'user',
          content: `${companyData?.company_type} COMPANY, 
          PROFESSIONAL MOODS & EMOTIONS SCORE IS ${data?.moodPercentage}% for all employees that don't like the work. 
          Previous solution for enhancing professional experience of users used by company owner did not work".
          can we give a solution to the company owners to help them with this overcome situation and help their company to grow with happy mindset of employees and good mental health with enhancing professional experiences?`
        };

        const completion = await openai.chat.completions.create({
          messages: [systemMessage, userMessage],
          model: 'gpt-3.5-turbo'
        });

        const openaiResponse =
          completion.choices &&
          completion.choices[0] &&
          completion.choices[0].message &&
          completion.choices[0].message.content;

        return res.status(200).send({
          solution: `${prependText}\n ${openaiResponse}`
        });
      }

      // for overall well being score calculation
      if (solutionType == 3) {
        let currentDate = new Date();
        let startDate = new Date(currentDate)
        startDate.setHours(0, 0, 0, 0);
        startDate.setDate(currentDate.getDate() - 7);
        const data = await getOverallScore(req.authCompanyId, startDate);
        let companyData = await Company.findOne({ _id: req.authCompanyId });

        let prependText = '';
        let countryText = '';
        let ethnicityText = '';
        let genderText = '';
        let emotionText = '';
        let ageGroupText = '';

        let mood = data.overallMood == 'Positive' ? true : false;

        if (mood) {
          if (data.overallMoodPercentage >= 1 && data.overallMoodPercentage <= 20) {
            prependText =
              'Your business has recorded a Very Poor score which indicates a substantial need for improvement or a complete reevaluation of the situation to rectify the underlying issues and move towards a more satisfactory or successful outcome. Check out our Shoorah business solutions to help you move forward from here.';
          } else if (data.overallMoodPercentage >= 21 && data.overallMoodPercentage <= 40) {
            prependText =
              'Your business has recorded a Poor score which signifies that there are significant issues or drawbacks that detract from the overall quality or satisfaction. This rating suggests that improvements are needed to raise the level of performance or experience to a more acceptable standard within your workplace. Visit Shoorah’s business solutions to help you make the necessary improvements going forwards';
          } else if (data.overallMoodPercentage >= 41 && data.overallMoodPercentage <= 60) {
            prependText =
              'Your business recorded an Average rating, which represents a neutral position, suggesting that you are meeting basic expectations without surpassing them. There is still much room for improvement so check out Shoorah’s business solutions to begin implementing actions that will help improve this score.';
          } else if (data.overallMoodPercentage >= 61 && data.overallMoodPercentage <= 80) {
            prependText =
              'Your business has recorded a Good rating which represents a strong performance that has exceeded expectations and is highly satisfactory. While there might be slight room for improvement, this rating reflects a level of quality that is indicative of a strong effort and a job well done. For a continued focus on constantly learning and improving, visit our Shoorah business solutions to learn how to keep building from here.';
          } else if (data.overallMoodPercentage >= 81 && data.overallMoodPercentage <= 100) {
            prependText =
              'Your business has recorded a Very Good rating. This represents an exceptionally high level of excellence and signifies a level of performance or quality that is truly outstanding and that sets a high very standard. Visit our Shoorah business solutions for ideas on how to maintain this rating into the future.';
          }
        } else {
          if (data.overallMoodPercentage >= 1 && data.overallMoodPercentage <= 20) {
            prependText =
              'Your business has recorded a Very significant negative score which indicates a substantial need for improvement or a complete reevaluation of the situation to rectify the underlying issues and move towards a more satisfactory or successful outcome. Check out our Shoorah business solutions to help you move forward from here.';
          } else if (data.overallMoodPercentage >= 21 && data.overallMoodPercentage <= 40) {
            prependText =
              'Your business has recorded a negative score which signifies that there are significant issues or drawbacks that detract from the overall quality or satisfaction. This rating suggests that improvements are needed to raise the level of performance or experience to a more acceptable standard within your workplace. Visit Shoorah’s business solutions to help you make the necessary improvements going forwards';
          } else if (data.overallMoodPercentage >= 41 && data.overallMoodPercentage <= 60) {
            prependText =
              'Your business recorded an Average rating, which represents a neutral position, suggesting that you are meeting basic expectations without surpassing them. There is still much room for improvement so check out Shoorah’s business solutions to begin implementing actions that will help improve this score.';
          } else if (data.overallMoodPercentage >= 61 && data.overallMoodPercentage <= 80) {
            prependText =
              'Your business has recorded a Poor Negative rating which represents a strong performance that has exceeded expectations and is highly satisfactory. While there might be slight room for improvement, this rating reflects a level of quality that is indicative of a strong effort and a job well done. For a continued focus on constantly learning and improving, visit our Shoorah business solutions to learn how to keep building from here.';
          } else if (data.overallMoodPercentage >= 81 && data.overallMoodPercentage <= 100) {
            prependText =
              'Your business has recorded a Very Poor negative rating. This represents an exceptionally high level of excellence and signifies a level of performance or quality that is truly outstanding and that sets a high very standard. Visit our Shoorah business solutions for ideas on how to maintain this rating into the future.';
          }
        }

        const systemMessage = {
          role: 'system',
          content: 'You are a helpful assistant.'
        };

        const userMessage = {
          role: 'user',
          content: `${companyData?.company_type} COMPANY , 
          OVERALL WELLBEING SCORE IS ${data?.overallMoodPercentage}% for all employees that don't like the work. 
          Previous solution used by company that did not work..
          How can we give a solution to the company owners to help them with this situation and make business works smooth and increase overall growth?`
        };

        const completion = await openai.chat.completions.create({
          messages: [systemMessage, userMessage],
          model: 'gpt-3.5-turbo'
        });

        const openaiResponse =
          completion.choices &&
          completion.choices[0] &&
          completion.choices[0].message &&
          completion.choices[0].message.content;

        return res.status(200).send({
          solution: `${prependText}\n ${openaiResponse}`
        });
      }

    } catch (error) {
      console.log(error);
      return Response.internalServerErrorResponse(res);
    }
  },




};
