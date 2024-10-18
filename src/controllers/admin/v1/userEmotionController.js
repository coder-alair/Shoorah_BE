'use strict';

const UserEmotion = require('../../../models/userEmotion');
const {
  getUsersEmotionDetailsValidation,
  getUserEmotionValidation
} = require('../../../services/adminValidations/moodEmotionValidation');
const { SUCCESS, USER_TYPE, RESPONSE_CODE } = require('../../../services/Constant');
const { currentDateOnly, toObjectId } = require('../../../services/Helper');
const Response = require('../../../services/Response');

module.exports = {
  /**
   * @description This function is used to get mood emotions
   * @param {*} req
   * @param {*} res
   * @return {*}
   */

  getAllUserEmotions: (req, res) => {
    try {
      const reqParam = req.query;
      getUsersEmotionDetailsValidation(reqParam, res, async (validate) => {
        if (validate) {
          let dateFrom = reqParam.reportFromDate
            ? new Date(reqParam.reportFromDate)
            : currentDateOnly();
          let dateTo = reqParam.reportToDate ? new Date(reqParam.reportToDate) : currentDateOnly();
          dateTo.setDate(dateTo.getDate() + 1);

          const filterCondition = {
            createdAt: {
              $gte: dateFrom,
              $lt: dateTo
            },
            deletedAt: null
          };

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
                          $cond: [{ $eq: ['$feedback', 'happy'] }, 1, 0]
                        }
                      },
                      sadCount: {
                        $sum: {
                          $cond: [{ $eq: ['$feedback', 'sad'] }, 1, 0]
                        }
                      },
                      overjoyedCount: {
                        $sum: {
                          $cond: [{ $eq: ['$feedback', 'overjoyed'] }, 1, 0]
                        }
                      },
                      neutralCount: {
                        $sum: {
                          $cond: [{ $eq: ['$feedback', 'neutral'] }, 1, 0]
                        }
                      },
                      depressedCount: {
                        $sum: {
                          $cond: [{ $eq: ['$feedback', 'depressed'] }, 1, 0]
                        }
                      }
                    }
                  }
                ],
                totalCounts: [
                  {
                    $group: {
                      _id: null,
                      totalHappyCount: {
                        $sum: {
                          $cond: [{ $eq: ['$feedback', 'happy'] }, 1, 0]
                        }
                      },
                      totalSadCount: {
                        $sum: {
                          $cond: [{ $eq: ['$feedback', 'sad'] }, 1, 0]
                        }
                      },
                      totalOverjoyedCount: {
                        $sum: {
                          $cond: [{ $eq: ['$feedback', 'overjoyed'] }, 1, 0]
                        }
                      },
                      totalNeutralCount: {
                        $sum: {
                          $cond: [{ $eq: ['$feedback', 'neutral'] }, 1, 0]
                        }
                      },
                      totalDepressedCount: {
                        $sum: {
                          $cond: [{ $eq: ['$feedback', 'depressed'] }, 1, 0]
                        }
                      }
                    }
                  }
                ]
              }
            },
            {
              $project: {
                totalCounts: { $arrayElemAt: ['$totalCounts', 0] } // Extract the first element from totalCounts
              }
            }
          ];
          const averageEmotion = await UserEmotion.aggregate(aggregationCondition);

          if (averageEmotion.length > 0 && averageEmotion[0].totalCounts) {
            return Response.successResponseData(
              res,
              averageEmotion[0].totalCounts,
              SUCCESS,
              res.__('emotionListSuccess')
            );
          } else {
            return Response.successResponseData(res, [], SUCCESS, res.__('emotionListSuccess'));
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

  /**
   * @description This function is used to get b2b user mood emotions
   * @param {*} req
   * @param {*} res
   * @return {*}
   */
  getUserEmotions: (req, res) => {
    try {
      const reqParam = req.query;
      getUserEmotionValidation(reqParam, res, async (validate) => {
        if (validate) {
          const reqParam = req.query;
          let dateFrom = reqParam.reportFromDate
            ? new Date(reqParam.reportFromDate)
            : currentDateOnly();
          let dateTo = reqParam.reportToDate ? new Date(reqParam.reportToDate) : currentDateOnly();
          dateTo.setDate(dateTo.getDate() + 1);

          const filterCondition = {
            user_id: toObjectId(reqParam.userId),
            createdAt: {
              $gte: dateFrom,
              $lt: dateTo
            },
            deletedAt: null
          };

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
                          $cond: [{ $eq: ['$feedback', 'happy'] }, 1, 0]
                        }
                      },
                      sadCount: {
                        $sum: {
                          $cond: [{ $eq: ['$feedback', 'sad'] }, 1, 0]
                        }
                      },
                      overjoyedCount: {
                        $sum: {
                          $cond: [{ $eq: ['$feedback', 'overjoyed'] }, 1, 0]
                        }
                      },
                      neutralCount: {
                        $sum: {
                          $cond: [{ $eq: ['$feedback', 'neutral'] }, 1, 0]
                        }
                      },
                      depressedCount: {
                        $sum: {
                          $cond: [{ $eq: ['$feedback', 'depressed'] }, 1, 0]
                        }
                      }
                    }
                  }
                ],
                totalCounts: [
                  {
                    $group: {
                      _id: null,
                      totalHappyCount: {
                        $sum: {
                          $cond: [{ $eq: ['$feedback', 'happy'] }, 1, 0]
                        }
                      },
                      totalSadCount: {
                        $sum: {
                          $cond: [{ $eq: ['$feedback', 'sad'] }, 1, 0]
                        }
                      },
                      totalOverjoyedCount: {
                        $sum: {
                          $cond: [{ $eq: ['$feedback', 'overjoyed'] }, 1, 0]
                        }
                      },
                      totalNeutralCount: {
                        $sum: {
                          $cond: [{ $eq: ['$feedback', 'neutral'] }, 1, 0]
                        }
                      },
                      totalDepressedCount: {
                        $sum: {
                          $cond: [{ $eq: ['$feedback', 'depressed'] }, 1, 0]
                        }
                      }
                    }
                  }
                ]
              }
            },
            {
              $project: {
                totalCounts: { $arrayElemAt: ['$totalCounts', 0] } // Extract the first element from totalCounts
              }
            }
          ];
          const averageEmotion = await UserEmotion.aggregate(aggregationCondition);

          if (averageEmotion.length > 0 && averageEmotion[0].totalCounts) {
            return Response.successResponseData(
              res,
              averageEmotion[0].totalCounts,
              SUCCESS,
              res.__('emotionListSuccess')
            );
          } else {
            return Response.successResponseData(res, [], SUCCESS, res.__('emotionListSuccess'));
          }
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      console.log(err);
      return Response.internalServerErrorResponse(res);
    }
  }
};
