'use strict';

const { Ideas, ContentApproval } = require('@models');
const Response = require('@services/Response');
const {
  addEditIdeasValidation,
  deleteIdeasValidation,
  ideasDetailedListValidation,
  getIdeaValidation,
  addEditDraftIdeasValidation,
  ideasDraftDetailedListValidation
} = require('../../../services/adminValidations/ideasValidations');
const {
  STATUS,
  FAIL,
  SUCCESS,
  PAGE,
  PER_PAGE,
  CONTENT_STATUS,
  CONTENT_TYPE,
  USER_TYPE,
  SORT_BY,
  SORT_ORDER
} = require('@services/Constant');
const { toObjectId } = require('@services/Helper');
const {
  newContentUploadedNotification
} = require('@services/adminServices/contentApprovalServices');
const {
  contentResponseObjTransformerList,
  contentResponseObjTransformer
} = require('@services/adminServices/contentManagementServices');
const {
  updateContentUploadedNotification
} = require('../../../services/adminServices/contentApprovalServices');

module.exports = {
  /**
   * @description This function is used to add or edit Idea
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  addEditIdea: async (req, res) => {
    try {
      const reqParam = req.body;
      addEditIdeasValidation(reqParam, res, async (validate) => {
        if (validate) {
          let updateData = {
            display_name: reqParam.ideaName.trim(),
            status: reqParam.ideaStatus,
            is_draft: reqParam.isDraft
          };
          if (req.userType === USER_TYPE.SUPER_ADMIN) {
            updateData = {
              ...updateData,
              approved_by: req.authAdminId,
              approved_on: new Date()
            };
          }
          if (reqParam.ideaUrl) {
            updateData = {
              ...updateData,
              idea_url: reqParam.ideaUrl
            };
          }
          if (reqParam.thumbnail) {
            updateData = {
              ...updateData,
              thumbnail: reqParam.thumbnail
            };
          }
          if (reqParam.ideaId) {
            if (
              reqParam.approvalStatus === CONTENT_STATUS.APPROVED &&
              req.userType !== USER_TYPE.SUPER_ADMIN
            ) {
              const newDataCondition = {
                ...updateData,
                created_by: req.authAdminId
              };
              const newData = await Ideas.findOneAndUpdate(
                {
                  parentId: reqParam.ideaId
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
                content_type: CONTENT_TYPE.IDEA,
                display_name: reqParam.ritualName.trim(),
                content_status: CONTENT_STATUS.DRAFT,
                created_by: req.authAdminId,
                comments: addComment
              };
              await ContentApproval.findOneAndUpdate(
                { parentId: reqParam.ideaId },
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
                  CONTENT_TYPE.IDEA
                ));
              return Response.successResponseWithoutData(res, res.__('ideaDetailUpdated'), SUCCESS);
            } else {
              const filterCondition = {
                _id: reqParam.ideaId,
                status: {
                  $ne: STATUS.DELETED
                }
              };
              const ideaData = await Ideas.findOneAndUpdate(filterCondition, updateData, {
                new: true
              }).select('_id');
              if (ideaData) {
                const filterContentCondition = {
                  content_type_id: ideaData._id,
                  content_type: CONTENT_TYPE.IDEA,
                  deletedAt: null
                };
                let updateContentCondition = {
                  display_name: reqParam.ideaName.trim(),
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
                    ritualData._id,
                    CONTENT_TYPE.IDEA
                  ));
                return Response.successResponseWithoutData(
                  res,
                  res.__('ideaDetailUpdated'),
                  SUCCESS
                );
              } else {
                return Response.successResponseWithoutData(res, res.__('noIdeaFound'), FAIL);
              }
            }
          } else {
            const newDataCondition = {
              ...updateData,
              created_by: req.authAdminId
            };
            const newData = await Ideas.create(newDataCondition);
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
                content_type: CONTENT_TYPE.IDEA,
                display_name: reqParam.ideaName.trim(),
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
                  CONTENT_TYPE.IDEA
                ));
              return Response.successResponseWithoutData(res, res.__('ideaAddedSuccess'), SUCCESS);
            } else {
              return Response.successResponseWithoutData(res, res.__('noIdeaFound'), SUCCESS);
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
   * @description This function is used to delete idea
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  deleteIdea: (req, res) => {
    try {
      const reqParam = req.query;
      deleteIdeasValidation(reqParam, res, async (validate) => {
        if (validate) {
          const deleteCondition = {
            status: STATUS.DELETED,
            deletedAt: new Date()
          };
          const deletedData = await Ideas.findByIdAndUpdate(reqParam.ideaId, deleteCondition, {
            new: true
          }).select('_id');
          if (deletedData) {
            const filterContentCondition = {
              content_type_id: reqParam.ideaId,
              content_type: CONTENT_TYPE.IDEA
            };
            await ContentApproval.findOneAndUpdate(filterContentCondition, {
              deletedAt: new Date()
            });
            return Response.successResponseWithoutData(res, res.__('ideaDeleteSuccess'), SUCCESS);
          } else {
            return Response.successResponseWithoutData(res, res.__('noRitualFound'), FAIL);
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
   * @description This function is used to get detailed list of rituals
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  ideaDetailedList: async (req, res) => {
    try {
      const reqParam = req.query;
      await Ideas.updateMany({ is_draft: { $eq: null } }, { is_draft: false });
      console.log('Heeeeeeeeeeeeeeeeeeee------------------');
      ideasDetailedListValidation(reqParam, res, async (validate) => {
        if (validate) {
          const page = reqParam.page ? parseInt(reqParam.page) : PAGE;
          const perPage = reqParam.perPage ? parseInt(reqParam.perPage) : PER_PAGE;
          const skip = (page - 1) * perPage || 0;
          const sortBy = reqParam.sortBy || SORT_BY;
          const sortOrder = reqParam.sortOrder ? parseInt(reqParam.sortOrder) : SORT_ORDER;
          const contentApprovalCondition = {
            content_type: CONTENT_TYPE.IDEA,
            content_status: reqParam.approvalStatus
              ? parseInt(reqParam.approvalStatus)
              : {
                  $ne: CONTENT_STATUS.DRAFT
                }
          };
          const ideasIds = [];
          const cursor = await ContentApproval.find(contentApprovalCondition)
            .select('content_type_id')
            .cursor();
          await cursor.eachAsync((doc) => {
            ideasIds.push(doc.content_type_id);
          });
          const filterCondition = {
            // _id: {
            //   $in: ideasIds
            // },
            is_draft: false,
            status: {
              $ne: STATUS.DELETED
            },
            ...(reqParam.createdBy && { created_by: toObjectId(reqParam.createdBy) }),
            ...(reqParam.searchKey && {
              display_name: { $regex: '.*' + reqParam.searchKey + '.*', $options: 'i' }
            }),
            ...(reqParam.approvedBy && { approved_by: toObjectId(reqParam.approvedBy) }),
            ...(reqParam.ritualStatus && { status: parseInt(reqParam.ritualStatus) }),
            ...(reqParam.id && { _id: toObjectId(reqParam.id) } &&
              delete contentApprovalCondition.content_status)
          };
          const totalRecords = await Ideas.countDocuments(filterCondition);
          const ideasDetailedData = await Ideas.find(filterCondition)
            .populate({
              path: 'created_by',
              select: 'name'
            })
            .populate({
              path: 'approved_by',
              select: 'name'
            })
            .populate({
              path: 'contentApproval',
              select: 'content_status'
            })
            .sort({ [sortBy]: sortOrder })
            .skip(skip)
            .limit(perPage)
            .select({
              id: '$_id',
              ideaName: '$display_name',
              ideaStatus: '$status',
              approvedOn: '$approved_on',
              createdBy: '$createdBy',
              approvedBy: '$approvedBy',
              createdOn: '$createdAt'
            })
            .lean();
          const ideas = contentResponseObjTransformerList(ideasDetailedData);
          return Response.successResponseData(res, ideas, SUCCESS, res.__('ideasListSuccess'), {
            page,
            perPage,
            totalRecords
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
   * @description This function is used to get idea by id
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  getIdea: (req, res) => {
    try {
      const reqParam = req.params;
      getIdeaValidation(reqParam, res, async (validate) => {
        if (validate) {
          const filterCondition = {
            _id: reqParam.id,
            status: {
              $ne: STATUS.DELETED
            }
          };
          const ideaDetailedData = await Ideas.findOne(filterCondition)
            .populate({
              path: 'created_by',
              select: 'name'
            })
            .populate({
              path: 'approved_by',
              select: 'name'
            })
            .populate({
              path: 'contentApproval',
              populate: {
                path: 'comments.commented_by',
                select: 'name'
              },
              select: 'content_status comments'
            })
            .select({
              id: '$_id',
              ideaName: '$display_name',
              ideaStatus: '$status',
              approvedOn: '$approved_on',
              createdBy: '$createdBy',
              approvedBy: '$approvedBy',
              createdOn: '$createdAt'
            })
            .lean();
          const idea = contentResponseObjTransformer(ideaDetailedData);
          return Response.successResponseData(res, idea, SUCCESS, res.__('ideaListSuccess'));
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  addEditDraftIdeas: (req, res) => {
    try {
      const reqParam = req.body;
      addEditDraftIdeasValidation(reqParam, res, async (validate) => {
        if (validate) {
          let updateData = {
            display_name: reqParam?.ideaName,
            status: reqParam?.ideaStatus,
            is_draft: reqParam.isDraft
          };
          if (req.userType === USER_TYPE.SUPER_ADMIN) {
            updateData = {
              ...updateData,
              approved_by: req.authAdminId,
              approved_on: new Date()
            };
          }
          if (reqParam.ideaUrl) {
            updateData = {
              ...updateData,
              idea_url: reqParam.idealUrl
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
          if (reqParam.ideaId) {
            if (
              reqParam.approvalStatus === CONTENT_STATUS.APPROVED &&
              req.userType !== USER_TYPE.SUPER_ADMIN
            ) {
              const newDataCondition = {
                ...updateData,
                created_by: req.authAdminId
              };
              const newData = await Ideas.findOneAndUpdate(
                {
                  parentId: reqParam.ideaId
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
                content_type: CONTENT_TYPE.IDEA,
                display_name: reqParam.ideaName,
                content_status: CONTENT_STATUS.DRAFT,
                created_by: req.authAdminId,
                comments: addComment
              };
              await ContentApproval.findOneAndUpdate(
                { parentId: reqParam.ideaId },
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
                  CONTENT_TYPE.IDEA
                ));
              return Response.successResponseWithoutData(
                res,
                res.__('ideaDraftDetailUpdated'),
                SUCCESS
              );
            } else {
              const filterCondition = {
                _id: reqParam.ideaId,
                status: {
                  $ne: STATUS.DELETED
                }
              };
              const ideaData = await Ideas.findOneAndUpdate(filterCondition, updateData, {
                new: true
              }).select('_id');
              if (ideaData) {
                const filterContentCondition = {
                  content_type_id: ideaData._id,
                  content_type: CONTENT_TYPE.IDEA,
                  deletedAt: null
                };
                let updateContentCondition = {
                  display_name: reqParam.ideaName,
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
                    ideaData._id,
                    CONTENT_TYPE.IDEA
                  ));
                return Response.successResponseWithoutData(
                  res,
                  res.__('ideaDraftDetailUpdated'),
                  SUCCESS
                );
              } else {
                return Response.successResponseWithoutData(res, res.__('noIdeaFound'), FAIL);
              }
            }
          } else {
            const newDataCondition = {
              ...updateData,
              created_by: req.authAdminId
            };
            const newData = await Ideas.create(newDataCondition);
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
                content_type: CONTENT_TYPE.IDEA,
                display_name: reqParam.ideaName,
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
                  CONTENT_TYPE.IDEA
                ));
              return Response.successResponseWithoutData(
                res,
                res.__('ideaDraftAddedSuccess'),
                SUCCESS
              );
            } else {
              return Response.successResponseWithoutData(res, res.__('noIdeaFound'), SUCCESS);
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

  ideasDraftDetailedList: async (req, res) => {
    try {
      const reqParam = req.query;
      // await Ideas.updateMany({is_draft:{$eq:null}},{is_draft:false});
      let IdeasData = await Ideas.find({
        // _id: reqParam.ritualId
      });
      console.log('IdeasData', IdeasData);
      if (IdeasData) {
        console.log('IdeasData', IdeasData);
      }
      ideasDraftDetailedListValidation(reqParam, res, async (validate) => {
        if (validate) {
          const page = reqParam.page ? parseInt(reqParam.page) : PAGE;
          const perPage = reqParam.perPage ? parseInt(reqParam.perPage) : PER_PAGE;
          const skip = (page - 1) * perPage || 0;
          const sortBy = reqParam.sortBy || SORT_BY;
          const sortOrder = reqParam.sortOrder ? parseInt(reqParam.sortOrder) : SORT_ORDER;

          const filterCondition = {
            // is_draft: true,
            status: {
              $ne: STATUS.DELETED
            },
            ...(req.userType === USER_TYPE.SUB_ADMIN
              ? { created_by: toObjectId(req.authAdminId) }
              : reqParam.createdBy && req.userType === USER_TYPE.SUPER_ADMIN
                ? { created_by: toObjectId(reqParam.createdBy) }
                : {}),
            ...(reqParam.searchKey && {
              display_name: { $regex: '.*' + reqParam.searchKey + '.*', $options: 'i' }
            }),
            ...(reqParam.approvedBy && { approved_by: toObjectId(reqParam.approvedBy) }),
            ...(reqParam.ideaStatus && { status: parseInt(reqParam.ideaStatus) })
          };
          const totalRecords = await Ideas.countDocuments(filterCondition);
          const ideaDetailedData = await Ideas.find(filterCondition)
            .populate({
              path: 'created_by',
              select: 'name'
            })
            .populate({
              path: 'approved_by',
              select: 'name'
            })
            .populate({
              path: 'contentApproval',
              select: 'content_status'
            })
            .sort({ [sortBy]: sortOrder })
            .skip(skip)
            .limit(perPage)
            .select({
              id: '$_id',
              ideaName: '$display_name',
              ideaStatus: '$status',
              approvedOn: '$approved_on',
              createdBy: '$createdBy',
              approvedBy: '$approvedBy',
              createdOn: '$createdAt'
            })
            .lean();
          const ideas = contentResponseObjTransformerList(ideaDetailedData);
          return Response.successResponseData(
            res,
            ideas,
            SUCCESS,
            res.__('ideasDraftListSuccess'),
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
      return Response.internalServerErrorResponse(res);
    }
  }
};
