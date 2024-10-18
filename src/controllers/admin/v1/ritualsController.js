'use strict';

const { Ritual, ContentApproval } = require('@models');
const Response = require('@services/Response');
const {
  addEditRitualsValidation,
  ritualsDetailedListValidation,
  deleteRitualsValidation,
  getRitualValidation
} = require('@services/adminValidations/ritualValidations');
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
const {
  addEditDraftRitualsValidation,
  ritualsDraftDetailedListValidation
} = require('../../../services/adminValidations/ritualValidations');

module.exports = {
  /**
   * @description This function is used to add or edit rituals
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  addEditRituals: (req, res) => {
    try {
      const reqParam = req.body;
      addEditRitualsValidation(reqParam, res, async (validate) => {
        if (validate) {
          let updateData = {
            display_name: reqParam.ritualName.trim(),
            status: reqParam.ritualStatus,
            focus_ids: reqParam.focusIds,
            is_draft: reqParam.isDraft || true
          };
          if (req.userType === USER_TYPE.SUPER_ADMIN) {
            updateData = {
              ...updateData,
              approved_by: req.authAdminId,
              approved_on: new Date()
            };
          }
          if (reqParam.ritualUrl) {
            updateData = {
              ...updateData,
              ritual_url: reqParam.ritualUrl
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
          if (reqParam.ritualId) {
            if (
              reqParam.approvalStatus === CONTENT_STATUS.APPROVED &&
              req.userType !== USER_TYPE.SUPER_ADMIN
            ) {
              const newDataCondition = {
                ...updateData,
                created_by: req.authAdminId
              };
              const newData = await Ritual.findOneAndUpdate(
                {
                  parentId: reqParam.ritualId
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
                content_type: CONTENT_TYPE.RITUALS,
                display_name: reqParam.ritualName.trim(),
                content_status: CONTENT_STATUS.DRAFT,
                created_by: req.authAdminId,
                comments: addComment
              };
              await ContentApproval.findOneAndUpdate(
                { parentId: reqParam.ritualId },
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
                  CONTENT_TYPE.RITUALS
                ));
              return Response.successResponseWithoutData(
                res,
                res.__('ritualDetailUpdated'),
                SUCCESS
              );
            } else {
              const filterCondition = {
                _id: reqParam.ritualId,
                status: {
                  $ne: STATUS.DELETED
                }
              };
              const ritualData = await Ritual.findOneAndUpdate(filterCondition, updateData, {
                new: true
              }).select('_id');
              if (ritualData) {
                const filterContentCondition = {
                  content_type_id: ritualData._id,
                  content_type: CONTENT_TYPE.RITUALS,
                  deletedAt: null
                };
                let updateContentCondition = {
                  display_name: reqParam.ritualName.trim(),
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
                    ritualData._id,
                    CONTENT_TYPE.RITUALS
                  ));
                return Response.successResponseWithoutData(
                  res,
                  res.__('ritualDetailUpdated'),
                  SUCCESS
                );
              } else {
                return Response.successResponseWithoutData(res, res.__('noRitualFound'), FAIL);
              }
            }
          } else {
            const newDataCondition = {
              ...updateData,
              created_by: req.authAdminId
            };
            const newData = await Ritual.create(newDataCondition);
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
                content_type: CONTENT_TYPE.RITUALS,
                display_name: reqParam.ritualName.trim(),
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
                  CONTENT_TYPE.RITUALS
                ));
              return Response.successResponseWithoutData(
                res,
                res.__('ritualAddedSuccess'),
                SUCCESS
              );
            } else {
              return Response.successResponseWithoutData(res, res.__('noRitualFound'), SUCCESS);
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
   * @description This function is used to get detailed list of rituals
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  ritualsDetailedList: async (req, res) => {
    try {
      const reqParam = req.query;
      await Ritual.updateMany({ is_draft: { $eq: null } }, { is_draft: false });

      ritualsDetailedListValidation(reqParam, res, async (validate) => {
        if (validate) {
          const page = reqParam.page ? parseInt(reqParam.page) : PAGE;
          const perPage = reqParam.perPage ? parseInt(reqParam.perPage) : PER_PAGE;
          const skip = (page - 1) * perPage || 0;
          const sortBy = reqParam.sortBy || SORT_BY;
          const sortOrder = reqParam.sortOrder ? parseInt(reqParam.sortOrder) : SORT_ORDER;
          const contentApprovalCondition = {
            content_type: CONTENT_TYPE.RITUALS,
            content_status: reqParam.approvalStatus
              ? parseInt(reqParam.approvalStatus)
              : {
                  $ne: CONTENT_STATUS.DRAFT
                }
          };
          const ritualIds = [];
          const cursor = await ContentApproval.find(contentApprovalCondition)
            .select('content_type_id')
            .cursor();
          await cursor.eachAsync((doc) => {
            ritualIds.push(doc.content_type_id);
          });
          const filterCondition = {
            _id: {
              $in: ritualIds
            },
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
          const totalRecords = await Ritual.countDocuments(filterCondition);
          const ritualsDetailedData = await Ritual.find(filterCondition)
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
              ritualName: '$display_name',
              ritualStatus: '$status',
              approvedOn: '$approved_on',
              createdBy: '$createdBy',
              approvedBy: '$approvedBy',
              createdOn: '$createdAt'
            })
            .lean();
          const rituals = contentResponseObjTransformerList(ritualsDetailedData);
          return Response.successResponseData(res, rituals, SUCCESS, res.__('ritualListSuccess'), {
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
   * @description This function is used to delete ritual
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  deleteRituals: (req, res) => {
    try {
      const reqParam = req.query;
      deleteRitualsValidation(reqParam, res, async (validate) => {
        if (validate) {
          const deleteCondition = {
            status: STATUS.DELETED,
            deletedAt: new Date()
          };
          const deletedData = await Ritual.findByIdAndUpdate(reqParam.ritualId, deleteCondition, {
            new: true
          }).select('_id');
          if (deletedData) {
            const filterContentCondition = {
              content_type_id: reqParam.ritualId,
              content_type: CONTENT_TYPE.RITUALS
            };
            await ContentApproval.findOneAndUpdate(filterContentCondition, {
              deletedAt: new Date()
            });
            return Response.successResponseWithoutData(res, res.__('ritualDeleteSuccess'), SUCCESS);
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
   * @description This function is used to get ritual by id
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  getRitual: (req, res) => {
    try {
      const reqParam = req.params;
      getRitualValidation(reqParam, res, async (validate) => {
        if (validate) {
          const filterCondition = {
            _id: reqParam.id,
            status: {
              $ne: STATUS.DELETED
            }
          };
          const ritualsDetailedData = await Ritual.findOne(filterCondition)
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
            .populate({
              path: 'focus_ids',
              select: 'display_name'
            })
            .select({
              id: '$_id',
              ritualName: '$display_name',
              ritualStatus: '$status',
              approvedOn: '$approved_on',
              createdBy: '$createdBy',
              approvedBy: '$approvedBy',
              createdOn: '$createdAt'
            })
            .lean();
          const rituals = contentResponseObjTransformer(ritualsDetailedData);
          return Response.successResponseData(res, rituals, SUCCESS, res.__('ritualListSuccess'));
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  addEditDraftRituals: (req, res) => {
    try {
      const reqParam = req.body;
      addEditDraftRitualsValidation(reqParam, res, async (validate) => {
        if (validate) {
          let updateData = {
            display_name: reqParam?.ritualName,
            status: reqParam?.ritualStatus,
            focus_ids: reqParam?.focusIds,
            is_draft: reqParam.isDraft || true
          };
          if (req.userType === USER_TYPE.SUPER_ADMIN) {
            updateData = {
              ...updateData,
              approved_by: req.authAdminId,
              approved_on: new Date()
            };
          }
          if (reqParam.ritualUrl) {
            updateData = {
              ...updateData,
              ritual_url: reqParam.ritualUrl
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
          if (reqParam.ritualId) {
            if (
              reqParam.approvalStatus === CONTENT_STATUS.APPROVED &&
              req.userType !== USER_TYPE.SUPER_ADMIN
            ) {
              const newDataCondition = {
                ...updateData,
                created_by: req.authAdminId
              };
              const newData = await Ritual.findOneAndUpdate(
                {
                  parentId: reqParam.ritualId
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
                content_type: CONTENT_TYPE.RITUALS,
                display_name: reqParam.ritualName,
                content_status: CONTENT_STATUS.DRAFT,
                created_by: req.authAdminId,
                comments: addComment
              };
              await ContentApproval.findOneAndUpdate(
                { parentId: reqParam.ritualId },
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
                  CONTENT_TYPE.RITUALS
                ));
              return Response.successResponseWithoutData(
                res,
                res.__('ritualDraftDetailUpdated'),
                SUCCESS
              );
            } else {
              const filterCondition = {
                _id: reqParam.ritualId,
                status: {
                  $ne: STATUS.DELETED
                }
              };
              const ritualData = await Ritual.findOneAndUpdate(filterCondition, updateData, {
                new: true
              }).select('_id');
              if (ritualData) {
                const filterContentCondition = {
                  content_type_id: ritualData._id,
                  content_type: CONTENT_TYPE.RITUALS,
                  deletedAt: null
                };
                let updateContentCondition = {
                  display_name: reqParam.ritualName,
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
                    ritualData._id,
                    CONTENT_TYPE.RITUALS
                  ));
                return Response.successResponseWithoutData(
                  res,
                  res.__('ritualDraftDetailUpdated'),
                  SUCCESS
                );
              } else {
                return Response.successResponseWithoutData(res, res.__('noRitualFound'), FAIL);
              }
            }
          } else {
            const newDataCondition = {
              ...updateData,
              created_by: req.authAdminId
            };
            const newData = await Ritual.create(newDataCondition);
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
                content_type: CONTENT_TYPE.RITUALS,
                display_name: reqParam.ritualName,
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
                  CONTENT_TYPE.RITUALS
                ));
              return Response.successResponseWithoutData(
                res,
                res.__('ritualDraftAddedSuccess'),
                SUCCESS
              );
            } else {
              return Response.successResponseWithoutData(res, res.__('noRitualFound'), SUCCESS);
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

  ritualsDraftDetailedList: async (req, res) => {
    try {
      const reqParam = req.query;
      // await Ritual.updateMany({is_draft:{$eq:null}},{is_draft:false});

      ritualsDraftDetailedListValidation(reqParam, res, async (validate) => {
        if (validate) {
          const page = reqParam.page ? parseInt(reqParam.page) : PAGE;
          const perPage = reqParam.perPage ? parseInt(reqParam.perPage) : PER_PAGE;
          const skip = (page - 1) * perPage || 0;
          const sortBy = reqParam.sortBy || SORT_BY;
          const sortOrder = reqParam.sortOrder ? parseInt(reqParam.sortOrder) : SORT_ORDER;

          const filterCondition = {
            is_draft: true,
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
            ...(reqParam.ritualStatus && { status: parseInt(reqParam.ritualStatus) })
          };
          const totalRecords = await Ritual.countDocuments(filterCondition);
          const ritualsDetailedData = await Ritual.find(filterCondition)
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
              ritualName: '$display_name',
              ritualStatus: '$status',
              approvedOn: '$approved_on',
              createdBy: '$createdBy',
              approvedBy: '$approvedBy',
              createdOn: '$createdAt'
            })
            .lean();
          const rituals = contentResponseObjTransformerList(ritualsDetailedData);
          return Response.successResponseData(
            res,
            rituals,
            SUCCESS,
            res.__('ritualDraftListSuccess'),
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
