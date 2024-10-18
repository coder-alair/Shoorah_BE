'use strict';

const UserEmotion = require('../../../models/userEmotion');
const { SUCCESS, FAIL, REPORT_TYPE, MOOD_REPORT } = require('../../../services/Constant');
const { currentDateOnly, toObjectId, getFirstDayOfWeek, getFirstDayOfMonth } = require('../../../services/Helper');
const Response = require('../../../services/Response');
const { emotionChartCalculation } = require('../../../services/userServices/moodService');
const { addEditEmotionsValidation, getEmotionDetailsValidation } = require('../../../services/userValidations/moodEmotionValidation');

module.exports = {
  /**
* @description This function is used to add user mood emotions for a day 
* @param {*} req
* @param {*} res
* @return {*}
*/

  addUserEmotion: (req, res) => {
    try {
      const reqParam = req.body;
      addEditEmotionsValidation(reqParam, res, async (validate) => {
        if (validate) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);

          let findCondition = {
            user_id: req.authUserId,
            createdAt: {
              $gte: today,
              $lt: tomorrow,
            },
          };

          const emotion = await UserEmotion.findOne(findCondition);
          if (emotion) {
            return Response.successResponseWithoutData(res, res.__('alreadyAddedEmotionForToday'), SUCCESS);
          } else {
            let updateData = {
              user_id: req.authUserId,
              feedback: reqParam.feedback,
            };

            await UserEmotion.create(updateData);

            return Response.successResponseWithoutData(res, res.__('emotionAddedSuccess'), SUCCESS);
          }
        }
      })
    } catch (err) {
      console.error(err);
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
* @description This function is used to get mood emotions  
* @param {*} req
* @param {*} res
* @return {*}
*/

  getUserEmotions: (req, res) => {
    try {
      const reqParam = req.query;
      getEmotionDetailsValidation(reqParam, res, async (validate) => {
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
            happyCount: {
              $sum: {
                $cond: [
                  { $eq: ['$feedback', 'happy'] }, // Check if feedback is 'happy'
                  1,
                  0
                ]
              }
            },
            sadCount: {
              $sum: {
                $cond: [
                  { $eq: ['$feedback', 'sad'] }, // Check if feedback is 'sad'
                  1,
                  0
                ]
              }
            },
            overjoyedCount: {
              $sum: {
                $cond: [
                  { $eq: ['$feedback', 'overjoyed'] }, // Check if feedback is 'overjoyed'
                  1,
                  0
                ]
              }
            },
            neutralCount: {
              $sum: {
                $cond: [
                  { $eq: ['$feedback', 'neutral'] }, // Check if feedback is 'neutral'
                  1,
                  0
                ]
              }
            },
            depressedCount: {
              $sum: {
                $cond: [
                  { $eq: ['$feedback', 'depressed'] }, // Check if feedback is 'depressed'
                  1,
                  0
                ]
              }
            }
          }

        

          switch (parseInt(reqParam.reportType)) {
            case REPORT_TYPE.DAILY:
              const aggregationCondition = [
                {
                  $match: filterCondition
                },
                {
                  $facet: {
                    emotionCount: [
                      {
                        $group: {
                          _id: '$user_id',
                          happyCount: {
                            $sum: {
                              $cond: [
                                { $eq: ['$feedback', 'happy'] }, // Check if feedback is 'happy'
                                1,
                                0
                              ]
                            }
                          },
                          sadCount: {
                            $sum: {
                              $cond: [
                                { $eq: ['$feedback', 'sad'] }, // Check if feedback is 'sad'
                                1,
                                0
                              ]
                            }
                          },
                          overjoyedCount: {
                            $sum: {
                              $cond: [
                                { $eq: ['$feedback', 'overjoyed'] }, // Check if feedback is 'overjoyed'
                                1,
                                0
                              ]
                            }
                          },
                          neutralCount: {
                            $sum: {
                              $cond: [
                                { $eq: ['$feedback', 'neutral'] }, // Check if feedback is 'neutral'
                                1,
                                0
                              ]
                            }
                          },
                          depressedCount: {
                            $sum: {
                              $cond: [
                                { $eq: ['$feedback', 'depressed'] }, // Check if feedback is 'depressed'
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
                    emotionCount: 1
                  }
                }
              ];
              const averageEmotion = await UserEmotion.aggregate(aggregationCondition);

              if (averageEmotion.length > 0 && averageEmotion[0].emotionCount.length > 0) {
                resData = {
                  emotionCount: averageEmotion[0].emotionCount[0]
                };
                return Response.successResponseData(
                  res,
                  averageEmotion[0].emotionCount[0],
                  SUCCESS,
                  res.__('emotionListSuccess')
                );
              } else {
                return Response.successResponseData(res, [], SUCCESS, res.__('emotionListSuccess'));
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
                        isoDayOfWeek: 7
                      }
                    }
                  }
                },
                {
                  $group: groupDataCondition
                }
              ];
              const weeklyData = await UserEmotion.aggregate(weeklyQuery);
    
              const dateRange = [dateFrom];
              for (let x = 0; x <= 5; x++) {
                dateFrom = new Date(dateFrom);
                dateFrom.setDate(dateFrom.getDate() + 7);
                dateRange.push(dateFrom);
              }
  
              resData = emotionChartCalculation(weeklyData, dateRange);
              return Response.successResponseData(res, resData, SUCCESS, res.__('emotionListSuccess'));

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
              const monthlyData = await UserEmotion.aggregate(monthlyQuery);
              const monthRange = [dateFrom];
              for (let x = 0; x <= 5; x++) {
                dateFrom = new Date(dateFrom);
                dateFrom.setMonth(dateFrom.getMonth() + 1);
                monthRange.push(dateFrom);
              }
              resData = emotionChartCalculation(monthlyData, monthRange);
              return Response.successResponseData(res, resData, SUCCESS, res.__('emotionListSuccess'));
           
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
              const yearlyData = await UserEmotion.aggregate(yearlyQuery);
              const yearRange = [dateFrom.getFullYear()];
              for (let x = 0; x <= 1; x++) {
                dateFrom = new Date(dateFrom);
                dateFrom.setFullYear(dateFrom.getFullYear() + 1);
                yearRange.push(dateFrom.getFullYear());
              }

              resData = emotionChartCalculation(yearlyData, yearRange);
              return Response.successResponseData(res, resData, SUCCESS, res.__('emotionListSuccess'));

            default:
              return Response.successResponseWithoutData(res, res.__('noEmotionCase'), FAIL);
          }
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },




} 