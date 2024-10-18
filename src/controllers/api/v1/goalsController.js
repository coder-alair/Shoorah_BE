'use strict';

const { Goals } = require('@models');
const Response = require('@services/Response');
const {
  addEditGoalsValidation,
  myGoalsListValidation,
  myDraftGoalsValidation,
  deleteGoalValidation
} = require('@services/userValidations/goalsValidations');
const {
  FAIL,
  SUCCESS,
  PAGE,
  PER_PAGE,
  USER_MEDIA_PATH,
  CLOUDFRONT_URL,
  CATEGORY_TYPE,
  BADGE_TYPE
} = require('@services/Constant');
const { toObjectId, currentDateOnly, unixTimeStamp, makeRandomDigit } = require('@services/Helper');
const { getUploadURL, removeOldImage } = require('@services/s3Services');
const { updateBadges, sendBadgeNotification } = require('@services/userServices/badgeServices');
const { ContentCounts } = require('../../../models');
const { default: axios } = require('axios');
const { analyzeSentiment } = require('./historyController');

module.exports = {
  /**
   * @description This function is used to add or edit goals.
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  addEditGoals: (req, res) => {
    try {
      const reqParam = req.body;
      addEditGoalsValidation(reqParam, res, async (validate) => {
        if (validate) {
          let updateData = {
            title: reqParam.title,
            is_completed: reqParam.isCompleted,
            is_saved: reqParam.isSaved,
            due_date: reqParam.dueDate || null,
            description: reqParam.description || null,
            checklist: reqParam.checklist || []
          };
          let goalsImageUrl;
          if (reqParam.isCompleted && reqParam.isSaved) {
            updateData = {
              ...updateData,
              completed_on: new Date()
            };
          }
          if (reqParam.imageUrl) {
            const imageExtension = reqParam.imageUrl.split('/')[1];
            const goalsImage = `${unixTimeStamp(new Date())}-${makeRandomDigit(
              4
            )}.${imageExtension}`;
            goalsImageUrl = await getUploadURL(
              reqParam.imageUrl,
              goalsImage,
              USER_MEDIA_PATH.GOALS
            );
            updateData = {
              ...updateData,
              image_url: goalsImage
            };
          }
          if (reqParam.isImageDeleted) {
            updateData = {
              ...updateData,
              image_url: null
            };
          }
          let response = await analyzeSentiment(updateData.title);
          updateData = {
            ...updateData,
            positivity: response ? response : false
          };

          if (reqParam.goalId) {
            const filterCondition = {
              _id: reqParam.goalId,
              user_id: req.authUserId,
              deletedAt: null
            };
            if (reqParam.imageUrl || reqParam.isImageDeleted) {
              const existingImageUrl = await Goals.findOne(filterCondition).select('image_url');
              if (existingImageUrl && existingImageUrl.image_url) {
                await removeOldImage(existingImageUrl.image_url, USER_MEDIA_PATH.GOALS, res);
              }
            }
            await Goals.findOneAndUpdate(filterCondition, updateData);
          } else {
            let { data: sentiments } = await axios.post(
              `https://suru-therapy.shoorah.io/match?input_text=${reqParam.title}`
            );
            let newData = {
              ...updateData,
              user_id: req.authUserId,
              sentiments
            };

            let response = await analyzeSentiment(newData.title);
            newData = {
              ...newData,
              positivity: response ? response : false
            };

            await Goals.create(newData);
          }
          const goalsCount = await Goals.countDocuments({
            user_id: req.authUserId,
            is_saved: true,
            is_completed: true,
            deletedAt: null
          });
          let badgeReceived = false;
          switch (goalsCount) {
            case 1:
              badgeReceived = await updateBadges(
                req.authUserId,
                CATEGORY_TYPE.GOALS,
                BADGE_TYPE.BRONZE
              );
              badgeReceived &&
                (await sendBadgeNotification(
                  req.authUserId,
                  CATEGORY_TYPE.GOALS,
                  BADGE_TYPE.BRONZE
                ));
              break;
            case 3:
              badgeReceived = await updateBadges(
                req.authUserId,
                CATEGORY_TYPE.GOALS,
                BADGE_TYPE.SILVER
              );
              badgeReceived &&
                (await sendBadgeNotification(
                  req.authUserId,
                  CATEGORY_TYPE.GOALS,
                  BADGE_TYPE.SILVER
                ));
              break;
            case 5:
              badgeReceived = await updateBadges(
                req.authUserId,
                CATEGORY_TYPE.GOALS,
                BADGE_TYPE.GOLD
              );
              badgeReceived &&
                (await sendBadgeNotification(req.authUserId, CATEGORY_TYPE.GOALS, BADGE_TYPE.GOLD));
              break;
            case 10:
              badgeReceived = await updateBadges(
                req.authUserId,
                CATEGORY_TYPE.GOALS,
                BADGE_TYPE.PLATINUM
              );
              badgeReceived &&
                (await sendBadgeNotification(
                  req.authUserId,
                  CATEGORY_TYPE.GOALS,
                  BADGE_TYPE.PLATINUM
                ));
              break;
            case 15:
              badgeReceived = await updateBadges(
                req.authUserId,
                CATEGORY_TYPE.GOALS,
                BADGE_TYPE.DIAMOND
              );
              badgeReceived &&
                (await sendBadgeNotification(
                  req.authUserId,
                  CATEGORY_TYPE.GOALS,
                  BADGE_TYPE.DIAMOND
                ));
              break;
          }

          return Response.successResponseWithoutData(
            res,
            reqParam.goalId ? res.__('goalsUpdateSuccess') : res.__('goalsAddSuccess'),
            SUCCESS,
            goalsImageUrl || null
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
   * @description This function is used to get list of my in progress or completed goals
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  myGoalsList: (req, res) => {
    try {
      const reqParam = req.query;
      myGoalsListValidation(reqParam, res, async (validate) => {
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
            user_id: toObjectId(req.authUserId),
            is_saved: true,
            deletedAt: null
          };
          if (reqParam.isCompleted) {
            filterCondition = {
              ...filterCondition,
              is_completed: JSON.parse(reqParam.isCompleted)
            };
          }
          if (reqParam.searchKey) {
            filterCondition = {
              ...filterCondition,
              $or: [{ title: { $regex: '.*' + reqParam.searchKey + '.*', $options: 'i' } }]
            };
          }
          const fromDate = currentDateOnly();
          const aggregateCondition = [
            {
              $match: filterCondition
            },
            {
              $addFields: {
                timeRemaining: {
                  $divide: [
                    {
                      $subtract: ['$due_date', fromDate]
                    },
                    86400000
                  ]
                }
              }
            },
            {
              $project: {
                goalId: '$_id',
                _id: 0,
                imageUrl: {
                  $concat: [CLOUDFRONT_URL, USER_MEDIA_PATH.GOALS, '/', '$image_url']
                },
                title: 1,
                description: 1,
                isCompleted: '$is_completed',
                createdOn: '$createdAt',
                dueDate: '$due_date',
                updatedAt: 1,
                checklist: 1,
                completedOn: '$completed_on',
                daysRemaining: {
                  $cond: {
                    if: {
                      $eq: ['$is_completed', true]
                    },
                    then: '$$REMOVE',
                    else: {
                      $cond: {
                        if: {
                          $lt: ['$timeRemaining', 0]
                        },
                        then: -1,
                        else: '$timeRemaining'
                      }
                    }
                  }
                }
              }
            },
            {
              $sort: {
                dueDate: 1,
                updatedAt: -1
              }
            },
            {
              $facet: {
                metadata: [{ $count: 'totalCount' }, { $addFields: { page, perPage } }],
                data: [{ $skip: skip }, { $limit: perPage }]
              }
            }
          ];
          const myGoals = await Goals.aggregate(aggregateCondition);

          const totalGoals = await Goals.find({ user_id: toObjectId(req.authUserId) });
          let existingCount = await ContentCounts.findOne({ user_id: toObjectId(req.authUserId) });
          if (existingCount) {
            await ContentCounts.updateOne(
              { user_id: toObjectId(req.authUserId) },
              {
                $set: {
                  goals: totalGoals.length
                }
              }
            );
          } else {
            await ContentCounts.create({
              goals: totalGoals.length,
              user_id: toObjectId(req.authUserId)
            });
          }

          return myGoals.length > 0
            ? Response.successResponseData(
                res,
                myGoals[0].data,
                SUCCESS,
                res.__('goalsListSucess'),
                myGoals[0].metadata[0]
              )
            : Response.successResponseWithoutData(res, res.__('noGoalsFound'), FAIL);
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to list my draft goals
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  myDraftGoals: (req, res) => {
    try {
      const reqParam = req.query;
      myDraftGoalsValidation(reqParam, res, async (validate) => {
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
          const filterCondition = {
            user_id: req.authUserId,
            is_saved: false,
            deletedAt: null
          };
          const draftGoals = await Goals.find(filterCondition, {
            goalId: '$_id',
            title: 1,
            createdOn: '$createdAt',
            checklist: 1,
            description: 1,
            isCompleted: '$is_completed',
            completedOn: '$completed_on',
            updatedAt: 1,
            imageUrl: {
              $concat: [CLOUDFRONT_URL, USER_MEDIA_PATH.GOALS, '/', '$image_url']
            },
            dueDate: '$due_date'
          })
            .skip(skip)
            .limit(perPage);
          const draftGoalsCount = await Goals.countDocuments(filterCondition);
          return Response.successResponseData(res, draftGoals, SUCCESS, res.__('goalsListSucess'), {
            page,
            perPage,
            totalCount: draftGoalsCount
          });
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to delete goal of loggged in user
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  deleteGoal: (req, res) => {
    try {
      const reqParam = req.query;
      deleteGoalValidation(reqParam, res, async (validate) => {
        if (validate) {
          const filterData = {
            user_id: req.authUserId,
            _id: reqParam.goalId,
            deletedAt: null
          };
          const deletedGoal = await Goals.findOneAndUpdate(
            filterData,
            { deletedAt: new Date() },
            { new: true }
          ).select('_id');
          return Response.successResponseWithoutData(
            res,
            deletedGoal ? res.__('goalDeleteSuccess') : res.__('noGoalsFound'),
            deletedGoal ? SUCCESS : FAIL
          );
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  }
};
