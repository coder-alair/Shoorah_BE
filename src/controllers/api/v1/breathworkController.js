'use strict';

const Response = require('@services/Response');

const { SUCCESS, FAIL, STATUS, USER_MEDIA_PATH, ADMIN_MEDIA_PATH, CLOUDFRONT_URL, PAGE, PER_PAGE, CONTENT_TYPE, BREATHWORK_NOTIFICATION_MESSAGE } = require('../../../services/Constant');
const BreathworkInterest = require('../../../models/BreathworkInterests');
const { addBreathworkInterestValidations, addEditBreathHoldValidations, addEditBreathExhaleValidations } = require('../../../services/userValidations/breathworkValidations');
const { convertObjectKeysToCamelCase, toObjectId, shuffleArray, makeRandomDigit } = require('../../../services/Helper');
const moment = require('moment');
const { userBreathworkDetailedListValidation, userBreathworkSessionValidation } = require('../../../services/userValidations/userBreathwokValidations');
const Breathwork = require('../../../models/Breathwork');
const BreathworkSession = require('../../../models/BreathworkSession');
const { RecentlyPlayed, Trending } = require('../../../models');

const setBreathworkUsage = async (userId) => {
  try {
    if (userId) {
      const currentDate = new Date();
      const content = await BreathworkInterest.findOne({
        user_id: userId,
        streak_updated_at: {
          $gte: moment(currentDate).subtract(1, 'day').startOf('day').toDate(),
          $lt: moment(currentDate).startOf('day').toDate()
        }
      });

      if (content) {
        let updateData = {
          breathwork_streak: 1
        }
        if (content.breathwork_streak >= content.max_breathwork_streak) {
          updateData = {
            ...updateData,
            max_breathwork_streak: 1
          }
        }
        await BreathworkInterest.updateOne(
          { user_id: userId },
          { $inc: updateData, streak_updated_at: currentDate }
        );
      } else {
        const previousContent = await BreathworkInterest.findOne({
          user_id: userId,
          streak_updated_at: {
            $gte: moment(currentDate).startOf('day').toDate(),
            $lt: moment(currentDate).endOf('day').toDate()
          }
        });

        if (!previousContent) {
          await BreathworkInterest.updateOne(
            { user_id: userId },
            { $set: { breathwork_streak: 1, streak_updated_at: currentDate } }
          );
        }
      }

      return true;
    }
  } catch (err) {
    console.error(err);
    return false;
  }
};


module.exports = {
  /**
   * @description This function is used for adding updating user breathwork interests
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */

  addUpdateBreathworkInterests: async (req, res) => {
    try {
      const reqParam = req.body;
      addBreathworkInterestValidations(reqParam, res, async (validate) => {
        if (validate) {
          let interest = await BreathworkInterest.findOne({ user_id: req.authUserId });
          if (interest) {
            let updateData = {
              user_id: req.authUserId,
              goals_interest: reqParam.goals,
              breathwork_exp: reqParam.breathworkExp,
              sessions: reqParam.sessions,
              sessions_durations: reqParam.sessionDuration,
              basic_list: reqParam.basicList,
              basic_status: reqParam.basicStatus
            }

            let max_hold_min = parseInt(reqParam.max_hold_min) || 0;
            let max_hold_sec = parseInt(reqParam.max_hold_sec) || 0;
            let max_exhale_min = parseInt(reqParam.max_exhale_min) || 0;
            let max_exhale_sec = parseInt(reqParam.max_exhale_sec) || 0;

            let [hold_min, hold_sec] = interest?.max_hold.split(':').map(Number);
            let [exhale_min, exhale_sec] = interest?.max_exhale.split(':').map(Number);

            if (max_hold_min > hold_min || (max_hold_min === hold_min && max_hold_sec > hold_sec)) {
              updateData = {
                ...updateData,
                max_hold: `${max_hold_min}:${max_hold_sec < 10 ? '0' : ''}${max_hold_sec}`
              };
            }
            if (max_exhale_min > exhale_min || (max_exhale_min === exhale_min && max_exhale_sec > exhale_sec)) {
              updateData = {
                ...updateData,
                max_exhale: `${max_exhale_min}:${max_exhale_sec < 10 ? '0' : ''}${max_exhale_sec}`
              };
            }

            await setBreathworkUsage(req.authUserId);
            await BreathworkInterest.findOneAndUpdate({ _id: interest._id }, updateData, { upsert: true, new: true });
            return Response.successResponseWithoutData(
              res,
              res.__('breathworkInterestUpdated'),
              SUCCESS,
            );
          } else {
            let newData = {
              user_id: req.authUserId,
              goals_interest: reqParam.goals,
              breathwork_exp: reqParam.breathworkExp,
              sessions_durations: reqParam.sessionDuration,
              basic_list: reqParam.basicList,
              basic_status: reqParam.basicStatus,
              sessions: 0,
              breathwork_streak: 1,
              max_breathwork_streak: 1,
              streak_updated_at: new Date(),
              max_exhale: '00:00',
              max_hold: '00:00'
            }

            await BreathworkInterest.create(newData);
            return Response.successResponseWithoutData(
              res,
              interest ? res.__('breathworkInterestUpdated') : res.__('breathworkInterestAdded'),
              SUCCESS,
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
  * @description This function is used for getting breathwork user profile
  * @param {*} req
  * @param {*} res
  * @returns {*}
  */

  getBreathworkInterests: async (req, res) => {
    try {
      let interestData = await BreathworkInterest.findOne({ user_id: req.authUserId }).lean();
      if (interestData) {
        await setBreathworkUsage(req.authUserId);
        let interest = await BreathworkInterest.findOne({ user_id: req.authUserId }).lean();
        const randomIndex = Math.floor(Math.random() * BREATHWORK_NOTIFICATION_MESSAGE.length);
        let thought = BREATHWORK_NOTIFICATION_MESSAGE[randomIndex];
        interest.thought = thought;

        return Response.successResponseData(
          res,
          convertObjectKeysToCamelCase(interest),
          SUCCESS,
          res.__('getInterestDataSucess'),
        )
      }
      else {
        return Response.successResponseWithoutData(res, res.__('noInterestFound'), FAIL);
      }
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
  * @description This function is used for getting all breathworks by category or basic
  * @param {*} req
  * @param {*} res
  * @returns {*}
  */

  breathworkList: async (req, res) => {
    try {
      const reqParam = req.query;
      userBreathworkDetailedListValidation(reqParam, res, async (validate) => {
        if (validate) {
          let page = PAGE;
          let perPage = PER_PAGE;
          if (reqParam.page) {
            page = parseInt(reqParam.page);
          }
          if (reqParam.perPage) {
            perPage = parseInt(reqParam.perPage);
          }
          const skip = (page - 1) * perPage || 0;
          let filterCondition = {
            status: STATUS.ACTIVE,
            approved_by: {
              $ne: null
            }
          };
          if (reqParam.searchKey) {
            filterCondition = {
              ...filterCondition,
              $or: [
                {
                  display_name: { $regex: '.*' + reqParam.searchKey + '.*', $options: 'i' }
                },
                {
                  expert_name: { $regex: '.*' + reqParam.searchKey + '.*', $options: 'i' }
                }
              ]
            };
          }

          if (reqParam.breathworkCategory) {
            filterCondition = {
              ...filterCondition,
              breathwork_category: parseInt(reqParam.breathworkCategory)
            };
          }

          if (reqParam.isBasic) {
            filterCondition = {
              ...filterCondition,
              is_basic: reqParam.isBasic === 'true'
            };
          }

          const aggregatePipeline = [
            {
              $match: filterCondition
            }
          ];

          aggregatePipeline.push(
            {
              $group: {
                _id: '$_id',
                display_name: {
                  $first: '$display_name'
                },
                description: {
                  $first: '$description'
                },
                duration: {
                  $first: '$duration'
                },
                breathwork_url: {
                  $first: '$breathwork_url'
                },
                breathwork_srt: {
                  $first: '$breathwork_srt'
                },
                breathwork_image: {
                  $first: '$breathwork_image'
                },
                breathwork_category: {
                  $first: '$breathwork_category'
                },
                expert_name: {
                  $first: '$expert_name'
                },
                expert_image: {
                  $first: '$expert_image'
                },
                is_basic: {
                  $first: '$is_basic'
                },
                updatedAt: {
                  $first: '$updatedAt'
                }
              }
            },
            {
              $project: {
                contentId: '$_id',
                contentName: '$display_name',
                description: 1,
                duration: 1,
                url: {
                  $concat: [
                    CLOUDFRONT_URL,
                    ADMIN_MEDIA_PATH.BREATHWORK_AUDIO,
                    '/',
                    '$breathwork_url'
                  ]
                },
                breathworkCategory: 1,
                breathworkSrtName: '$breathwork_srt',
                srtUrl: {
                  $concat: [CLOUDFRONT_URL, 'admins/breathwork/srt/', '$breathwork_srt']
                },
                image: {
                  $concat: [
                    CLOUDFRONT_URL,
                    ADMIN_MEDIA_PATH.BREATHWORK_IMAGE,
                    '/',
                    '$breathwork_image'
                  ]
                },
                expertName: '$expert_name',
                isBasic: '$is_basic',
                updatedAt: 1,
                expertImage: {
                  $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.EXPERT_IMAGES, '/', '$expert_image']
                },
                _id: 0
              }
            },
            {
              $addFields: {
                contentType: CONTENT_TYPE.BREATHWORK
              }
            },
            {
              $sort: {
                updatedAt: -1
              }
            },

            {
              $lookup: {
                from: "breathwork_interests",
                let: { contentId: "$contentId" },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $in: ["$$contentId", "$basic_list"]
                      }
                    }
                  },
                  {
                    $limit: 1
                  }
                ],
                as: "basicListInfo"
              }
            },
            {
              $addFields: {
                basicList: { $gt: [{ $size: "$basicListInfo" }, 0] } // Set to true if basicListInfo array is not empty
              }
            },
            {
              $project: {
                basicListInfo: 0
              }
            },

            {
              $facet: {
                metaData: [
                  {
                    $count: 'totalCount'
                  },
                  {
                    $addFields: {
                      page,
                      perPage
                    }
                  }
                ],
                data: [
                  {
                    $skip: skip
                  },
                  {
                    $limit: perPage
                  }
                ]
              }
            }
          );
          const breathworkData = await Breathwork.aggregate(aggregatePipeline);
          return breathworkData.length > 0
            ? Response.successResponseData(
              res,
              breathworkData[0].data,
              SUCCESS,
              res.__('getBreathworkList'),
              breathworkData[0].metaData[0]
            )
            : Response.successResponseWithoutData(res, res.__('noBreathworkFound'), FAIL);
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },


};
