'use strict';

const { Affirmation, ContentApproval } = require('@models');
const Response = require('@services/Response');
const {
  addEditAffirmationValidation,
  affirmationDetailedListValidation,
  deleteAffirmationValidation,
  addAffirmationCsvValidation,
  getAffirmationValidation
} = require('@services/adminValidations/affirmationValidations');
const {
  STATUS,
  SUCCESS,
  FAIL,
  PAGE,
  PER_PAGE,
  CONTENT_TYPE,
  CONTENT_STATUS,
  USER_TYPE,
  SORT_BY,
  SORT_ORDER,
  AFFIRMATION_TYPE
} = require('@services/Constant');
const { toObjectId } = require('@services/Helper');
const csv = require('csv-parser');
const fs = require('fs');
const async = require('async');
const formidable = require('formidable');
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
  addEditDraftAffirmationValidation,
  affirmationDraftsDetailedListValidation
} = require('../../../services/adminValidations/affirmationValidations');

module.exports = {
  /**
   * @description This function is used to add or edit affirmation details manually.
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  addEditAffirmation: (req, res) => {
    try {
      const reqParam = req.body;
      addEditAffirmationValidation(reqParam, res, async (validate) => {
        if (validate) {
          let updateData = {
            display_name: reqParam.affirmationName?.trim(),
            description: reqParam.description?.trim() || null,
            affirmation_type: reqParam.affirmationType,
            status: reqParam.affirmationStatus,
            focus_ids: reqParam.focusIds,
            is_draft: reqParam.isDraft || false
          };
          if (req.userType === USER_TYPE.SUPER_ADMIN) {
            updateData = {
              ...updateData,
              approved_by: req.authAdminId,
              approved_on: new Date()
            };
          }
          if (reqParam.affirmationId) {
            if (
              reqParam.approvalStatus === CONTENT_STATUS.APPROVED &&
              req.userType !== USER_TYPE.SUPER_ADMIN
            ) {
              const newDataCondition = {
                ...updateData,
                created_by: req.authAdminId
              };
              const newData = await Affirmation.findOneAndUpdate(
                { parentId: reqParam.affirmationId },
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
                content_type: CONTENT_TYPE.AFFIRMATION,
                display_name: reqParam.affirmationName?.trim(),
                content_status: CONTENT_STATUS.DRAFT,
                created_by: req.authAdminId,
                comments: addComment
              };
              await ContentApproval.findOneAndUpdate(
                { parentId: reqParam.affirmationId },
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
                  CONTENT_TYPE.AFFIRMATION
                ));

              return Response.successResponseWithoutData(
                res,
                res.__('affirmationDetailUpdated'),
                SUCCESS
              );
            } else {
              const filterData = {
                _id: reqParam.affirmationId,
                status: {
                  $ne: STATUS.DELETED
                }
              };
              const updatedData = await Affirmation.findOneAndUpdate(filterData, updateData, {
                new: true
              }).select('_id');
              if (updatedData) {
                const filterContentCondition = {
                  content_type_id: updatedData._id,
                  content_type: CONTENT_TYPE.AFFIRMATION,
                  deletedAt: null
                };
                let updateContentCondition = {
                  display_name: reqParam.affirmationName.trim(),
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
                    updatedData._id,
                    CONTENT_TYPE.AFFIRMATION
                  ));

                return Response.successResponseWithoutData(
                  res,
                  res.__('affirmationDetailUpdated'),
                  SUCCESS
                );
              } else {
                return Response.successResponseWithoutData(
                  res,
                  res.__('noAffirmationFound'),
                  SUCCESS
                );
              }
            }
          } else {
            const newDataCondition = {
              ...updateData,
              created_by: req.authAdminId
            };
            const newData = await Affirmation.create(newDataCondition);
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
                content_type: CONTENT_TYPE.AFFIRMATION,
                display_name: reqParam.affirmationName.trim(),
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
                  CONTENT_TYPE.AFFIRMATION
                ));
              return Response.successResponseWithoutData(
                res,
                res.__('affirmationDetailAdded'),
                SUCCESS
              );
            } else {
              return Response.successResponseWithoutData(res, res.__('noAffirmationFound'), FAIL);
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
   * @description this function is used to get detailed list of affirmation
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  affirmationDetailedList: async (req, res) => {
    try {
      const reqParam = req.query;
      await Affirmation.updateMany({ is_draft: { $eq: null } }, { is_draft: false });

      affirmationDetailedListValidation(reqParam, res, async (validate) => {
        if (validate) {
          const page = reqParam.page ? parseInt(reqParam.page) : PAGE;
          const perPage = reqParam.perPage ? parseInt(reqParam.perPage) : PER_PAGE;
          const skip = (page - 1) * perPage || 0;
          const contentApprovalCondition = {
            content_type: CONTENT_TYPE.AFFIRMATION,
            content_status: reqParam.approvalStatus
              ? parseInt(reqParam.approvalStatus)
              : {
                  $ne: CONTENT_STATUS.DRAFT
                }
          };
          const sortBy = reqParam.sortBy || SORT_BY;
          const sortOrder = reqParam.sortOrder ? parseInt(reqParam.sortOrder) : SORT_ORDER;
          const affirmationIds = [];
          const cursor = await ContentApproval.find(contentApprovalCondition)
            .select('content_type_id')
            .cursor();
          await cursor.eachAsync((doc) => {
            affirmationIds.push(doc.content_type_id);
          });
          const filterCondition = {
            _id: {
              $in: affirmationIds
            },
            is_draft: false,
            status: {
              $ne: STATUS.DELETED
            },
            ...(reqParam.createdBy && { created_by: toObjectId(reqParam.createdBy) }),
            ...(reqParam.approvedBy && { approved_by: toObjectId(reqParam.approvedBy) }),
            ...(reqParam.searchKey && {
              $or: [{ display_name: { $regex: '.*' + reqParam.searchKey + '.*', $options: 'i' } }]
            }),
            ...(reqParam.affirmationStatus && { status: parseInt(reqParam.affirmationStatus) }),
            ...(reqParam.id && { _id: toObjectId(reqParam.id) } &&
              delete contentApprovalCondition.content_status)
          };
          const totalRecords = await Affirmation.countDocuments(filterCondition);
          const affirmationDetailedList = await Affirmation.find(filterCondition)
            .populate({
              path: 'created_by',
              select: 'name'
            })
            .populate({
              path: 'approved_by',
              select: 'name'
            })
            .populate({
              path: 'focus_ids',
              select: 'display_name'
            })
            .populate({
              path: 'contentApproval',
              select: 'content_status'
            })
            .sort({ [sortBy]: sortOrder })
            .skip(skip)
            .limit(perPage)
            .select({
              affirmationName: '$display_name',
              affirmationStatus: '$status',
              approvedOn: '$approved_on',
              id: '$_id',
              _id: 1,
              createdOn: '$createdAt'
            })
            .lean();
          const affirmations = contentResponseObjTransformerList(affirmationDetailedList);
          return Response.successResponseData(
            res,
            affirmations,
            SUCCESS,
            res.__('affirmationListSuccess'),
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
  },

  /**
   * @description This function is used to delete affirmation
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  deleteAffirmation: (req, res) => {
    try {
      const reqParam = req.query;
      deleteAffirmationValidation(reqParam, res, async (validate) => {
        if (validate) {
          const deleteCondition = {
            status: STATUS.DELETED,
            deletedAt: new Date()
          };
          const deletedData = await Affirmation.findByIdAndUpdate(
            reqParam.affirmationId,
            deleteCondition,
            { new: true }
          ).select('_id');
          if (deletedData) {
            const filterContentCondition = {
              content_type_id: reqParam.affirmationId,
              content_type: CONTENT_TYPE.AFFIRMATION
            };
            await ContentApproval.findOneAndUpdate(filterContentCondition, {
              deletedAt: new Date()
            });
            return Response.successResponseWithoutData(
              res,
              res.__('affirmationDeleteSuccess'),
              SUCCESS
            );
          } else {
            return Response.successResponseWithoutData(res, res.__('noAffirmationFound'), FAIL);
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
   * @description This function is used to add affirmation using csv upload.
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  addAffirmationCsv: async (req, res) => {
    try {
      const form = formidable();
      form.parse(req, (err, reqParam, reqFile) => {
        if (err) {
          return Response.internalServerErrorResponse(res);
        }
        if (!reqFile.csvFile) {
          return Response.validationErrorResponseData(res, res.__('affirmationCsvRequired'));
        }
        if (!reqParam.focusIds) {
          return Response.validationErrorResponseData(res, res.__('focusIdsRequired'));
        }
        reqParam.focusIds = JSON.parse(reqParam.focusIds);
        reqParam.csvFileMimetype = reqFile.csvFile.mimetype;

        addAffirmationCsvValidation(reqParam, res, async (validate) => {
          if (validate) {
            // eslint-disable-next-line spellcheck/spell-checker
            const readData = fs.createReadStream(reqFile.csvFile.filepath);

            const affirmationArray = [];
            readData.pipe(
              csv({
                // separator: ';'
              })
                .on('data', async (row) => {
                  if (row.display_name) {
                    const tempObj = {
                      display_name: row.display_name?.trim(),
                      description: row.description?.trim() || null,
                      affirmation_type: AFFIRMATION_TYPE.CSV,
                      focus_ids: reqParam.focusIds,
                      created_by: req.authAdminId,
                      approved_by: req.userType === USER_TYPE.SUPER_ADMIN ? req.authAdminId : null,
                      approved_on: req.userType === USER_TYPE.SUPER_ADMIN ? new Date() : null
                    };
                    affirmationArray.push(tempObj);
                  }
                })
                .on('end', async function () {
                  if (affirmationArray.length > 0) {
                    const affirmations = await Affirmation.insertMany(affirmationArray);
                    if (affirmations.length > 0) {
                      const contentApprovalArray = [];
                      async.forEachOf(
                        affirmations,
                        async function (el) {
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
                            content_type_id: el._id,
                            content_type: CONTENT_TYPE.AFFIRMATION,
                            display_name: el.display_name.trim(),
                            focus_ids: reqParam.focusIds,
                            content_status: addComment.content_status,
                            created_by: req.authAdminId,
                            comments: addComment,
                            updated_by:
                              req.userType === USER_TYPE.SUPER_ADMIN ? req.authAdminId : null,
                            updated_on: req.userType === USER_TYPE.SUPER_ADMIN ? new Date() : null
                          };
                          contentApprovalArray.push(newContentData);
                        },
                        async function (err) {
                          if (err) {
                            return Response.internalServerErrorResponse(res);
                          } else {
                            await ContentApproval.insertMany(contentApprovalArray);
                          }
                        }
                      );
                      return Response.successResponseWithoutData(
                        res,
                        res.__('affirmationUploadedSuccess'),
                        SUCCESS
                      );
                    } else {
                      return Response.validationErrorResponseData(res, res.__('notValidCsv'));
                    }
                  } else {
                    return Response.validationErrorResponseData(res, res.__('notValidCsv'));
                  }
                })
                .on('error', function (error) {
                  return Response.successResponseWithoutData(res, error.message, FAIL);
                })
            );
          } else {
            return Response.internalServerErrorResponse(res);
          }
        });
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to get affirmation details by id
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  getAffirmation: (req, res) => {
    try {
      const reqParam = req.params;
      getAffirmationValidation(reqParam, res, async (validate) => {
        if (validate) {
          const filterCondition = {
            _id: reqParam.id,
            status: {
              $ne: STATUS.DELETED
            },
            ...(req.userType === USER_TYPE.SUB_ADMIN && { created_by: toObjectId(req.authAdminId) })
          };
          const affirmationDetails = await Affirmation.findOne(filterCondition)
            .populate({
              path: 'created_by',
              select: 'name'
            })
            .populate({
              path: 'approved_by',
              select: 'name'
            })
            .populate({
              path: 'focus_ids',
              select: 'display_name'
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
              affirmationName: '$display_name',
              affirmationStatus: '$status',
              approvedOn: '$approved_on',
              id: '$_id',
              _id: 1,
              createdOn: '$createdAt',
              description: 1
            })
            .lean();
          const affirmation =
            affirmationDetails && contentResponseObjTransformer(affirmationDetails);
          return Response.successResponseData(
            res,
            affirmation,
            SUCCESS,
            res.__('affirmationListSuccess')
          );
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  addEditDraftAffirmation: (req, res) => {
    try {
      const reqParam = req.body;
      addEditDraftAffirmationValidation(reqParam, res, async (validate) => {
        if (validate) {
          let updateData = {
            display_name: reqParam?.affirmationName,
            description: reqParam?.description || null,
            affirmation_type: reqParam?.affirmationType,
            status: reqParam?.affirmationStatus,
            focus_ids: reqParam?.focusIds,
            is_draft: reqParam?.isDraft || true
          };
          if (req.userType === USER_TYPE.SUPER_ADMIN) {
            updateData = {
              ...updateData,
              approved_by: req.authAdminId,
              approved_on: new Date()
            };
          }
          if (reqParam.affirmationId) {
            if (
              reqParam.approvalStatus === CONTENT_STATUS.APPROVED &&
              req.userType !== USER_TYPE.SUPER_ADMIN
            ) {
              const newDataCondition = {
                ...updateData,
                created_by: req.authAdminId
              };
              const newData = await Affirmation.findOneAndUpdate(
                { parentId: reqParam.affirmationId },
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
                content_type: CONTENT_TYPE.AFFIRMATION,
                display_name: reqParam.affirmationName,
                content_status: CONTENT_STATUS.DRAFT,
                created_by: req.authAdminId,
                comments: addComment
              };
              await ContentApproval.findOneAndUpdate(
                { parentId: reqParam.affirmationId },
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
                  CONTENT_TYPE.AFFIRMATION
                ));

              return Response.successResponseWithoutData(
                res,
                res.__('affirmationDetailUpdated'),
                SUCCESS
              );
            } else {
              const filterData = {
                _id: reqParam.affirmationId,
                status: {
                  $ne: STATUS.DELETED
                }
              };
              const updatedData = await Affirmation.findOneAndUpdate(filterData, updateData, {
                new: true
              }).select('_id');
              if (updatedData) {
                const filterContentCondition = {
                  content_type_id: updatedData._id,
                  content_type: CONTENT_TYPE.AFFIRMATION,
                  deletedAt: null
                };
                let updateContentCondition = {
                  display_name: reqParam.affirmationName,
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
                    updatedData._id,
                    CONTENT_TYPE.AFFIRMATION
                  ));

                return Response.successResponseWithoutData(
                  res,
                  res.__('affirmationDetailUpdated'),
                  SUCCESS
                );
              } else {
                return Response.successResponseWithoutData(
                  res,
                  res.__('noAffirmationFound'),
                  SUCCESS
                );
              }
            }
          } else {
            const newDataCondition = {
              ...updateData,
              created_by: req.authAdminId
            };
            const newData = await Affirmation.create(newDataCondition);
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
                content_type: CONTENT_TYPE.AFFIRMATION,
                display_name: reqParam.affirmationName,
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
                  CONTENT_TYPE.AFFIRMATION
                ));
              return Response.successResponseWithoutData(
                res,
                res.__('affirmationDetailAdded'),
                SUCCESS
              );
            } else {
              return Response.successResponseWithoutData(res, res.__('noAffirmationFound'), FAIL);
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

  affirmationDraftDetailedList: (req, res) => {
    try {
      const reqParam = req.query;
      affirmationDraftsDetailedListValidation(reqParam, res, async (validate) => {
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
            ...(reqParam.approvedBy && { approved_by: toObjectId(reqParam.approvedBy) }),
            ...(reqParam.searchKey && {
              $or: [{ display_name: { $regex: '.*' + reqParam.searchKey + '.*', $options: 'i' } }]
            }),
            ...(reqParam.affirmationStatus && { status: parseInt(reqParam.affirmationStatus) })
          };
          const totalRecords = await Affirmation.countDocuments(filterCondition);
          const affirmationDetailedList = await Affirmation.find(filterCondition)
            .populate({
              path: 'created_by',
              select: 'name'
            })
            .populate({
              path: 'approved_by',
              select: 'name'
            })
            .populate({
              path: 'focus_ids',
              select: 'display_name'
            })
            .populate({
              path: 'contentApproval',
              select: 'content_status'
            })
            .sort({ [sortBy]: sortOrder })
            .skip(skip)
            .limit(perPage)
            .select({
              affirmationName: '$display_name',
              affirmationStatus: '$status',
              approvedOn: '$approved_on',
              id: '$_id',
              _id: 1,
              createdOn: '$createdAt'
            })
            .lean();
          const affirmations = contentResponseObjTransformerList(affirmationDetailedList);
          return Response.successResponseData(
            res,
            affirmations,
            SUCCESS,
            res.__('affirmationDraftListSuccess'),
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
