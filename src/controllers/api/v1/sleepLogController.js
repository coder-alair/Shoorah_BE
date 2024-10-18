'use strict';

const { Mood } = require('@models');
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
const { convertObjectKeysToCamelCase } = require('../../../services/Helper');
const {
  addEditBeforeLogsValidation,
  addEditAfterLogsValidation,
  getSleepLogsDetailsValidation,
  downloadSleepReportValidation
} = require('../../../services/userValidations/sleepLogsValidations');
const BeforeSleep = require('../../../models/BeforeSleep');
const AfterSleep = require('../../../models/AfterSleep');
const {
  beforeSleepChartCalculation,
  afterSleepChartCalculation
} = require('../../../services/userServices/sleepService');

module.exports = {
  /**
   * @description This function is used to add edit daily before sleep log.
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  addEditBeforeSleep: (req, res) => {
    try {
      const reqParam = req.body;
      const allValuesZeroOrUndefined = Object.values(reqParam).every(value => value === 0 || value === undefined);
      if (allValuesZeroOrUndefined) {
        return Response.errorResponseData(res, res.__('At least one mood value is required'), RESPONSE_CODE.BAD_REQUEST);
      }
      addEditBeforeLogsValidation(reqParam, res, async (validate) => {
        if (validate) {
          const createBeforeSleepLog = {
            user_id: req.authUserId,
            anxious: reqParam.anxious || 0,
            calm: reqParam.calm || 0,
            sad: reqParam.sad || 0,
            happy: reqParam.happy || 0,
            noisy: reqParam.noisy || 0,
            quiet: reqParam.quiet || 0,
            cold: reqParam.cold || 0,
            warm: reqParam.warm || 0,
            agitated: reqParam.agitated || 0,
            peaceful: reqParam.peaceful || 0,
            uneasy: reqParam.uneasy || 0,
            settled: reqParam.settled || 0,
            worried: reqParam.worried || 0,
            at_ease: reqParam.atEase || 0,
            overwhelmed: reqParam.overwhelmed || 0,
            in_control: reqParam.inControl || 0
          };
          await BeforeSleep.create(createBeforeSleepLog);
          return Response.successResponseWithoutData(
            res,
            res.__('updateUserBeforeSleepLog'),
            SUCCESS
          );
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to add edit daily after sleep log.
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  addEditAfterSleep: (req, res) => {
    try {
      const reqParam = req.body;
      const allValuesZeroOrUndefined = Object.values(reqParam).every(value => value === 0 || value === undefined);
      if (allValuesZeroOrUndefined) {
        return Response.errorResponseData(res, res.__('All values cannot be zero or undefined'), RESPONSE_CODE.BAD_REQUEST);
      }
      addEditAfterLogsValidation(reqParam, res, async (validate) => {
        if (validate) {
          const createAfterSleepLog = {
            user_id: req.authUserId,
            tossing_and_turning: reqParam.tossingTurning || 0,
            sleep_soundly: reqParam.sleepSoundly || 0,
            light_sleep: reqParam.lightSleep || 0,
            deep_sleep: reqParam.deepSleep || 0,
            nightmare: reqParam.nightmare || 0,
            lovely_dream: reqParam.lovelyDream || 0,
            restless: reqParam.restless || 0,
            still: reqParam.still || 0,
            sweaty: reqParam.sweaty || 0,
            cool: reqParam.cool || 0,
            sleepwalking: reqParam.sleepwalking || 0,
            staying_put: reqParam.stayingPut || 0,
            snoring: reqParam.snoring || 0,
            silent: reqParam.silent || 0,
            need_more_sleep: reqParam.needMoreSleep || 0,
            rested: reqParam.rested || 0,
            nocturnal_eating: reqParam.nocturnalEating || 0,
            no_midnight_snacks: reqParam.noMidnightSnacks || 0
          };
          await AfterSleep.create(createAfterSleepLog);
          return Response.successResponseWithoutData(
            res,
            res.__('updateUserAfterSleepLog'),
            SUCCESS
          );
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to get today's latest one record of before sleep log for looged in user
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  getLatestBeforeSleepDetails: async (req, res) => {
    try {
      const dateFrom = currentDateOnly();
      const dateTo = currentDateOnly();
      dateTo.setDate(dateTo.getDate() + 1);
      const sleepDetails = await BeforeSleep.findOne(
        { user_id: req.authUserId, deletedAt: null, createdAt: { $gte: dateFrom, $lt: dateTo } },
        {
          calm: 1,
          anxious: 1,
          sad: 1,
          happy: 1,
          noisy: 1,
          quiet: 1,
          cold: 1,
          warm: 1,
          agitated: 1,
          peaceful: 1,
          uneasy: 1,
          settled: 1,
          worried: 1,
          atEase: '$at_ease',
          overwhelmed: 1,
          inControl: '$in_control'
        }
      ).sort({
        createdAt: -1
      });
      if (sleepDetails) {
        return Response.successResponseData(
          res,
          convertObjectKeysToCamelCase(sleepDetails),
          SUCCESS,
          res.__('sleepLogListSuccess')
        );
      } else {
        const resObj = await BeforeSleep.create({ user_id: req.authUserId });
        return Response.successResponseData(res, resObj, SUCCESS, res.__('sleepLogListSuccess'));
      }
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to get today's latest one record of after sleep log for looged in user
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  getLatestAfterSleepDetails: async (req, res) => {
    try {
      const dateFrom = currentDateOnly();
      const dateTo = currentDateOnly();
      dateTo.setDate(dateTo.getDate() + 1);
      const sleepDetails = await AfterSleep.findOne(
        { user_id: req.authUserId, deletedAt: null, createdAt: { $gte: dateFrom, $lt: dateTo } },
        {
          tossingTurning: '$tossing_and_turning',
          sleepingSoundly: '$sleeping_soundly',
          lightSleep: '$light_sleep',
          deepSleep: '$deep_sleep',
          nightmare: 1,
          lovelyDream: '$lovely_dream',
          restless: 1,
          still: 1,
          sweaty: 1,
          cool: 1,
          sleepwalking: 1,
          stayingPut: '$staying_put',
          snoring: 1,
          silent: 1,
          needMoreSleep: '$need_more_sleep',
          rested: 1,
          nocturnalEating: '$nocturnal_eating',
          noMidnightSnacks: '$no_midnight_snacks'
        }
      ).sort({
        createdAt: -1
      });
      if (sleepDetails) {
        return Response.successResponseData(
          res,
          convertObjectKeysToCamelCase(sleepDetails),
          SUCCESS,
          res.__('sleepLogListSuccess')
        );
      } else {
        const resObj = await AfterSleep.create({ user_id: req.authUserId });
        return Response.successResponseData(res, resObj, SUCCESS, res.__('sleepLogListSuccess'));
      }
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  getBeforeSleepDetails: (req, res) => {
    try {
      const reqParam = req.query;
      getSleepLogsDetailsValidation(reqParam, res, async (validate) => {
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
            noisyCount: {
              $sum: {
                $cond: [
                  {
                    $gt: ['$noisy', 0]
                  },
                  1,
                  0
                ]
              }
            },
            quietCount: {
              $sum: {
                $cond: [
                  {
                    $gt: ['$quiet', 0]
                  },
                  1,
                  0
                ]
              }
            },
            coldCount: {
              $sum: {
                $cond: [
                  {
                    $gt: ['$cold', 0]
                  },
                  1,
                  0
                ]
              }
            },
            warmCount: {
              $sum: {
                $cond: [
                  {
                    $gt: ['$warm', 0]
                  },
                  1,
                  0
                ]
              }
            },
            agitatedCount: {
              $sum: {
                $cond: [
                  {
                    $gt: ['$agitated', 0]
                  },
                  1,
                  0
                ]
              }
            },
            peacefulCount: {
              $sum: {
                $cond: [
                  {
                    $gt: ['$peaceful', 0]
                  },
                  1,
                  0
                ]
              }
            },
            uneasyCount: {
              $sum: {
                $cond: [
                  {
                    $gt: ['$uneasy', 0]
                  },
                  1,
                  0
                ]
              }
            },
            settledCount: {
              $sum: {
                $cond: [
                  {
                    $gt: ['$settled', 0]
                  },
                  1,
                  0
                ]
              }
            },
            atEaseCount: {
              $sum: {
                $cond: [
                  {
                    $gt: ['$at_ease', 0]
                  },
                  1,
                  0
                ]
              }
            },
            overwhelmedCount: {
              $sum: {
                $cond: [
                  {
                    $gt: ['$overwhelmed', 0]
                  },
                  1,
                  0
                ]
              }
            },
            inControlCount: {
              $sum: {
                $cond: [
                  {
                    $gt: ['$in_control', 0]
                  },
                  1,
                  0
                ]
              }
            },
            worriedCount: {
              $sum: {
                $cond: [
                  {
                    $gt: ['$worried', 0]
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
            sad: {
              $avg: '$sad'
            },
            happy: {
              $avg: '$happy'
            },
            noisy: {
              $avg: '$noisy'
            },
            quiet: {
              $avg: '$quiet'
            },
            cold: {
              $avg: '$cold'
            },
            warm: {
              $avg: '$warm'
            },
            agitated: {
              $avg: '$agitated'
            },
            peaceful: {
              $avg: '$peaceful'
            },
            uneasy: {
              $avg: '$uneasy'
            },
            settled: {
              $avg: '$settled'
            },
            worried: {
              $avg: '$worried'
            },
            atEase: {
              $avg: '$at_ease'
            },
            overwhelmed: {
              $avg: '$overwhelmed'
            },
            inControl: {
              $avg: '$in_control'
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
                          happy: 1,
                          sad: 1,
                          quiet: 1,
                          peaceful: 1,
                          noisy: 1,
                          cold: 1,
                          warm: 1,
                          agitated: 1,
                          uneasy: 1,
                          settled: 1,
                          worried: 1,
                          atEase: '$at_ease',
                          overwhelmed: 1,
                          inControl: '$in_control',
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
                          sad: {
                            $avg: '$sad'
                          },
                          happy: {
                            $avg: '$happy'
                          },
                          noisy: {
                            $avg: '$noisy'
                          },
                          quiet: {
                            $avg: '$quiet'
                          },
                          cold: {
                            $avg: '$cold'
                          },
                          warm: {
                            $avg: '$warm'
                          },
                          agitated: {
                            $avg: '$agitated'
                          },
                          peaceful: {
                            $avg: '$peaceful'
                          },
                          uneasy: {
                            $avg: '$uneasy'
                          },
                          settled: {
                            $avg: '$settled'
                          },
                          worried: {
                            $avg: '$worried'
                          },
                          atEase: {
                            $avg: '$at_ease'
                          },
                          overwhelmed: {
                            $avg: '$overwhelmed'
                          },
                          inControl: {
                            $avg: '$in_control'
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
                          noisy: {
                            $sum: {
                              $cond: [
                                {
                                  $gt: ['$noisy', 0]
                                },
                                1,
                                0
                              ]
                            }
                          },
                          quiet: {
                            $sum: {
                              $cond: [
                                {
                                  $gt: ['$quiet', 0]
                                },
                                1,
                                0
                              ]
                            }
                          },
                          cold: {
                            $sum: {
                              $cond: [
                                {
                                  $gt: ['$cold', 0]
                                },
                                1,
                                0
                              ]
                            }
                          },
                          warm: {
                            $sum: {
                              $cond: [
                                {
                                  $gt: ['$warm', 0]
                                },
                                1,
                                0
                              ]
                            }
                          },
                          agitated: {
                            $sum: {
                              $cond: [
                                {
                                  $gt: ['$agitated', 0]
                                },
                                1,
                                0
                              ]
                            }
                          },
                          peaceful: {
                            $sum: {
                              $cond: [
                                {
                                  $gt: ['$peaceful', 0]
                                },
                                1,
                                0
                              ]
                            }
                          },
                          uneasy: {
                            $sum: {
                              $cond: [
                                {
                                  $gt: ['$uneasy', 0]
                                },
                                1,
                                0
                              ]
                            }
                          },
                          settled: {
                            $sum: {
                              $cond: [
                                {
                                  $gt: ['$settled', 0]
                                },
                                1,
                                0
                              ]
                            }
                          },
                          atEase: {
                            $sum: {
                              $cond: [
                                {
                                  $gt: ['$at_ease', 0]
                                },
                                1,
                                0
                              ]
                            }
                          },
                          overwhelmed: {
                            $sum: {
                              $cond: [
                                {
                                  $gt: ['$overwhelmed', 0]
                                },
                                1,
                                0
                              ]
                            }
                          },
                          inControl: {
                            $sum: {
                              $cond: [
                                {
                                  $gt: ['$in_control', 0]
                                },
                                1,
                                0
                              ]
                            }
                          },
                          worried: {
                            $sum: {
                              $cond: [
                                {
                                  $gt: ['$worried', 0]
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
                      noisy: {
                        $round: [{ $arrayElemAt: ['$averageMoods.noisy', 0] }, 2]
                      },
                      quiet: {
                        $round: [{ $arrayElemAt: ['$averageMoods.quiet', 0] }, 2]
                      },
                      happy: {
                        $round: [{ $arrayElemAt: ['$averageMoods.happy', 0] }, 2]
                      },
                      sad: {
                        $round: [{ $arrayElemAt: ['$averageMoods.sad', 0] }, 2]
                      },
                      cold: {
                        $round: [{ $arrayElemAt: ['$averageMoods.cold', 0] }, 2]
                      },
                      warm: {
                        $round: [{ $arrayElemAt: ['$averageMoods.warm', 0] }, 2]
                      },
                      agitated: {
                        $round: [{ $arrayElemAt: ['$averageMoods.agitated', 0] }, 2]
                      },
                      peaceful: {
                        $round: [{ $arrayElemAt: ['$averageMoods.peaceful', 0] }, 2]
                      },
                      uneasy: {
                        $round: [{ $arrayElemAt: ['$averageMoods.uneasy', 0] }, 2]
                      },
                      settled: {
                        $round: [{ $arrayElemAt: ['$averageMoods.settled', 0] }, 2]
                      },
                      worried: {
                        $round: [{ $arrayElemAt: ['$averageMoods.worried', 0] }, 2]
                      },
                      atEase: {
                        $round: [{ $arrayElemAt: ['$averageMoods.atEase', 0] }, 2]
                      },
                      overwhelmed: {
                        $round: [{ $arrayElemAt: ['$averageMoods.overwhelmed', 0] }, 2]
                      },
                      inControl: {
                        $round: [{ $arrayElemAt: ['$averageMoods.inControl', 0] }, 2]
                      }
                    },
                    moodCount: 1
                  }
                }
              ];
              const averageMood = await BeforeSleep.aggregate(aggregationCondition);
              const averageMoodPercentage = {
                anxious: calculatePercentage(
                  averageMood[0].averageMood.anxious,
                  averageMood[0].averageMood.anxious + averageMood[0].averageMood.calm
                ),
                calm: calculatePercentage(
                  averageMood[0].averageMood.calm,
                  averageMood[0].averageMood.anxious + averageMood[0].averageMood.calm
                ),
                happy: calculatePercentage(
                  averageMood[0].averageMood.happy,
                  averageMood[0].averageMood.happy + averageMood[0].averageMood.sad
                ),
                sad: calculatePercentage(
                  averageMood[0].averageMood.sad,
                  averageMood[0].averageMood.happy + averageMood[0].averageMood.sad
                ),
                quiet: calculatePercentage(
                  averageMood[0].averageMood.quiet,
                  averageMood[0].averageMood.quiet + averageMood[0].averageMood.noisy
                ),
                noisy: calculatePercentage(
                  averageMood[0].averageMood.noisy,
                  averageMood[0].averageMood.quiet + averageMood[0].averageMood.noisy
                ),
                cold: calculatePercentage(
                  averageMood[0].averageMood.cold,
                  averageMood[0].averageMood.cold + averageMood[0].averageMood.warm
                ),
                warm: calculatePercentage(
                  averageMood[0].averageMood.warm,
                  averageMood[0].averageMood.cold + averageMood[0].averageMood.warm
                ),
                agitated: calculatePercentage(
                  averageMood[0].averageMood.agitated,
                  averageMood[0].averageMood.agitated + averageMood[0].averageMood.peaceful
                ),
                peaceful: calculatePercentage(
                  averageMood[0].averageMood.peaceful,
                  averageMood[0].averageMood.agitated + averageMood[0].averageMood.peaceful
                ),
                uneasy: calculatePercentage(
                  averageMood[0].averageMood.uneasy,
                  averageMood[0].averageMood.uneasy + averageMood[0].averageMood.settled
                ),
                settled: calculatePercentage(
                  averageMood[0].averageMood.settled,
                  averageMood[0].averageMood.uneasy + averageMood[0].averageMood.settled
                ),
                worried: calculatePercentage(
                  averageMood[0].averageMood.worried,
                  averageMood[0].averageMood.worried + averageMood[0].averageMood.atEase
                ),
                atEase: calculatePercentage(
                  averageMood[0].averageMood.atEase,
                  averageMood[0].averageMood.worried + averageMood[0].averageMood.atEase
                ),
                overwhelmed: calculatePercentage(
                  averageMood[0].averageMood.overwhelmed,
                  averageMood[0].averageMood.overwhelmed + averageMood[0].averageMood.inControl
                ),
                inControl: calculatePercentage(
                  averageMood[0].averageMood.inControl,
                  averageMood[0].averageMood.overwhelmed + averageMood[0].averageMood.inControl
                )
              };
              if (averageMood.length > 0 && averageMood[0].moodData.length > 0) {
                resData = {
                  sleepData: averageMood[0].moodData,
                  averageSleepPercentage: averageMoodPercentage,
                  sleepCount: averageMood[0].moodCount[0]
                };
                return Response.successResponseData(
                  res,
                  resData,
                  SUCCESS,
                  res.__('beforeSleepListSuccess')
                );
              } else {
                return Response.successResponseData(
                  res,
                  [],
                  SUCCESS,
                  res.__('beforeSleepListSuccess')
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
              const weeklyData = await BeforeSleep.aggregate(weeklyQuery);
              const dateRange = [dateFrom];
              for (let x = 0; x <= 5; x++) {
                dateFrom = new Date(dateFrom);
                dateFrom.setDate(dateFrom.getDate() + 7);
                dateRange.push(dateFrom);
              }
              resData = beforeSleepChartCalculation(weeklyData, dateRange);
              return Response.successResponseData(
                res,
                resData,
                SUCCESS,
                res.__('beforeSleepListSuccess')
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
              const monthlyData = await BeforeSleep.aggregate(monthlyQuery);
              const monthRange = [dateFrom];
              for (let x = 0; x <= 5; x++) {
                dateFrom = new Date(dateFrom);
                dateFrom.setMonth(dateFrom.getMonth() + 1);
                monthRange.push(dateFrom);
              }
              resData = beforeSleepChartCalculation(monthlyData, monthRange);
              return Response.successResponseData(
                res,
                resData,
                SUCCESS,
                res.__('beforeSleepListSuccess')
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
              const yearlyData = await BeforeSleep.aggregate(yearlyQuery);
              const yearRange = [dateFrom.getFullYear()];
              for (let x = 0; x <= 1; x++) {
                dateFrom = new Date(dateFrom);
                dateFrom.setFullYear(dateFrom.getFullYear() + 1);
                yearRange.push(dateFrom.getFullYear());
              }

              resData = beforeSleepChartCalculation(yearlyData, yearRange);
              return Response.successResponseData(
                res,
                resData,
                SUCCESS,
                res.__('beforeSleepListSuccess')
              );
            default:
              return Response.successResponseWithoutData(res, res.__('noSleepCase'), FAIL);
          }
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      console.log(err);
      return Response.internalServerErrorResponse(res);
    }
  },

  getAfterSleepDetails: (req, res) => {
    try {
      const reqParam = req.query;
      getSleepLogsDetailsValidation(reqParam, res, async (validate) => {
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
            tossingTurningCount: {
              $sum: {
                $cond: [
                  {
                    $gt: ['$tossing_and_turning', 0]
                  },
                  1,
                  0
                ]
              }
            },
            sleepSoundlyCount: {
              $sum: {
                $cond: [
                  {
                    $gt: ['$sleep_soundly', 0]
                  },
                  1,
                  0
                ]
              }
            },
            lightSleepCount: {
              $sum: {
                $cond: [
                  {
                    $gt: ['$light_sleep', 0]
                  },
                  1,
                  0
                ]
              }
            },
            deepSleepCount: {
              $sum: {
                $cond: [
                  {
                    $gt: ['$deep_sleep', 0]
                  },
                  1,
                  0
                ]
              }
            },
            nightmareCount: {
              $sum: {
                $cond: [
                  {
                    $gt: ['$nightmare', 0]
                  },
                  1,
                  0
                ]
              }
            },
            lovelyDreamCount: {
              $sum: {
                $cond: [
                  {
                    $gt: ['$lovely_dream', 0]
                  },
                  1,
                  0
                ]
              }
            },
            restlessCount: {
              $sum: {
                $cond: [
                  {
                    $gt: ['$restless', 0]
                  },
                  1,
                  0
                ]
              }
            },
            stillCount: {
              $sum: {
                $cond: [
                  {
                    $gt: ['$still', 0]
                  },
                  1,
                  0
                ]
              }
            },
            sweatyCount: {
              $sum: {
                $cond: [
                  {
                    $gt: ['$sweaty', 0]
                  },
                  1,
                  0
                ]
              }
            },
            coolCount: {
              $sum: {
                $cond: [
                  {
                    $gt: ['$cool', 0]
                  },
                  1,
                  0
                ]
              }
            },
            sleepwalkingCount: {
              $sum: {
                $cond: [
                  {
                    $gt: ['$sleepwalking', 0]
                  },
                  1,
                  0
                ]
              }
            },
            stayingPutCount: {
              $sum: {
                $cond: [
                  {
                    $gt: ['$staying_put', 0]
                  },
                  1,
                  0
                ]
              }
            },
            snoringCount: {
              $sum: {
                $cond: [
                  {
                    $gt: ['$snoring', 0]
                  },
                  1,
                  0
                ]
              }
            },
            silentCount: {
              $sum: {
                $cond: [
                  {
                    $gt: ['$silent', 0]
                  },
                  1,
                  0
                ]
              }
            },
            needMoreSleepCount: {
              $sum: {
                $cond: [
                  {
                    $gt: ['$need_more_sleep', 0]
                  },
                  1,
                  0
                ]
              }
            },
            restedCount: {
              $sum: {
                $cond: [
                  {
                    $gt: ['$rested', 0]
                  },
                  1,
                  0
                ]
              }
            },
            nocturnalEatingCount: {
              $sum: {
                $cond: [
                  {
                    $gt: ['$nocturnal_eating', 0]
                  },
                  1,
                  0
                ]
              }
            },
            noMidnightSnacksCount: {
              $sum: {
                $cond: [
                  {
                    $gt: ['$no_midnight_snacks', 0]
                  },
                  1,
                  0
                ]
              }
            },
            tossingTurning: {
              $avg: '$tossing_and_turning'
            },
            sleepSoundly: {
              $avg: '$sleep_soundly'
            },
            lightSleep: {
              $avg: '$light_sleep'
            },
            deepSleep: {
              $avg: '$deep_sleep'
            },
            nightmare: {
              $avg: '$nightmare'
            },
            lovelyDream: {
              $avg: '$lovely_dream'
            },
            restless: {
              $avg: '$restless'
            },
            still: {
              $avg: '$still'
            },
            sweaty: {
              $avg: '$sweaty'
            },
            cool: {
              $avg: '$cool'
            },
            sleepwalking: {
              $avg: '$sleepwalking'
            },
            stayingPut: {
              $avg: '$staying_put'
            },
            snoring: {
              $avg: '$snoring'
            },
            silent: {
              $avg: '$silent'
            },
            needMoreSleep: {
              $avg: '$need_more_sleep'
            },
            rested: {
              $avg: '$rested'
            },
            nocturnalEating: {
              $avg: '$nocturnal_eating'
            },
            noMidnightSnacks: {
              $avg: '$no_midnight_snacks'
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
                          tossingTurning: '$tossing_and_turning',
                          sleepSoundly: '$sleep_soundly',
                          lightSleep: '$light_sleep',
                          deepSleep: '$deep_sleep',
                          nightmare: 1,
                          lovelyDream: '$lovely_dream',
                          restless: 1,
                          still: 1,
                          sweaty: 1,
                          cool: 1,
                          sleepwalking: 1,
                          stayingPut: '$staying_put',
                          snoring: 1,
                          silent: 1,
                          needMoreSleep: '$need_more_sleep',
                          rested: 1,
                          nocturnalEating: '$nocturnal_eating',
                          noMidnightSnacks: '$no_midnight_snacks',
                          createdAt: 1,
                          _id: 0
                        }
                      }
                    ],
                    averageMoods: [
                      {
                        $group: {
                          _id: '$user_id',
                          tossingTurning: {
                            $avg: '$tossing_and_turning'
                          },
                          sleepSoundly: {
                            $avg: '$sleep_soundly'
                          },
                          lightSleep: {
                            $avg: '$light_sleep'
                          },
                          deepSleep: {
                            $avg: '$deep_sleep'
                          },
                          nightmare: {
                            $avg: '$nightmare'
                          },
                          lovelyDream: {
                            $avg: '$lovely_dream'
                          },
                          restless: {
                            $avg: '$restless'
                          },
                          still: {
                            $avg: '$still'
                          },
                          sweaty: {
                            $avg: '$sweaty'
                          },
                          cool: {
                            $avg: '$cool'
                          },
                          sleepwalking: {
                            $avg: '$sleepwalking'
                          },
                          stayingPut: {
                            $avg: '$staying_put'
                          },
                          snoring: {
                            $avg: '$snoring'
                          },
                          silent: {
                            $avg: '$silent'
                          },
                          needMoreSleep: {
                            $avg: '$need_more_sleep'
                          },
                          rested: {
                            $avg: '$rested'
                          },
                          nocturnalEating: {
                            $avg: '$nocturnal_eating'
                          },
                          noMidnightSnacks: {
                            $avg: '$no_midnight_snacks'
                          }
                        }
                      }
                    ],
                    moodCount: [
                      {
                        $group: {
                          _id: '$user_id',
                          tossingTurningCount: {
                            $sum: {
                              $cond: [
                                {
                                  $gt: ['$tossing_and_turning', 0]
                                },
                                1,
                                0
                              ]
                            }
                          },
                          sleepSoundlyCount: {
                            $sum: {
                              $cond: [
                                {
                                  $gt: ['$sleep_soundly', 0]
                                },
                                1,
                                0
                              ]
                            }
                          },
                          lightSleepCount: {
                            $sum: {
                              $cond: [
                                {
                                  $gt: ['$light_sleep', 0]
                                },
                                1,
                                0
                              ]
                            }
                          },
                          deepSleepCount: {
                            $sum: {
                              $cond: [
                                {
                                  $gt: ['$deep_sleep', 0]
                                },
                                1,
                                0
                              ]
                            }
                          },
                          nightmareCount: {
                            $sum: {
                              $cond: [
                                {
                                  $gt: ['$nightmare', 0]
                                },
                                1,
                                0
                              ]
                            }
                          },
                          lovelyDreamCount: {
                            $sum: {
                              $cond: [
                                {
                                  $gt: ['$lovely_dream', 0]
                                },
                                1,
                                0
                              ]
                            }
                          },
                          restlessCount: {
                            $sum: {
                              $cond: [
                                {
                                  $gt: ['$restless', 0]
                                },
                                1,
                                0
                              ]
                            }
                          },
                          stillCount: {
                            $sum: {
                              $cond: [
                                {
                                  $gt: ['$still', 0]
                                },
                                1,
                                0
                              ]
                            }
                          },
                          sweatyCount: {
                            $sum: {
                              $cond: [
                                {
                                  $gt: ['$sweaty', 0]
                                },
                                1,
                                0
                              ]
                            }
                          },
                          coolCount: {
                            $sum: {
                              $cond: [
                                {
                                  $gt: ['$cool', 0]
                                },
                                1,
                                0
                              ]
                            }
                          },
                          sleepwalkingCount: {
                            $sum: {
                              $cond: [
                                {
                                  $gt: ['$sleepwalking', 0]
                                },
                                1,
                                0
                              ]
                            }
                          },
                          stayingPutCount: {
                            $sum: {
                              $cond: [
                                {
                                  $gt: ['$staying_put', 0]
                                },
                                1,
                                0
                              ]
                            }
                          },
                          snoringCount: {
                            $sum: {
                              $cond: [
                                {
                                  $gt: ['$snoring', 0]
                                },
                                1,
                                0
                              ]
                            }
                          },
                          silentCount: {
                            $sum: {
                              $cond: [
                                {
                                  $gt: ['$silent', 0]
                                },
                                1,
                                0
                              ]
                            }
                          },
                          needMoreSleepCount: {
                            $sum: {
                              $cond: [
                                {
                                  $gt: ['$need_more_sleep', 0]
                                },
                                1,
                                0
                              ]
                            }
                          },
                          restedCount: {
                            $sum: {
                              $cond: [
                                {
                                  $gt: ['$rested', 0]
                                },
                                1,
                                0
                              ]
                            }
                          },
                          nocturnalEatingCount: {
                            $sum: {
                              $cond: [
                                {
                                  $gt: ['$nocturnal_eating', 0]
                                },
                                1,
                                0
                              ]
                            }
                          },
                          noMidnightSnacksCount: {
                            $sum: {
                              $cond: [
                                {
                                  $gt: ['$no_midnight_snacks', 0]
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
                      tossingTurning: {
                        $round: [{ $arrayElemAt: ['$averageMoods.tossingTurning', 0] }, 2]
                      },
                      sleepSoundly: {
                        $round: [{ $arrayElemAt: ['$averageMoods.sleepSoundly', 0] }, 2]
                      },
                      lightSleep: {
                        $round: [{ $arrayElemAt: ['$averageMoods.lightSleep', 0] }, 2]
                      },
                      deepSleep: {
                        $round: [{ $arrayElemAt: ['$averageMoods.deepSleep', 0] }, 2]
                      },
                      nightmare: {
                        $round: [{ $arrayElemAt: ['$averageMoods.nightmare', 0] }, 2]
                      },
                      lovelyDream: {
                        $round: [{ $arrayElemAt: ['$averageMoods.lovelyDream', 0] }, 2]
                      },
                      restless: {
                        $round: [{ $arrayElemAt: ['$averageMoods.restless', 0] }, 2]
                      },
                      still: {
                        $round: [{ $arrayElemAt: ['$averageMoods.still', 0] }, 2]
                      },
                      sweaty: {
                        $round: [{ $arrayElemAt: ['$averageMoods.sweaty', 0] }, 2]
                      },
                      cool: {
                        $round: [{ $arrayElemAt: ['$averageMoods.cool', 0] }, 2]
                      },
                      sleepwalking: {
                        $round: [{ $arrayElemAt: ['$averageMoods.sleepwalking', 0] }, 2]
                      },
                      stayingPut: {
                        $round: [{ $arrayElemAt: ['$averageMoods.stayingPut', 0] }, 2]
                      },
                      snoring: {
                        $round: [{ $arrayElemAt: ['$averageMoods.snoring', 0] }, 2]
                      },
                      silent: {
                        $round: [{ $arrayElemAt: ['$averageMoods.silent', 0] }, 2]
                      },
                      needMoreSleep: {
                        $round: [{ $arrayElemAt: ['$averageMoods.needMoreSleep', 0] }, 2]
                      },
                      rested: {
                        $round: [{ $arrayElemAt: ['$averageMoods.rested', 0] }, 2]
                      },
                      nocturnalEating: {
                        $round: [{ $arrayElemAt: ['$averageMoods.nocturnalEating', 0] }, 2]
                      },
                      noMidnightSnacks: {
                        $round: [{ $arrayElemAt: ['$averageMoods.noMidnightSnacks', 0] }, 2]
                      }
                    },
                    moodCount: 1
                  }
                }
              ];
              const averageMood = await AfterSleep.aggregate(aggregationCondition);
              const averageMoodPercentage = {
                tossingTurning: calculatePercentage(
                  averageMood[0].averageMood.tossingTurning,
                  averageMood[0].averageMood.tossingTurning +
                  averageMood[0].averageMood.sleepSoundly
                ),
                sleepSoundly: calculatePercentage(
                  averageMood[0].averageMood.sleepSoundly,
                  averageMood[0].averageMood.tossingTurning +
                  averageMood[0].averageMood.sleepSoundly
                ),
                lightSleep: calculatePercentage(
                  averageMood[0].averageMood.lightSleep,
                  averageMood[0].averageMood.lightSleep + averageMood[0].averageMood.deepSleep
                ),
                deepSleep: calculatePercentage(
                  averageMood[0].averageMood.deepSleep,
                  averageMood[0].averageMood.lightSleep + averageMood[0].averageMood.deepSleep
                ),
                nightmare: calculatePercentage(
                  averageMood[0].averageMood.nightmare,
                  averageMood[0].averageMood.nightmare + averageMood[0].averageMood.lovelyDream
                ),
                lovelyDream: calculatePercentage(
                  averageMood[0].averageMood.lovelyDream,
                  averageMood[0].averageMood.nightmare + averageMood[0].averageMood.lovelyDream
                ),
                restless: calculatePercentage(
                  averageMood[0].averageMood.restless,
                  averageMood[0].averageMood.restless + averageMood[0].averageMood.still
                ),
                still: calculatePercentage(
                  averageMood[0].averageMood.still,
                  averageMood[0].averageMood.restless + averageMood[0].averageMood.still
                ),
                sweaty: calculatePercentage(
                  averageMood[0].averageMood.sweaty,
                  averageMood[0].averageMood.sweaty + averageMood[0].averageMood.cool
                ),
                cool: calculatePercentage(
                  averageMood[0].averageMood.cool,
                  averageMood[0].averageMood.sweaty + averageMood[0].averageMood.cool
                ),
                sleepwalking: calculatePercentage(
                  averageMood[0].averageMood.sleepwalking,
                  averageMood[0].averageMood.sleepwalking + averageMood[0].averageMood.stayingPut
                ),
                stayingPut: calculatePercentage(
                  averageMood[0].averageMood.stayingPut,
                  averageMood[0].averageMood.sleepwalking + averageMood[0].averageMood.stayingPut
                ),
                snoring: calculatePercentage(
                  averageMood[0].averageMood.snoring,
                  averageMood[0].averageMood.snoring + averageMood[0].averageMood.silent
                ),
                silent: calculatePercentage(
                  averageMood[0].averageMood.silent,
                  averageMood[0].averageMood.snoring + averageMood[0].averageMood.silent
                ),
                rested: calculatePercentage(
                  averageMood[0].averageMood.rested,
                  averageMood[0].averageMood.rested + averageMood[0].averageMood.needMoreSleep
                ),
                needMoreSleep: calculatePercentage(
                  averageMood[0].averageMood.needMoreSleep,
                  averageMood[0].averageMood.rested + averageMood[0].averageMood.needMoreSleep
                ),
                nocturnalEating: calculatePercentage(
                  averageMood[0].averageMood.nocturnalEating,
                  averageMood[0].averageMood.nocturnalEating +
                  averageMood[0].averageMood.noMidnightSnacks
                ),
                noMidnightSnacks: calculatePercentage(
                  averageMood[0].averageMood.noMidnightSnacks,
                  averageMood[0].averageMood.nocturnalEating +
                  averageMood[0].averageMood.noMidnightSnacks
                )
              };
              if (averageMood.length > 0 && averageMood[0].moodData.length > 0) {
                resData = {
                  sleepData: averageMood[0].moodData,
                  averageSleepPercentage: averageMoodPercentage,
                  sleepCount: averageMood[0].moodCount[0]
                };
                return Response.successResponseData(
                  res,
                  resData,
                  SUCCESS,
                  res.__('afterSleepListSuccess')
                );
              } else {
                return Response.successResponseData(
                  res,
                  [],
                  SUCCESS,
                  res.__('afterSleepListSuccess')
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
              const weeklyData = await AfterSleep.aggregate(weeklyQuery);
              const dateRange = [dateFrom];
              for (let x = 0; x <= 5; x++) {
                dateFrom = new Date(dateFrom);
                dateFrom.setDate(dateFrom.getDate() + 7);
                dateRange.push(dateFrom);
              }
              resData = afterSleepChartCalculation(weeklyData, dateRange);
              return Response.successResponseData(
                res,
                resData,
                SUCCESS,
                res.__('afterSleepListSuccess')
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
              const monthlyData = await AfterSleep.aggregate(monthlyQuery);
              const monthRange = [dateFrom];
              for (let x = 0; x <= 5; x++) {
                dateFrom = new Date(dateFrom);
                dateFrom.setMonth(dateFrom.getMonth() + 1);
                monthRange.push(dateFrom);
              }
              resData = afterSleepChartCalculation(monthlyData, monthRange);
              return Response.successResponseData(
                res,
                resData,
                SUCCESS,
                res.__('afterSleepListSuccess')
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
              const yearlyData = await AfterSleep.aggregate(yearlyQuery);
              const yearRange = [dateFrom.getFullYear()];
              for (let x = 0; x <= 1; x++) {
                dateFrom = new Date(dateFrom);
                dateFrom.setFullYear(dateFrom.getFullYear() + 1);
                yearRange.push(dateFrom.getFullYear());
              }

              resData = afterSleepChartCalculation(yearlyData, yearRange);
              return Response.successResponseData(
                res,
                resData,
                SUCCESS,
                res.__('afterSleepListSuccess')
              );
            default:
              return Response.successResponseWithoutData(res, res.__('noSleepCase'), FAIL);
          }
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      console.log(err);
      return Response.internalServerErrorResponse(res);
    }
  },

  downloadBeforeSleepReport: (req, res) => {
    try {
      const reqParam = req.query;
      downloadSleepReportValidation(reqParam, res, async (validate) => {
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
                      sad: {
                        $avg: '$sad'
                      },
                      happy: {
                        $avg: '$happy'
                      },
                      noisy: {
                        $avg: '$noisy'
                      },
                      quiet: {
                        $avg: '$quiet'
                      },
                      cold: {
                        $avg: '$cold'
                      },
                      warm: {
                        $avg: '$warm'
                      },
                      agitated: {
                        $avg: '$agitated'
                      },
                      peaceful: {
                        $avg: '$peaceful'
                      },
                      uneasy: {
                        $avg: '$uneasy'
                      },
                      settled: {
                        $avg: '$settled'
                      },
                      worried: {
                        $avg: '$worried'
                      },
                      atEase: {
                        $avg: '$at_ease'
                      },
                      overwhelmed: {
                        $avg: '$overwhelmed'
                      },
                      inControl: {
                        $avg: '$in_control'
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
                      noisy: {
                        $sum: {
                          $cond: [
                            {
                              $gt: ['$noisy', 0]
                            },
                            1,
                            0
                          ]
                        }
                      },
                      quiet: {
                        $sum: {
                          $cond: [
                            {
                              $gt: ['$quiet', 0]
                            },
                            1,
                            0
                          ]
                        }
                      },
                      cold: {
                        $sum: {
                          $cond: [
                            {
                              $gt: ['$cold', 0]
                            },
                            1,
                            0
                          ]
                        }
                      },
                      warm: {
                        $sum: {
                          $cond: [
                            {
                              $gt: ['$warm', 0]
                            },
                            1,
                            0
                          ]
                        }
                      },
                      agitated: {
                        $sum: {
                          $cond: [
                            {
                              $gt: ['$agitated', 0]
                            },
                            1,
                            0
                          ]
                        }
                      },
                      peaceful: {
                        $sum: {
                          $cond: [
                            {
                              $gt: ['$peaceful', 0]
                            },
                            1,
                            0
                          ]
                        }
                      },
                      uneasy: {
                        $sum: {
                          $cond: [
                            {
                              $gt: ['$uneasy', 0]
                            },
                            1,
                            0
                          ]
                        }
                      },
                      settled: {
                        $sum: {
                          $cond: [
                            {
                              $gt: ['$settled', 0]
                            },
                            1,
                            0
                          ]
                        }
                      },
                      atEase: {
                        $sum: {
                          $cond: [
                            {
                              $gt: ['$at_ease', 0]
                            },
                            1,
                            0
                          ]
                        }
                      },
                      overwhelmed: {
                        $sum: {
                          $cond: [
                            {
                              $gt: ['$overwhelmed', 0]
                            },
                            1,
                            0
                          ]
                        }
                      },
                      inControl: {
                        $sum: {
                          $cond: [
                            {
                              $gt: ['$in_control', 0]
                            },
                            1,
                            0
                          ]
                        }
                      },
                      worried: {
                        $sum: {
                          $cond: [
                            {
                              $gt: ['$worried', 0]
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
          const moodDetails = await BeforeSleep.aggregate(aggregationCondition);
          if (!moodDetails[0].averageMoods.length > 0) {
            return Response.errorResponseData(
              res,
              res.__('NoSleepDatFound'),
              RESPONSE_CODE.NOT_FOUND
            );
          }
          const averageMoods = moodDetails[0].averageMoods[0];
          const moodCount = moodDetails[0].moodCount[0];
          const positiveIndex =
            averageMoods.calm +
            averageMoods.happy +
            averageMoods.quiet +
            averageMoods.warm +
            averageMoods.peaceful +
            averageMoods.settled +
            averageMoods.atEase +
            averageMoods.inControl;

          const negativeIndex =
            averageMoods.anxious +
            averageMoods.sad +
            averageMoods.noisy +
            averageMoods.cold +
            averageMoods.agitated +
            averageMoods.uneasy +
            averageMoods.worried +
            averageMoods.overwhelmed;

          const totalIndexValue = positiveIndex + negativeIndex;
          const postivePercentage = calculatePercentage(positiveIndex, totalIndexValue);
          const negativePercentage = calculatePercentage(negativeIndex, totalIndexValue);
          const moodPercentage = {
            calm: calculatePercentage(averageMoods.calm, positiveIndex),
            happy: calculatePercentage(averageMoods.happy, positiveIndex),
            quiet: calculatePercentage(averageMoods.quiet, positiveIndex),
            warm: calculatePercentage(averageMoods.warm, positiveIndex),
            peaceful: calculatePercentage(averageMoods.peaceful, positiveIndex),
            settled: calculatePercentage(averageMoods.settled, positiveIndex),
            atEase: calculatePercentage(averageMoods.atEase, positiveIndex),
            inControl: calculatePercentage(averageMoods.inControl, positiveIndex),

            anxious: calculatePercentage(averageMoods.anxious, negativeIndex),
            sad: calculatePercentage(averageMoods.sad, negativeIndex),
            noisy: calculatePercentage(averageMoods.noisy, negativeIndex),
            cold: calculatePercentage(averageMoods.cold, negativeIndex),
            agitated: calculatePercentage(averageMoods.agitated, negativeIndex),
            worried: calculatePercentage(averageMoods.worried, negativeIndex),
            uneasy: calculatePercentage(averageMoods.uneasy, negativeIndex),
            overwhelmed: calculatePercentage(averageMoods.overwhelmed, negativeIndex)
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
          const compiledFunction = pug.compileFile('src/views/before-sleep.pug');
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

  downloadAfterSleepReport: (req, res) => {
    try {
      const reqParam = req.query;
      downloadSleepReportValidation(reqParam, res, async (validate) => {
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
                      tossingTurning: {
                        $avg: '$tossing_and_turning'
                      },
                      sleepSoundly: {
                        $avg: '$sleep_soundly'
                      },
                      lightSleep: {
                        $avg: '$light_sleep'
                      },
                      deepSleep: {
                        $avg: '$deep_sleep'
                      },
                      nightmare: {
                        $avg: '$nightmare'
                      },
                      lovelyDream: {
                        $avg: '$lovely_dream'
                      },
                      restless: {
                        $avg: '$restless'
                      },
                      still: {
                        $avg: '$still'
                      },
                      sweaty: {
                        $avg: '$sweaty'
                      },
                      cool: {
                        $avg: '$cool'
                      },
                      sleepwalking: {
                        $avg: '$sleepwalking'
                      },
                      stayingPut: {
                        $avg: '$staying_put'
                      },
                      snoring: {
                        $avg: '$snoring'
                      },
                      silent: {
                        $avg: '$silent'
                      },
                      needMoreSleep: {
                        $avg: '$need_more_sleep'
                      },
                      rested: {
                        $avg: '$rested'
                      },
                      nocturnalEating: {
                        $avg: '$nocturnal_eating'
                      },
                      noMidnightSnacks: {
                        $avg: '$no_midnight_snacks'
                      }
                    }
                  }
                ],
                moodCount: [
                  {
                    $group: {
                      _id: '$user_id',
                      tossingTurning: {
                        $sum: {
                          $cond: [
                            {
                              $gt: ['$tossing_and_turning', 0]
                            },
                            1,
                            0
                          ]
                        }
                      },
                      sleepSoundly: {
                        $sum: {
                          $cond: [
                            {
                              $gt: ['$sleep_soundly', 0]
                            },
                            1,
                            0
                          ]
                        }
                      },
                      lightSleep: {
                        $sum: {
                          $cond: [
                            {
                              $gt: ['$light_sleep', 0]
                            },
                            1,
                            0
                          ]
                        }
                      },
                      deepSleep: {
                        $sum: {
                          $cond: [
                            {
                              $gt: ['$deep_sleep', 0]
                            },
                            1,
                            0
                          ]
                        }
                      },
                      nightmare: {
                        $sum: {
                          $cond: [
                            {
                              $gt: ['$nightmare', 0]
                            },
                            1,
                            0
                          ]
                        }
                      },
                      lovelyDream: {
                        $sum: {
                          $cond: [
                            {
                              $gt: ['$lovely_dream', 0]
                            },
                            1,
                            0
                          ]
                        }
                      },
                      restless: {
                        $sum: {
                          $cond: [
                            {
                              $gt: ['$restless', 0]
                            },
                            1,
                            0
                          ]
                        }
                      },
                      still: {
                        $sum: {
                          $cond: [
                            {
                              $gt: ['$still', 0]
                            },
                            1,
                            0
                          ]
                        }
                      },
                      sweaty: {
                        $sum: {
                          $cond: [
                            {
                              $gt: ['$sweaty', 0]
                            },
                            1,
                            0
                          ]
                        }
                      },
                      cool: {
                        $sum: {
                          $cond: [
                            {
                              $gt: ['$cool', 0]
                            },
                            1,
                            0
                          ]
                        }
                      },
                      sleepwalking: {
                        $sum: {
                          $cond: [
                            {
                              $gt: ['$sleepwalking', 0]
                            },
                            1,
                            0
                          ]
                        }
                      },
                      stayingPut: {
                        $sum: {
                          $cond: [
                            {
                              $gt: ['$staying_put', 0]
                            },
                            1,
                            0
                          ]
                        }
                      },
                      snoring: {
                        $sum: {
                          $cond: [
                            {
                              $gt: ['$snoring', 0]
                            },
                            1,
                            0
                          ]
                        }
                      },
                      silent: {
                        $sum: {
                          $cond: [
                            {
                              $gt: ['$silent', 0]
                            },
                            1,
                            0
                          ]
                        }
                      },
                      needMoreSleep: {
                        $sum: {
                          $cond: [
                            {
                              $gt: ['$need_more_sleep', 0]
                            },
                            1,
                            0
                          ]
                        }
                      },
                      rested: {
                        $sum: {
                          $cond: [
                            {
                              $gt: ['$rested', 0]
                            },
                            1,
                            0
                          ]
                        }
                      },
                      nocturnalEating: {
                        $sum: {
                          $cond: [
                            {
                              $gt: ['$nocturnal_eating', 0]
                            },
                            1,
                            0
                          ]
                        }
                      },
                      noMidnightSnacks: {
                        $sum: {
                          $cond: [
                            {
                              $gt: ['$no_midnight_snacks', 0]
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
          const moodDetails = await AfterSleep.aggregate(aggregationCondition);
          if (!moodDetails[0].averageMoods.length > 0) {
            return Response.errorResponseData(
              res,
              res.__('NoSleepDatFound'),
              RESPONSE_CODE.NOT_FOUND
            );
          }
          const averageMoods = moodDetails[0].averageMoods[0];
          const moodCount = moodDetails[0].moodCount[0];
          const positiveIndex =
            averageMoods.sleepSoundly +
            averageMoods.deepSleep +
            averageMoods.lovelyDream +
            averageMoods.still +
            averageMoods.cool +
            averageMoods.stayingPut +
            averageMoods.silent +
            averageMoods.noMidnightSnacks +
            averageMoods.rested;

          const negativeIndex =
            averageMoods.tossingTurning +
            averageMoods.lightSleep +
            averageMoods.nightmare +
            averageMoods.restless +
            averageMoods.sweaty +
            averageMoods.sleepwalking +
            averageMoods.snoring +
            averageMoods.nocturnalEating +
            averageMoods.needMoreSleep;

          const totalIndexValue = positiveIndex + negativeIndex;
          const postivePercentage = calculatePercentage(positiveIndex, totalIndexValue);
          const negativePercentage = calculatePercentage(negativeIndex, totalIndexValue);
          const moodPercentage = {
            sleepSoundly: calculatePercentage(averageMoods.sleepSoundly, positiveIndex),
            deepSleep: calculatePercentage(averageMoods.deepSleep, positiveIndex),
            lovelyDream: calculatePercentage(averageMoods.lovelyDream, positiveIndex),
            still: calculatePercentage(averageMoods.still, positiveIndex),
            cool: calculatePercentage(averageMoods.cool, positiveIndex),
            stayingPut: calculatePercentage(averageMoods.stayingPut, positiveIndex),
            silent: calculatePercentage(averageMoods.silent, positiveIndex),
            rested: calculatePercentage(averageMoods.rested, positiveIndex),
            noMidnightSnacks: calculatePercentage(averageMoods.noMidnightSnacks, positiveIndex),

            tossingTurning: calculatePercentage(averageMoods.tossingTurning, negativeIndex),
            lightSleep: calculatePercentage(averageMoods.lightSleep, negativeIndex),
            nightmare: calculatePercentage(averageMoods.nightmare, negativeIndex),
            restless: calculatePercentage(averageMoods.restless, negativeIndex),
            sweaty: calculatePercentage(averageMoods.sweaty, negativeIndex),
            sleepwalking: calculatePercentage(averageMoods.sleepwalking, negativeIndex),
            snoring: calculatePercentage(averageMoods.snoring, negativeIndex),
            needMoreSleep: calculatePercentage(averageMoods.needMoreSleep, negativeIndex),
            nocturnalEating: calculatePercentage(averageMoods.nocturnalEating, negativeIndex)
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
          const compiledFunction = pug.compileFile('src/views/after-sleep.pug');
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
