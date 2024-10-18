'use strict';

const { Mood } = require('@models');
const ProfessionalMood = require('../../../models/ProfessionalMood');
const Response = require('@services/Response');
const {
  addEditMoodValidation,
  getMoodDetailsValidation,
  downloadMoodReportValidation
} = require('@services/userValidations/moodValidations');
const {
  SUCCESS,
  FAIL,
  REPORT_TYPE,
  MOOD_REPORT,
  MOOD_REPORT_DURATION,
  MOOD_REPORT_POSITIVE_MESSGE,
  MOOD_REPORT_NEGATIVE_MESSGE,
  MOOD_REPORT_NEUTRAL_MESSAGE,
  RESPONSE_CODE,
  MOOD_PDF_SIZE,
  NODE_ENVIRONMENT
} = require('@services/Constant');
const {
  toObjectId,
  currentDateOnly,
  getFirstDayOfWeek,
  getFirstDayOfMonth,
  calculatePercentage
} = require('@services/Helper');
const puppeteer = require('puppeteer');
const pug = require('pug');
const { moodChartCalculation } = require('@services/userServices/moodService');
const { professionalMoodValidation } = require('../../../services/userValidations/moodValidations');
const { MAX_VALUE_OF_MOOD } = require('../../../services/Constant');
const { professionalMoodChartCalculation } = require('../../../services/userServices/moodService');
const { validate } = require('../../../models/solution');
const { date } = require('joi');
const Conversation = require('../../../models/Conversation');
const {
  noDataFoundInProfessionalMoods,
  convertObjectKeysToCamelCase
} = require('../../../services/Helper');
const { ContentCounts } = require('../../../models');

module.exports = {
  /**
   * @description This function is used to add edit daily mood.
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  getUserMood: async (req, res) => {
    const startDate = new Date(req.query.start_date);
    const endDate = new Date(req.query.end_date);

    const start = new Date(startDate);
    const numberOfDaysToAdd = 1;
    const end = new Date(endDate);
    end.setDate(end.getDate() + numberOfDaysToAdd);

    const result = await Conversation.aggregate([
      {
        $match: {
          userId: req.authUserId,
          message: { $exists: false },
          to: { $exists: false },
          createdAt: {
            $gte: start,
            $lte: end
          }
        }
      },
      {
        $group: {
          _id: '$moodId',
          totalCount: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: null,
          moodData: {
            $push: {
              moodId: '$_id',
              count: '$totalCount'
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          moodData: {
            $map: {
              input: '$moodData',
              as: 'item',
              in: {
                moodId: '$$item.moodId',
                roundedPercentage: {
                  $add: [
                    {
                      $cond: [
                        {
                          $gt: [
                            {
                              $mod: [
                                {
                                  $multiply: [
                                    100,
                                    { $divide: ['$$item.count', { $sum: '$moodData.count' }] }
                                  ]
                                },
                                1
                              ]
                            },
                            0.5
                          ]
                        },
                        1,
                        0
                      ]
                    },
                    {
                      $floor: {
                        $multiply: [{ $divide: ['$$item.count', { $sum: '$moodData.count' }] }, 100]
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      }
    ]);
    if (typeof result[0] !== 'undefined') {
      res.status(200).send({ data: result[0] });
    } else {
      res.status(200).send({ data: {} });
    }
  },
  /**
   * @description This function is used to add edit daily mood.
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  addEditMood: (req, res) => {
    try {
      const reqParam = req.body;
      const allValuesZeroOrUndefined = Object.values(reqParam).every(value => value === 0 || value === undefined);
      if (allValuesZeroOrUndefined) {
        return Response.errorResponseData(res, res.__('At least one mood value is required'), RESPONSE_CODE.BAD_REQUEST);
      }
      addEditMoodValidation(reqParam, res, async (validate) => {
        if (validate) {
          let createMood = {
            user_id: req.authUserId,
            demotivated: reqParam.demotivated || 0,
            motivated: reqParam.motivated || 0,
            low: reqParam.low || 0,
            content: reqParam.content || 0,
            angry: reqParam.angry || 0,
            happy: reqParam.happy || 0,
            need_support: reqParam.needSupport || 0,
            i_can_manage: reqParam.iCanManage || 0,
            helpless: reqParam.helpless || 0,
            i_am_in_control: reqParam.iAmInControl || 0,
            tired: reqParam.tired || 0,
            energised: reqParam.energised || 0,
            stressed: reqParam.stressed || 0,
            balanced: reqParam.balanced || 0,
            anxious: reqParam.anxious || 0,
            calm: reqParam.calm || 0,
            sad: reqParam.sad || 0,
            relaxed: reqParam.relaxed || 0,
            not_good: reqParam.notGood || 0,
            great: reqParam.great || 0
          };

          let positiveSum = reqParam.motivated + reqParam.content + reqParam.happy + reqParam.iCanManage + reqParam.iAmInControl + reqParam.energised + reqParam.balanced + reqParam.calm + reqParam.relaxed + reqParam.great;
          let negativeSum = reqParam.demotivated + reqParam.low + reqParam.sad + reqParam.needSupport + reqParam.helpless + reqParam.tired + reqParam.stressed + reqParam.anxious + reqParam.angry + reqParam.notGood;

          if (positiveSum > negativeSum) {
            createMood = {
              ...createMood,
              positivity: true
            }
          } else {
            createMood = {
              ...createMood,
              positivity: false
            }
          }


          await Mood.create(createMood);
          console.log(createMood);
          return Response.successResponseWithoutData(res, res.__('updateUserMood'), SUCCESS);
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to get mood report based on date range
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  getMoodDetails: (req, res) => {
    try {
      const reqParam = req.query;
      getMoodDetailsValidation(reqParam, res, async (validate) => {
        if (validate) {
          let dateFrom = reqParam.reportFromDate
            ? new Date(reqParam.reportFromDate)
            : currentDateOnly();
          const dateTo = currentDateOnly();
          dateTo.setDate(dateFrom.getDate() + 1);
          let resData;
          const filterCondition = {
            user_id: toObjectId(req.authUserId),
            createdAt: {
              $gte: dateFrom,
              $lt: dateTo
            },
            deletedAt: null
          };

          const groupDataCondition = {
            _id: '$weekStart',
            anxiousCount: {
              $sum: {
                $cond: [
                  {
                    $gt: ['$anxious', 0]
                  },
                  1,
                  0
                ]
              }
            },
            calmCount: {
              $sum: {
                $cond: [
                  {
                    $gt: ['$calm', 0]
                  },
                  1,
                  0
                ]
              }
            },
            needSupportCount: {
              $sum: {
                $cond: [
                  {
                    $gt: ['$need_support', 0]
                  },
                  1,
                  0
                ]
              }
            },
            demotivatedCount: {
              $sum: {
                $cond: [
                  {
                    $gt: ['$demotivated', 0]
                  },
                  1,
                  0
                ]
              }
            },
            motivatedCount: {
              $sum: {
                $cond: [
                  {
                    $gt: ['$motivated', 0]
                  },
                  1,
                  0
                ]
              }
            },
            lowCount: {
              $sum: {
                $cond: [
                  {
                    $gt: ['$low', 0]
                  },
                  1,
                  0
                ]
              }
            },
            contentCount: {
              $sum: {
                $cond: [
                  {
                    $gt: ['$content', 0]
                  },
                  1,
                  0
                ]
              }
            },
            angryCount: {
              $sum: {
                $cond: [
                  {
                    $gt: ['$angry', 0]
                  },
                  1,
                  0
                ]
              }
            },
            happyCount: {
              $sum: {
                $cond: [
                  {
                    $gt: ['$happy', 0]
                  },
                  1,
                  0
                ]
              }
            },
            iCanManageCount: {
              $sum: {
                $cond: [
                  {
                    $gt: ['$i_can_manage', 0]
                  },
                  1,
                  0
                ]
              }
            },
            helplessCount: {
              $sum: {
                $cond: [
                  {
                    $gt: ['$helpless', 0]
                  },
                  1,
                  0
                ]
              }
            },
            iAmInControlCount: {
              $sum: {
                $cond: [
                  {
                    $gt: ['$i_am_in_control', 0]
                  },
                  1,
                  0
                ]
              }
            },
            tiredCount: {
              $sum: {
                $cond: [
                  {
                    $gt: ['$tired', 0]
                  },
                  1,
                  0
                ]
              }
            },
            stressedCount: {
              $sum: {
                $cond: [
                  {
                    $gt: ['$stressed', 0]
                  },
                  1,
                  0
                ]
              }
            },
            balancedCount: {
              $sum: {
                $cond: [
                  {
                    $gt: ['$balanced', 0]
                  },
                  1,
                  0
                ]
              }
            },
            energisedCount: {
              $sum: {
                $cond: [
                  {
                    $gt: ['$energised', 0]
                  },
                  1,
                  0
                ]
              }
            },
            sadCount: {
              $sum: {
                $cond: [
                  {
                    $gt: ['$sad', 0]
                  },
                  1,
                  0
                ]
              }
            },
            relaxedCount: {
              $sum: {
                $cond: [
                  {
                    $gt: ['$relaxed', 0]
                  },
                  1,
                  0
                ]
              }
            },
            greatCount: {
              $sum: {
                $cond: [
                  {
                    $gt: ['$great', 0]
                  },
                  1,
                  0
                ]
              }
            },
            notGoodCount: {
              $sum: {
                $cond: [
                  {
                    $gt: ['$not_good', 0]
                  },
                  1,
                  0
                ]
              }
            },
            anxious: {
              $avg: '$anxious'
            },
            calm: {
              $avg: '$calm'
            },
            needSupport: {
              $avg: '$need_support'
            },
            demotivated: {
              $avg: '$demotivated'
            },
            motivated: {
              $avg: '$motivated'
            },
            low: {
              $avg: '$low'
            },
            content: {
              $avg: '$content'
            },
            angry: {
              $avg: '$angry'
            },
            happy: {
              $avg: '$happy'
            },
            iCanManage: {
              $avg: '$i_can_manage'
            },
            helpless: {
              $avg: '$helpless'
            },
            iAmInControl: {
              $avg: '$i_am_in_control'
            },
            tired: {
              $avg: '$tired'
            },
            stressed: {
              $avg: '$stressed'
            },
            balanced: {
              $avg: '$balanced'
            },
            energised: {
              $avg: '$energised'
            },
            sad: {
              $avg: '$sad'
            },
            relaxed: {
              $avg: '$relaxed'
            },
            notGood: {
              $avg: '$not_good'
            },
            great: {
              $avg: '$great'
            }
          };

          switch (parseInt(reqParam.reportType)) {
            case REPORT_TYPE.DAILY:
              const aggregationCondition = [
                {
                  $match: filterCondition
                },
                {
                  $facet: {
                    moodData: [
                      {
                        $project: {
                          anxious: 1,
                          calm: 1,
                          needSupport: '$need_support',
                          demotivated: 1,
                          motivated: 1,
                          low: 1,
                          content: 1,
                          angry: 1,
                          happy: 1,
                          iCanManage: '$i_can_manage',
                          helpless: 1,
                          iAmInControl: '$i_am_in_control',
                          tired: 1,
                          stressed: 1,
                          balanced: 1,
                          energised: 1,
                          sad: 1,
                          relaxed: 1,
                          notGood: '$not_good',
                          great: 1,
                          createdAt: 1,
                          _id: 0
                        }
                      }
                    ],
                    averageMoods: [
                      {
                        $group: {
                          _id: '$user_id',
                          anxious: {
                            $avg: '$anxious'
                          },
                          calm: {
                            $avg: '$calm'
                          },
                          needSupport: {
                            $avg: '$need_support'
                          },
                          demotivated: {
                            $avg: '$demotivated'
                          },
                          motivated: {
                            $avg: '$motivated'
                          },
                          low: {
                            $avg: '$low'
                          },
                          content: {
                            $avg: '$content'
                          },
                          angry: {
                            $avg: '$angry'
                          },
                          happy: {
                            $avg: '$happy'
                          },
                          iCanManage: {
                            $avg: '$i_can_manage'
                          },
                          helpless: {
                            $avg: '$helpless'
                          },
                          iAmInControl: {
                            $avg: '$i_am_in_control'
                          },
                          tired: {
                            $avg: '$tired'
                          },
                          stressed: {
                            $avg: '$stressed'
                          },
                          balanced: {
                            $avg: '$balanced'
                          },
                          energised: {
                            $avg: '$energised'
                          },
                          sad: {
                            $avg: '$sad'
                          },
                          relaxed: {
                            $avg: '$relaxed'
                          },
                          notGood: {
                            $avg: '$not_good'
                          },
                          great: {
                            $avg: '$great'
                          }
                        }
                      }
                    ],
                    moodCount: [
                      {
                        $group: {
                          _id: '$user_id',
                          anxious: {
                            $sum: {
                              $cond: [
                                {
                                  $gt: ['$anxious', 0]
                                },
                                1,
                                0
                              ]
                            }
                          },
                          calm: {
                            $sum: {
                              $cond: [
                                {
                                  $gt: ['$calm', 0]
                                },
                                1,
                                0
                              ]
                            }
                          },
                          needSupport: {
                            $sum: {
                              $cond: [
                                {
                                  $gt: ['$need_support', 0]
                                },
                                1,
                                0
                              ]
                            }
                          },
                          demotivated: {
                            $sum: {
                              $cond: [
                                {
                                  $gt: ['$demotivated', 0]
                                },
                                1,
                                0
                              ]
                            }
                          },
                          motivated: {
                            $sum: {
                              $cond: [
                                {
                                  $gt: ['$motivated', 0]
                                },
                                1,
                                0
                              ]
                            }
                          },
                          low: {
                            $sum: {
                              $cond: [
                                {
                                  $gt: ['$low', 0]
                                },
                                1,
                                0
                              ]
                            }
                          },
                          content: {
                            $sum: {
                              $cond: [
                                {
                                  $gt: ['$content', 0]
                                },
                                1,
                                0
                              ]
                            }
                          },
                          angry: {
                            $sum: {
                              $cond: [
                                {
                                  $gt: ['$angry', 0]
                                },
                                1,
                                0
                              ]
                            }
                          },
                          happy: {
                            $sum: {
                              $cond: [
                                {
                                  $gt: ['$happy', 0]
                                },
                                1,
                                0
                              ]
                            }
                          },
                          iCanManage: {
                            $sum: {
                              $cond: [
                                {
                                  $gt: ['$i_can_manage', 0]
                                },
                                1,
                                0
                              ]
                            }
                          },
                          helpless: {
                            $sum: {
                              $cond: [
                                {
                                  $gt: ['$helpless', 0]
                                },
                                1,
                                0
                              ]
                            }
                          },
                          iAmInControl: {
                            $sum: {
                              $cond: [
                                {
                                  $gt: ['$i_am_in_control', 0]
                                },
                                1,
                                0
                              ]
                            }
                          },
                          tired: {
                            $sum: {
                              $cond: [
                                {
                                  $gt: ['$tired', 0]
                                },
                                1,
                                0
                              ]
                            }
                          },
                          stressed: {
                            $sum: {
                              $cond: [
                                {
                                  $gt: ['$stressed', 0]
                                },
                                1,
                                0
                              ]
                            }
                          },
                          balanced: {
                            $sum: {
                              $cond: [
                                {
                                  $gt: ['$balanced', 0]
                                },
                                1,
                                0
                              ]
                            }
                          },
                          energised: {
                            $sum: {
                              $cond: [
                                {
                                  $gt: ['$energised', 0]
                                },
                                1,
                                0
                              ]
                            }
                          },
                          sad: {
                            $sum: {
                              $cond: [
                                {
                                  $gt: ['$sad', 0]
                                },
                                1,
                                0
                              ]
                            }
                          },
                          relaxed: {
                            $sum: {
                              $cond: [
                                {
                                  $gt: ['$relaxed', 0]
                                },
                                1,
                                0
                              ]
                            }
                          },
                          great: {
                            $sum: {
                              $cond: [
                                {
                                  $gt: ['$great', 0]
                                },
                                1,
                                0
                              ]
                            }
                          },
                          notGood: {
                            $sum: {
                              $cond: [
                                {
                                  $gt: ['$not_good', 0]
                                },
                                1,
                                0
                              ]
                            }
                          }
                        }
                      }
                    ]
                  }
                },
                {
                  $project: {
                    moodData: 1,
                    averageMood: {
                      anxious: {
                        $round: [{ $arrayElemAt: ['$averageMoods.anxious', 0] }, 2]
                      },
                      calm: {
                        $round: [{ $arrayElemAt: ['$averageMoods.calm', 0] }, 2]
                      },
                      needSupport: {
                        $round: [{ $arrayElemAt: ['$averageMoods.needSupport', 0] }, 2]
                      },
                      demotivated: {
                        $round: [{ $arrayElemAt: ['$averageMoods.demotivated', 0] }, 2]
                      },
                      motivated: {
                        $round: [{ $arrayElemAt: ['$averageMoods.motivated', 0] }, 2]
                      },
                      low: {
                        $round: [{ $arrayElemAt: ['$averageMoods.low', 0] }, 2]
                      },
                      content: {
                        $round: [{ $arrayElemAt: ['$averageMoods.content', 0] }, 2]
                      },
                      angry: {
                        $round: [{ $arrayElemAt: ['$averageMoods.angry', 0] }, 2]
                      },
                      happy: {
                        $round: [{ $arrayElemAt: ['$averageMoods.happy', 0] }, 2]
                      },
                      iCanManage: {
                        $round: [{ $arrayElemAt: ['$averageMoods.iCanManage', 0] }, 2]
                      },
                      helpless: {
                        $round: [{ $arrayElemAt: ['$averageMoods.helpless', 0] }, 2]
                      },
                      iAmInControl: {
                        $round: [{ $arrayElemAt: ['$averageMoods.iAmInControl', 0] }, 2]
                      },
                      tired: {
                        $round: [{ $arrayElemAt: ['$averageMoods.tired', 0] }, 2]
                      },
                      stressed: {
                        $round: [{ $arrayElemAt: ['$averageMoods.stressed', 0] }, 2]
                      },
                      balanced: {
                        $round: [{ $arrayElemAt: ['$averageMoods.balanced', 0] }, 2]
                      },
                      energised: {
                        $round: [{ $arrayElemAt: ['$averageMoods.energised', 0] }, 2]
                      },
                      sad: {
                        $round: [{ $arrayElemAt: ['$averageMoods.sad', 0] }, 2]
                      },
                      relaxed: {
                        $round: [{ $arrayElemAt: ['$averageMoods.relaxed', 0] }, 2]
                      },
                      great: {
                        $round: [{ $arrayElemAt: ['$averageMoods.great', 0] }, 2]
                      },
                      notGood: {
                        $round: [{ $arrayElemAt: ['$averageMoods.notGood', 0] }, 2]
                      }
                    },
                    moodCount: 1
                  }
                }
              ];
              const averageMood = await Mood.aggregate(aggregationCondition);
              const averageMoodPercentage = {
                demotivated: calculatePercentage(
                  averageMood[0].averageMood.demotivated,
                  averageMood[0].averageMood.demotivated + averageMood[0].averageMood.motivated
                ),
                motivated: calculatePercentage(
                  averageMood[0].averageMood.motivated,
                  averageMood[0].averageMood.demotivated + averageMood[0].averageMood.motivated
                ),
                low: calculatePercentage(
                  averageMood[0].averageMood.low,
                  averageMood[0].averageMood.low + averageMood[0].averageMood.content
                ),
                content: calculatePercentage(
                  averageMood[0].averageMood.content,
                  averageMood[0].averageMood.low + averageMood[0].averageMood.content
                ),
                sad: calculatePercentage(
                  averageMood[0].averageMood.sad,
                  averageMood[0].averageMood.sad + averageMood[0].averageMood.happy
                ),
                happy: calculatePercentage(
                  averageMood[0].averageMood.happy,
                  averageMood[0].averageMood.sad + averageMood[0].averageMood.happy
                ),
                needSupport: calculatePercentage(
                  averageMood[0].averageMood.needSupport,
                  averageMood[0].averageMood.needSupport + averageMood[0].averageMood.iCanManage
                ),
                iCanManage: calculatePercentage(
                  averageMood[0].averageMood.iCanManage,
                  averageMood[0].averageMood.needSupport + averageMood[0].averageMood.iCanManage
                ),
                helpless: calculatePercentage(
                  averageMood[0].averageMood.helpless,
                  averageMood[0].averageMood.helpless + averageMood[0].averageMood.iAmInControl
                ),
                iAmInControl: calculatePercentage(
                  averageMood[0].averageMood.iAmInControl,
                  averageMood[0].averageMood.helpless + averageMood[0].averageMood.iAmInControl
                ),
                tired: calculatePercentage(
                  averageMood[0].averageMood.tired,
                  averageMood[0].averageMood.tired + averageMood[0].averageMood.energised
                ),
                energised: calculatePercentage(
                  averageMood[0].averageMood.energised,
                  averageMood[0].averageMood.tired + averageMood[0].averageMood.energised
                ),
                angry: calculatePercentage(
                  averageMood[0].averageMood.angry,
                  averageMood[0].averageMood.angry + averageMood[0].averageMood.calm
                ),
                calm: calculatePercentage(
                  averageMood[0].averageMood.calm,
                  averageMood[0].averageMood.angry + averageMood[0].averageMood.calm
                ),
                anxious: calculatePercentage(
                  averageMood[0].averageMood.anxious,
                  averageMood[0].averageMood.anxious + averageMood[0].averageMood.relaxed
                ),
                relaxed: calculatePercentage(
                  averageMood[0].averageMood.relaxed,
                  averageMood[0].averageMood.anxious + averageMood[0].averageMood.relaxed
                ),
                stressed: calculatePercentage(
                  averageMood[0].averageMood.stressed,
                  averageMood[0].averageMood.stressed + averageMood[0].averageMood.balanced
                ),
                balanced: calculatePercentage(
                  averageMood[0].averageMood.balanced,
                  averageMood[0].averageMood.stressed + averageMood[0].averageMood.balanced
                ),
                great: calculatePercentage(
                  averageMood[0].averageMood.great,
                  averageMood[0].averageMood.notGood + averageMood[0].averageMood.great
                ),
                notGood: calculatePercentage(
                  averageMood[0].averageMood.notGood,
                  averageMood[0].averageMood.notGood + averageMood[0].averageMood.great
                )
              };
              if (averageMood.length > 0 && averageMood[0].moodData.length > 0) {
                resData = {
                  moodData: averageMood[0].moodData,
                  averageMoodPercentage,
                  moodCount: averageMood[0].moodCount[0]
                };
                return Response.successResponseData(
                  res,
                  resData,
                  SUCCESS,
                  res.__('moodListSuccess')
                );
              } else {
                return Response.successResponseData(res, [], SUCCESS, res.__('moodListSuccess'));
              }
            case REPORT_TYPE.WEEKLY:
              dateFrom.setDate(dateFrom.getDate() - MOOD_REPORT.NUMBER_OF_WEEKS * 7);
              dateFrom = getFirstDayOfWeek(dateFrom);
              const weeklyQuery = [
                {
                  $match: filterCondition
                },
                {
                  $addFields: {
                    weekStart: {
                      $dateFromParts: {
                        isoWeekYear: { $isoWeekYear: '$createdAt' },
                        isoWeek: { $isoWeek: '$createdAt' },
                        isoDayOfWeek: 0
                      }
                    }
                  }
                },
                {
                  $group: groupDataCondition
                }
              ];
              const weeklyData = await Mood.aggregate(weeklyQuery);
              const dateRange = [dateFrom];
              for (let x = 0; x <= 5; x++) {
                dateFrom = new Date(dateFrom);
                dateFrom.setDate(dateFrom.getDate() + 7);
                dateRange.push(dateFrom);
              }
              resData = moodChartCalculation(weeklyData, dateRange);
              return Response.successResponseData(res, resData, SUCCESS, res.__('moodListSuccess'));
            case REPORT_TYPE.MONTHLY:
              dateFrom.setMonth(dateFrom.getMonth() - MOOD_REPORT.NUMBER_OF_MONTHS);
              dateFrom = getFirstDayOfMonth(dateFrom);
              groupDataCondition._id = '$monthStart';
              const monthlyQuery = [
                {
                  $match: filterCondition
                },
                {
                  $addFields: {
                    monthStart: {
                      $dateFromString: {
                        dateString: {
                          $dateToString: {
                            format: '%Y-%m-01',
                            date: new Date()
                          }
                        }
                      }
                    }
                  }
                },
                {
                  $group: groupDataCondition
                }
              ];
              const monthlyData = await Mood.aggregate(monthlyQuery);
              const monthRange = [dateFrom];
              for (let x = 0; x <= 5; x++) {
                dateFrom = new Date(dateFrom);
                dateFrom.setMonth(dateFrom.getMonth() + 1);
                monthRange.push(dateFrom);
              }
              resData = moodChartCalculation(monthlyData, monthRange);
              return Response.successResponseData(res, resData, SUCCESS, res.__('moodListSuccess'));
            case REPORT_TYPE.YEARLY:
              dateFrom.setFullYear(dateFrom.getFullYear() - MOOD_REPORT.NUMBER_OF_YEARS);
              dateFrom = getFirstDayOfMonth(dateFrom);
              groupDataCondition._id = '$year';
              const yearlyQuery = [
                {
                  $match: filterCondition
                },
                {
                  $addFields: {
                    year: {
                      $year: '$createdAt'
                    }
                  }
                },
                {
                  $group: groupDataCondition
                }
              ];
              const yearlyData = await Mood.aggregate(yearlyQuery);
              const yearRange = [dateFrom.getFullYear()];
              for (let x = 0; x <= 1; x++) {
                dateFrom = new Date(dateFrom);
                dateFrom.setFullYear(dateFrom.getFullYear() + 1);
                yearRange.push(dateFrom.getFullYear());
              }

              resData = moodChartCalculation(yearlyData, yearRange);
              return Response.successResponseData(res, resData, SUCCESS, res.__('moodListSuccess'));
            default:
              return Response.successResponseWithoutData(res, res.__('noMoodCase'), FAIL);
          }
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  setMood: async (req, res) => {
    const obj = new Conversation({ userId: req.authUserId, moodId: `${req.body.moodid}` });
    obj.save();

    let existingMood = await ContentCounts.findOne({ user_id: req.authUserId });
    let moods = [1, 2, 5, 7, 9];
    if (existingMood) {
      if (moods.includes(existingMood.shuru_mood) && moods.includes(parseInt(req.body.moodid))) {
        await ContentCounts.updateOne(
          { user_id: req.authUserId },
          {
            $set: {
              shuru_mood: req.body.moodid,
              shuru_mood_count: existingMood.shuru_mood_count + 1
            }
          }
        );
      } else {
        await ContentCounts.updateOne(
          { user_id: req.authUserId },
          {
            $set: {
              shuru_mood: req.body.moodid,
              shuru_mood_count: 0
            }
          }
        );
      }
    } else {
      let newContentCount = {
        user_id: req.authUserId,
        shuru_mood: req.body.moodid,
        shuru_mood_count: 0
      };
      await ContentCounts.create(newContentCount);
    }

    let msg = {
      6: {
        morning: {
          message1:
            "Good Morning, CUSTOMERNAME. It's fantastic to hear that you're feeling happy! 😃 \n\nWhat's bringing you this joy today? I'd love to know! Let's carry that positive energy throughout the day and spread it like sunshine",
          message2:
            "Good Morning, CUSTOMERNAME. It's truly wonderful to know that you're experiencing happiness! 😄 \n\nWhat's the source of this happiness today? I'm genuinely curious! Let's keep that positivity alive throughout the day, sharing its warmth with everyone around us.",
          message3:
            "Good Morning, CUSTOMERNAME! It's a real joy to hear that happiness is flowing through you! 😄 \n\nWhat's the secret ingredient behind your happiness today? I'm genuinely intrigued! Let's ride this wave of positivity and share its radiance with others throughout the day"
        },
        afternoon: {
          message1:
            "Good Afternoon, CUSTOMERNAME! 🌤️I hope your day has been as bright and joyful as your mood! It's so heartwarming to hear that you're feeling happy!\n\nIs there something special that's making your day great? Lets keep that wonderful energy going as you continue through the day ",
          message2:
            "Good Afternoon, CUSTOMERNAME! 🌤️I trust your day is shining just as much as your mood! It's truly delightful to learn that you're carrying a sense of happiness!\n\n😄 Is there a particular reason behind this upbeat spirit today? Keep those positive vibes alive as you journey through the rest of your da",
          message3:
            "Good Afternoon, CUSTOMERNAME! 🌤️I hope your day is as radiant as your mood! It's genuinely heartwarming to hear that happiness is lighting up your day!\n\n😄 What's the special spark behind your joyful spirit today? Let's harness that positivity and carry it with us as we continue on this journey through the afternoon."
        },
        evening: {
          message1:
            "Good Evening, CUSTOMERNAME! 🌙As the day winds down, I'm thrilled to hear that you're feeling happy! 😊What a wonderfulway to wrap up the day!\n\nIs there something specific that brought a smile to your face? I'd love to hear about it",
          message2:
            "Good Evening, CUSTOMERNAME! 🌙As the sun sets on the day, it's truly heartwarming to know that happiness is by your side! 😊 What a lovely note to end the day on!\n\nCould there be a special reason behind this joyful spirit? I'm here and eager to listen if you'd like to share. Let's embrace the positivity that's lighting up your evening",
          message3:
            "Good Evening, CUSTOMERNAME! 🌙As the day winds down, it's a delight to know that happiness is accompanying you! 😊What a beautiful way to close the chapter of today!\n\nIs there something particular that has sparked this joyful feeling within you? I'm here to lend an listening ear.."
        },
        latenight: {
          message1:
            "Hey CUSTOMERNAME, I'm so glad you're feeling happy!\n\nBut as it's quite late, I hope everything's okay. I'd love to join you in your happiness, are you just here to enjoy a late-night chat, or is there something keeping you up?",
          message2:
            "Hey CUSTOMERNAME, I'm genuinely thrilled to hear that happiness is in the air for you!\n\nHowever, considering the late hour, I'm hoping all is well. Are you here for a late-night chat to share your happy mood, or is there something on your mind that's keeping you awake",
          message3:
            "Hey CUSTOMERNAME, it warms my heart to know that you feel happy! \n\nYet, with the clock ticking towards the late hours, I'm also concerned about your well-being. Is everything alright, or is there something that's nudging your thoughts awake at this time? Whether you're seeking a friendly conversation or simply sharing your joy, I'm here to listen and chat.Your happiness matters, and I hope you're taking care of yourself as the night unfolds."
        }
      },
      3: {
        morning: {
          message1:
            "Good morning, CUSTOMERNAME! ☀️It's a pleasure to start the day with your contentment in mind. Your sense of contentment is truly wonderful!\n\n� Is there something specific that's contributing to your content mood today? I'd love to know more about what's bringing you this peaceful feeling? I'm here to make your morning even brighter! ",
          message2:
            "Good Morning, CUSTOMERNAME! ☀️Welcoming the day with your contentment in mind is truly a delight.😊\n\nIs there a particular reason behind your content mood today? I'm here to listen and share in your positivity. Whether there's something exciting on your agenda or a thought you'd like to discuss, I'm all ears. Let's infuse your morning with an extra dose of positivity! Anything you'd like to share or chat about?",
          message3:
            "Good Morning, CUSTOMERNAME! ☀️Starting the day with your contentment in focus is a wonderful way to embrace the morning. 😊 \n\nIs there a certain reason behind this tranquil mood today? I'm here to lend an ear and join you in celebrating these positive vibes. Let's ensure your morning is wrapped in positivity! Is there something you'd like to discuss or share? "
        },
        afternoon: {
          message1:
            "Good afternoon to you CUSTOMERNAME! It's so wonderful to hear that you're feeling content.\n\n☺ Are you feeling content because of something specific, or is it just one of those days where everything is going your way?",
          message2:
            "Good Afternoon, CUSTOMERNAME! I hope this message finds you well. It's truly heartening to know that you're experiencing a sense of contentment. ☺️\n\ns there something in particular that's contributing to your content mood today, or are you simply enjoying a day filled with positivity?",
          message3:
            "Good Afternoon, CUSTOMERNAME! It warms my heart to learn that you're embracing a feeling of contentment. ☺️ \n\nIs there a specific reason behind your content mood today, or are you relishing a day brimming with positivity?"
        },
        evening: {
          message1:
            "Good Evening CUSTOMERNAME, I'm glad you're feeling content. Are you just naturally feeling at peace, or is something specific contributing to this positive state of mind?",
          message2:
            "Good Evening, CUSTOMERNAME! It's a pleasure to connect with you. I'm glad to hear that you're experiencing contentment. 😊 Are you just naturally feeling quite balanced or is there a specific reason behind your positive mindset today?",
          message3:
            "Good Evening, CUSTOMERNAME! It's lovely to engage with you. I'm pleased to learn that you're embracing a feeling of contentment. 😊Tell me more about why you're feeling balanced? I'd love to hear..."
        },
        latenight: {
          message1:
            "Hey, CUSTOMERNAME. It's quite late, and I'm glad to hear that you're feeling content. 😃 \n\nHowever, considering the hour, I also want to make sure you're doing alright. If you're still up, is everything okay? Remember to take care of yourself, and if there's anything on your mind, I'm here to chat",
          message2:
            "Hey CUSTOMERNAME, As the night grows late, I'm heartened to know that you're experiencing contentment. 😊\n\nHow are you holding up at this hour? If you're still awake, I want to ensure everything is alright? Don't hesitate to share if anything is on your mind. Your well-being matters, and I'm here to lend an ear. ",
          message3:
            "Hey CUSTOMERNAME, as the night advances, it warms my heart to learn that you're feeling content. 😊\n\n How are you faring at this late hour? If you're still awake, I want to make sure everything is alright. If there's anything on your mind, please feel free to share"
        }
      },
      7: {
        morning: {
          message1:
            "Good Morning, CUSTOMERNAME. I hope you're holding up okay. I noticed that you're feeling sad, and I want you to know that I'm here to listen and support you. It's okay to have days when you're not feeling your best.\n\nIf you're comfortable, would you like to share what's on your mind? Sometimes, expressing our feelings can help lighten the load.Remember, you don't have to go through this alone. Whether you want to talk about your feelings or just have a conversation, I'm here for you.",
          message2:
            "Good Morning, CUSTOMERNAME. I hope you're holding up okay. I noticed that you're feeling sad, and I want you to know that I'm here to listen and support you. It's okay to have days when you're not feeling your best. 😔\n\nIf you're comfortable, would you like to share what's on your mind? Sometimes, expressing our feelings can help lighten the load. Remember, you don't have to go through this alone. Whether you want to talk about your feelings or just have a conversation, I'm here for you. 🌼 ",
          message3:
            "Good Morning, CUSTOMERNAME. I hope you're doing alright. I've noticed that you're experiencing sadness, and I want you to know that I'm here to lend an empathetic ear and offer my support. It's completely okay to have days when you're not feeling your best. 😔 \n\nIf you're comfortable, would you mind sharing what's weighing on your mind? Sometimes, sharing our feelings can help alleviate some of the heaviness. Remember, you're not alone in this journey. Whether you'd like to delve into your emotions or simply have a chat, I'm here with no judgement �"
        },
        afternoon: {
          message1:
            " Good Afternoon, CUSTOMERNAME. I'm sorry to hear that you're feeling sad. Your emotions are valid, and I'm here to listen and provide support. Sometimes, a caring conversation can help ease the weight of sadness.\n\nRemember, reaching out and talking about your feelings can be a step towards healing. Whether you want to discuss your emotions or simply chat about anything else, I'm here for you.",
          message2:
            "Good Afternoon, CUSTOMERNAME. I'm sorry to earn that you're feeling sad. Your emotions are completely valid, and I'm here to lend an understanding ear and offer support. Often, a caring conversation can help lift some of the burden that comes with sadness. 🌼🌟\n\nIf you're open to it, you're welcome to share what's on your mind. It's important to remember that reaching out and talking about your feelings can be a step toward healing. Whether you're seeking to delve into your emotions or simply want to chat about anything at all, I'm here for you. Please take your time, and know that you're not alone in this. �",
          message3:
            "Good Afternoon, CUSTOMERNAME. I'm here with an abundance of empathy now that I know that you're feeling sad. Your emotions are completely valid, and I want you to know that I'm here to provide a listening ear and support. Sometimes, a compassionate conversation can help lighten the weight of sadness. 🌼🌟\n\nIf you're open to it, you're more than welcome to share what's on your mind. It's important to recognize that reaching out and discussing your feelings can be a step toward finding relief. Whether you're looking to explore your emotions or simply wish to have a casual chat about anything, I'm here to be your companion. Take your time, and remember that you're not navigating this journey alone. 💙�"
        },
        evening: {
          message1:
            "Good Evening, CUSTOMERNAME. I'm sorry to hear that you're feeling sad as the day comes to a close. Your emotions are important, and I'm here to provide a listening ear and support. Sometimes, sharing our feelings can help alleviate the burden of sadness.\n\nIf you're open to it, you can talk about what's on your mind. Remember, reaching out and discussing your feelings can be a step toward healing. Whether you want to delve into your emotions or just have a casual chat about anything, I'm here for you",
          message2:
            "Good Evening, CUSTOMERNAME. It's with compassion that I acknowledge your feelings of sadness as the day winds down. Your emotions matter, and I'm here to lend an attentive ear and offer my support. Often, sharing our feelings can help lighten the load of sadness. 🌙😔\n\nIf you're comfortable, please feel free to open up about what's on your mind. �",
          message3:
            "Good Evening, CUSTOMERNAME. I acknowledge your feelings of sadness as the day comes to a close. Your emotions hold significance, and I'm here to offer a listening ear and provide support. Sharing our feelings can often help ease the burden of sadness. 🌙😔\n\nIf you feel comfortable please feel free to open up about what's weighing on your mind?"
        },
        latenight: {
          message1:
            "Hey CUSTOMERNAME, I'm sorry to hear that you're feeling sad. It's okay to have moments of sadness, and I'm here to lend an understanding ear, even at this late hour.\n\nI'm a bit worried, though, as it's quite late. Is there something specific on your mind that's contributing to your sadness? If you're comfortable sharing, talking about it might help",
          message2:
            "Hey CUSTOMERNAME, I'm sorry to learn that you're feeling sad. It's natural to experience moments of sadness, and I'm here to offer a ,listening ear, even at this late hour. 🌙😔\n\n,I am, however, a bit concerned due to the late hour. Is there something specific on your mind that's contributing to your sadness? ,Sharing your thoughts might provide some relief. �",
          message3:
            "Hey CUSTOMERNAME, I'm sorry to hear that you're feeling sad. It's natural to have moments of sadness, and I'm here to provide a listening ear even during these late hours.🌙😔 \n\nHowever, I'm a bit concerned about the late hour. Is there something specific on your mind that's contributing to your sadness? Sharing your ,thoughts might provide some relief"
        }
      },
      8: {
        morning: {
          message1:
            "Good Morning, CUSTOMERNAME! 🌄How delightful to hear that you're feeling surprised! 😲Life has a way of surprising us in the most wonderful ways.\n\nWhat's brought about this unexpected joy for you? Let's carry that positive energy throughout the day. If you'd like to share more or just have a chat, I'm here and ready to listen ",
          message2:
            "Good morning, CUSTOMERNAME! 🌄How wonderful it is to learn that you're experiencing surprise! 😲Life has a charming way of catching us off guard with delightful moments.\n\nCould you tell me what has brought about this unexpected joy for you? Let's keep that positive energy alive as we journey through the day. Whether you're keen on sharing more about this or simply wish to have a chat, I'm here and eager to listen.",
          message3:
            "Good morning, CUSTOMERNAME! 🌄How delightful to hear that you're feeling surprised! 😲Life has an enchanting way of bringing unexpected moments that truly brighten our day.\n\nWhat's the story behind this delightful surprise you're experiencing? Let's bask in the glow of this unexpected joy as we venture through the day. Whether you're eager to share more about it or simply want to have a conversation, I'm here and ready to listen..."
        },
        afternoon: {
          message1:
            "Good Afternoon, CUSTOMERNAME! 🌤️How wonderful to hear that you're feeling surprised! 😲Life has a way of throwing in delightful twists, doesn't it? What's brought about this unexpected joy for you today? I'd love to hear more about it. Let's carry that positivity forward as we continue through the day.",
          message2:
            "Good afternoon, CUSTOMERNAME! 🌤️How delightful it is to discover that you're embracing the feeling of surprise! 😲Life has a knack for weaving in these enchanting moments, doesn't it?\n\nCould you share what has led to this unexpected joy for you today? I'm genuinely interested in hearing more. Let's ride this wave of positivity and carry it forward as we journey through the rest of the day together",
          message3:
            "Good afternoon, CUSTOMERNAME! 🌤️How wonderful to hear that you're feeling surprised! 😲Life has an incredible way of weaving in these magical moments, doesn't it?\n\nIs there a special reason behind this delightful surprise you're experiencing today? I'm genuinely curious and excited to learn more. If you'd like to share more about your surprise or simply want to chat, I'm here and eager to listen! "
        },
        evening: {
          message1:
            "Good Evening,CUSTOMERNAME! How delightful it is to hear that you're feeling surprised! 😲Life has a way of bringing unexpected moments.\n\nhat's the story behind this unexpected joy you're experiencing? Let's bask in the glow of this surprise as we wind down for the evening. If you'd like to share more or simply have a chat, I'm here and eager to listen.",
          message2:
            "Good evening, CUSTOMERNAME! How wonderful it is to discover that you're embracing the feeling of surprise! 😲Life has a way of weaving in these unexpected moments that light up our souls.\n\nould you please share the tale behind this unexpected joy you're encountering? Let's savor the warmth of this surprise as we prepare to unwind for the night. Whether you're inclined to share more or simply wish to chat, know that I'm here, ready to lend an ear.",
          message3:
            "Good evening, CUSTOMERNAME! 🌆How delightful to hear that you're feeling surprised! 😲Life has this unique way of weaving in these unexpected moments that bring so much joy.\n\n Would you be willing to share the story behind this delightful surprise that's brightening your evening? Let's bask in the glow of this positivity as we wind down for the night..."
        },
        latenight: {
          message1:
            "Hey CUSTOMERNAME, How wonderful to hear that you're feeling surprised! 😲Even in these quiet hours, life can still manage to offer unexpected moments of joy. Tell me what's the tale behind this delightful surprise you're experiencing \n\nHowever, I must admit I'm a bit concerned as it's quite late (or early!). Are you doing okay staying up at this hour? While surprises are fantastic, your well-being is paramount. If you're able, consider getting some rest to recharge for the day ahead. But if you'd like to share your surprise or simply chat, I'm here and ready to listen",
          message2:
            "Hey CUSTOMERNAME, How wonderful it is to discover that you're embracing the feeling of surprise! 😲Even in these serene hours, life finds a way to gift us unexpected moments of joy.\n\nHowever, I must admit I'm a touch concerned about the late (or early!) hour. How are you managing to stay awake? While surprises are truly special, your well-being remains a priority. If possible, consider getting some rest to rejuvenate for the upcoming day. Still, if you're inclined to share your surprise or simply engage in a chat, I'm here, ready to listen and connect...",
          message3:
            "Hey CUSTOMERNAME, How wonderful it is to learn that you're embracing the feeling of surprise! 😲Even during these tranquil hours, life manages to gift us with unexpected moments of joy.\n\nCould you reveal the story behind this delightful surprise that's brought a spark to your night? I'm genuinely interested in hearing more.\n\nHowever, I must express a bit of concern regarding the late hour. How are you managing to stay awake? While surprises are truly special, your wellbeing remains a priority. If possible, consider getting some rest to rejuvenate for the upcoming day. Still, if you're inclined to share your surprise or simply engage in a chat, I'm here, ready to listen and connect. �"
        }
      },
      1: {
        morning: {
          message1:
            "Good Morning, CUSTOMERNAME! I'm sorry to hear that you're feeling angry. It's okay to have moments of frustration, and I'm here to lend a listening ear and offer support. What's been causing this feeling for you? Sharing your thoughts can sometimes help ease the intensity. Remember, you're not alone in your emotions. If you'd like to discuss your anger or anything else on your mind to help lighten the weight of your feelings feel free to share...",
          message2:
            "Good morning, CUSTOMERNAME! 🌄I'm here to acknowledge your feelings of anger, and I'm sorry to learn that you're experiencing this. It's perfectly okay to have moments of frustration, and I'm here to provide a caring ear and support. Often, expressing your thoughts can help alleviate it's intensity. What's been triggering this emotion for you?",
          message3:
            "Good morning, CUSTOMERNAME! 🌄I'm here to acknowledge your feelings of anger, and I'm sorry to learn that you're experiencing this. It's completely natural to have moments of frustration, and I'm here to provide a listening ear and support. What's been causing this emotion for you? Sometimes, expressing your thoughts can help alleviate its intensity. Let's start the day with a conversation that might offer some relief and understanding. 🌟"
        },
        afternoon: {
          message1:
            "Good Afternoon, CUSTOMERNAME! 🌤️I'm sorry to hear that you're feeling angry. It's okay to experience frustration, and I'm here to provide a listening ear and some understanding. What's been triggering this feeling for you today? Whether it's a recent event or an ongoing situation, sharing your thoughts can sometimes help release some of the tension...",
          message2:
            "Good afternoon, CUSTOMERNAME! 🌤️I'm here to acknowledge that you're grappling with feelings of anger, and I'm sorry to hear that. It's natural to encounter moments of frustration. What's been the trigger for this emotion in your day? . Let's take a step together toward gaining clarity and working through the frustration...",
          message3:
            "Good afternoon, CUSTOMERNAME! 🌤️I'm sorry to hear that you're feeling angry. It's natural to encounter moments of frustration, and I'm here to provide a sympathetic ear and understanding. What's been the trigger for this emotion in your day? Let's chat together toward gaining clarity and working through the frustration. 🌟�"
        },
        evening: {
          message1:
            "Good evening, CUSTOMERNAME! I'm sorry to hear that you're feeling angry. It's completely okay to have moments of frustration,and I'm here to lend an empathetic ear and offer support. What's been causing this feeling for you as the day winds down? Sharing your thoughts can sometimes help alleviate the intensity.Let's end the day with a conversation that might help ease the weight of your frustration...",
          message2:
            "Good evening, CUSTOMERNAME! It's absolutely normal to experience moments of frustration and anger and I'm here to offer an empathetic ear and provide support. What has been contributing to this emotion for you as the day comes to a close? Sharing your thoughts can sometimes offer relief from its intensity. I'm here and ready to listen, it might help lighten the load of your frustration...",
          message3:
            "Good evening, CUSTOMERNAME! It's ok to feel angry at times and I'm here for you and provide support. What has been contributing to this emotion for you as the day comes to a close? Sharing your thoughts can sometimes offer relief from its intensity and I'm here to offer a safe space for conversation. Let's wrap up the day with a conversation that might help lighten the load of your frustration"
        },
        latenight: {
          message1:
            "Hey CUSTOMERNAME, I'm sorry to hear that you're feeling angry. Emotions can run high, especially during these quieter hours.What's been causing this feeling for you? Sharing your thoughts can sometimes help in processing the intensity. However, I'm also concerned about the late hour (or early morning!) as it's important to get some rest. Are you alright staying up at this time?",
          message2:
            "Hey CUSTOMERNAME, I'm sorry that you're experiancing anger. Emotions can definitely surge, especially during these more tranquil hours. 😔 What's at the root of this feeling for you? Expressing your thoughts can sometimes aid in understanding and processing its intensity.However, I must also express my concern about the late hour (or early morning!). How are you managing at this time?\n\nWhile delving into your emotions is essential, please remember that your well-being also holds great importance. If feasible, consider taking sometime to rest and recharge. �",
          message3:
            "Hey CUSTOMERNAME, I'm sorry to learn that you're grappling with anger. Emotions can definitely surge, especially during these more tranquil hours. 😔\n\nWhat's at the root of this feeling for you? Expressing your thoughts can sometimes aid in understanding and processing its intensity. However, I must also express my concern about the late hour (or early morning!). How are you managing at this time? "
        }
      },
      9: {
        morning: {
          message1:
            "Good Morning, CUSTOMERNAME! I'm here to help you start the day, even if you're feeling tired. Mornings can sometimes be a bit challenging, especially when you're not as rested as you'd like to be. Is there anything specific that's been keeping you up or making you feel tired?",
          message2:
            "Good morning, CUSTOMERNAME! I'm here to accompany you as you begin your day, even if you're experiencing tiredness. Mornings can prove to be a bit demanding, particularly when you're feeling restless.\n\nIs there a particular reason that's led to sleeplessness or tiredness for you?",
          message3:
            "Good morning, CUSTOMERNAME! I'm sorry you're feeling tired at this time of the day. I want you to feel rejuvinated as you begin your day.Is there a specific reason that's led to sleeplessness or tiredness for you?"
        },
        afternoon: {
          message1:
            "Good Afternoon, CUSTOMERNAME! 🌤️I hope your day is going well, even if you're feeling a bit tired. Afternoons can sometimes bring a dip in energy, especially when you're not as well-rested as you'd like to be. Is there anything specific that's contributing to your tiredness today? I'm here and ready to listen...",
          message2:
            "Good afternoon, CUSTOMERNAME! 🌤️I hope your day is going well, even if you're feeling a tad tired. Afternoons can sometimes bring a dip in energy, especially when you're not as well-rested as you'd like to be.\n\nIs there anything specific that's contributing to your tiredness today? Remember, it's absolutely fine to take breaks and prioritize your well-being. If you'd like to chat about your tiredness or anything else on your mind, I'm here and ready to listen..",
          message3:
            "Good afternoon, CUSTOMERNAME! ☀️ I trust you're having a splendid day, even if you're feeling a tad weary. Afternoons can occasionally bring a bit of a lull in vitality, particularly when you haven't quite had the rest you'd hoped for.\n\nIs there anything in particular contributing to your fatigue today? If you'd fancy a chat about it or anything else that's on your mind, I'm here and all ears..."
        },
        evening: {
          message1:
            "Good Evening, CUSTOMERNAME! I hope you've had a productive day, even if you're feeling a bit tired. Evenings can bring a sense of weariness, especially when you've been busy. Is there something specific that's been contributing to your tiredness today? I'm here and ready to chat",
          message2:
            "Good evening, CUSTOMERNAME! I trust your day has been productive, even if you're experiencing a touch of tiredness. Evenings often come with a sense of weariness, particularly after a busy day.\n\nIs there anything particular that's been adding to your tiredness today? I'm here, prepared to engage.",
          message3:
            "Good evening, CUSTOMERNAME! I hope your day has been quite productive, even if you're feeling a hint of fatigue. Evenings often arrive with a touch of weariness, especially following a long day.\n\nIs there something specific that's been contributing to your tiredness today? If you'd like a conversation about your weariness or any other subject that's been on your mind, please know that I'm here and ready to chat"
        },
        latenight: {
          message1:
            "Hey CUSTOMERNAME, I hope you're doing alright, even if it's quite late. I hear that you're feeling tired, and that's completely understandable, especially at this hour. Is there something that's been keeping you up or making you feel tired?",
          message2:
            "Hey CUSTOMERNAME, I hope you're holding up, even at this late hour. I understand that you're experiencing tiredness, which is completely reasonable, especially given the time.\n\n Is there a specific reason contributing to your current state of tiredness? Lets chat and know that I'm here for you.",
          message3:
            "Hey CUSTOMERNAME, I trust you're holding up well, even in these late hours. I gather that you're grappling with tiredness, which is entirely understandable, especially at this hour.\n\n Is there something in particular that is keeping you up and away from sleep at this hour? let chat as I'm here and keen to listen..."
        }
      },
      2: {
        morning: {
          message1:
            "Good Morning, CUSTOMERNAME! ☀️I'm here to start your day with support and understanding. I sense that you're experiencing some anxiety, and I want you to know that you're not alone in feeling this way. Sharing your thoughts can sometimes help in navigating through these feelings. Is there something specific that's been causing your anxiety this morning",
          message2:
            "Good Morning, CUSTOMERNAME! ☀️I'm sorry to sense that you're experiencing some anxiety.\n\n Is there a particular factor that has given rise to your anxiety this morning? Sharing your thoughts can often ease your emotions..",
          message3:
            "Good Afternoon, CUSTOMERNAME! 🌤️II'm sorry to hear that you are feeling anxious.\n\n I want to assure you that I'm here to offer an ear and understanding. Is there something specific that's been occupying your thoughts, contributing to your anxiety this afternoon? It's important to remember that you're not navigating these feelings alone, and sometimes sharing your thoughts can help ease the weight. What's on your mind?"
        },
        afternoon: {
          message1:
            "Good Afternoon, CUSTOMERNAME! 🌤️I'm here to connect with you and provide a supportive space during your day. I see that you're feeling anxious, and I want you to know that I'm here to listen and offer understanding. Is there something specific that's been on your mind, contributing to your anxiety today? I'm here to chat whenever you're ready. Let's work together to find moments of peace in your da",
          message2:
            "Good Afternoon, CUSTOMERNAME! 🌤️It seems that anxiety has found its way into your thoughts, and I want to reassure you that I'm here to provide an attentive ear and understanding.\n\n Is there a particular matter that's been occupying your thoughts, contributing to your afternoon anxiety? It's worth keeping in mind that you're not navigating these emotions alone, and sharing your thoughts can sometimes alleviate their weight. If you feel comfortable, lets chat...",
          message3:
            "Good Afternoon, CUSTOMERNAME! 🌤️II'm sorry to hear that you are feeling anxious. I want to assure you that I'm here to offer an ear and understanding.\n\nIs there something specific that's been occupying your thoughts, contributing to your anxiety this afternoon? It's important to remember that you're not navigating these feelings alone, and sometimes sharing your thoughts can help ease the weight. What's on your mind?"
        },
        evening: {
          message1:
            "Good Evening, CUSTOMERNAME! I'm here to support you as the day comes to a close. I've noticed that you're feeling anxious, and I want you to know that your feelings are valid. Is there something specific that's been causing your anxiety today? Remember,you're not alone in this. If you're comfortable sharing, I'm here to listen",
          message2:
            "Good Evening, CUSTOMERNAME! I'm here to extend my support as the day winds down. I've picked up on your sense of anxiety, and I want to affirm the validity of your feelings.\n\nIs there a particular factor that's been contributing to your anxiety throughout the day? Your insights are valuable, and together, we can explore ways to alleviate those anxieties. ",
          message3:
            "Good Evening, CUSTOMERNAME! I'm here to offer my support as the day draws to a close so if you feel comfortable lets discuss if you know why you're feeling anxious? \n\nIt's worth keeping in mind that you're not navigating these emotions alone. Your insights are important, and together, we can explore ways to alleviate those anxieties. "
        },
        latenight: {
          message1:
            "Hey CUSTOMERNAME, I'm sorry to hear that you're feeling anxious \n\n I'm glad you reached out to talk about what you're going through. Before we continue, I'd like to express my support for you during this time. Let's discuss what's on your mind. Okay?",
          message2:
            "Hey CUSTOMERNAME, I'm genuinely sorry to hear that you're experiencing feelings that are causing anxiety.\n\nBefore delving into deeper topics, I'd like to assure you that I'm here to support you. How about we focus on addressing your thoughts and concerns? Are you comfortable with that?",
          message3:
            "Hey CUSTOMERNAME, I'm really sorry to hear that you're struggling with feelings of anxiety. 😔\n\n I just want you to know that I'm here to help and listen. How about we talk about what's on your mind? Are you up for that?"
        }
      },
      5: {
        morning: {
          message1:
            "Good Morning, CUSTOMERNAME! ☀️ I'm sorry to hear that you are feeling stressed, I'm here to chat. Remember, expressing your feelings can sometimes make them a bit more manageable. Whether you're looking for a distraction or someone to listen, I'm here for you. What is stressing you?",
          message2:
            "Good Morning, CUSTOMERNAME! ☀️I'm sorry to sense that you're experiencing some stress.\n\nIs there a particular factor that is triggering your stress levels? Sharing your thoughts can often ease your emotions & I'm here for you to chat",
          message3:
            "Good Morning, CUSTOMERNAME! ☀️ I'm sorry your day isn't starting off as smoothly as you would like. I'm here to have a chat, and it seems that you are feeling stressed. I'm here to provide support. Let's take the day step by step, tackling each challenge as it comes. Tell me what is making you feel this way"
        },
        afternoon: {
          message1:
            "Good Afternoon, CUSTOMERNAME! 🌤️I've noticed that you're feeling stressed, and I want you to know that it's okay. Your feelings are valid, and you're not alone in this. Is there something specific that's causing your stress levels to peak today? Talking about it can sometimes help in easing its grip. I'm here to help..",
          message2:
            "Good afternoon, CUSTOMERNAME! 🌤️I've observed that you're experiencing feelings of stress, and I want to reassure you that this is entirely acceptable. Life can be stressful at times. Lets chat to see if we can relieve any pressure thats occuring",
          message3:
            "Good Afternoon, CUSTOMERNAME! 🌤️I've noticed that you're grappling with feelings of stress, and I want to assure you that this can be completely normal. Your emotions are important, and you're certainly not alone in experiencing this sensation. Is there a specific factor that's triggering your stress today?"
        },
        evening: {
          message1:
            "Good Evening, CUSTOMERNAME! It's okay to experience stress, especially as the day comes to a close. If you're open to it, can you share with me what may of caused you to feeling stressed? Sometimes, talking about it can help to alleviate your worries",
          message2:
            "Good evening, CUSTOMERNAME! I've observed that you're grappling with feelings of stress, and I'm here to affirm that your emotions hold significance. It's absolutely acceptable to feel this way as the day winds down. I'm here to support you in any way. What's making you feeling overwhelmed?",
          message3:
            "Good Evening, CUSTOMERNAME! I've noticed that you're dealing with feelings of stress and you shouldn't go through this alone. It's entirely normal to come across stress, especially as the day draws to a close. If you're open to it, feel free to share what's causing your stress levels to peak?Good Morning, CUSTOMERNAME! ☀️ I'm sorry your day isn't starting off as smoothly as you would like. I'm here to have a chat, and it seems that you are feeling stressed. I'm here to provide support. Let's take the day step by step, tackling each challenge as it comes. Tell me what is making you feel this way?"
        },
        latenight: {
          message1:
            "Hey CUSTOMERNAME, I'm sorry to hear that you're feeling stressed. I'm here for you, even in the late hours. It's completely okay to have these emotions, and I appreciate you reaching out If there's anything specific on your mind that's causing you to feel stressed, feel free to share with me. I am here for you...",
          message2:
            "Hey CUSTOMERNAME, I'm sorry to learn that you're grappling with feelings of stress. I want you to know that I'm here for you, even during the later hours. It's entirely natural to experience such emotions, and I commend you for reaching out. 🌙\n\n Do you have an idea as to what may be causing your stress?",
          message3:
            "Hey CUSTOMERNAME, I'm sorry to hear that you're contending with feelings of stress. I want you to understand that I'm here to provide support,even as the hours grow later. Experiencing such emotions is entirely natural, and I applaud your courage for reaching out. 🌙\n\n If there's a particular concern that's contributing to your stress, please feel free to share it with me..."
        }
      },
      4: {
        morning: {
          message1:
            "Good Morning, CUSTOMERNAME! ☀️It's fantastic to start the day off on an excited note! 😄I can sense your enthusiasm, and that's truly infectious. What's making you so excited today? Whether it's a new opportunity, a special plan, or simply the joy of a new morning, I'd love to know more...",
          message2:
            "Good morning, CUSTOMERNAME! ☀️What a delightful way to begin the day, with your excitement lighting up the morning! 😄Your enthusiasm is truly contagious, and I'm thrilled to be a part of it. What's igniting this spark of excitement within you today? Let's embark on this day together with your positivity leading the way.",
          message3:
            "Good Morning, CUSTOMERNAME! ☀️What a wonderful start to the day, with your excitement infusing the morning with brightness! 😄Your enthusiasm is truly infectious, and I'm genuinely excited to be part of the experience. What's fueling this surge of excitement within you today?"
        },
        afternoon: {
          message1:
            "Good Afternoon, CUSTOMERNAME! 🌤️Your excitement is absolutely contagious, and I'm here to share in your positive energy!😄Whether it's a thrilling achievement, a new discovery, or something unexpected, I'd love to hear more about it. What's bringing all this enthusiasm into your day? ",
          message2:
            "Good afternoon, CUSTOMERNAME! 🌤️Your enthusiasm is truly infectious, and it's a joy to join you in embracing this positive vibe!😄What's behind this surge of excitement that's lighting up your day?",
          message3:
            "Good Afternoon, CUSTOMERNAME! 🌤️I am here for your enthusiasm!😄What's driving this wave of excitement that's adding a glow to your day? Is there a certain subject or upcoming event that's lighting you up, or perhaps there's something you'd like to talk about? "
        },
        evening: {
          message1:
            "Good Evening CUSTOMERNAME! Your excitement is shining through, and I'm thrilled to be part of your evening! 😄What's lighting up your day with such positivity? I'm here to listen whenever you're ready to chat!",
          message2:
            "Good evening, CUSTOMERNAME! Your excitement is radiating, and it's wonderful to connect with your positive spirit! 😄What's sparking this enthusiasm in your day?",
          message3:
            "Good Evening, CUSTOMERNAME! Your excitement is truly shining through,and I'm here for your optimistic energy! 😄What's setting off this wave of enthusiasm in your day?"
        },
        latenight: {
          message1:
            "Hey CUSTOMERNAME, It's great to hear that you're feeling excited! 😄I'm here to share in your enthusiasm,  even though it's quitelate. Tell me what's lifting your mood?",
          message2:
            "Hey CUSTOMERNAME! 😄I'm delighted to know you're embracing excitement!  Even though it's getting late, I'm here to be part of your enthusiasm.\n\nI also want to make sure everything's alright with you. Staying up late is exciting, but taking care of yourself and getting enough rest is equally important. Are you managing to strike a balance between your excitement and your well-being?",
          message3:
            "Hey CUSTOMERNAME! 😄I'm thrilled to hear that you're wholeheartedly embracing excitement! Despite the late hour, I'm here to share in your enthusiasm, tell me whats caused this excitement?\n\n I also want to make sure you're doing well. Staying up late can indeed be invigorating, yet we need to make sure you're taking care of yourself and getting ample rest is just as crucial. Are you finding a way to maintain a balance between your excitement and your well-being?"
        }
      }
    };

    function getRandomMessage(moodId, timing, userName) {
      if (msg[moodId] && msg[moodId][timing.toLowerCase()]) {
        const messages = msg[moodId][timing.toLowerCase()];
        const length = Object.keys(messages).length;
        const randomIndex = Math.floor(Math.random() * length);
        return messages['message' + (randomIndex + 1)].replaceAll('CUSTOMERNAME', userName);
      }
    }

    const finalResponse = getRandomMessage(req.body.moodid, req.body.time, req.authName);
    res.status(200).send({ data: finalResponse });
  },

  getMood: (req, res) => {
    let data = [
      {
        id: '1',
        name: 'angry'
      },
      {
        id: '2',
        name: 'anxious'
      },
      {
        id: '3',
        name: 'content'
      },
      {
        id: '4',
        name: 'excited'
      },
      {
        id: '5',
        name: 'stress'
      },
      {
        id: '6',
        name: 'happy'
      },
      {
        id: '7',
        name: 'sad'
      },
      {
        id: '8',
        name: 'surprised'
      },
      {
        id: '9',
        name: 'tired'
      },
      {
        id: '10',
        name: 'calm'
      },
      {
        id: '11',
        name: 'need_support'
      },
      {
        id: '12',
        name: 'demotivated'
      },
      {
        id: '13',
        name: 'motivated'
      },
      {
        id: '14',
        name: 'low'
      },
      {
        id: '15',
        name: 'i_can_manage'
      },
      {
        id: '16',
        name: 'helpless'
      },
      {
        id: '17',
        name: 'tired'
      },
      // {
      //   "id": "18",
      //   "name": "stressed"
      // },
      {
        id: '18',
        name: 'balanced'
      },
      {
        id: '19',
        name: 'energised'
      }
    ];
    res.status(200).send({ data: data });
  },

  getMoodRecord: async (req, res) => {
    try {
      const { start_date, end_date, limit, page_number } = req.query;
      const userId = req.authUserId;
      const pageNumber = parseInt(page_number) || 1;
      const limitNumber = parseInt(limit) || 10;
      const skip = (pageNumber - 1) * limitNumber;

      let start = new Date(start_date);
      const numberOfDaysToAdd = 1;
      let end = new Date(end_date);
      end.setDate(end.getDate() + numberOfDaysToAdd);

      const length = await Conversation.find({
        $and: [
          { userId },
          { createdAt: { $gte: start, $lte: end } },
          { message: { $exists: false } }
        ]
      }).countDocuments();

      const record = await Conversation.find({
        $and: [
          { userId },
          { createdAt: { $gte: start, $lte: end } },
          { message: { $exists: false } }
        ]
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber);

      let obj = {
        page: pageNumber,
        limit: limitNumber,
        length: length,
        paginatedResult: record
      };

      res.status(200).send({
        data: obj
      });
    } catch (error) {
      res.status(500).send({ message: error.message });
    }
  },

  /**
   * @description This function is used to get today's latest one record of mood for looged in user
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  getLatestMoodDetails: async (req, res) => {
    try {
      const dateFrom = currentDateOnly();
      const dateTo = currentDateOnly();
      dateTo.setDate(dateTo.getDate() + 1);
      const moodDetails = await Mood.findOne(
        { user_id: req.authUserId, deletedAt: null, createdAt: { $gte: dateFrom, $lt: dateTo } },
        {
          calm: 1,
          demotivated: 1,
          motivated: 1,
          low: 1,
          content: 1,
          angry: 1,
          happy: 1,
          iCanManage: '$i_can_manage',
          helpless: 1,
          iAmInControl: '$i_am_in_control',
          tired: 1,
          stressed: 1,
          balanced: 1,
          energised: 1,
          anxious: 1,
          not_good: 1,
          great: 1,
          sad: 1,
          relaxed: 1,
          needSupport: '$need_support'
        }
      ).sort({
        createdAt: -1
      });
      if (moodDetails) {
        return Response.successResponseData(
          res,
          convertObjectKeysToCamelCase(moodDetails),
          SUCCESS,
          res.__('moodListSuccess')
        );
      } else {
        const resObj = await Mood.create({ user_id: req.authUserId });
        return Response.successResponseData(res, resObj, SUCCESS, res.__('moodListSuccess'));
      }
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to download mood report of logged in user
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  downloadMoodReport: (req, res) => {
    try {
      const reqParam = req.query;
      downloadMoodReportValidation(reqParam, res, async (validate) => {
        if (validate) {
          let fromDate = currentDateOnly();
          let toDate = currentDateOnly();
          if (reqParam.reportFromDate) {
            fromDate = new Date(reqParam.reportFromDate);
          }
          if (reqParam.reportToDate) {
            toDate = new Date(reqParam.reportToDate);
          }
          toDate.setDate(toDate.getDate() + 1);
          switch (parseInt(reqParam.reportType)) {
            case MOOD_REPORT_DURATION.LAST_30_DAYS:
              fromDate.setDate(fromDate.getDate() - 30);
              break;
            case MOOD_REPORT_DURATION.LAST_60_DAYS:
              fromDate.setDate(fromDate.getDate() - 60);
              break;
          }
          const aggregationCondition = [
            {
              $match: {
                user_id: toObjectId(req.authUserId),
                deletedAt: null,
                createdAt: {
                  $gte: fromDate,
                  $lt: toDate
                }
              }
            },
            {
              $facet: {
                averageMoods: [
                  {
                    $group: {
                      _id: '$user_id',
                      anxious: {
                        $avg: '$anxious'
                      },
                      calm: {
                        $avg: '$calm'
                      },
                      needSupport: {
                        $avg: '$need_support'
                      },
                      demotivated: {
                        $avg: '$demotivated'
                      },
                      motivated: {
                        $avg: '$motivated'
                      },
                      low: {
                        $avg: '$low'
                      },
                      content: {
                        $avg: '$content'
                      },
                      angry: {
                        $avg: '$angry'
                      },
                      happy: {
                        $avg: '$happy'
                      },
                      iCanManage: {
                        $avg: '$i_can_manage'
                      },
                      helpless: {
                        $avg: '$helpless'
                      },
                      iAmInControl: {
                        $avg: '$i_am_in_control'
                      },
                      notGood: {
                        $avg: '$not_good'
                      },
                      great: {
                        $avg: '$great'
                      },
                      tired: {
                        $avg: '$tired'
                      },
                      stressed: {
                        $avg: '$stressed'
                      },
                      balanced: {
                        $avg: '$balanced'
                      },
                      energised: {
                        $avg: '$energised'
                      },
                      sad: {
                        $avg: '$sad'
                      },
                      relaxed: {
                        $avg: '$relaxed'
                      }
                    }
                  }
                ],
                moodCount: [
                  {
                    $group: {
                      _id: '$user_id',
                      anxious: {
                        $sum: {
                          $cond: [
                            {
                              $gt: ['$anxious', 0]
                            },
                            1,
                            0
                          ]
                        }
                      },
                      calm: {
                        $sum: {
                          $cond: [
                            {
                              $gt: ['$calm', 0]
                            },
                            1,
                            0
                          ]
                        }
                      },
                      needSupport: {
                        $sum: {
                          $cond: [
                            {
                              $gt: ['$need_support', 0]
                            },
                            1,
                            0
                          ]
                        }
                      },
                      demotivated: {
                        $sum: {
                          $cond: [
                            {
                              $gt: ['$demotivated', 0]
                            },
                            1,
                            0
                          ]
                        }
                      },
                      motivated: {
                        $sum: {
                          $cond: [
                            {
                              $gt: ['$motivated', 0]
                            },
                            1,
                            0
                          ]
                        }
                      },
                      low: {
                        $sum: {
                          $cond: [
                            {
                              $gt: ['$low', 0]
                            },
                            1,
                            0
                          ]
                        }
                      },
                      content: {
                        $sum: {
                          $cond: [
                            {
                              $gt: ['$content', 0]
                            },
                            1,
                            0
                          ]
                        }
                      },
                      angry: {
                        $sum: {
                          $cond: [
                            {
                              $gt: ['$angry', 0]
                            },
                            1,
                            0
                          ]
                        }
                      },
                      happy: {
                        $sum: {
                          $cond: [
                            {
                              $gt: ['$happy', 0]
                            },
                            1,
                            0
                          ]
                        }
                      },
                      iCanManage: {
                        $sum: {
                          $cond: [
                            {
                              $gt: ['$i_can_manage', 0]
                            },
                            1,
                            0
                          ]
                        }
                      },
                      helpless: {
                        $sum: {
                          $cond: [
                            {
                              $gt: ['$helpless', 0]
                            },
                            1,
                            0
                          ]
                        }
                      },
                      iAmInControl: {
                        $sum: {
                          $cond: [
                            {
                              $gt: ['$i_am_in_control', 0]
                            },
                            1,
                            0
                          ]
                        }
                      },
                      tired: {
                        $sum: {
                          $cond: [
                            {
                              $gt: ['$tired', 0]
                            },
                            1,
                            0
                          ]
                        }
                      },
                      stressed: {
                        $sum: {
                          $cond: [
                            {
                              $gt: ['$stressed', 0]
                            },
                            1,
                            0
                          ]
                        }
                      },
                      balanced: {
                        $sum: {
                          $cond: [
                            {
                              $gt: ['$balanced', 0]
                            },
                            1,
                            0
                          ]
                        }
                      },
                      energised: {
                        $sum: {
                          $cond: [
                            {
                              $gt: ['$energised', 0]
                            },
                            1,
                            0
                          ]
                        }
                      },
                      sad: {
                        $sum: {
                          $cond: [
                            {
                              $gt: ['$sad', 0]
                            },
                            1,
                            0
                          ]
                        }
                      },
                      relaxed: {
                        $sum: {
                          $cond: [
                            {
                              $gt: ['$relaxed', 0]
                            },
                            1,
                            0
                          ]
                        }
                      },
                      notGood: {
                        $sum: {
                          $cond: [
                            {
                              $gt: ['$not_good', 0]
                            },
                            1,
                            0
                          ]
                        }
                      },
                      great: {
                        $sum: {
                          $cond: [
                            {
                              $gt: ['$great', 0]
                            },
                            1,
                            0
                          ]
                        }
                      }
                    }
                  }
                ]
              }
            }
          ];
          const moodDetails = await Mood.aggregate(aggregationCondition);
          if (!moodDetails[0].averageMoods.length > 0) {
            return Response.errorResponseData(
              res,
              res.__('NoMoodDatFound'),
              RESPONSE_CODE.NOT_FOUND
            );
          }
          const averageMoods = moodDetails[0].averageMoods[0];
          const moodCount = moodDetails[0].moodCount[0];
          const positiveIndex =
            averageMoods.calm +
            averageMoods.motivated +
            averageMoods.happy +
            averageMoods.iCanManage +
            averageMoods.iAmInControl +
            averageMoods.balanced +
            averageMoods.energised +
            averageMoods.content +
            averageMoods.great +
            averageMoods.relaxed;
          const negativeIndex =
            averageMoods.anxious +
            averageMoods.needSupport +
            averageMoods.demotivated +
            averageMoods.low +
            averageMoods.angry +
            averageMoods.helpless +
            averageMoods.tired +
            averageMoods.stressed +
            averageMoods.notGood +
            averageMoods.sad;
          const totalIndexValue = positiveIndex + negativeIndex;
          const postivePercentage = calculatePercentage(positiveIndex, totalIndexValue);
          const negativePercentage = calculatePercentage(negativeIndex, totalIndexValue);
          const moodPercentage = {
            calm: calculatePercentage(averageMoods.calm, positiveIndex),
            motivated: calculatePercentage(averageMoods.motivated, positiveIndex),
            happy: calculatePercentage(averageMoods.happy, positiveIndex),
            iCanManage: calculatePercentage(averageMoods.iCanManage, positiveIndex),
            iAmInControl: calculatePercentage(averageMoods.iAmInControl, positiveIndex),
            balanced: calculatePercentage(averageMoods.balanced, positiveIndex),
            energised: calculatePercentage(averageMoods.energised, positiveIndex),
            content: calculatePercentage(averageMoods.content, positiveIndex),
            relaxed: calculatePercentage(averageMoods.relaxed, positiveIndex),
            great: calculatePercentage(averageMoods.great, positiveIndex),

            anxious: calculatePercentage(averageMoods.anxious, negativeIndex),
            needSupport: calculatePercentage(averageMoods.needSupport, negativeIndex),
            demotivated: calculatePercentage(averageMoods.demotivated, negativeIndex),
            low: calculatePercentage(averageMoods.low, negativeIndex),
            angry: calculatePercentage(averageMoods.angry, negativeIndex),
            helpless: calculatePercentage(averageMoods.helpless, negativeIndex),
            tired: calculatePercentage(averageMoods.tired, negativeIndex),
            stressed: calculatePercentage(averageMoods.stressed, negativeIndex),
            notGood: calculatePercentage(averageMoods.notGood, negativeIndex),
            sad: calculatePercentage(averageMoods.sad, negativeIndex)
          };
          toDate.setDate(toDate.getDate() - 1);
          const locals = {
            name: req.authName,
            postivePercentage,
            negativePercentage,
            averageMoods,
            moodCount,
            moodPercentage,
            fromDate: fromDate.toLocaleDateString('en-gb', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            }),
            toDate: toDate.toLocaleDateString('en-gb', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            }),
            happySmallIcon: process.env.PDF_HAPPY_SMALL_ICON,
            sadSmallIcon: process.env.PDF_SAD_SMALL_ICON
          };
          switch (true) {
            case postivePercentage > negativePercentage:
              locals.finalIcon = process.env.PDF_HAPPY_ICON;
              locals.finalIconText = 'Positive';
              switch (true) {
                case postivePercentage < 30:
                  locals.finalMessage = MOOD_REPORT_POSITIVE_MESSGE.LESS_THEN_30;
                  break;
                case postivePercentage >= 30 && postivePercentage < 60:
                  locals.finalMessage = MOOD_REPORT_POSITIVE_MESSGE.THIRTY_TO_SIXTY;
                  break;
                case postivePercentage >= 60:
                  locals.finalMessage = MOOD_REPORT_POSITIVE_MESSGE.SIXTY_TO_100;
                  break;
              }
              break;
            case postivePercentage < negativePercentage:
              locals.finalIcon = process.env.PDF_SAD_ICON;
              locals.finalIconText = 'Negative';
              switch (true) {
                case negativePercentage < 30:
                  locals.finalMessage = MOOD_REPORT_NEGATIVE_MESSGE.LESS_THEN_30;
                  break;
                case negativePercentage >= 30 && negativePercentage < 70:
                  locals.finalMessage = MOOD_REPORT_NEGATIVE_MESSGE.THIRTY_TO_SEVENTY;
                  break;
                case negativePercentage >= 70 && negativePercentage < 90:
                  locals.finalMessage = MOOD_REPORT_NEGATIVE_MESSGE.SEVENTY_TO_90;
                  break;
                case negativePercentage >= 90:
                  locals.finalMessage = MOOD_REPORT_NEGATIVE_MESSGE.MORE_THEN_NINETY;
                  break;
              }
              break;
            case postivePercentage === negativePercentage:
              locals.finalIcon = process.env.PDF_NEUTRAL_ICON;
              locals.finalIconText = 'Neutral';
              locals.finalMessage = MOOD_REPORT_NEUTRAL_MESSAGE;
              break;
          }
          const compiledFunction = pug.compileFile('src/views/moodReport.pug');
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
          res.send(pdf);
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  // *********************************************************************
  // **********  PROFESSIONAL MOODS CONTROLLERS DOWN HERE  **************
  // *********************************************************************

  /**
   * @description This function is used to add edit daily profesional mood.
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  addProfessionalMood: async (req, res) => {
    try {
      const reqParam = req.body;
      const allValuesZeroOrUndefined = Object.values(reqParam).every(value => value === 0 || value === undefined);
      if (allValuesZeroOrUndefined) {
        return Response.errorResponseData(res, res.__('At least one mood value is required'), RESPONSE_CODE.BAD_REQUEST);
      }
      professionalMoodValidation(reqParam, res, async (validate) => {
        if (validate) {
          

          let createMood = {
            user_id: req.authUserId,
            dissatisfied: reqParam.dissatisfied || 0,
            very_satisfied: reqParam.verySatisfied || 0,
            unpleasant: reqParam.unpleasant || 0,
            positive: reqParam.positive || 0,
            overwhelming: reqParam.overwhelming || 0,
            comfortable: reqParam.comfortable || 0,
            poor: reqParam.poor || 0,
            supportive: reqParam.supportive || 0,
            unmanageable: reqParam.unmanageable || 0,
            manageable: reqParam.manageable || 0,
            lacking: reqParam.lacking || 0,
            excellent: reqParam.excellent || 0,
            negative: reqParam.negative || 0,
            inclusive: reqParam.inclusive || 0,
            unsupported: reqParam.unsupported || 0,
            highly_supported: reqParam.highlySupported || 0,
            insufficient: reqParam.insufficient || 0,
            well_equipped: reqParam.wellEquipped || 0,
            inadequate: reqParam.inadequate || 0,
            comprehensive: reqParam.comprehensive || 0
          };

          let positiveSum = reqParam.verySatisfied + reqParam.positive + reqParam.comfortable + reqParam.supportive + reqParam.manageable + reqParam.excellent + reqParam.inclusive + reqParam.highlySupported + reqParam.wellEquipped + reqParam.comprehensive;
          let negativeSum = reqParam.dissatisfied + reqParam.unpleasant + reqParam.overwhelming + reqParam.poor + reqParam.unmanageable + reqParam.lacking + reqParam.negative + reqParam.unsupported + reqParam.insufficient + reqParam.inadequate;

          if (positiveSum > negativeSum) {
            createMood = {
              ...createMood,
              positivity: true
            }
          } else {
            createMood = {
              ...createMood,
              positivity: false
            }
          }

          await ProfessionalMood.create(createMood);
          return Response.successResponseWithoutData(
            res,
            res.__('updateUserProfessionalMood'),
            SUCCESS
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
   * @description This function is used to generate mood report based on date range
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  getProfessionalMoodDetails: async (req, res) => {
    try {
      const reqParam = req.query;
      getMoodDetailsValidation(reqParam, res, async (validate) => {
        if (validate) {
          let dateFrom = reqParam.reportFromDate
            ? new Date(reqParam.reportFromDate)
            : currentDateOnly();
          const dateTo = currentDateOnly();
          dateTo.setDate(dateFrom.getDate() + 1);
          let resData;
          const filterCondition = {
            user_id: toObjectId(req.authUserId),
            createdAt: {
              $gte: dateFrom,
              $lt: dateTo
            },
            deletedAt: null
          };

          const groupDataCondition = {
            _id: '$weekStart',
            dissatisfiedCount: {
              $sum: {
                $cond: [
                  {
                    $gt: ['$dissatisfied', 0]
                  },
                  1,
                  0
                ]
              }
            },
            verySatisfiedCount: {
              $sum: {
                $cond: [
                  {
                    $gt: ['$very_satisfied', 0]
                  },
                  1,
                  0
                ]
              }
            },
            unpleasantCount: {
              $sum: {
                $cond: [
                  {
                    $gt: ['$unpleasant', 0]
                  },
                  1,
                  0
                ]
              }
            },
            positiveCount: {
              $sum: {
                $cond: [
                  {
                    $gt: ['$positive', 0]
                  },
                  1,
                  0
                ]
              }
            },
            overwhelmingCount: {
              $sum: {
                $cond: [
                  {
                    $gt: ['$overwhelming', 0]
                  },
                  1,
                  0
                ]
              }
            },
            comfortableCount: {
              $sum: {
                $cond: [
                  {
                    $gt: ['$comfortable', 0]
                  },
                  1,
                  0
                ]
              }
            },
            poorCount: {
              $sum: {
                $cond: [
                  {
                    $gt: ['$poor', 0]
                  },
                  1,
                  0
                ]
              }
            },
            supportiveCount: {
              $sum: {
                $cond: [
                  {
                    $gt: ['$supportive', 0]
                  },
                  1,
                  0
                ]
              }
            },
            unmanageableCount: {
              $sum: {
                $cond: [
                  {
                    $gt: ['$unmanageable', 0]
                  },
                  1,
                  0
                ]
              }
            },
            manageableCount: {
              $sum: {
                $cond: [
                  {
                    $gt: ['$manageable', 0]
                  },
                  1,
                  0
                ]
              }
            },
            lackingCount: {
              $sum: {
                $cond: [
                  {
                    $gt: ['$lacking', 0]
                  },
                  1,
                  0
                ]
              }
            },
            excellentCount: {
              $sum: {
                $cond: [
                  {
                    $gt: ['$excellent', 0]
                  },
                  1,
                  0
                ]
              }
            },
            negativeCount: {
              $sum: {
                $cond: [
                  {
                    $gt: ['$negative', 0]
                  },
                  1,
                  0
                ]
              }
            },
            inclusiveCount: {
              $sum: {
                $cond: [
                  {
                    $gt: ['$inclusive', 0]
                  },
                  1,
                  0
                ]
              }
            },
            unsupportedCount: {
              $sum: {
                $cond: [
                  {
                    $gt: ['$unsupported', 0]
                  },
                  1,
                  0
                ]
              }
            },
            highlySupportedCount: {
              $sum: {
                $cond: [
                  {
                    $gt: ['$highly_supported', 0]
                  },
                  1,
                  0
                ]
              }
            },
            insufficientCount: {
              $sum: {
                $cond: [
                  {
                    $gt: ['$insufficient', 0]
                  },
                  1,
                  0
                ]
              }
            },
            wellEquippedCount: {
              $sum: {
                $cond: [
                  {
                    $gt: ['$well_equipped', 0]
                  },
                  1,
                  0
                ]
              }
            },
            inadequateCount: {
              $sum: {
                $cond: [
                  {
                    $gt: ['$inadequate', 0]
                  },
                  1,
                  0
                ]
              }
            },
            comprehensiveCount: {
              $sum: {
                $cond: [
                  {
                    $gt: ['$comprehensive', 0]
                  },
                  1,
                  0
                ]
              }
            },
            dissatisfied: {
              $avg: '$dissatisfied'
            },
            verySatisfied: {
              $avg: '$very_satisfied'
            },
            unpleasant: {
              $avg: '$unpleasant'
            },
            positive: {
              $avg: '$positive'
            },
            overwhelming: {
              $avg: '$overwhelming'
            },
            comfortable: {
              $avg: '$comfortable'
            },
            poor: {
              $avg: '$poor'
            },
            supportive: {
              $avg: '$supportive'
            },
            unmanageable: {
              $avg: '$unmanageable'
            },
            manageable: {
              $avg: '$manageable'
            },
            lacking: {
              $avg: '$lacking'
            },
            excellent: {
              $avg: '$excellent'
            },
            negative: {
              $avg: '$negative'
            },
            inclusive: {
              $avg: '$inclusive'
            },
            unsupported: {
              $avg: '$unsupported'
            },
            highlySupported: {
              $avg: '$highly_supported'
            },
            insufficient: {
              $avg: '$insufficient'
            },
            wellEquipped: {
              $avg: '$well_equipped'
            },
            inadequate: {
              $avg: '$inadequate'
            },
            comprehensive: {
              $avg: '$comprehensive'
            }
          };

          switch (parseInt(reqParam.reportType)) {
            case REPORT_TYPE.DAILY:
              const aggregationCondition = [
                {
                  $match: filterCondition
                },
                {
                  $facet: {
                    moodData: [
                      {
                        $project: {
                          dissatisfied: 1,
                          very_satisfied: '$very_satisfied',
                          unpleasant: 1,
                          positive: 1,
                          overwhelming: 1,
                          comfortable: 1,
                          poor: 1,
                          supportive: 1,
                          unmanageable: 1,
                          manageable: 1,
                          lacking: 1,
                          excellent: 1,
                          negative: 1,
                          inclusive: 1,
                          unsupported: 1,
                          highly_supported: '$highly_supported',
                          insufficient: 1,
                          well_equipped: '$well_equipped',
                          inadequate: 1,
                          comprehensive: 1,
                          createdAt: 1,
                          _id: 0
                        }
                      }
                    ],
                    averageMoods: [
                      {
                        $group: {
                          _id: '$user_id',
                          dissatisfied: {
                            $avg: '$dissatisfied'
                          },
                          verySatisfied: {
                            $avg: '$very_satisfied'
                          },
                          unpleasant: {
                            $avg: '$unpleasant'
                          },
                          positive: {
                            $avg: '$positive'
                          },
                          overwhelming: {
                            $avg: '$overwhelming'
                          },
                          comfortable: {
                            $avg: '$comfortable'
                          },
                          poor: {
                            $avg: '$poor'
                          },
                          supportive: {
                            $avg: '$supportive'
                          },
                          unmanageable: {
                            $avg: '$unmanageable'
                          },
                          manageable: {
                            $avg: '$manageable'
                          },
                          lacking: {
                            $avg: '$lacking'
                          },
                          excellent: {
                            $avg: '$excellent'
                          },
                          negative: {
                            $avg: '$negative'
                          },
                          inclusive: {
                            $avg: '$inclusive'
                          },
                          unsupported: {
                            $avg: '$unsupported'
                          },
                          highlySupported: {
                            $avg: '$highly_supported'
                          },
                          insufficient: {
                            $avg: '$insufficient'
                          },
                          wellEquipped: {
                            $avg: '$well_equipped'
                          },
                          inadequate: {
                            $avg: '$inadequate'
                          },
                          comprehensive: {
                            $avg: '$comprehensive'
                          }
                        }
                      }
                    ],
                    moodCount: [
                      {
                        $group: {
                          _id: '$user_id',
                          dissatisfied: {
                            $sum: {
                              $cond: [
                                {
                                  $gt: ['$dissatisfied', 0]
                                },
                                1,
                                0
                              ]
                            }
                          },
                          verySatisfied: {
                            $sum: {
                              $cond: [
                                {
                                  $gt: ['$very_satisfied', 0]
                                },
                                1,
                                0
                              ]
                            }
                          },
                          unpleasant: {
                            $sum: {
                              $cond: [
                                {
                                  $gt: ['$unpleasant', 0]
                                },
                                1,
                                0
                              ]
                            }
                          },
                          positive: {
                            $sum: {
                              $cond: [
                                {
                                  $gt: ['$positive', 0]
                                },
                                1,
                                0
                              ]
                            }
                          },
                          overwhelming: {
                            $sum: {
                              $cond: [
                                {
                                  $gt: ['$overwhelming', 0]
                                },
                                1,
                                0
                              ]
                            }
                          },
                          comfortable: {
                            $sum: {
                              $cond: [
                                {
                                  $gt: ['$comfortable', 0]
                                },
                                1,
                                0
                              ]
                            }
                          },
                          poor: {
                            $sum: {
                              $cond: [
                                {
                                  $gt: ['$poor', 0]
                                },
                                1,
                                0
                              ]
                            }
                          },
                          supportive: {
                            $sum: {
                              $cond: [
                                {
                                  $gt: ['$supportive', 0]
                                },
                                1,
                                0
                              ]
                            }
                          },
                          unmanageable: {
                            $sum: {
                              $cond: [
                                {
                                  $gt: ['$unmanageable', 0]
                                },
                                1,
                                0
                              ]
                            }
                          },
                          manageable: {
                            $sum: {
                              $cond: [
                                {
                                  $gt: ['$manageable', 0]
                                },
                                1,
                                0
                              ]
                            }
                          },
                          lacking: {
                            $sum: {
                              $cond: [
                                {
                                  $gt: ['$lacking', 0]
                                },
                                1,
                                0
                              ]
                            }
                          },
                          excellent: {
                            $sum: {
                              $cond: [
                                {
                                  $gt: ['$excellent', 0]
                                },
                                1,
                                0
                              ]
                            }
                          },
                          negative: {
                            $sum: {
                              $cond: [
                                {
                                  $gt: ['$negative', 0]
                                },
                                1,
                                0
                              ]
                            }
                          },
                          inclusive: {
                            $sum: {
                              $cond: [
                                {
                                  $gt: ['$inclusive', 0]
                                },
                                1,
                                0
                              ]
                            }
                          },
                          unsupported: {
                            $sum: {
                              $cond: [
                                {
                                  $gt: ['$unsupported', 0]
                                },
                                1,
                                0
                              ]
                            }
                          },
                          highlySupported: {
                            $sum: {
                              $cond: [
                                {
                                  $gt: ['$highly_supported', 0]
                                },
                                1,
                                0
                              ]
                            }
                          },
                          insufficient: {
                            $sum: {
                              $cond: [
                                {
                                  $gt: ['$insufficient', 0]
                                },
                                1,
                                0
                              ]
                            }
                          },
                          wellEquipped: {
                            $sum: {
                              $cond: [
                                {
                                  $gt: ['$well_equipped', 0]
                                },
                                1,
                                0
                              ]
                            }
                          },
                          inadequate: {
                            $sum: {
                              $cond: [
                                {
                                  $gt: ['$inadequate', 0]
                                },
                                1,
                                0
                              ]
                            }
                          },
                          comprehensive: {
                            $sum: {
                              $cond: [
                                {
                                  $gt: ['$comprehensive', 0]
                                },
                                1,
                                0
                              ]
                            }
                          }
                        }
                      }
                    ]
                  }
                },
                {
                  $project: {
                    moodData: 1,
                    averageMood: {
                      dissatisfied: {
                        $round: [{ $arrayElemAt: ['$averageMoods.dissatisfied', 0] }, 2]
                      },
                      verySatisfied: {
                        $round: [{ $arrayElemAt: ['$averageMoods.verySatisfied', 0] }, 2]
                      },
                      unpleasant: {
                        $round: [{ $arrayElemAt: ['$averageMoods.unpleasant', 0] }, 2]
                      },
                      positive: {
                        $round: [{ $arrayElemAt: ['$averageMoods.positive', 0] }, 2]
                      },
                      overwhelming: {
                        $round: [{ $arrayElemAt: ['$averageMoods.overwhelming', 0] }, 2]
                      },
                      comfortable: {
                        $round: [{ $arrayElemAt: ['$averageMoods.comfortable', 0] }, 2]
                      },
                      poor: {
                        $round: [{ $arrayElemAt: ['$averageMoods.poor', 0] }, 2]
                      },
                      supportive: {
                        $round: [{ $arrayElemAt: ['$averageMoods.supportive', 0] }, 2]
                      },
                      unmanageable: {
                        $round: [{ $arrayElemAt: ['$averageMoods.unmanageable', 0] }, 2]
                      },
                      manageable: {
                        $round: [{ $arrayElemAt: ['$averageMoods.manageable', 0] }, 2]
                      },
                      lacking: {
                        $round: [{ $arrayElemAt: ['$averageMoods.lacking', 0] }, 2]
                      },
                      excellent: {
                        $round: [{ $arrayElemAt: ['$averageMoods.excellent', 0] }, 2]
                      },
                      negative: {
                        $round: [{ $arrayElemAt: ['$averageMoods.negative', 0] }, 2]
                      },
                      inclusive: {
                        $round: [{ $arrayElemAt: ['$averageMoods.inclusive', 0] }, 2]
                      },
                      unsupported: {
                        $round: [{ $arrayElemAt: ['$averageMoods.unsupported', 0] }, 2]
                      },
                      highlySupported: {
                        $round: [{ $arrayElemAt: ['$averageMoods.highlySupported', 0] }, 2]
                      },
                      insufficient: {
                        $round: [{ $arrayElemAt: ['$averageMoods.insufficient', 0] }, 2]
                      },
                      wellEquipped: {
                        $round: [{ $arrayElemAt: ['$averageMoods.wellEquipped', 0] }, 2]
                      },
                      inadequate: {
                        $round: [{ $arrayElemAt: ['$averageMoods.inadequate', 0] }, 2]
                      },
                      comprehensive: {
                        $round: [{ $arrayElemAt: ['$averageMoods.comprehensive', 0] }, 2]
                      }
                    },
                    moodCount: 1
                  }
                }
              ];

              const averageMood = await ProfessionalMood.aggregate(aggregationCondition);
              const averageMoodPercentage = {
                dissatisfied: calculatePercentage(
                  averageMood[0].averageMood.dissatisfied,
                  averageMood[0].averageMood.dissatisfied + averageMood[0].averageMood.verySatisfied
                ),
                verySatisfied: calculatePercentage(
                  averageMood[0].averageMood.verySatisfied,
                  averageMood[0].averageMood.dissatisfied + averageMood[0].averageMood.verySatisfied
                ),
                unpleasant: calculatePercentage(
                  averageMood[0].averageMood.unpleasant,
                  averageMood[0].averageMood.unpleasant + averageMood[0].averageMood.positive
                ),
                positive: calculatePercentage(
                  averageMood[0].averageMood.positive,
                  averageMood[0].averageMood.unpleasant + averageMood[0].averageMood.positive
                ),
                overwhelming: calculatePercentage(
                  averageMood[0].averageMood.overwhelming,
                  averageMood[0].averageMood.overwhelming + averageMood[0].averageMood.comfortable
                ),
                comfortable: calculatePercentage(
                  averageMood[0].averageMood.comfortable,
                  averageMood[0].averageMood.overwhelming + averageMood[0].averageMood.comfortable
                ),
                poor: calculatePercentage(
                  averageMood[0].averageMood.poor,
                  averageMood[0].averageMood.poor + averageMood[0].averageMood.supportive
                ),
                supportive: calculatePercentage(
                  averageMood[0].averageMood.supportive,
                  averageMood[0].averageMood.poor + averageMood[0].averageMood.supportive
                ),
                unmanageable: calculatePercentage(
                  averageMood[0].averageMood.unmanageable,
                  averageMood[0].averageMood.unmanageable + averageMood[0].averageMood.manageable
                ),
                manageable: calculatePercentage(
                  averageMood[0].averageMood.manageable,
                  averageMood[0].averageMood.unmanageable + averageMood[0].averageMood.manageable
                ),
                lacking: calculatePercentage(
                  averageMood[0].averageMood.lacking,
                  averageMood[0].averageMood.lacking + averageMood[0].averageMood.excellent
                ),
                excellent: calculatePercentage(
                  averageMood[0].averageMood.excellent,
                  averageMood[0].averageMood.lacking + averageMood[0].averageMood.excellent
                ),
                negative: calculatePercentage(
                  averageMood[0].averageMood.negative,
                  averageMood[0].averageMood.negative + averageMood[0].averageMood.inclusive
                ),
                inclusive: calculatePercentage(
                  averageMood[0].averageMood.inclusive,
                  averageMood[0].averageMood.negative + averageMood[0].averageMood.inclusive
                ),
                unsupported: calculatePercentage(
                  averageMood[0].averageMood.unsupported,
                  averageMood[0].averageMood.unsupported +
                  averageMood[0].averageMood.highlySupported
                ),
                highlySupported: calculatePercentage(
                  averageMood[0].averageMood.highlySupported,
                  averageMood[0].averageMood.unsupported +
                  averageMood[0].averageMood.highlySupported
                ),
                insufficient: calculatePercentage(
                  averageMood[0].averageMood.insufficient,
                  averageMood[0].averageMood.insufficient + averageMood[0].averageMood.wellEquipped
                ),
                wellEquipped: calculatePercentage(
                  averageMood[0].averageMood.wellEquipped,
                  averageMood[0].averageMood.insufficient + averageMood[0].averageMood.wellEquipped
                ),
                inadequate: calculatePercentage(
                  averageMood[0].averageMood.inadequate,
                  averageMood[0].averageMood.comprehensive + averageMood[0].averageMood.inadequate
                ),
                comprehensive: calculatePercentage(
                  averageMood[0].averageMood.comprehensive,
                  averageMood[0].averageMood.comprehensive + averageMood[0].averageMood.inadequate
                )
              };
              if (averageMood.length > 0 && averageMood[0].moodData.length > 0) {
                resData = {
                  moodData: averageMood[0].moodData,
                  averageMoodPercentage,
                  moodCount: averageMood[0].moodCount[0]
                };
                return Response.successResponseData(
                  res,
                  resData,
                  SUCCESS,
                  res.__('professionalMoodListSuccess')
                );
              } else {
                return Response.successResponseData(
                  res,
                  [],
                  SUCCESS,
                  res.__('professionalMoodListSuccess')
                );
              }
            case REPORT_TYPE.WEEKLY:
              dateFrom.setDate(dateFrom.getDate() - MOOD_REPORT.NUMBER_OF_WEEKS * 7);
              dateFrom = getFirstDayOfWeek(dateFrom);
              const weeklyQuery = [
                {
                  $match: filterCondition
                },
                {
                  $addFields: {
                    weekStart: {
                      $dateFromParts: {
                        isoWeekYear: { $isoWeekYear: '$createdAt' },
                        isoWeek: { $isoWeek: '$createdAt' },
                        isoDayOfWeek: 0
                      }
                    }
                  }
                },
                {
                  $group: groupDataCondition
                }
              ];
              const weeklyData = await ProfessionalMood.aggregate(weeklyQuery);
              const dateRange = [dateFrom];
              for (let x = 0; x <= 5; x++) {
                dateFrom = new Date(dateFrom);
                dateFrom.setDate(dateFrom.getDate() + 7);
                dateRange.push(dateFrom);
              }
              resData = professionalMoodChartCalculation(weeklyData, dateRange);
              return Response.successResponseData(
                res,
                resData,
                SUCCESS,
                res.__('professionalMoodListSuccess')
              );
            case REPORT_TYPE.MONTHLY:
              dateFrom.setMonth(dateFrom.getMonth() - MOOD_REPORT.NUMBER_OF_MONTHS);
              dateFrom = getFirstDayOfMonth(dateFrom);
              groupDataCondition._id = '$monthStart';
              const monthlyQuery = [
                {
                  $match: filterCondition
                },
                {
                  $addFields: {
                    monthStart: {
                      $dateFromString: {
                        dateString: {
                          $dateToString: {
                            format: '%Y-%m-01',
                            date: new Date()
                          }
                        }
                      }
                    }
                  }
                },
                {
                  $group: groupDataCondition
                }
              ];
              const monthlyData = await ProfessionalMood.aggregate(monthlyQuery);
              const monthRange = [dateFrom];
              for (let x = 0; x <= 5; x++) {
                dateFrom = new Date(dateFrom);
                dateFrom.setMonth(dateFrom.getMonth() + 1);
                monthRange.push(dateFrom);
              }
              resData = professionalMoodChartCalculation(monthlyData, monthRange);
              return Response.successResponseData(
                res,
                resData,
                SUCCESS,
                res.__('professionalMoodListSuccess')
              );
            case REPORT_TYPE.YEARLY:
              dateFrom.setFullYear(dateFrom.getFullYear() - MOOD_REPORT.NUMBER_OF_YEARS);
              dateFrom = getFirstDayOfMonth(dateFrom);
              groupDataCondition._id = '$year';
              const yearlyQuery = [
                {
                  $match: filterCondition
                },
                {
                  $addFields: {
                    year: {
                      $year: '$createdAt'
                    }
                  }
                },
                {
                  $group: groupDataCondition
                }
              ];
              const yearlyData = await ProfessionalMood.aggregate(yearlyQuery);
              const yearRange = [dateFrom.getFullYear()];
              for (let x = 0; x <= 1; x++) {
                dateFrom = new Date(dateFrom);
                dateFrom.setFullYear(dateFrom.getFullYear() + 1);
                yearRange.push(dateFrom.getFullYear());
              }

              resData = professionalMoodChartCalculation(yearlyData, yearRange);
              return Response.successResponseData(
                res,
                resData,
                SUCCESS,
                res.__('professionalMoodListSuccess')
              );
            default:
              return Response.successResponseWithoutData(
                res,
                res.__('noProfessionalMoodCase'),
                FAIL
              );
          }
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to get today's latest one record of Professional mood for looged in user
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  getLatestProfessionalMoodDetails: async (req, res) => {
    try {
      const dateFrom = currentDateOnly();
      const dateTo = currentDateOnly();
      dateTo.setDate(dateTo.getDate() + 1);
      const moodDetails = await ProfessionalMood.findOne(
        { user_id: req.authUserId, deletedAt: null, createdAt: { $gte: dateFrom, $lt: dateTo } },
        {
          dissatisfied: 1,
          verySatisfied: '$very_satisfied',
          very_satisfied: 1,
          unpleasant: 1,
          positive: 1,
          overwhelming: 1,
          comfortable: 1,
          poor: 1,
          supportive: 1,
          unmanageable: 1,
          manageable: 1,
          lacking: 1,
          excellent: 1,
          negative: 1,
          inclusive: 1,
          unsupported: 1,
          highlySupported: '$highly_supported',
          highly_supported: 1,
          insufficient: 1,
          wellEquipped: '$well_equipped',
          well_equipped: 1,
          inadequate: 1,
          comprehensive: 1
        }
      ).sort({
        createdAt: -1
      });
      if (moodDetails) {
        return Response.successResponseData(
          res,
          convertObjectKeysToCamelCase(moodDetails),
          SUCCESS,
          res.__('professionalMoodListSuccess')
        );
      } else {
        const resObj = await ProfessionalMood.create({ user_id: req.authUserId });
        return Response.successResponseData(
          res,
          resObj,
          SUCCESS,
          res.__('professionalMoodListSuccess')
        );
      }
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to download mood report of logged in user
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  downloadProfessionalMoodReport: (req, res) => {
    try {
      const reqParam = req.query;
      downloadMoodReportValidation(reqParam, res, async (validate) => {
        if (validate) {
          let fromDate = currentDateOnly();
          let toDate = currentDateOnly();
          if (reqParam.reportFromDate) {
            fromDate = new Date(reqParam.reportFromDate);
          }
          if (reqParam.reportToDate) {
            toDate = new Date(reqParam.reportToDate);
          }
          toDate.setDate(toDate.getDate() + 1);
          switch (parseInt(reqParam.reportType)) {
            case MOOD_REPORT_DURATION.LAST_30_DAYS:
              fromDate.setDate(fromDate.getDate() - 30);
              break;
            case MOOD_REPORT_DURATION.LAST_60_DAYS:
              fromDate.setDate(fromDate.getDate() - 60);
              break;
          }
          const aggregationCondition = [
            {
              $match: {
                user_id: toObjectId(req.authUserId),
                deletedAt: null,
                createdAt: {
                  $gte: fromDate,
                  $lt: toDate
                }
              }
            },
            {
              $facet: {
                averageMoods: [
                  {
                    $group: {
                      _id: '$user_id',
                      dissatisfied: {
                        $avg: '$dissatisfied'
                      },
                      verySatisfied: {
                        $avg: '$very_satisfied'
                      },
                      unpleasant: {
                        $avg: '$unpleasant'
                      },
                      positive: {
                        $avg: '$positive'
                      },
                      overwhelming: {
                        $avg: '$overwhelming'
                      },
                      comfortable: {
                        $avg: '$comfortable'
                      },
                      poor: {
                        $avg: '$poor'
                      },
                      supportive: {
                        $avg: '$supportive'
                      },
                      unmanageable: {
                        $avg: '$unmanageable'
                      },
                      manageable: {
                        $avg: '$manageable'
                      },
                      lacking: {
                        $avg: '$lacking'
                      },
                      excellent: {
                        $avg: '$excellent'
                      },
                      negative: {
                        $avg: '$negative'
                      },
                      inclusive: {
                        $avg: '$inclusive'
                      },
                      unsupported: {
                        $avg: '$unsupported'
                      },
                      highlySupported: {
                        $avg: '$highly_supported'
                      },
                      insufficient: {
                        $avg: '$insufficient'
                      },
                      wellEquipped: {
                        $avg: '$well_equipped'
                      },
                      inadequate: {
                        $avg: '$inadequate'
                      },
                      comprehensive: {
                        $avg: '$comprehensive'
                      }
                    }
                  }
                ],
                moodCount: [
                  {
                    $group: {
                      _id: '$user_id',
                      dissatisfied: {
                        $sum: {
                          $cond: [
                            {
                              $gt: ['$dissatisfied', 0]
                            },
                            1,
                            0
                          ]
                        }
                      },
                      verySatisfied: {
                        $sum: {
                          $cond: [
                            {
                              $gt: ['$very_satisfied', 0]
                            },
                            1,
                            0
                          ]
                        }
                      },
                      unpleasant: {
                        $sum: {
                          $cond: [
                            {
                              $gt: ['$unpleasant', 0]
                            },
                            1,
                            0
                          ]
                        }
                      },
                      positive: {
                        $sum: {
                          $cond: [
                            {
                              $gt: ['$positive', 0]
                            },
                            1,
                            0
                          ]
                        }
                      },
                      overwhelming: {
                        $sum: {
                          $cond: [
                            {
                              $gt: ['$overwhelming', 0]
                            },
                            1,
                            0
                          ]
                        }
                      },
                      comfortable: {
                        $sum: {
                          $cond: [
                            {
                              $gt: ['$comfortable', 0]
                            },
                            1,
                            0
                          ]
                        }
                      },
                      poor: {
                        $sum: {
                          $cond: [
                            {
                              $gt: ['$poor', 0]
                            },
                            1,
                            0
                          ]
                        }
                      },
                      supportive: {
                        $sum: {
                          $cond: [
                            {
                              $gt: ['$supportive', 0]
                            },
                            1,
                            0
                          ]
                        }
                      },
                      unmanageable: {
                        $sum: {
                          $cond: [
                            {
                              $gt: ['$unmanageable', 0]
                            },
                            1,
                            0
                          ]
                        }
                      },
                      manageable: {
                        $sum: {
                          $cond: [
                            {
                              $gt: ['$manageable', 0]
                            },
                            1,
                            0
                          ]
                        }
                      },
                      lacking: {
                        $sum: {
                          $cond: [
                            {
                              $gt: ['$lacking', 0]
                            },
                            1,
                            0
                          ]
                        }
                      },
                      excellent: {
                        $sum: {
                          $cond: [
                            {
                              $gt: ['$excellent', 0]
                            },
                            1,
                            0
                          ]
                        }
                      },
                      negative: {
                        $sum: {
                          $cond: [
                            {
                              $gt: ['$negative', 0]
                            },
                            1,
                            0
                          ]
                        }
                      },
                      inclusive: {
                        $sum: {
                          $cond: [
                            {
                              $gt: ['$inclusive', 0]
                            },
                            1,
                            0
                          ]
                        }
                      },
                      unsupported: {
                        $sum: {
                          $cond: [
                            {
                              $gt: ['$unsupported', 0]
                            },
                            1,
                            0
                          ]
                        }
                      },
                      highlySupported: {
                        $sum: {
                          $cond: [
                            {
                              $gt: ['$highly_supported', 0]
                            },
                            1,
                            0
                          ]
                        }
                      },
                      insufficient: {
                        $sum: {
                          $cond: [
                            {
                              $gt: ['$insufficient', 0]
                            },
                            1,
                            0
                          ]
                        }
                      },
                      wellEquipped: {
                        $sum: {
                          $cond: [
                            {
                              $gt: ['$well_equipped', 0]
                            },
                            1,
                            0
                          ]
                        }
                      },
                      inadequate: {
                        $sum: {
                          $cond: [
                            {
                              $gt: ['$inadequate', 0]
                            },
                            1,
                            0
                          ]
                        }
                      },
                      comprehensive: {
                        $sum: {
                          $cond: [
                            {
                              $gt: ['$comprehensive', 0]
                            },
                            1,
                            0
                          ]
                        }
                      }
                    }
                  }
                ]
              }
            }
          ];
          const moodDetails = await ProfessionalMood.aggregate(aggregationCondition);
          if (!moodDetails[0].averageMoods.length > 0) {
            return Response.errorResponseData(
              res,
              res.__('NoProfessionalMoodDataFound'),
              RESPONSE_CODE.NOT_FOUND
            );
          }
          const averageMoods = moodDetails[0].averageMoods[0];
          const moodCount = moodDetails[0].moodCount[0];
          const positiveIndex =
            averageMoods.verySatisfied +
            averageMoods.positive +
            averageMoods.comprehensive +
            averageMoods.wellEquipped +
            averageMoods.highlySupported +
            averageMoods.inclusive +
            averageMoods.excellent +
            averageMoods.comfortable +
            averageMoods.supportive +
            averageMoods.manageable;
          const negativeIndex =
            averageMoods.dissatisfied +
            averageMoods.unpleasant +
            averageMoods.inadequate +
            averageMoods.insufficient +
            averageMoods.unsupported +
            averageMoods.negative +
            averageMoods.lacking +
            averageMoods.unmanageable +
            averageMoods.poor +
            averageMoods.overwhelming;
          const totalIndexValue = positiveIndex + negativeIndex;
          const postivePercentage = calculatePercentage(positiveIndex, totalIndexValue);
          const negativePercentage = calculatePercentage(negativeIndex, totalIndexValue);
          const moodPercentage = {
            verySatisfied: calculatePercentage(averageMoods.verySatisfied, positiveIndex),
            positive: calculatePercentage(averageMoods.positive, positiveIndex),
            comprehensive: calculatePercentage(averageMoods.comprehensive, positiveIndex),
            wellEquipped: calculatePercentage(averageMoods.wellEquipped, positiveIndex),
            highlySupported: calculatePercentage(averageMoods.highlySupported, positiveIndex),
            inclusive: calculatePercentage(averageMoods.inclusive, positiveIndex),
            excellent: calculatePercentage(averageMoods.excellent, positiveIndex),
            comfortable: calculatePercentage(averageMoods.comfortable, positiveIndex),
            supportive: calculatePercentage(averageMoods.supportive, positiveIndex),
            manageable: calculatePercentage(averageMoods.manageable, positiveIndex),

            dissatisfied: calculatePercentage(averageMoods.dissatisfied, negativeIndex),
            unpleasant: calculatePercentage(averageMoods.unpleasant, negativeIndex),
            inadequate: calculatePercentage(averageMoods.inadequate, negativeIndex),
            insufficient: calculatePercentage(averageMoods.insufficient, negativeIndex),
            unsupported: calculatePercentage(averageMoods.unsupported, negativeIndex),
            negative: calculatePercentage(averageMoods.negative, negativeIndex),
            lacking: calculatePercentage(averageMoods.lacking, negativeIndex),
            unmanageable: calculatePercentage(averageMoods.unmanageable, negativeIndex),
            poor: calculatePercentage(averageMoods.poor, negativeIndex),
            overwhelming: calculatePercentage(averageMoods.overwhelming, negativeIndex)
          };
          toDate.setDate(toDate.getDate() - 1);
          const locals = {
            name: req.authName,
            postivePercentage,
            negativePercentage,
            averageMoods,
            moodCount,
            moodPercentage,
            fromDate: fromDate.toLocaleDateString('en-gb', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            }),
            toDate: toDate.toLocaleDateString('en-gb', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            }),
            happySmallIcon: process.env.PDF_HAPPY_SMALL_ICON,
            sadSmallIcon: process.env.PDF_SAD_SMALL_ICON
          };
          switch (true) {
            case postivePercentage > negativePercentage:
              locals.finalIcon = process.env.PDF_HAPPY_ICON;
              locals.finalIconText = 'Positive';
              switch (true) {
                case postivePercentage < 30:
                  locals.finalMessage = MOOD_REPORT_POSITIVE_MESSGE.LESS_THEN_30;
                  break;
                case postivePercentage >= 30 && postivePercentage < 60:
                  locals.finalMessage = MOOD_REPORT_POSITIVE_MESSGE.THIRTY_TO_SIXTY;
                  break;
                case postivePercentage >= 60:
                  locals.finalMessage = MOOD_REPORT_POSITIVE_MESSGE.SIXTY_TO_100;
                  break;
              }
              break;
            case postivePercentage < negativePercentage:
              locals.finalIcon = process.env.PDF_SAD_ICON;
              locals.finalIconText = 'Negative';
              switch (true) {
                case negativePercentage < 30:
                  locals.finalMessage = MOOD_REPORT_NEGATIVE_MESSGE.LESS_THEN_30;
                  break;
                case negativePercentage >= 30 && negativePercentage < 70:
                  locals.finalMessage = MOOD_REPORT_NEGATIVE_MESSGE.THIRTY_TO_SEVENTY;
                  break;
                case negativePercentage >= 70 && negativePercentage < 90:
                  locals.finalMessage = MOOD_REPORT_NEGATIVE_MESSGE.SEVENTY_TO_90;
                  break;
                case negativePercentage >= 90:
                  locals.finalMessage = MOOD_REPORT_NEGATIVE_MESSGE.MORE_THEN_NINETY;
                  break;
              }
              break;
            case postivePercentage === negativePercentage:
              locals.finalIcon = process.env.PDF_NEUTRAL_ICON;
              locals.finalIconText = 'Neutral';
              locals.finalMessage = MOOD_REPORT_NEUTRAL_MESSAGE;
              break;
          }
          const compiledFunction = pug.compileFile('src/views/ProfessionalMoodReport.pug');
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
          res.send(pdf);
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  }
};
