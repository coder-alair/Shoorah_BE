'use strict';

const Response = require('@services/Response');
const { FAIL, SUCCESS } = require('@services/Constant');
const HelpUsImprove = require('../../../models/HelpUsImprove');
const {
  addUserFeedbackValidation,
  getFeedbackValidation
} = require('../../../services/userValidations/feedbackValidation');
const {
  toObjectId,
  convertObjectKeysToCamelCase,
  dynamicUserModelName
} = require('../../../services/Helper');
const { Meditation } = require('../../../models');
const {
  CONTENT_TYPE,
  STATUS,
  HELP_US_IMPROVE,
  PAGE,
  PER_PAGE,
  SORT_ORDER,
  SORT_BY
} = require('../../../services/Constant');
const { userFeedsListValidation } = require('../../../services/adminValidations/helpUsValidations');

module.exports = {
  /**
   * @description This function is for get help feedback
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */

  getUserFeedbacks: async (req, res) => {
    try {
      const reqParam = req.query;
      userFeedsListValidation(reqParam, res, async (validate) => {
        if (validate) {
          const helpUsImproveValues = Object.values(HELP_US_IMPROVE);
          const page = reqParam.page ? parseInt(reqParam.page) : PAGE;
          const perPage = reqParam.perPage ? parseInt(reqParam.perPage) : PER_PAGE;
          const skip = (page - 1) * perPage || 0;
          const sortBy = reqParam.sortBy || SORT_BY;
          const sortOrder = reqParam.sortOrder ? parseInt(reqParam.sortOrder) : SORT_ORDER;
          let sortByFeedbackType = reqParam.sortByFeedbackType; // e.g., "Track is too long"
          // e.g., "Track is too long"
          let sortOrderFeedback = parseInt(reqParam.sortOrderFeedback) || 1;

          let Model = await dynamicUserModelName(parseInt(reqParam.contentType));
          let filterCondition = {
            deletedAt: null,
            status: STATUS.ACTIVE,
            ...(reqParam.searchKey && {
              $or: [
                {
                  display_name: { $regex: '.*' + reqParam.searchKey + '.*', $options: 'i' }
                }
              ]
            })
          };

          let aggregatePipeline = [
            {
              $match: filterCondition
            },
            {
              $lookup: {
                from: 'help_us_improves',
                localField: '_id',
                foreignField: 'content_id',
                as: 'feedbacks'
              }
            },
            {
              $addFields: {
                feedbackCount: {
                  $arrayToObject: {
                    $map: {
                      input: helpUsImproveValues,
                      as: 'feedbackValue',
                      in: {
                        k: '$$feedbackValue',
                        v: {
                          $size: {
                            $filter: {
                              input: '$feedbacks',
                              as: 'feedback',
                              cond: { $eq: ['$$feedback.feedback', '$$feedbackValue'] }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            {
              $addFields: {
                feedbackCountForSort: {
                  $ifNull: [
                    {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: { $objectToArray: '$feedbackCount' },
                            as: 'item',
                            cond: { $eq: ['$$item.k', sortByFeedbackType] }
                          }
                        },
                        0
                      ]
                    },
                    { k: sortByFeedbackType, v: 0 }
                  ]
                }
              }
            },
            {
              $addFields: {
                sortFeedbackCount: '$feedbackCountForSort.v',
                totalFeedbackCount: {
                  $sum: {
                    $map: {
                      input: { $objectToArray: '$feedbackCount' },
                      as: 'feedback',
                      in: '$$feedback.v'
                    }
                  }
                }
              }
            },
            {
              $match: {
                totalFeedbackCount: { $gt: 0 }
              }
            }
          ];

          const totalRecordsPipeline = [...aggregatePipeline, { $count: 'total' }];
          const totalRecordsResult = await Model.aggregate(totalRecordsPipeline);
          const totalRecords = totalRecordsResult.length > 0 ? totalRecordsResult[0].total : 0;

          if (sortBy === 'display_name') {
            aggregatePipeline.push({
              $addFields: {
                sortField: {
                  $toLower: `$${sortBy}`
                }
              }
            });
          } else {
            aggregatePipeline.push({
              $addFields: {
                sortField: `$${sortBy}`
              }
            });
          }

          const data = await Model.aggregate([
            ...aggregatePipeline,
            {
              $sort: {
                sortFeedbackCount: sortOrderFeedback,
                sortField: sortOrder
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
                _id: 0,
                content_id: '$_id',
                content_name: '$display_name',
                content_type: { $literal: parseInt(reqParam.contentType) },
                created_at: '$createdAt',
                feedback: '$feedbackCount'
              }
            }
          ]);

          // const totalRecords = await Model.countDocuments(filterCondition);

          return Response.successResponseData(
            res,
            convertObjectKeysToCamelCase(data),
            SUCCESS,
            res.__('getUserFeeds'),
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
      console.error(err);
      return Response.internalServerErrorResponse(res);
    }
  }
};
