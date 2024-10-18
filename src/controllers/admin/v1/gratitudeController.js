'use strict';

const { Gratitude, ContentApproval } = require('@models');
const Response = require('@services/Response');
const {
  FAIL,
  SUCCESS,
  PAGE,
  PER_PAGE,
  STATUS,
  CONTENT_TYPE,
  CONTENT_STATUS,
  USER_TYPE
} = require('@services/Constant');
const {
  addEditGratitudeValidation,
  gratitudeDetailedListValidation,
  deleteGratitudeValidation
} = require('@services/adminValidations/gratitudeValidations');
const { toObjectId } = require('@services/Helper');
const {
  newContentUploadedNotification
} = require('@services/adminServices/contentApprovalServices');
const {
  updateContentUploadedNotification
} = require('../../../services/adminServices/contentApprovalServices');

module.exports = {
  /**
   * @description This function is used to add or edit gratitude
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  addEditGratitude: (req, res) => {
    try {
      const reqParam = req.body;
      addEditGratitudeValidation(reqParam, res, async (validate) => {
        if (validate) {
          let updateData = {
            display_name: reqParam.gratitudeTitle.trim(),
            gratitude_type: reqParam.gratitudeType,
            status: reqParam.gratitudeStatus,
            focus_ids: reqParam.focusIds
          };
          if (req.userType === USER_TYPE.SUPER_ADMIN) {
            updateData = {
              ...updateData,
              approved_by: req.authAdminId,
              approved_on: new Date()
            };
          }
          if (reqParam.gratitudeUrl) {
            updateData = {
              ...updateData,
              gratitude_url: reqParam.gratitudeUrl
            };
          }
          if (reqParam.duration) {
            updateData = {
              ...updateData,
              duration: reqParam.duration
            };
          }
          if (reqParam.thumbnail) {
            updateData = {
              ...updateData,
              thumbnail: reqParam.thumbnail
            };
          }
          if (reqParam.gratitudeId) {
            if (
              reqParam.approvalStatus === CONTENT_STATUS.APPROVED &&
              req.userType !== USER_TYPE.SUPER_ADMIN
            ) {
              const newDataCondition = {
                ...updateData,
                created_by: req.authAdminId
              };
              const newData = await Gratitude.findOneAndUpdate(
                {
                  parentId: reqParam.gratitudeId
                },
                newDataCondition,
                { upsert: true, new: true }
              );
              const addComment = {
                comment: null,
                commented_by: req.authAdminId,
                commented_on: new Date(),
                content_status: CONTENT_STATUS.DRAFT
              };
              const newContentData = {
                content_type_id: newData._id,
                content_type: CONTENT_TYPE.GRATITUDE,
                display_name: reqParam.gratitudeTitle.trim(),
                content_status: CONTENT_STATUS.DRAFT,
                created_by: req.authAdminId,
                comments: addComment
              };
              await ContentApproval.findOneAndUpdate(
                { parentId: reqParam.gratitudeId },
                newContentData,
                {
                  upsert: true
                }
              );

              req.userType !== USER_TYPE.SUPER_ADMIN &&
                (await updateContentUploadedNotification(
                  req.authAdminName,
                  req.authAdminId,
                  newData._id,
                  CONTENT_TYPE.GRATITUDE
                ));
              return Response.successResponseWithoutData(
                res,
                res.__('gratitudeDetailUpdated'),
                SUCCESS
              );
            } else {
              const filterData = {
                _id: reqParam.gratitudeId,
                status: {
                  $ne: STATUS.DELETED
                }
              };
              const gratitudeData = await Gratitude.findOneAndUpdate(filterData, updateData, {
                new: true
              }).select('_id');
              if (gratitudeData) {
                const filterContentCondition = {
                  content_type_id: gratitudeData._id,
                  content_type: CONTENT_TYPE.GRATITUDE,
                  deletedAt: null
                };
                let updateContentCondition = {
                  display_name: reqParam.gratitudeTitle.trim(),
                  focus_ids: reqParam.focusIds,
                  content_status:
                    req.userType === USER_TYPE.SUPER_ADMIN
                      ? CONTENT_STATUS.APPROVED
                      : CONTENT_STATUS.DRAFT
                };
                if (req.userType === USER_TYPE.SUPER_ADMIN) {
                  const addComment = {
                    comment: null,
                    commented_by: req.authAdminId,
                    commented_on: new Date(),
                    content_status: CONTENT_STATUS.APPROVED
                  };
                  updateContentCondition = {
                    ...updateContentCondition,
                    $push: { comments: addComment },
                    updated_by: req.authAdminId,
                    updated_on: new Date()
                  };
                }
                await ContentApproval.findOneAndUpdate(
                  filterContentCondition,
                  updateContentCondition
                );

                req.userType !== USER_TYPE.SUPER_ADMIN &&
                  (await updateContentUploadedNotification(
                    req.authAdminName,
                    req.authAdminId,
                    gratitudeData._id,
                    CONTENT_TYPE.GRATITUDE
                  ));

                return Response.successResponseWithoutData(
                  res,
                  res.__('gratitudeDetailUpdated'),
                  SUCCESS
                );
              } else {
                return Response.successResponseWithoutData(
                  res,
                  res.__('noGratitudeFound'),
                  SUCCESS
                );
              }
            }
          } else {
            const newDataCondition = {
              ...updateData,
              created_by: req.authAdminId
            };
            const newData = await Gratitude.create(newDataCondition);
            if (newData) {
              const addComment = {
                comment: null,
                commented_by: req.authAdminId,
                commented_on: new Date(),
                content_status:
                  req.userType === USER_TYPE.SUPER_ADMIN
                    ? CONTENT_STATUS.APPROVED
                    : CONTENT_STATUS.DRAFT
              };
              const newContentData = {
                content_type_id: newData._id,
                content_type: CONTENT_TYPE.GRATITUDE,
                display_name: reqParam.gratitudeTitle.trim(),
                focus_ids: reqParam.focusIds,
                content_status: addComment.content_status,
                created_by: req.authAdminId,
                comments: addComment,
                updated_by: req.userType === USER_TYPE.SUPER_ADMIN ? req.authAdminId : null,
                updated_on: req.userType === USER_TYPE.SUPER_ADMIN ? new Date() : null
              };
              await ContentApproval.create(newContentData);
              req.userType !== USER_TYPE.SUPER_ADMIN &&
                (await newContentUploadedNotification(
                  req.authAdminName,
                  req.authAdminId,
                  newData._id,
                  CONTENT_TYPE.GRATITUDE
                ));
              return Response.successResponseWithoutData(
                res,
                res.__('gratitudeAddedSuccess'),
                SUCCESS
              );
            } else {
              return Response.successResponseWithoutData(res, res.__('noGratitudeFound'), FAIL);
            }
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
   * @description This function is used to get detailed list of gratitudes.
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  gratitudeDetailedList: (req, res) => {
    try {
      const reqParam = req.query;
      gratitudeDetailedListValidation(reqParam, res, async (validate) => {
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
            status: {
              $ne: STATUS.DELETED
            }
          };
          if (req.userType === USER_TYPE.SUB_ADMIN) {
            filterCondition = {
              ...filterCondition,
              created_by: toObjectId(req.authAdminId)
            };
          }
          if (reqParam.createdBy && req.userType === USER_TYPE.SUPER_ADMIN) {
            filterCondition = {
              ...filterCondition,
              created_by: toObjectId(reqParam.createdBy)
            };
          }
          if (reqParam.approvedBy) {
            filterCondition = {
              ...filterCondition,
              approved_by: toObjectId(reqParam.approvedBy)
            };
          }
          if (reqParam.gratitudeStatus) {
            filterCondition = {
              ...filterCondition,
              status: parseInt(reqParam.gratitudeStatus)
            };
          }
          if (reqParam.searchKey) {
            filterCondition = {
              ...filterCondition,
              display_name: { $regex: '.*' + reqParam.searchKey + '.*', $options: 'i' }
            };
          }
          const contentApprovalCondition = {
            $expr: {
              $eq: ['$$contentId', '$content_type_id']
            },
            content_status: {
              $ne: CONTENT_STATUS.DRAFT
            }
          };
          if (reqParam.id) {
            filterCondition = {
              ...filterCondition,
              _id: toObjectId(reqParam.id)
            };
            delete contentApprovalCondition.content_status;
          }
          let sortBy = 'createdOn';
          let sortOrder = -1;
          if (reqParam.sortBy) {
            sortBy = reqParam.sortBy;
          }
          if (reqParam.sortOrder) {
            sortOrder = parseInt(reqParam.sortOrder);
          }
          const aggregatePipeline = [
            {
              $match: filterCondition
            },
            {
              $lookup: {
                from: 'users',
                localField: 'created_by',
                foreignField: '_id',
                as: 'createdBy'
              }
            },
            {
              $unwind: {
                path: '$createdBy',
                preserveNullAndEmptyArrays: true
              }
            },
            {
              $lookup: {
                from: 'users',
                localField: 'approved_by',
                foreignField: '_id',
                as: 'approvedBy'
              }
            },
            {
              $unwind: {
                path: '$approvedBy',
                preserveNullAndEmptyArrays: true
              }
            },
            {
              $lookup: {
                from: 'content_approvals',
                let: {
                  contentId: '$_id'
                },
                pipeline: [
                  {
                    $match: contentApprovalCondition
                  }
                ],
                as: 'contentApproval'
              }
            },
            {
              $unwind: {
                path: '$contentApproval',
                preserveNullAndEmptyArrays: false
              }
            },
            {
              $unwind: {
                path: '$contentApproval.comments',
                preserveNullAndEmptyArrays: true
              }
            },
            {
              $lookup: {
                from: 'users',
                localField: 'contentApproval.comments.commented_by',
                foreignField: '_id',
                as: 'contentApproval.comments.commented_by'
              }
            },
            {
              $unwind: {
                path: '$contentApproval.comments.commented_by',
                preserveNullAndEmptyArrays: true
              }
            },
            {
              $sort: {
                'contentApproval.comments.commented_on': -1
              }
            },
            {
              $group: {
                _id: '$_id',
                comments: {
                  $push: {
                    comment: '$contentApproval.comments.comment',
                    commented_by: '$contentApproval.comments.commented_by.name',
                    commented_on: '$contentApproval.comments.commented_on',
                    content_status: '$contentApproval.comments.content_status'
                  }
                },
                focus: {
                  $first: '$focus_ids'
                },
                duration: {
                  $first: '$duration'
                },
                thumbnail: {
                  $first: '$thumbnail'
                },
                createdBy: {
                  $first: '$createdBy'
                },
                approvedBy: {
                  $first: '$approvedBy'
                },
                gratitudeTitle: {
                  $first: '$display_name'
                },
                gratitudeType: {
                  $first: '$gratitude_type'
                },
                gratitudeStatus: {
                  $first: '$status'
                },
                gratitudeUrl: {
                  $first: '$gratitude_url'
                },
                approvedOn: {
                  $first: '$approved_on'
                },
                createdOn: {
                  $first: '$createdAt'
                },
                approvalStatus: {
                  $first: '$contentApproval.content_status'
                }
              }
            },
            {
              $lookup: {
                from: 'focus',
                let: {
                  focusIds: '$focus'
                },
                pipeline: [
                  {
                    $match: {
                      status: STATUS.ACTIVE,
                      approved_by: {
                        $ne: null
                      },
                      $expr: {
                        $in: ['$_id', '$$focusIds']
                      }
                    }
                  }
                ],
                as: 'focus'
              }
            },
            {
              $project: {
                'focus.display_name': 1,
                'focus._id': 1,
                duration: 1,
                thumbnail: 1,
                'createdBy.name': 1,
                'createdBy.id': '$createdBy._id',
                'approvedBy.name': 1,
                'approvedBy.id': '$approvedBy._id',
                gratitudeTitle: 1,
                gratitudeType: 1,
                gratitudeStatus: 1,
                gratitudeUrl: 1,
                approvedOn: 1,
                createdOn: 1,
                approvalStatus: 1,
                comments: 1,
                id: '$_id',
                _id: 0
              }
            },
            {
              $sort: {
                [sortBy]: sortOrder
              }
            },
            {
              $facet: {
                metaData: [
                  {
                    $count: 'totalRecords'
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
          ];
          if (reqParam.approvalStatus) {
            aggregatePipeline[5].$lookup.pipeline[0].$match.content_status = parseInt(
              reqParam.approvalStatus
            );
          }
          const gratitudeData = await Gratitude.aggregate(aggregatePipeline);
          if (gratitudeData.length > 0) {
            return Response.successResponseData(
              res,
              gratitudeData[0].data,
              SUCCESS,
              res.__('gratitudeListSuccess'),
              gratitudeData[0].metaData[0]
            );
          } else {
            return Response.successResponseWithoutData(res, res.__('noGratitudeFound'), SUCCESS);
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
   * @description This function is used to delete gratitude
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  deleteGratitude: (req, res) => {
    try {
      const reqParam = req.query;
      deleteGratitudeValidation(reqParam, res, async (validate) => {
        if (validate) {
          const deleteCondition = {
            status: STATUS.DELETED,
            deletedAt: new Date()
          };
          const deleteGratitude = await Gratitude.findByIdAndUpdate(
            reqParam.gratitudeId,
            deleteCondition,
            { new: true }
          ).select('_id');
          if (deleteGratitude) {
            const filterContentCondition = {
              content_type_id: reqParam.gratitudeId,
              content_type: CONTENT_TYPE.GRATITUDE
            };
            await ContentApproval.findOneAndUpdate(filterContentCondition, {
              deletedAt: new Date()
            });
            return Response.successResponseWithoutData(
              res,
              res.__('gratitudeDeleteSuccess'),
              SUCCESS
            );
          } else {
            return Response.successResponseWithoutData(res, res.__('noGratitudeFound'), FAIL);
          }
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  }
};
