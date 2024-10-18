'use strict';

const { UserRituals, UserCompletedRituals, Ritual } = require('@models');
const Response = require('@services/Response');
const {
  ritualsListValidation,
  addMyRitualsValidation,
  myRitualListValidation,
  deleteMyRitualValidation,
  myRitualsCompletedStatusValidation,
  myRitualsCompletedStatusListValidation
} = require('@services/userValidations/userRitualsValidations');
const {
  FAIL,
  SUCCESS,
  PAGE,
  PER_PAGE,
  STATUS,
  CATEGORY_TYPE,
  BADGE_TYPE
} = require('@services/Constant');
const { toObjectId, currentDateOnly } = require('@services/Helper');
const { updateBadges, sendBadgeNotification } = require('@services/userServices/badgeServices');
const { Category, UserCustomRituals, ContentCounts } = require('../../../models');
const { CONTENT_TYPE } = require('../../../services/Constant');

module.exports = {
  /**
   * @description This function is used to get list of shoorah rituals.
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  shoorahRituals: async (req, res) => {
    try {
      const reqParam = req.query;
      if (reqParam.categoryId) {
        let category = await Category.findOne({
          _id: reqParam.categoryId,
          contentType: CONTENT_TYPE.RITUALS
        });
        reqParam.focusIds = category?.focuses;
        reqParam.focusIds = reqParam?.focusIds?.map((objectId) => objectId.toString());
      }

      ritualsListValidation(reqParam, res, async (validate) => {
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
          let filterRituals = {
            status: STATUS.ACTIVE,
            approved_by: {
              $ne: null
            }
          };
          if (reqParam.searchKey) {
            filterRituals = {
              ...filterRituals,
              display_name: {
                $regex: '.*' + reqParam.searchKey + '.*',
                $options: 'i'
              }
            };
          }
          const aggregateCondition = [
            {
              $match: filterRituals
            },
            {
              $unwind: {
                path: '$focus_ids',
                preserveNullAndEmptyArrays: false
              }
            }
          ];
          if (reqParam.focusIds && reqParam.focusIds.length > 0) {
            const objFocusIds = [];
            reqParam.focusIds.map((el) => {
              objFocusIds.push(toObjectId(el));
            });
            aggregateCondition.push({
              $match: {
                $expr: {
                  $in: ['$focus_ids', objFocusIds]
                }
              }
            });
          }
          aggregateCondition.push(
            {
              $group: {
                _id: '$_id',
                focus_ids: {
                  $addToSet: '$focus_ids'
                },
                display_name: {
                  $first: '$display_name'
                },
                updatedAt: {
                  $first: '$updatedAt'
                }
              }
            },
            {
              $lookup: {
                from: 'user_rituals',
                let: {
                  ritualId: '$_id'
                },
                pipeline: [
                  {
                    $match: {
                      user_id: toObjectId(req.authUserId),
                      $expr: {
                        $in: ['$$ritualId', '$ritual_ids']
                      }
                    }
                  },
                  {
                    $project: {
                      ritual_ids: 1
                    }
                  }
                ],
                as: 'userRituals'
              }
            },
            {
              $match: {
                $expr: {
                  $eq: [{ $size: '$userRituals' }, 0]
                }
              }
            },
            {
              $lookup: {
                from: 'focus',
                let: {
                  focusIds: '$focus_ids'
                },
                pipeline: [
                  {
                    $match: {
                      status: 1,
                      approved_by: {
                        $ne: null
                      },
                      $expr: {
                        $in: ['$_id', '$$focusIds']
                      }
                    }
                  },
                  {
                    $project: {
                      display_name: 1
                    }
                  }
                ],
                as: 'focus'
              }
            },
            {
              $match: {
                $expr: {
                  $gt: [{ $size: '$focus' }, 0]
                }
              }
            },
            {
              $project: {
                id: '$_id',
                ritualName: '$display_name',
                focusName: '$focus.display_name',
                updatedAt: 1,
                _id: 0
              }
            },
            {
              $sort: {
                updatedAt: -1
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
          const ritualData = await Ritual.aggregate(aggregateCondition);
          return ritualData.length > 0
            ? Response.successResponseData(
                res,
                ritualData[0].data,
                SUCCESS,
                res.__('ritualsList'),
                ritualData[0].metaData[0]
              )
            : Response.successResponseWithoutData(res, res.__('somethingWrong'), FAIL);
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to add logged in user's rituals
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  addMyRituals: (req, res) => {
    try {
      const reqParam = req.body;
      addMyRitualsValidation(reqParam, res, async (validate) => {
        if (validate) {
          const newObj = {
            $addToSet: { ritual_ids: { $each: reqParam.ritualIds } }
          };
          const filterData = {
            user_id: req.authUserId,
            deletedAt: null
          };
          const myRitual = await UserRituals.findOneAndUpdate(filterData, newObj, {
            upsert: true,
            new: true
          }).select('_id ritual_ids');
          if (myRitual?.ritual_ids.length >= 5) {
            const badgeReceived = await updateBadges(
              req.authUserId,
              CATEGORY_TYPE.USER_RITUALS,
              BADGE_TYPE.BRONZE
            );
            badgeReceived &&
              (await sendBadgeNotification(
                req.authUserId,
                CATEGORY_TYPE.USER_RITUALS,
                BADGE_TYPE.BRONZE
              ));
          }
          return Response.successResponseWithoutData(
            res,
            myRitual ? res.__('myRitualUpdate') : res.__('somethingWrong'),
            myRitual ? SUCCESS : FAIL
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
   * @description This function is used to get logged in user rituals list
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  myRitualList: (req, res) => {
    try {
      const reqParam = req.query;
      myRitualListValidation(reqParam, res, async (validate) => {
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
          const dateFrom = currentDateOnly();
          const dateTo = currentDateOnly();
          dateTo.setDate(dateFrom.getDate() + 1);

          const filterRituals = {
            status: STATUS.ACTIVE,
            approved_by: {
              $ne: null
            },
            $expr: {
              $in: ['$_id', '$$ritualIds']
            }
          };
          const aggregateCondition = [
            {
              $match: {
                user_id: toObjectId(req.authUserId),
                deletedAt: null,
                ritual_ids: {
                  $not: {
                    $size: 0
                  }
                }
              }
            },
            {
              $limit: 1
            },
            {
              $lookup: {
                from: 'rituals',
                let: {
                  ritualIds: '$ritual_ids'
                },
                pipeline: [
                  {
                    $match: filterRituals
                  },
                  {
                    $project: {
                      id: '$_id',
                      ritualName: '$display_name',
                      focus_ids: 1,
                      updatedAt: 1
                    }
                  }
                ],
                as: 'userRituals'
              }
            },
            {
              $unwind: {
                path: '$userRituals',
                preserveNullAndEmptyArrays: false
              }
            }
          ];
          const aggregateConditionAll = [
            {
              $match: {
                user_id: toObjectId(req.authUserId),
                ritual_ids: {
                  $not: {
                    $size: 0
                  }
                }
              }
            },
            {
              $limit: 1
            },
            {
              $lookup: {
                from: 'rituals',
                let: {
                  ritualIds: '$ritual_ids'
                },
                pipeline: [
                  {
                    $match: filterRituals
                  },
                  {
                    $project: {
                      id: '$_id',
                      ritualName: '$display_name',
                      focus_ids: 1,
                      updatedAt: 1
                    }
                  }
                ],
                as: 'userRituals'
              }
            },
            {
              $unwind: {
                path: '$userRituals',
                preserveNullAndEmptyArrays: false
              }
            }
          ];

          if (reqParam.searchKey) {
            aggregateCondition.push({
              $match: {
                'userRituals.ritualName': {
                  $regex: '.*' + reqParam.searchKey + '.*',
                  $options: 'i'
                }
              }
            });
          }
          const filterFocus = {
            status: STATUS.ACTIVE,
            approved_by: {
              $ne: null
            },
            $expr: {
              $in: ['$_id', '$$focusIds']
            }
          };
          aggregateCondition.push(
            {
              $lookup: {
                from: 'user_completed_rituals',
                let: {
                  ritualId: '$userRituals._id'
                },
                pipeline: [
                  {
                    $match: {
                      user_id: toObjectId(req.authUserId),
                      $expr: {
                        $eq: ['$ritual_id', '$$ritualId']
                      },
                      createdAt: {
                        $gte: dateFrom,
                        $lt: dateTo
                      }
                    }
                  },
                  {
                    $project: {
                      is_completed: 1,
                      consecutive_count: 1
                    }
                  }
                ],
                as: 'userCompletedStatus'
              }
            },
            {
              $unwind: {
                path: '$userCompletedStatus',
                preserveNullAndEmptyArrays: true
              }
            },
            {
              $addFields: {
                'userRituals.isCompleted': {
                  $cond: [
                    {
                      $and: [
                        {
                          $gt: ['$userCompletedStatus', null]
                        },
                        {
                          $eq: ['$userCompletedStatus.is_completed', true]
                        }
                      ]
                    },
                    true,
                    false
                  ]
                },
                'userRituals.consecutiveCount': {
                  $cond: [
                    {
                      $gt: ['$userCompletedStatus', null]
                    },
                    '$userCompletedStatus.consecutive_count',
                    0
                  ]
                }
              }
            },
            {
              $lookup: {
                from: 'focus',
                let: {
                  focusIds: '$userRituals.focus_ids'
                },
                pipeline: [
                  {
                    $match: filterFocus
                  },
                  {
                    $project: {
                      display_name: 1
                    }
                  }
                ],
                as: 'userRituals.focus'
              }
            },
            {
              $addFields: {
                'userRituals.focusName': '$userRituals.focus.display_name'
              }
            },
            {
              $project: {
                'userRituals.id': '$userRituals._id',
                'userRituals.ritualName': 1,
                'userRituals.focusName': 1,
                'userRituals.createdAt': 1,
                'userRituals.isCompleted': 1,
                'userRituals.consecutiveCount': 1
              }
            },
            {
              $sort: {
                'userRituals.createdAt': -1
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
            },
            {
              $project: {
                metaData: 1,
                data: '$data.userRituals'
              }
            }
          );
          aggregateConditionAll.push(
            {
              $lookup: {
                from: 'user_completed_rituals',
                let: {
                  ritualId: '$userRituals._id'
                },
                pipeline: [
                  {
                    $match: {
                      user_id: toObjectId(req.authUserId),
                      $expr: {
                        $eq: ['$ritual_id', '$$ritualId']
                      }
                    }
                  },
                  {
                    $project: {
                      is_completed: 1,
                      consecutive_count: 1
                    }
                  }
                ],
                as: 'userCompletedStatus'
              }
            },
            {
              $unwind: {
                path: '$userCompletedStatus',
                preserveNullAndEmptyArrays: true
              }
            },
            {
              $addFields: {
                'userRituals.isCompleted': {
                  $cond: [
                    {
                      $and: [
                        {
                          $gt: ['$userCompletedStatus', null]
                        },
                        {
                          $eq: ['$userCompletedStatus.is_completed', true]
                        }
                      ]
                    },
                    true,
                    false
                  ]
                },
                'userRituals.consecutiveCount': {
                  $cond: [
                    {
                      $gt: ['$userCompletedStatus', null]
                    },
                    '$userCompletedStatus.consecutive_count',
                    0
                  ]
                }
              }
            },
            {
              $lookup: {
                from: 'focus',
                let: {
                  focusIds: '$userRituals.focus_ids'
                },
                pipeline: [
                  {
                    $match: filterFocus
                  },
                  {
                    $project: {
                      display_name: 1
                    }
                  }
                ],
                as: 'userRituals.focus'
              }
            },
            {
              $addFields: {
                'userRituals.focusName': '$userRituals.focus.display_name'
              }
            },
            {
              $project: {
                'userRituals.id': '$userRituals._id',
                'userRituals.ritualName': 1,
                'userRituals.focusName': 1,
                'userRituals.createdAt': 1,
                'userRituals.isCompleted': 1,
                'userRituals.consecutiveCount': 1
              }
            },
            {
              $sort: {
                'userRituals.createdAt': -1
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
            },
            {
              $project: {
                metaData: 1,
                data: '$data.userRituals'
              }
            }
          );

          const customRitualAggregate = [
            {
              $match: {
                created_by: toObjectId(req.authUserId),
                is_saved: true,
                deletedAt: null
              }
            },
            {
              $lookup: {
                from: 'user_completed_rituals',
                let: {
                  ritualId: '$_id'
                },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $eq: ['$$ritualId', '$ritual_id']
                      },
                      user_id: toObjectId(req.authUserId),
                      createdAt: {
                        $gte: dateFrom,
                        $lt: dateTo
                      }
                    }
                  }
                ],
                as: 'userCompletedStatus'
              }
            },
            {
              $unwind: {
                path: '$userCompletedStatus',
                preserveNullAndEmptyArrays: true
              }
            },
            {
              $addFields: {
                'userCustomRituals.isCompleted': {
                  $cond: [
                    {
                      $and: [
                        {
                          $gt: ['$userCompletedStatus', null]
                        },
                        {
                          $eq: ['$userCompletedStatus.is_completed', true]
                        }
                      ]
                    },
                    true,
                    false
                  ]
                },
                'userCustomRituals.consecutiveCount': {
                  $cond: [
                    {
                      $gt: ['$userCompletedStatus', null]
                    },
                    '$userCompletedStatus.consecutive_count',
                    0
                  ]
                }
              }
            },
            {
              $group: {
                _id: '$_id', // You can use a unique identifier here.
                id: { $first: '$_id' },
                ritualName: { $first: '$ritual_name' },
                createdAt: { $first: '$createdAt' },
                isSaved: { $first: '$is_saved' },
                isCompleted: { $max: '$userCustomRituals.isCompleted' },
                consecutiveCount: { $max: '$userCustomRituals.consecutiveCount' }
              }
            },
            {
              $project: {
                id: 1,
                ritualName: 1,
                createdAt: 1,
                isCompleted: 1,
                isSaved: 1,
                consecutiveCount: 1,
                _id: 0
              }
            },
            {
              $sort: {
                createdAt: -1
              }
            }
          ];

          const customRitualAggregateAll = [
            {
              $match: {
                created_by: toObjectId(req.authUserId),
                is_saved: true,
                deletedAt: null
              }
            },
            {
              $lookup: {
                from: 'user_completed_rituals',
                let: {
                  ritualId: '$_id'
                },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $eq: ['$$ritualId', '$ritual_id']
                      },
                      user_id: toObjectId(req.authUserId)
                    }
                  }
                ],
                as: 'userCompletedStatus'
              }
            },
            {
              $unwind: {
                path: '$userCompletedStatus',
                preserveNullAndEmptyArrays: true
              }
            },
            {
              $addFields: {
                'userCustomRituals.isCompleted': {
                  $cond: [
                    {
                      $and: [
                        {
                          $gt: ['$userCompletedStatus', null]
                        },
                        {
                          $eq: ['$userCompletedStatus.is_completed', true]
                        }
                      ]
                    },
                    true,
                    false
                  ]
                },
                'userCustomRituals.consecutiveCount': {
                  $cond: [
                    {
                      $gt: ['$userCompletedStatus', null]
                    },
                    '$userCompletedStatus.consecutive_count',
                    0
                  ]
                }
              }
            },
            {
              $group: {
                _id: '$_id', // You can use a unique identifier here.
                id: { $first: '$_id' },
                ritualName: { $first: '$ritual_name' },
                createdAt: { $first: '$createdAt' },
                isSaved: { $first: '$is_saved' },
                isCompleted: { $max: '$userCustomRituals.isCompleted' },
                consecutiveCount: { $max: '$userCustomRituals.consecutiveCount' }
              }
            },
            {
              $project: {
                id: 1,
                ritualName: 1,
                createdAt: 1,
                isCompleted: 1,
                isSaved: 1,
                consecutiveCount: 1,
                _id: 0
              }
            },
            {
              $sort: {
                createdAt: -1
              }
            }
          ];

          const customRituals = await UserCustomRituals.aggregate(customRitualAggregate);
          const myRituals = await UserRituals.aggregate(aggregateCondition);

          const customRitualsAll = await UserCustomRituals.aggregate(customRitualAggregateAll);
          const myRitualsAll = await UserRituals.aggregate(aggregateConditionAll);

          const totalRituals = customRituals.concat(myRituals[0].data);
          const totalRitualsAll = customRitualsAll.concat(myRitualsAll[0].data);

          let existingCount = await ContentCounts.findOne({ user_id: req.authUserId });
          if (existingCount) {
            await ContentCounts.updateOne(
              { user_id: req.authUserId },
              {
                $set: {
                  rituals: totalRitualsAll.length > 5 ? 5 : totalRitualsAll.length
                }
              }
            );
          } else {
            await ContentCounts.create({
              $set: {
                rituals: totalRitualsAll.length > 5 ? 5 : totalRitualsAll.length,
                user_id: req.authUserId
              }
            });
          }

          return myRituals.length > 0
            ? Response.successResponseData(res, totalRituals, SUCCESS, res.__('myRitualsList'), {
                totalCount: totalRituals ? totalRituals.length : 0,
                page: page,
                perPage: perPage
              })
            : Response.successResponseData(res, [], SUCCESS, res.__('myRitualsList'));
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to delete my rituals.
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  deleteMyRitual: (req, res) => {
    try {
      const reqParam = req.query;
      deleteMyRitualValidation(reqParam, res, async (validate) => {
        if (validate) {
          const filterData = {
            user_id: req.authUserId,
            deletedAt: null
          };
          const filterCustomData = {
            ritual_id: reqParam.ritualId,
            deletedAt: null
          };
          const updateData = {
            $pull: { ritual_ids: reqParam.ritualId }
          };

          const updateCustomData = {
            deletedAt: new Date()
          };

          const ritualDelete = await UserRituals.findOneAndUpdate(filterData, updateData, {
            new: true
          }).select('_id');

          const customRitualDelete = await UserCustomRituals.findOneAndUpdate(
            filterCustomData,
            updateCustomData,
            {
              new: true
            }
          ).select('_id');

          return Response.successResponseWithoutData(
            res,
            ritualDelete
              ? res.__('myRitualDeleted')
              : customRitualDelete
                ? res.__('myCustomRitualDeleted')
                : res.__('noMyRitualsFound'),
            ritualDelete ? SUCCESS : customRitualDelete ? SUCCESS : FAIL
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
   * @description This function is used to add or update my rituals completed status.
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  myRitualsCompletedStatus: (req, res) => {
    try {
      const reqParam = req.body;
      myRitualsCompletedStatusValidation(reqParam, res, async (validate) => {
        if (validate) {
          const dateFrom = currentDateOnly();
          const dateTo = currentDateOnly();
          dateTo.setDate(dateFrom.getDate() + 1);
          const filterData = {
            user_id: req.authUserId,
            ritual_id: reqParam.ritualId,
            createdAt: {
              $gte: dateFrom,
              $lt: dateTo
            },
            deletedAt: null
          };
          let updateData = {
            is_completed: reqParam.isCompleted
          };
          if (reqParam.isCompleted) {
            const previousDateTo = currentDateOnly();
            const previousDateFrom = currentDateOnly();
            previousDateFrom.setDate(previousDateTo.getDate() - 1);
            const previousFilterData = {
              user_id: req.authUserId,
              ritual_id: reqParam.ritualId,
              createdAt: {
                $gte: previousDateFrom,
                $lt: previousDateTo
              },
              deletedAt: null
            };
            const previousDateRitualStatus = await UserCompletedRituals.findOne(
              previousFilterData
            ).select('is_completed consecutive_count');
            updateData = {
              ...updateData,
              consecutive_count:
                previousDateRitualStatus && previousDateRitualStatus.is_completed
                  ? previousDateRitualStatus.consecutive_count + 1
                  : 0
            };
          } else {
            updateData = { ...updateData, consecutive_count: 0 };
          }
          const updatedRitualStatus = await UserCompletedRituals.findOneAndUpdate(
            filterData,
            updateData,
            { upsert: true, new: true }
          ).select('_id');
          return Response.successResponseWithoutData(
            res,
            updatedRitualStatus ? res.__('myritualStatus') : res.__('somethingWrong'),
            updatedRitualStatus ? SUCCESS : FAIL
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
   * @description This function is used to get my rituals completed status list daily basis.
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */

  myRitualsCompletedStatusList: (req, res) => {
    try {
      const reqParam = req.query;
      myRitualsCompletedStatusListValidation(reqParam, res, async (validate) => {
        if (validate) {
          const dateFrom = currentDateOnly();
          const dateTo = currentDateOnly();
          dateTo.setDate(dateFrom.getDate() + 1);
          const filterRituals = {
            status: STATUS.ACTIVE,
            approved_by: {
              $ne: null
            },
            $expr: {
              $in: ['$_id', '$$ritualIds']
            }
          };

          const aggregateCondition = [
            {
              $match: {
                user_id: toObjectId(req.authUserId),
                deletedAt: null,
                ritual_ids: {
                  $not: {
                    $size: 0
                  }
                }
              }
            },
            {
              $lookup: {
                from: 'rituals',
                let: {
                  ritualIds: '$ritual_ids'
                },
                pipeline: [
                  {
                    $match: filterRituals
                  },
                  {
                    $project: {
                      id: '$_id',
                      ritualName: '$display_name',
                      createdAt: 1
                    }
                  }
                ],
                as: 'userRituals'
              }
            },
            {
              $unwind: {
                path: '$userRituals',
                preserveNullAndEmptyArrays: false
              }
            },
            {
              $lookup: {
                from: 'user_completed_rituals',
                let: {
                  ritualId: '$userRituals._id'
                },
                pipeline: [
                  {
                    $match: {
                      user_id: toObjectId(req.authUserId),
                      $expr: {
                        $eq: ['$ritual_id', '$$ritualId']
                      },
                      createdAt: {
                        $gte: dateFrom,
                        $lt: dateTo
                      }
                    }
                  },
                  {
                    $project: {
                      is_completed: 1,
                      consecutive_count: 1
                    }
                  }
                ],
                as: 'userCompletedStatus'
              }
            },
            {
              $unwind: {
                path: '$userCompletedStatus',
                preserveNullAndEmptyArrays: true
              }
            },
            {
              $match: {
                $or: [
                  {
                    userCompletedStatus: { $exists: false }
                  },
                  {
                    'userCompletedStatus.is_completed': false
                  }
                ]
              }
            },
            {
              $addFields: {
                'userRituals.isCompleted': {
                  $cond: [
                    {
                      $and: [
                        {
                          $gt: ['$userCompletedStatus', null]
                        },
                        {
                          $eq: ['$userCompletedStatus.is_completed', true]
                        }
                      ]
                    },
                    true,
                    false
                  ]
                },
                'userRituals.consecutiveCount': {
                  $cond: [
                    {
                      $gt: ['$userCompletedStatus', null]
                    },
                    '$userCompletedStatus.consecutive_count',
                    0
                  ]
                }
              }
            },
            {
              $project: {
                ritualId: '$userRituals._id',
                ritualName: '$userRituals.ritualName',
                createdAt: '$userRituals.createdAt',
                isCompleted: '$userRituals.isCompleted',
                consecutiveCount: '$userRituals.consecutiveCount',
                _id: 0
              }
            },
            {
              $sort: {
                createdAt: -1
              }
            }
          ];

          const customRitualAggregate = [
            {
              $match: {
                created_by: toObjectId(req.authUserId),
                is_saved: true,
                deletedAt: null
              }
            },
            {
              $lookup: {
                from: 'user_completed_rituals',
                let: {
                  ritualId: '$_id'
                },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $eq: ['$$ritualId', '$ritual_id']
                      },
                      user_id: toObjectId(req.authUserId),
                      createdAt: {
                        $gte: dateFrom,
                        $lt: dateTo
                      }
                    }
                  }
                ],
                as: 'userCompletedStatus'
              }
            },
            {
              $unwind: {
                path: '$userCompletedStatus',
                preserveNullAndEmptyArrays: true
              }
            },
            {
              $match: {
                $or: [
                  {
                    userCompletedStatus: { $exists: false }
                  },
                  {
                    'userCompletedStatus.is_completed': false
                  }
                ]
              }
            },
            {
              $addFields: {
                'userCustomRituals.isCompleted': {
                  $cond: [
                    {
                      $and: [
                        {
                          $gt: ['$userCompletedStatus', null]
                        },
                        {
                          $eq: ['$userCompletedStatus.is_completed', true]
                        }
                      ]
                    },
                    true,
                    false
                  ]
                },
                'userCustomRituals.consecutiveCount': {
                  $cond: [
                    {
                      $gt: ['$userCompletedStatus', null]
                    },
                    '$userCompletedStatus.consecutive_count',
                    0
                  ]
                }
              }
            },
            {
              $group: {
                _id: '$_id', // You can use a unique identifier here.
                ritualId: { $first: '$_id' },
                ritualName: { $first: '$ritual_name' },
                isSaved: { $first: '$is_saved' },
                createdAt: { $first: '$createdAt' },
                isCompleted: { $max: '$userCustomRituals.isCompleted' },
                consecutiveCount: { $max: '$userCustomRituals.consecutiveCount' }
              }
            },
            {
              $project: {
                ritualId: 1,
                ritualName: 1,
                createdAt: 1,
                isSaved: 1,
                isCompleted: 1,
                consecutiveCount: 1,
                _id: 0
              }
            },
            {
              $sort: {
                createdAt: -1
              }
            }
          ];

          const customRituals = await UserCustomRituals.aggregate(customRitualAggregate);
          const myRitualStatus = await UserRituals.aggregate(aggregateCondition);

          const totalRituals = customRituals.concat(myRitualStatus);

          const totalCount = totalRituals ? totalRituals.length : 0;
          Response.successResponseData(res, totalRituals, SUCCESS, res.__('myRitualsList'), {
            totalCount
          });
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  addEditCustomRitual: async (req, res) => {
    const reqParam = req.body;

    try {
      if (reqParam.ritualId) {
        let ritual = await UserCustomRituals.findOne({
          _id: reqParam.ritualId
        });

        if (ritual) {
          let customRitual = {
            ritual_name: reqParam.ritualName,
            is_saved: JSON.parse(reqParam.isSaved)
          };

          await UserCustomRituals.findOneAndUpdate({ _id: reqParam.ritualId }, customRitual);

          let ritual = await UserCustomRituals.findOne({
            _id: reqParam.ritualId
          });

          return Response.successResponseData(
            res,
            ritual,
            SUCCESS,
            res.__('myCustomRitualUpdated')
          );
        } else {
          return Response.errorResponse(res, res.__('myCustomRitualNotFound'));
        }
      } else {
        let customRitual = {
          ritual_name: reqParam.ritualName,
          is_saved: JSON.parse(reqParam.isSaved),
          created_by: req.authUserId
        };

        let ritual = await UserCustomRituals.create(customRitual);

        await UserCompletedRituals.create({
          ritual_id: ritual._id,
          user_id: req.authUserId,
          is_completed: false,
          consecutive_count: 0
        });

        return Response.successResponseData(res, ritual, SUCCESS, res.__('myCustomRitualCreated'));
      }
    } catch (err) {
      console.log(err);
      return Response.internalServerErrorResponse(res);
    }
  },

  myRitualDraftList: (req, res) => {
    try {
      const reqParam = req.query;
      myRitualListValidation(reqParam, res, async (validate) => {
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
          const dateFrom = currentDateOnly();
          const dateTo = currentDateOnly();
          dateTo.setDate(dateFrom.getDate() + 1);

          const customRitualAggregate = [
            {
              $match: {
                created_by: toObjectId(req.authUserId),
                is_saved: false,
                deletedAt: null
              }
            },
            {
              $lookup: {
                from: 'user_completed_rituals',
                let: {
                  ritualId: '$_id'
                },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $eq: ['$$ritualId', '$ritual_id']
                      },
                      user_id: toObjectId(req.authUserId),
                      createdAt: {
                        $gte: dateFrom,
                        $lt: dateTo
                      }
                    }
                  }
                ],
                as: 'userCompletedStatus'
              }
            },
            {
              $unwind: {
                path: '$userCompletedStatus',
                preserveNullAndEmptyArrays: true
              }
            },
            {
              $addFields: {
                'userCustomRituals.isCompleted': {
                  $cond: [
                    {
                      $and: [
                        {
                          $gt: ['$userCompletedStatus', null]
                        },
                        {
                          $eq: ['$userCompletedStatus.is_completed', true]
                        }
                      ]
                    },
                    true,
                    false
                  ]
                },
                'userCustomRituals.consecutiveCount': {
                  $cond: [
                    {
                      $gt: ['$userCompletedStatus', null]
                    },
                    '$userCompletedStatus.consecutive_count',
                    0
                  ]
                }
              }
            },
            {
              $group: {
                _id: '$_id', // You can use a unique identifier here.
                id: { $first: '$_id' },
                ritualName: { $first: '$ritual_name' },
                createdAt: { $first: '$createdAt' },
                isSaved: { $first: '$is_saved' },
                isCompleted: { $max: '$userCustomRituals.isCompleted' },
                consecutiveCount: { $max: '$userCustomRituals.consecutiveCount' }
              }
            },
            {
              $project: {
                id: 1,
                ritualName: 1,
                createdAt: 1,
                isCompleted: 1,
                isSaved: 1,
                consecutiveCount: 1,
                _id: 0
              }
            },
            {
              $sort: {
                createdAt: -1
              }
            }
          ];

          const customRituals = await UserCustomRituals.aggregate(customRitualAggregate);
          // const myRituals = await UserRituals.aggregate(aggregateCondition);

          const totalRituals = customRituals;

          return totalRituals.length > 0
            ? Response.successResponseData(
                res,
                totalRituals,
                SUCCESS,
                res.__('myRitualsDraftsList'),
                { totalCount: totalRituals ? totalRituals.length : 0, page: page, perPage: perPage }
              )
            : Response.successResponseData(res, [], SUCCESS, res.__('myRitualsDraftsList'));
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  }
};
