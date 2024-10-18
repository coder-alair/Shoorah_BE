'use strict';

const {
  Focus,
  ContentApproval,
  Affirmation,
  Meditation,
  Sound,
  Gratitude,
  Ritual,
  UserInterest
} = require('@models');
const Response = require('@services/Response');
const {
  addEditFocusValidation,
  focusListValidation,
  deleteFocusValidation,
  focusNameListValidation,
  getFocusValidation
} = require('@services/adminValidations/focusValidations');
const {
  STATUS,
  SUCCESS,
  PAGE,
  PER_PAGE,
  FAIL,
  CONTENT_TYPE,
  CONTENT_STATUS,
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
  addEditDraftFocusValidation,
  draftFocusListValidation
} = require('../../../services/adminValidations/focusValidations');

module.exports = {
  /**
   * @description This function is used to add or edit focus
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  addEditFocus: (req, res) => {
    try {
      const reqParam = req.body;
      addEditFocusValidation(reqParam, res, async (validate) => {
        if (validate) {
          let updateCondition = {
            display_name: reqParam.focusName.trim(),
            focus_type: reqParam.focusType,
            status: reqParam.focusStatus,
            is_draft: reqParam.isDraft || false
          };
          if (req.userType === USER_TYPE.SUPER_ADMIN) {
            updateCondition = {
              ...updateCondition,
              approved_by: req.authAdminId,
              approved_on: new Date()
            };
          }
          if (reqParam.focusId) {
            if (
              reqParam.approvalStatus === CONTENT_STATUS.APPROVED &&
              req.userType !== USER_TYPE.SUPER_ADMIN
            ) {
              const newDataCondition = {
                ...updateCondition,
                created_by: req.authAdminId
              };
              const newData = await Focus.findOneAndUpdate(
                { parentId: reqParam.focusId },
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
                content_type: CONTENT_TYPE.FOCUS,
                display_name: reqParam.focusName.trim(),
                content_status: CONTENT_STATUS.DRAFT,
                created_by: req.authAdminId,
                comments: addComment
              };
              await ContentApproval.findOneAndUpdate(
                { parentId: reqParam.focusId },
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
                  CONTENT_TYPE.FOCUS
                ));

              return Response.successResponseWithoutData(
                res,
                res.__('focusUpdateSuccess'),
                SUCCESS
              );
            } else {
              const filterCondition = {
                _id: reqParam.focusId,
                status: {
                  $ne: STATUS.DELETED
                }
              };
              const focusData = await Focus.findOneAndUpdate(filterCondition, updateCondition, {
                new: true
              }).select('_id');
              if (focusData) {
                const filterContentCondition = {
                  content_type_id: focusData._id,
                  content_type: CONTENT_TYPE.FOCUS,
                  deletedAt: null
                };
                let updateContentCondition;
                if (req.userType === USER_TYPE.SUPER_ADMIN) {
                  const addComment = {
                    comment: null,
                    commented_by: req.authAdminId,
                    commented_on: new Date(),
                    content_status: CONTENT_STATUS.APPROVED
                  };
                  updateContentCondition = {
                    display_name: reqParam.focusName.trim(),
                    content_status: CONTENT_STATUS.APPROVED,
                    $push: { comments: addComment },
                    updated_by: req.authAdminId,
                    updated_on: new Date()
                  };
                } else {
                  updateContentCondition = {
                    display_name: reqParam.focusName.trim(),
                    content_status: CONTENT_STATUS.DRAFT
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
                    focusData._id,
                    CONTENT_TYPE.FOCUS
                  ));

                return Response.successResponseWithoutData(
                  res,
                  res.__('focusUpdateSuccess'),
                  SUCCESS
                );
              } else {
                return Response.successResponseWithoutData(res, res.__('invalidFocusId'), FAIL);
              }
            }
          } else {
            const newDataCondition = {
              ...updateCondition,
              created_by: req.authAdminId
            };
            const newData = await Focus.create(newDataCondition);
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
                content_type: CONTENT_TYPE.FOCUS,
                display_name: reqParam.focusName.trim(),
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
                  CONTENT_TYPE.FOCUS
                ));
              return Response.successResponseWithoutData(res, res.__('focusAddedSuccess'), SUCCESS);
            } else {
              return Response.successResponseWithoutData(res, res.__('noFocusFound'), FAIL);
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
   * @description This function is used to get focus list
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  focusList: async (req, res) => {
    try {
      const reqParam = req.query;
      await Focus.updateMany({ is_draft: { $eq: null } }, { is_draft: false });

      focusListValidation(reqParam, res, async (validate) => {
        if (validate) {
          const page = reqParam.page ? parseInt(reqParam.page) : PAGE;
          const perPage = reqParam.perPage ? parseInt(reqParam.perPage) : PER_PAGE;
          const skip = (page - 1) * perPage || 0;
          const sortBy = reqParam.sortBy || SORT_BY;
          const sortOrder = reqParam.sortOrder ? parseInt(reqParam.sortOrder) : SORT_ORDER;
          const contentApprovalCondition = {
            content_type: CONTENT_TYPE.FOCUS,
            content_status: reqParam.approvalStatus
              ? parseInt(reqParam.approvalStatus)
              : {
                  $ne: CONTENT_STATUS.DRAFT
                }
          };
          const focusIds = [];
          const cursor = await ContentApproval.find(contentApprovalCondition)
            .select('content_type_id')
            .cursor();
          await cursor.eachAsync((doc) => {
            focusIds.push(doc.content_type_id);
          });
          const filterData = {
            _id: {
              $in: focusIds
            },
            is_draft: false,
            status: {
              $ne: STATUS.DELETED
            },
            ...(reqParam.createdBy && { created_by: toObjectId(reqParam.createdBy) }),
            ...(reqParam.searchKey && {
              display_name: { $regex: `.*${reqParam.searchKey}.*`, $options: 'i' }
            }),
            ...(reqParam.id && { _id: toObjectId(reqParam.id) } &&
              delete contentApprovalCondition.content_status),
            ...(reqParam.focusType && { focus_type: parseInt(reqParam.focusType) }),
            ...(reqParam.approvedBy && { approved_by: toObjectId(reqParam.approvedBy) }),
            ...(reqParam.focusStatus && { status: parseInt(reqParam.focusStatus) })
          };
          const totalRecords = await Focus.countDocuments(filterData);
          const focusData = await Focus.find(filterData)
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
              focusName: '$display_name',
              focusType: '$focus_type',
              focusStatus: '$status',
              approvalStatus: '$contentApproval.content_status',
              approvedOn: '$approved_on',
              createdOn: '$createdAt'
            })
            .lean();
          const focus = contentResponseObjTransformerList(focusData);
          return Response.successResponseData(res, focus, SUCCESS, res.__('focusListSuccess'), {
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
   * @description This function is used to delete focus
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  deleteFocus: (req, res) => {
    try {
      const reqParam = req.query;
      deleteFocusValidation(reqParam, res, async (validate) => {
        if (validate) {
          const deletedData = await Focus.findByIdAndUpdate(
            reqParam.focusId,
            { status: STATUS.DELETED, deletedAt: new Date() },
            { new: true }
          ).select('_id approved_by');
          if (deletedData) {
            const filterContentCondition = {
              content_type_id: reqParam.focusId,
              content_type: CONTENT_TYPE.FOCUS
            };
            await ContentApproval.findOneAndUpdate(filterContentCondition, {
              deletedAt: new Date()
            });
            if (deletedData.approved_by) {
              const filterContentFocus = {
                focus_ids: reqParam.focusId,
                status: {
                  $ne: STATUS.DELETED
                }
              };
              const userInterestFocus = {
                $or: [
                  { main_focus_ids: reqParam.focusId },
                  { affirmation_focus_ids: reqParam.focusId }
                ],
                deletedAt: null
              };
              const userInterestFocusUpdate = {
                $pull: { main_focus_ids: reqParam.focusId, affirmation_focus_ids: reqParam.focusId }
              };
              const updateContentFocus = { $pull: { focus_ids: reqParam.focusId } };
              await Affirmation.updateMany(filterContentFocus, updateContentFocus);
              await Meditation.updateMany(filterContentFocus, updateContentFocus);
              await Sound.updateMany(filterContentFocus, updateContentFocus);
              await Gratitude.updateMany(filterContentFocus, updateContentFocus);
              await Ritual.updateMany(filterContentFocus, updateContentFocus);
              await UserInterest.updateMany(userInterestFocus, userInterestFocusUpdate);
            }
            return Response.successResponseWithoutData(res, res.__('focusDeleteSuccess'), SUCCESS);
          } else {
            return Response.successResponseWithoutData(res, res.__('noFocusFound'), FAIL);
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
   * @desciprion This function is used to get focus name only to show it to drop down
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  focusNameList: async (req, res) => {
    try {
      const reqParam = req.params;
      await Focus.updateMany({ is_draft: { $eq: null } }, { is_draft: false });

      focusNameListValidation(reqParam, res, async (validate) => {
        if (validate) {
          const filterCondition = {
            focus_type: reqParam.focusType,
            status: STATUS.ACTIVE,
            is_draft: false,
            approved_by: {
              $ne: null
            }
          };
          const focusData = await Focus.find(filterCondition, {
            id: '$_id',
            _id: 1,
            focusName: '$display_name'
          });
          if (focusData.length > 0) {
            return Response.successResponseData(
              res,
              focusData,
              SUCCESS,
              res.__('focusListSuccess')
            );
          } else {
            return Response.successResponseWithoutData(res, res.__('noFocusFound'), SUCCESS);
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
   * @description This function is used to get focus details by id.
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  getFocus: (req, res) => {
    try {
      const reqParam = req.params;
      getFocusValidation(reqParam, res, async (validate) => {
        if (validate) {
          const filterData = {
            _id: reqParam.id,
            status: {
              $ne: STATUS.DELETED
            }
          };
          const focusData = await Focus.findOne(filterData)
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
              focusName: '$display_name',
              focusType: '$focus_type',
              focusStatus: '$status',
              approvalStatus: '$contentApproval.content_status',
              approvedOn: '$approved_on',
              createdOn: '$createdAt'
            })
            .lean();

          const focus = focusData && contentResponseObjTransformer(focusData);
          return Response.successResponseData(res, focus, SUCCESS, res.__('focusListSuccess'));
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  addEditDraftFocus: (req, res) => {
    try {
      const reqParam = req.body;
      addEditDraftFocusValidation(reqParam, res, async (validate) => {
        if (validate) {
          let updateCondition = {
            display_name: reqParam.focusName.trim(),
            focus_type: reqParam.focusType,
            status: reqParam.focusStatus,
            is_draft: reqParam.isDraft || true
          };
          if (req.userType === USER_TYPE.SUPER_ADMIN) {
            updateCondition = {
              ...updateCondition,
              approved_by: req.authAdminId,
              approved_on: new Date()
            };
          }
          if (reqParam.focusId) {
            if (
              reqParam.approvalStatus === CONTENT_STATUS.APPROVED &&
              req.userType !== USER_TYPE.SUPER_ADMIN
            ) {
              const newDataCondition = {
                ...updateCondition,
                created_by: req.authAdminId
              };
              const newData = await Focus.findOneAndUpdate(
                { parentId: reqParam.focusId },
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
                content_type: CONTENT_TYPE.FOCUS,
                display_name: reqParam.focusName.trim(),
                content_status: CONTENT_STATUS.DRAFT,
                created_by: req.authAdminId,
                comments: addComment
              };
              await ContentApproval.findOneAndUpdate(
                { parentId: reqParam.focusId },
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
                  CONTENT_TYPE.FOCUS
                ));

              return Response.successResponseWithoutData(
                res,
                res.__('draftFocusUpdateSuccess'),
                SUCCESS
              );
            } else {
              const filterCondition = {
                _id: reqParam.focusId,
                status: {
                  $ne: STATUS.DELETED
                }
              };
              const focusData = await Focus.findOneAndUpdate(filterCondition, updateCondition, {
                new: true
              }).select('_id');
              if (focusData) {
                const filterContentCondition = {
                  content_type_id: focusData._id,
                  content_type: CONTENT_TYPE.FOCUS,
                  deletedAt: null
                };
                let updateContentCondition;
                if (req.userType === USER_TYPE.SUPER_ADMIN) {
                  const addComment = {
                    comment: null,
                    commented_by: req.authAdminId,
                    commented_on: new Date(),
                    content_status: CONTENT_STATUS.APPROVED
                  };
                  updateContentCondition = {
                    display_name: reqParam.focusName.trim(),
                    content_status: CONTENT_STATUS.APPROVED,
                    $push: { comments: addComment },
                    updated_by: req.authAdminId,
                    updated_on: new Date()
                  };
                } else {
                  updateContentCondition = {
                    display_name: reqParam.focusName.trim(),
                    content_status: CONTENT_STATUS.DRAFT
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
                    focusData._id,
                    CONTENT_TYPE.FOCUS
                  ));

                return Response.successResponseWithoutData(
                  res,
                  res.__('focusUpdateSuccess'),
                  SUCCESS
                );
              } else {
                return Response.successResponseWithoutData(res, res.__('invalidFocusId'), FAIL);
              }
            }
          } else {
            const newDataCondition = {
              ...updateCondition,
              created_by: req.authAdminId
            };
            const newData = await Focus.create(newDataCondition);
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
                content_type: CONTENT_TYPE.FOCUS,
                display_name: reqParam.focusName.trim(),
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
                  CONTENT_TYPE.FOCUS
                ));
              return Response.successResponseWithoutData(res, res.__('focusAddedSuccess'), SUCCESS);
            } else {
              return Response.successResponseWithoutData(res, res.__('noFocusFound'), FAIL);
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

  draftFocusList: async (req, res) => {
    try {
      const reqParam = req.query;
      // await Focus.updateMany({is_draft:{$eq:null}},{is_draft:false});

      draftFocusListValidation(reqParam, res, async (validate) => {
        if (validate) {
          const page = reqParam.page ? parseInt(reqParam.page) : PAGE;
          const perPage = reqParam.perPage ? parseInt(reqParam.perPage) : PER_PAGE;
          const skip = (page - 1) * perPage || 0;
          const sortBy = reqParam.sortBy || SORT_BY;
          const sortOrder = reqParam.sortOrder ? parseInt(reqParam.sortOrder) : SORT_ORDER;

          const filterData = {
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
              display_name: { $regex: `.*${reqParam.searchKey}.*`, $options: 'i' }
            }),
            ...(reqParam.focusType && { focus_type: parseInt(reqParam.focusType) }),
            ...(reqParam.approvedBy && { approved_by: toObjectId(reqParam.approvedBy) }),
            ...(reqParam.focusStatus && { status: parseInt(reqParam.focusStatus) })
          };
          const totalRecords = await Focus.countDocuments(filterData);
          const focusData = await Focus.find(filterData)
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
              focusName: '$display_name',
              focusType: '$focus_type',
              focusStatus: '$status',
              approvalStatus: '$contentApproval.content_status',
              approvedOn: '$approved_on',
              createdOn: '$createdAt'
            })
            .lean();
          const focus = contentResponseObjTransformerList(focusData);
          return Response.successResponseData(
            res,
            focus,
            SUCCESS,
            res.__('draftFocusListSuccess'),
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
