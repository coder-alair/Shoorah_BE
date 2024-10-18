'use strict';

const Response = require('@services/Response');
const {
  SUCCESS,
  FAIL,
  STATUS,
  PAGE,
  PER_PAGE,
  SORT_ORDER,
  CLOUDFRONT_URL,
  ADMIN_MEDIA_PATH,
  USER_TYPE,
  RESPONSE_CODE,
  CONTENT_STATUS,
  CONTENT_TYPE,
  SURVEY_TYPE,
  SURVEY_STATUS,
  SURVEY_SCOPE
} = require('../../../services/Constant');
const {
  convertObjectKeysToCamelCase,
  toObjectId,
  unixTimeStamp,
  makeRandomDigit
} = require('../../../services/Helper');
const AppSurveys = require('../../../models/AppSurveys');
const SurveysQuestion = require('../../../models/SurveyQuestion');
const AppSurveyCategory = require('../../../models/AppSurveyCategory');
const {
  addEditSurveyValidation,
  getSurveyValidation,
  getAllSurveyValidation,
  addEditSurveyCategoryValidation,
  deleteSurveyCategoryValidation,
  deleteSurveyValidation
} = require('../../../services/adminValidations/surveyValidations');
const {
  sendSurveyB2BNotificationsToUsers
} = require('../../../services/userServices/notifyAdminServices');
const { getUploadURL, removeOldImage, copyFile } = require('@services/s3Services');
const SurveyApproval = require('../../../models/SurveyApprovals');
const {
  newSurveyUploadedNotification,
  updateB2BContentUploadedNotification
} = require('../../../services/adminServices/companyStatusNotify');
const { ContentApproval } = require('../../../models');
const { stringifyId, compareObjectId, getAdminPlatformURL, hasValue } = require('@helpers/utils');
const {
  CONTENT_TYPE_MAPPING,
  CONTENT_APPROVAL_REQUEST,
  CONTENT_APPROVAL_MESSAGE,
  NOTIFICATION_TYPE,
  SURVEY_INSIGHT_KEYS,
  CONTENT_APPROVAL_STATUS
} = require('@services/Constant');
const {
  updateContentUploadedNotification
} = require('@services/adminServices/contentApprovalServices');

module.exports = {
  /**
   * @description This function is used for create b2b survey
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */

  addEditB2BSurvey: async (req, res) => {
    try {
      const payload = req.body;
      const skipApproval = req.userType === USER_TYPE.COMPANY_ADMIN;

      let updateData = {
        ...(payload.surveyTitle.trim() && { title: payload.surveyTitle.trim() }),
        ...(payload.surveyStatus && { status: payload.surveyStatus }),
        ...(payload.surveyType && { survey_type: payload.surveyType }),
        ...(payload.target.length > 0 && { target: payload.target }),
        ...(payload.category && { category: payload.category }),
        ...(payload.surveyDuration && { duration: payload.surveyDuration }),
        ...(payload.notifyTime && { notify_time: payload.notifyTime })
      };

      let existingSurvey;

      if (!payload.surveyId) {
        updateData.company_id = req.authCompanyId;
        updateData.created_by = req.authAdminId;
        updateData.scope = SURVEY_SCOPE.B2B;
      } else {
        existingSurvey = await AppSurveys.findById(payload.surveyId).select('questions logo image');
        if (!existingSurvey) {
          return Response.errorResponseData(res, res.__('surveyNotFound'), RESPONSE_CODE.NOT_FOUND);
        }
      }

      // Skip approval for super admin
      if (skipApproval && !existingSurvey) {
        updateData.approved_by = req.authAdminId;
        updateData.approved_on = new Date();
        updateData.status = STATUS.ACTIVE;
      }

      const extraMetaData = {
        surveyLogo: null,
        surveyImage: null
      };

      // Manage logo and image
      if (payload.surveyLogo) {
        const imageExtension = payload.surveyLogo.split('/')[1];
        const surveyLogoName = `${unixTimeStamp(new Date())}-${makeRandomDigit(
          4
        )}.${imageExtension}`;
        extraMetaData.surveyLogo = await getUploadURL(
          payload.surveyLogo,
          surveyLogoName,
          ADMIN_MEDIA_PATH.SURVEY_LOGO
        );
        updateData.logo = surveyLogoName;
      } else if (payload.previewLogo) {
        const logoFileName = payload.previewLogo.split('/').pop();
        if (logoFileName) {
          const logoExtension = logoFileName.split('.')[1];
          const newLogoFileName = `${unixTimeStamp(new Date())}-${makeRandomDigit(
            4
          )}.${logoExtension}`;
          const isSuccess = await copyFile(
            ADMIN_MEDIA_PATH.SURVEY_LOGO,
            logoFileName,
            ADMIN_MEDIA_PATH.SURVEY_LOGO,
            newLogoFileName
          );
          if (isSuccess) updateData.logo = newLogoFileName;
        }
      }

      if (payload.surveyImage) {
        const imageExtension = payload.surveyImage.split('/')[1];
        const surveyImageName = `${unixTimeStamp(new Date())}-${makeRandomDigit(
          4
        )}.${imageExtension}`;
        extraMetaData.surveyImage = await getUploadURL(
          payload.surveyImage,
          surveyImageName,
          ADMIN_MEDIA_PATH.SURVEY_IMAGE
        );
        updateData.image = surveyImageName;
      } else if (payload.previewImage) {
        const imageFileName = payload.previewImage.split('/').pop();
        if (imageFileName) {
          const imageExtension = imageFileName.split('.')[1];
          const newImageFileName = `${unixTimeStamp(new Date())}-${makeRandomDigit(
            4
          )}.${imageExtension}`;
          const isSuccess = await copyFile(
            ADMIN_MEDIA_PATH.SURVEY_IMAGE,
            imageFileName,
            ADMIN_MEDIA_PATH.SURVEY_IMAGE,
            newImageFileName
          );
          if (isSuccess) updateData.image = newImageFileName;
        }
      }

      if (existingSurvey) {
        if (payload.surveyLogo === null && existingSurvey.logo) {
          await removeOldImage(existingSurvey.logo, ADMIN_MEDIA_PATH.SURVEY_LOGO, res);
        }
        if (payload.surveyImage === null && existingSurvey.image) {
          await removeOldImage(existingSurvey.image, ADMIN_MEDIA_PATH.SURVEY_IMAGE, res);
        }
      }

      const queryId = payload.surveyId && toObjectId(payload.surveyId);
      const survey = await (queryId
        ? AppSurveys.findOneAndUpdate(
            { _id: queryId },
            { $set: updateData },
            {
              upsert: true,
              new: true
            }
          )
        : AppSurveys.create(updateData));

      if (!survey) {
        return Response.errorResponseData(
          res,
          res.__(existingSurvey ? 'surveyUpdateFailed' : 'surveyCreationFailed'),
          FAIL
        );
      }

      // Manage questions
      const existingQuestionIds = new Map();
      const questionBulkOperations = [];
      for (const questionId of existingSurvey?.questions || []) {
        existingQuestionIds.set(stringifyId(questionId), true);
      }
      // Update existing question or create a new one
      for (const question of payload?.questions || []) {
        const questionId = stringifyId(question?.questionId);

        const isExistingQuestion = existingQuestionIds.has(questionId);
        const questionPayload = {
          title: question?.title,
          skipable: question?.skipable,
          options: question?.options
        };
        if (!isExistingQuestion) questionPayload.survey_id = survey._id;
        if (isExistingQuestion) {
          existingQuestionIds.delete(questionId);
          questionBulkOperations.push({
            updateOne: {
              filter: { _id: questionId },
              update: { $set: questionPayload }
            }
          });
        } else {
          updateData.questions = updateData.questions || [];
          updateData.questions.push(questionId);
          questionBulkOperations.push({
            insertOne: {
              document: questionPayload
            }
          });
        }
      }
      // Remove all deleted questions from db in one operation
      if (existingQuestionIds.size) {
        questionBulkOperations.push({
          deleteMany: {
            filter: { _id: { $in: [...existingQuestionIds.keys()].map(toObjectId) } }
          }
        });
      }
      // Update questions in both collections
      if (questionBulkOperations.length) {
        await SurveysQuestion.bulkWrite(questionBulkOperations, { ordered: false });
        const questionIds = await SurveysQuestion.find({ survey_id: survey._id })
          .select('_id')
          .distinct('_id');
        await AppSurveys.updateOne({ _id: survey._id }, { $set: { questions: questionIds } });
      }

      // If created by sub-admin and is not draft, Send a content approval notification to Super Admin
      if (!skipApproval && survey.survey_type !== SURVEY_TYPE.DRAFT) {
        const isTemplate = survey.survey_type === SURVEY_TYPE.TEMPLATE;
        const contentData = {
          content_type_id: survey._id,
          company_id: toObjectId(req.authCompanyId),
          content_type: CONTENT_TYPE.SURVEY,
          display_name: payload.surveyTitle.trim(),
          content_status: CONTENT_STATUS.DRAFT,
          created_by: req.authAdminId,
          updated_by: req.authAdminId,
          comments: []
        };
        const existingApproval = await ContentApproval.findOne({
          content_type_id: survey._id,
          company_id: toObjectId(req.authCompanyId)
        })
          .sort({ updatedAt: -1 })
          .select('content_status');
        const updateExistingApproval =
          existingApproval && existingApproval?.content_status !== CONTENT_STATUS.APPROVED;
        await (updateExistingApproval
          ? ContentApproval.findOneAndUpdate({ content_type_id: survey._id }, contentData, {
              upsert: true
            })
          : ContentApproval.create(contentData));

        // If only new content approval created, then send the email. Don't send new email for changes
        if (!updateExistingApproval) {
          const contentTypeText =
            CONTENT_TYPE_MAPPING[CONTENT_TYPE.SURVEY] + (isTemplate ? ' Template' : '');
          await updateB2BContentUploadedNotification(
            req.authAdminName,
            req.authAdminId,
            req.authCompanyId,
            survey._id,
            CONTENT_TYPE.SURVEY,
            {
              title: CONTENT_APPROVAL_REQUEST(contentTypeText),
              message: `${req.authAdminName} ${CONTENT_APPROVAL_MESSAGE.REQUEST(contentTypeText)}`,
              notificationType: NOTIFICATION_TYPE.B2B_CONTENT_APPROVAL_REQUEST,
              email: {
                titleButton: 'Go to approval',
                titleButtonUrl: `${getAdminPlatformURL(true)}/view-survey/${survey._id}?type=approval`,
                thirdLine: `${req.authAdminName} ${CONTENT_APPROVAL_MESSAGE.REQUEST(contentTypeText)} on shoorah admin panel. click the go to approval button to go to website. `
              }
            }
          );
        }
      }

      if (skipApproval && survey.survey_type === SURVEY_TYPE.SURVEY) {
        sendSurveyB2BNotificationsToUsers(req.companyName, req.authAdminId, req.authCompanyId);
      }

      return Response.successResponseWithoutData(
        res,
        res.__(existingSurvey ? 'surveyUpdatedSuccess' : 'surveyAddedSuccess'),
        SUCCESS,
        extraMetaData
      );
    } catch (e) {
      return Response.internalServerErrorResponse(res);
    }
  },

  getB2BSurveyById: async (req, res) => {
    try {
      const reqParam = req.query;
      let filterCondition = {
        _id: toObjectId(reqParam.surveyId),
        $or: [{ company_id: toObjectId(req.authCompanyId) }, { survey_type: SURVEY_TYPE.TEMPLATE }]
      };

      const pipeline = [
        { $match: filterCondition },
        {
          $lookup: {
            from: 'users',
            localField: 'created_by',
            foreignField: '_id',
            as: 'created_by'
          }
        },
        { $unwind: '$created_by' },
        {
          $lookup: {
            from: 'content_approvals',
            let: {
              survey_id: '$_id'
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ['$content_type_id', '$$survey_id']
                  }
                }
              },
              {
                $project: {
                  content_status: 1,
                  comment: { $last: '$comments' },
                  updated_by: 1,
                  updatedAt: 1
                }
              },
              {
                $sort: {
                  updatedAt: -1
                }
              },
              {
                $limit: 1
              },
              {
                $lookup: {
                  from: 'users',
                  let: { updated_by: '$updated_by' },
                  pipeline: [
                    {
                      $match: {
                        $expr: {
                          $eq: ['$_id', '$$updated_by']
                        }
                      }
                    },
                    {
                      $limit: 1
                    },
                    {
                      $project: {
                        _id: 1,
                        name: 1
                      }
                    }
                  ],
                  as: 'updated_by'
                }
              },
              {
                $unwind: { path: '$updated_by', preserveNullAndEmptyArrays: true }
              },
              {
                $project: {
                  _id: 0,
                  content_status: 1,
                  comment: {
                    $cond: {
                      if: {
                        $and: [{ $eq: ['$updated_by._id', '$comment.commented_by'] }]
                      },
                      then: '$comment.comment',
                      else: null
                    }
                  },
                  updated_by: '$updated_by.name'
                }
              }
            ],
            as: 'approval_status'
          }
        },
        // Convert an array of status to status
        {
          $unwind: {
            path: '$approval_status',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'approved_by',
            foreignField: '_id',
            as: 'approved_by'
          }
        },
        { $unwind: { path: '$approved_by', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'app_survey_categories',
            localField: 'category',
            foreignField: '_id',
            as: 'category'
          }
        },
        { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'survey_questions',
            localField: 'questions',
            foreignField: '_id',
            as: 'questions'
          }
        },
        {
          $project: {
            surveyTitle: '$title',
            createdOn: '$createdAt',
            createdBy: '$created_by.name',
            surveyCategory: '$category._id',
            approvedOn: '$approved_on',
            approvedBy: { $ifNull: ['$approved_by.name', null] },
            approvalStatus: {
              $cond: {
                if: '$approved_by.name',
                then: 1,
                else: {
                  $ifNull: ['$approval_status.content_status', 0]
                }
              }
            },
            approvalUpdatedBy: '$approval_status.updated_by',
            comment: {
              $ifNull: ['$approval_status.comment', '']
            },
            questions: '$questions',
            surveyType: '$survey_type',
            status: '$status',
            surveyLogo: {
              $cond: {
                if: '$logo',
                then: { $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.SURVEY_LOGO, '/', '$logo'] },
                else: null
              }
            },
            surveyImage: {
              $cond: {
                if: '$image',
                then: { $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.SURVEY_IMAGE, '/', '$image'] },
                else: null
              }
            },
            scope: '$scope',
            notifyTime: '$notify_time',
            surveyDuration: '$duration',
            target: '$target',
            id: '$_id'
          }
        }
      ];
      console.log(JSON.stringify(pipeline));
      const survey = await AppSurveys.aggregate(pipeline);

      if (survey && survey?.length) {
        return Response.successResponseData(res, survey[0], SUCCESS, res.__('getSurveySuccess'));
      } else {
        return Response.successResponseWithoutData(res, res.__('getSurveyFail'), FAIL);
      }
    } catch (err) {
      console.log(err);
      return Response.internalServerErrorResponse(res);
    }
  },

  getAllB2BSurveys: async (req, res) => {
    try {
      const reqParam = req.query;

      const page = reqParam.page ? parseInt(reqParam.page) : PAGE;
      const perPage = reqParam.perPage ? parseInt(reqParam.perPage) : PER_PAGE;
      const skip = (page - 1) * perPage || 0;
      const sortBy = reqParam.sortBy || 'updatedAt';
      const sortOrder = reqParam.sortOrder ? parseInt(reqParam.sortOrder) : SORT_ORDER;

      const filterCondition = {
        deletedAt: null,
        status: SURVEY_STATUS.ACTIVE,
        survey_type: SURVEY_TYPE.SURVEY,
        company_id: toObjectId(req.authCompanyId)
      };

      if (hasValue(reqParam.searchKey)) {
        filterCondition.title = { $regex: '.*' + reqParam.searchKey + '.*', $options: 'i' };
      }
      if (hasValue(reqParam.surveyStatus)) {
        filterCondition.status = parseInt(reqParam.surveyStatus);
      }
      if (hasValue(reqParam.surveyType)) {
        filterCondition.survey_type = parseInt(reqParam.surveyType);
        if (filterCondition.survey_type === SURVEY_TYPE.DRAFT) {
          filterCondition.status = SURVEY_STATUS.INACTIVE;
          filterCondition.created_by = toObjectId(req.authAdminId);
        } else if (filterCondition.survey_type === SURVEY_TYPE.TEMPLATE) {
          filterCondition.company_id = null;
        }
      }

      const totalRecords = await AppSurveys.countDocuments(filterCondition);

      const pipeline = [
        { $match: filterCondition },
        // Populate a user who created the survey
        {
          $lookup: {
            from: 'users',
            let: { created_by: '$created_by' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ['$_id', '$$created_by']
                  }
                }
              },
              {
                $limit: 1
              },
              {
                $project: {
                  _id: 0,
                  name: 1
                }
              }
            ],
            as: 'created_by'
          }
        },
        // Convert an array of users to a user
        { $unwind: '$created_by' },
        // Populate survey approval status,
        {
          $lookup: {
            from: 'content_approvals',
            let: {
              survey_id: '$_id'
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ['$content_type_id', '$$survey_id']
                  }
                }
              },
              {
                $project: {
                  content_status: 1,
                  updatedAt: 1
                }
              },
              {
                $sort: {
                  updatedAt: -1
                }
              },
              {
                $limit: 1
              },
              {
                $project: {
                  _id: 0,
                  content_status: 1
                }
              }
            ],
            as: 'approval_status'
          }
        },
        // Convert an array of status to status
        {
          $unwind: {
            path: '$approval_status',
            preserveNullAndEmptyArrays: true
          }
        },
        // Populate user who approved the survey
        {
          $lookup: {
            from: 'users',
            let: {
              approved_by: '$approved_by'
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ['$_id', '$$approved_by']
                  }
                }
              },
              {
                $limit: 1
              },
              {
                $project: {
                  _id: 0,
                  name: 1
                }
              }
            ],
            as: 'approved_by'
          }
        },
        // Convert an array of users to a user
        { $unwind: { path: '$approved_by', preserveNullAndEmptyArrays: true } },

        {
          $lookup: {
            from: 'app_survey_categories',
            localField: 'category',
            foreignField: '_id',
            as: 'category'
          }
        },
        { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            surveyTitle: '$title',
            createdOn: '$createdAt',
            createdBy: '$created_by.name',
            approvedOn: '$approved_on',
            approvedBy: { $ifNull: ['$approved_by.name', null] },
            approvalStatus: {
              $cond: {
                if: '$approved_by.name',
                then: 1,
                else: {
                  $ifNull: ['$approval_status.content_status', 0]
                }
              }
            },
            category: {
              $cond: {
                if: '$category',
                then: '$category.category_name',
                else: null
              }
            },
            approvalUpdatedBy: '$approval_status',
            surveyType: '$survey_type',
            status: '$status',
            survey_logo: {
              $cond: {
                if: '$logo',
                then: { $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.SURVEY_LOGO, '/', '$logo'] },
                else: null
              }
            },
            survey_image: {
              $cond: {
                if: '$image',
                then: { $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.SURVEY_IMAGE, '/', '$image'] },
                else: null
              }
            },
            scope: '$scope',
            notifyTime: '$notify_time',
            target: '$target',
            id: '$_id',
            [sortBy]: true
          }
        },
        { $sort: { [sortBy]: sortOrder } }, // Sort based on rating and provided sort fields
        { $skip: skip },
        { $limit: perPage }
      ];
      console.log(JSON.stringify(pipeline));
      const surveys = await AppSurveys.aggregate(pipeline);

      const surveysData = convertObjectKeysToCamelCase(surveys);
      return Response.successResponseData(res, surveysData, SUCCESS, res.__('surveyListSuccess'), {
        page,
        perPage,
        totalRecords
      });
    } catch (err) {
      console.log(err);
      return Response.internalServerErrorResponse(res);
    }
  },

  getAllDraftsB2BSurveys: (req, res) => {
    try {
      const reqParam = req.query;
      if (
        req.userType !== USER_TYPE.COMPANY_ADMIN &&
        req.userType !== USER_TYPE.COMPANY_SUB_ADMIN
      ) {
        return Response.errorResponseData(res, res.__('accessDenied'), RESPONSE_CODE.UNAUTHORIZED);
      }
      getAllSurveyValidation(reqParam, res, async (validate) => {
        if (validate) {
          const page = reqParam.page ? parseInt(reqParam.page) : PAGE;
          const perPage = reqParam.perPage ? parseInt(reqParam.perPage) : PER_PAGE;
          const skip = (page - 1) * perPage || 0;
          const sortBy = reqParam.sortBy || 'updatedAt';
          const sortOrder = reqParam.sortOrder ? parseInt(reqParam.sortOrder) : SORT_ORDER;

          const filterCondition = {
            is_draft: true,
            status: {
              $ne: STATUS.DELETED
            },
            company_id: toObjectId(req.authCompanyId),
            created_by: toObjectId(req.authAdminId),
            ...(reqParam.searchKey && {
              $or: [
                {
                  survey_title: { $regex: '.*' + reqParam.searchKey + '.*', $options: 'i' }
                }
              ]
            }),
            ...(reqParam.approvedBy && { approved_by: toObjectId(reqParam.approvedBy) }),
            ...(reqParam.surveyStatus && { status: parseInt(reqParam.surveyStatus) })
          };

          const totalRecords = await AppSurveys.countDocuments(filterCondition);

          const surveys = await AppSurveys.aggregate([
            { $match: filterCondition },
            {
              $lookup: {
                from: 'users', // Collection name for 'created_by'
                localField: 'created_by',
                foreignField: '_id',
                as: 'created_by'
              }
            },
            { $unwind: '$created_by' }, // Unwind created_by array
            {
              $lookup: {
                from: 'users', // Collection name for 'approved_by'
                localField: 'approved_by',
                foreignField: '_id',
                as: 'approved_by'
              }
            },
            { $unwind: { path: '$approved_by', preserveNullAndEmptyArrays: true } }, // Unwind approved_by array
            {
              $project: {
                surveyTitle: '$survey_title',
                createdBy: '$created_by.name',
                approvedBy: { $ifNull: ['$approved_by.name', null] },
                isTemplate: '$is_template',
                isDraft: '$is_draft',
                status: '$status',
                survey_logo: {
                  $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.SURVEY_LOGO, '/', '$survey_logo']
                },
                survey_image: {
                  $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.SURVEY_IMAGE, '/', '$survey_image']
                },
                template_category: '$template_category',
                notifyTime: '$notify_time',
                surveyArea: '$survey_area',
                approvedOn: '$approved_on',
                id: '$_id',
                createdOn: '$createdAt'
              }
            },
            { $sort: { [sortBy]: sortOrder } }, // Sort based on rating and provided sort fields
            { $skip: skip },
            { $limit: perPage }
          ]);

          const surveysData = convertObjectKeysToCamelCase(surveys);
          return Response.successResponseData(
            res,
            surveysData,
            SUCCESS,
            res.__('surveyListSuccess'),
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
      console.log(err);
      return Response.internalServerErrorResponse(res);
    }
  },

  addEditB2BSurveyCategory: (req, res) => {
    try {
      const reqParam = req.body;
      if (
        req.userType !== USER_TYPE.COMPANY_ADMIN &&
        req.userType !== USER_TYPE.COMPANY_SUB_ADMIN
      ) {
        return Response.errorResponseData(res, res.__('accessDenied'), RESPONSE_CODE.UNAUTHORIZED);
      }
      addEditSurveyCategoryValidation(reqParam, res, async (validate) => {
        if (validate) {
          let updateData = {
            category_name: reqParam.categoryName.trim(),
            company_id: toObjectId(req.authCompanyId)
          };

          if (reqParam.categoryId) {
            const newData = await AppSurveyCategory.findOneAndUpdate(
              {
                _id: reqParam.categoryId
              },
              updateData,
              { upsert: true, new: true }
            );

            return Response.successResponseWithoutData(
              res,
              res.__('categoryDetailUpdated'),
              SUCCESS
            );
          } else {
            const newData = await AppSurveyCategory.create(updateData);
            if (newData) {
              return Response.successResponseWithoutData(
                res,
                res.__('categoryAddedSuccess'),
                SUCCESS
              );
            } else {
              return Response.successResponseWithoutData(res, res.__('noCategoryFound'), FAIL);
            }
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

  getAllB2BSurveyCategory: async (req, res) => {
    try {
      if (
        req.userType !== USER_TYPE.COMPANY_ADMIN &&
        req.userType !== USER_TYPE.COMPANY_SUB_ADMIN
      ) {
        return Response.errorResponseData(res, res.__('accessDenied'), RESPONSE_CODE.UNAUTHORIZED);
      }

      const filterCondition = {
        status: STATUS.ACTIVE,
        company_id: toObjectId(req.authCompanyId),
        deletedAt: null
      };
      const categories = await AppSurveyCategory.aggregate([
        { $match: filterCondition },
        {
          $project: {
            _id: 0,
            id: '$_id',
            categoryName: '$category_name'
          }
        }
      ]);
      return Response.successResponseData(res, categories, SUCCESS, res.__('categoryGetSuccess'));
    } catch (err) {
      console.log(err);
      return Response.internalServerErrorResponse(res);
    }
  },

  deleteB2BCategory: (req, res) => {
    try {
      const reqParam = req.query;
      if (
        req.userType !== USER_TYPE.COMPANY_ADMIN &&
        req.userType !== USER_TYPE.COMPANY_SUB_ADMIN
      ) {
        return Response.errorResponseData(res, res.__('accessDenied'), RESPONSE_CODE.UNAUTHORIZED);
      }
      deleteSurveyCategoryValidation(reqParam, res, async (validate) => {
        if (validate) {
          const deleteCondition = {
            status: STATUS.DELETED,
            deletedAt: new Date()
          };
          const deletedData = await AppSurveyCategory.findByIdAndUpdate(
            reqParam.categoryId,
            deleteCondition,
            { new: true }
          ).select('_id');
          if (deletedData) {
            return Response.successResponseWithoutData(
              res,
              res.__('categoryDeleteSuccess'),
              SUCCESS
            );
          } else {
            return Response.successResponseWithoutData(res, res.__('noCategoryFound'), FAIL);
          }
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  deleteB2BSurvey: async (req, res) => {
    try {
      const reqParam = req.query;
      const isCompanyAdmin = req.userType === USER_TYPE.COMPANY_ADMIN;

      const survey = await AppSurveys.findOne({
        _id: toObjectId(reqParam.surveyId),
        company_id: toObjectId(req.authCompanyId),
        survey_type: { $ne: SURVEY_TYPE.TEMPLATE }
      }).lean();

      if (!survey) {
        return Response.errorResponseData(res, res.__('surveyNotFound'), RESPONSE_CODE.NOT_FOUND);
      }

      if (!isCompanyAdmin && survey.created_by.toString() !== req.authAdminId) {
        return Response.errorResponseData(res, res.__('accessDenied'), RESPONSE_CODE.FORBIDDEN);
      }

      const deleteCondition = {
        status: SURVEY_STATUS.INACTIVE,
        deletedAt: new Date()
      };
      const deletedData = await AppSurveys.findByIdAndUpdate(
        toObjectId(reqParam.surveyId),
        { $set: deleteCondition },
        {
          new: true
        }
      ).select('_id');

      await SurveysQuestion.updateMany(
        { survey_id: toObjectId(reqParam.surveyId), deletedAt: null },
        {
          $set: {
            deletedAt: new Date()
          }
        }
      ).select('_id');

      if (deletedData) {
        return Response.successResponseWithoutData(res, res.__('surveyDeleteSuccess'), SUCCESS);
      } else {
        return Response.successResponseWithoutData(res, res.__('surveyDeleteFail'), FAIL);
      }
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  b2bSurveyApproval: async (req, res) => {
    try {
      const reqParam = req.body;

      const approvalToUpdate = await ContentApproval.findOne({
        content_type_id: toObjectId(reqParam.surveyId),
        company_id: toObjectId(req.authCompanyId)
      })
        .select('_id content_status')
        .sort({ createdAt: -1 });

      if (!approvalToUpdate) {
        return Response.errorResponseData(
          res,
          res.__('approvalRequestNotFound'),
          RESPONSE_CODE.NOT_FOUND
        );
      }

      // Update content approval request
      const contentApprovalUpdate = {
        $set: {
          content_status: reqParam.surveyStatus,
          updated_by: toObjectId(req.authAdminId),
          updated_on: new Date()
        }
      };

      const hasComment = reqParam.comment?.trim();
      if (hasComment) {
        const commentData = {
          comment: reqParam.comment,
          commented_by: toObjectId(req.authAdminId),
          commented_on: new Date(),
          content_status: reqParam.surveyStatus
        };

        contentApprovalUpdate['$push'] = { comments: commentData };
      }

      // Update content approval and app survey status and comment
      await ContentApproval.updateOne(
        {
          _id: approvalToUpdate._id
        },
        contentApprovalUpdate
      );
      // Update survey status and approve date
      const surveyUpdateData = {};
      if (reqParam.surveyStatus === CONTENT_STATUS.APPROVED) {
        surveyUpdateData.approved_by = toObjectId(req.authAdminId);
        surveyUpdateData.approved_on = new Date();
        surveyUpdateData.status = SURVEY_STATUS.ACTIVE;
      } else if (reqParam.surveyStatus === CONTENT_STATUS.REJECTED) {
        surveyUpdateData.status = SURVEY_STATUS.REJECTED;
      }

      const survey = await AppSurveys.findOneAndUpdate(
        { _id: toObjectId(reqParam.surveyId), company_id: toObjectId(req.authCompanyId) },
        { $set: surveyUpdateData },
        { new: true }
      );
      if (!survey?._id) {
        return Response.errorResponseData(
          res,
          res.__('surveyApprovalFailed'),
          RESPONSE_CODE.NOT_FOUND
        );
      }
      let notificationMessageMethod = CONTENT_APPROVAL_MESSAGE.UPDATE;
      switch (reqParam.surveyStatus) {
        case CONTENT_STATUS.APPROVED: {
          notificationMessageMethod = CONTENT_APPROVAL_MESSAGE.APPROVED;
          break;
        }
        case CONTENT_STATUS.REJECTED: {
          notificationMessageMethod = CONTENT_APPROVAL_MESSAGE.REJECTED;
          break;
        }
      }
      // Send notification to sub admin
      const contentTypeText =
        CONTENT_TYPE_MAPPING[CONTENT_TYPE.SURVEY] +
        (survey.survey_type === SURVEY_TYPE.TEMPLATE ? ' Template' : '');
      await updateB2BContentUploadedNotification(
        req.authAdminName,
        req.authAdminId,
        req.authCompanyId,
        survey._id,
        CONTENT_TYPE.SURVEY,
        {
          // For queries
          userType: USER_TYPE.COMPANY_SUB_ADMIN,
          userId: survey.created_by,
          // For notifications
          title: CONTENT_APPROVAL_STATUS(contentTypeText, reqParam.surveyStatus, hasComment),
          message: `${req.authAdminName} ${notificationMessageMethod(contentTypeText, hasComment)}`,
          notificationType: NOTIFICATION_TYPE.B2B_CONTENT_APPROVAL_STATUS,
          email: {
            titleButton: 'Go to survey',
            titleButtonUrl: `${getAdminPlatformURL(true)}/pulse-survey/add-edit-survey?id=${survey._id}`,
            thirdLine: `${req.authAdminName} ${notificationMessageMethod(contentTypeText, hasComment)} on shoorah admin panel. click the go to survey button to go to website. `
          }
        }
      );

      if (
        reqParam.surveyStatus === CONTENT_STATUS.APPROVED &&
        survey.survey_type === SURVEY_TYPE.SURVEY
      ) {
        sendSurveyB2BNotificationsToUsers(req.companyName, req.authAdminId, req.authCompanyId);
      }

      return Response.successResponseWithoutData(res, res.__('b2bSurveyApprovalSuccess'), SUCCESS);
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  }

  // sendB2BSurveyNotification: (req, res) => {
  //   try {
  //     const reqParam = req.body;
  //     if (
  //       req.userType !== USER_TYPE.COMPANY_ADMIN &&
  //       req.userType !== USER_TYPE.COMPANY_SUB_ADMIN
  //     ) {
  //       return Response.errorResponseData(res, res.__('accessDenied'), RESPONSE_CODE.UNAUTHORIZED);
  //     }
  //     getSurveyValidation(reqParam, res, async (validate) => {
  //       if (validate) {
  //         let filterCondition = {
  //           _id: toObjectId(reqParam.surveyId),
  //           company_id: toObjectId(req.authCompanyId)
  //         };
  //
  //         const survey = await AppSurveys.aggregate([
  //           { $match: filterCondition },
  //           {
  //             $lookup: {
  //               from: 'users', // Collection name for 'created_by'
  //               localField: 'created_by',
  //               foreignField: '_id',
  //               as: 'created_by'
  //             }
  //           },
  //           { $unwind: '$created_by' }, // Unwind created_by array
  //           {
  //             $lookup: {
  //               from: 'users', // Collection name for 'approved_by'
  //               localField: 'approved_by',
  //               foreignField: '_id',
  //               as: 'approved_by'
  //             }
  //           },
  //           { $unwind: '$approved_by' }, // Unwind approved_by array
  //           {
  //             $lookup: {
  //               from: 'app_survey_categories', // Collection name for 'survey_category'
  //               localField: 'survey_category',
  //               foreignField: '_id',
  //               as: 'survey_category'
  //             }
  //           },
  //           { $unwind: '$survey_category' }, // Unwind survey_category array
  //           {
  //             $lookup: {
  //               from: 'survey_questions', // Collection name for 'questions'
  //               localField: 'questions',
  //               foreignField: '_id',
  //               as: 'questions'
  //             }
  //           },
  //           {
  //             $project: {
  //               surveyTitle: '$survey_title',
  //               isTemplate: '$is_template',
  //               isDraft: '$is_draft',
  //               templateCategory: '$template_category',
  //               notifyTime: '$notify_time',
  //               surveyArea: '$survey_area',
  //               id: '$_id',
  //               createdOn: '$createdAt'
  //             }
  //           }
  //         ]);
  //
  //         if (survey && survey.length) {
  //           if (survey.length && survey[0].templateCategory) {
  //             await sendSurveyB2BNotificationsToUsers(
  //               'Your Company',
  //               req.authAdminId,
  //               req.authCompanyId
  //             );
  //           }
  //
  //           return Response.successResponseWithoutData(
  //             res,
  //             res.__('sendSurveyNotificationSuccess'),
  //             SUCCESS
  //           );
  //         } else {
  //           return Response.successResponseWithoutData(
  //             res,
  //             res.__('sendSurveyNotificationFail'),
  //             FAIL
  //           );
  //         }
  //       } else {
  //         return Response.internalServerErrorResponse(res);
  //       }
  //     });
  //   } catch (err) {
  //     console.log(err);
  //     return Response.internalServerErrorResponse(res);
  //   }
  // },
  //
  // getAllB2BTemplateSurveys: (req, res) => {
  //   try {
  //     const reqParam = req.query;
  //     if (
  //       req.userType !== USER_TYPE.COMPANY_ADMIN &&
  //       req.userType !== USER_TYPE.COMPANY_SUB_ADMIN
  //     ) {
  //       return Response.errorResponseData(res, res.__('accessDenied'), RESPONSE_CODE.UNAUTHORIZED);
  //     }
  //
  //     getAllSurveyValidation(reqParam, res, async (validate) => {
  //       if (validate) {
  //         const page = reqParam.page ? parseInt(reqParam.page) : PAGE;
  //         const perPage = reqParam.perPage ? parseInt(reqParam.perPage) : PER_PAGE;
  //         const skip = (page - 1) * perPage || 0;
  //         const sortBy = reqParam.sortBy || 'updatedAt';
  //         const sortOrder = reqParam.sortOrder ? parseInt(reqParam.sortOrder) : SORT_ORDER;
  //
  //         let filterCondition = {
  //           is_draft: false,
  //           is_template: true,
  //           status: STATUS.ACTIVE,
  //           approved_by: {
  //             $ne: null
  //           }
  //         };
  //
  //         const totalRecords = await AppSurveys.countDocuments(filterCondition);
  //         const surveys = await AppSurveys.aggregate([
  //           { $match: filterCondition },
  //           {
  //             $lookup: {
  //               from: 'users', // Collection name for 'created_by'
  //               localField: 'created_by',
  //               foreignField: '_id',
  //               as: 'created_by'
  //             }
  //           },
  //           { $unwind: '$created_by' }, // Unwind created_by array
  //           {
  //             $lookup: {
  //               from: 'users', // Collection name for 'approved_by'
  //               localField: 'approved_by',
  //               foreignField: '_id',
  //               as: 'approved_by'
  //             }
  //           },
  //           { $unwind: { path: '$approved_by', preserveNullAndEmptyArrays: true } },
  //           {
  //             $lookup: {
  //               from: 'app_survey_categories', // Collection name for 'survey_category'
  //               localField: 'survey_category',
  //               foreignField: '_id',
  //               as: 'survey_category'
  //             }
  //           },
  //           { $unwind: '$survey_category' }, // Unwind approved_by array
  //           {
  //             $project: {
  //               surveyTitle: '$survey_title',
  //               createdBy: '$created_by.name',
  //               surveyCategory: '$survey_category',
  //               approvedBy: { $ifNull: ['$approved_by.name', null] },
  //               isTemplate: '$is_template',
  //               isDraft: '$is_draft',
  //               status: '$status',
  //               survey_logo: {
  //                 $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.SURVEY_LOGO, '/', '$survey_logo']
  //               },
  //               survey_image: {
  //                 $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.SURVEY_IMAGE, '/', '$survey_image']
  //               },
  //               template_category: '$template_category',
  //               notifyTime: '$notify_time',
  //               surveyArea: '$survey_area',
  //               approvedOn: '$approved_on',
  //               id: '$_id',
  //               createdOn: '$createdAt'
  //             }
  //           },
  //           { $sort: { [sortBy]: sortOrder } }, // Sort based on rating and provided sort fields
  //           { $skip: skip },
  //           { $limit: perPage }
  //         ]);
  //
  //         const surveysData = convertObjectKeysToCamelCase(surveys);
  //
  //         return Response.successResponseData(
  //           res,
  //           surveysData,
  //           SUCCESS,
  //           res.__('surveyListSuccess'),
  //           {
  //             page,
  //             perPage,
  //             totalRecords
  //           }
  //         );
  //       } else {
  //         return Response.internalServerErrorResponse(res);
  //       }
  //     });
  //   } catch (err) {
  //     console.log(err);
  //     return Response.internalServerErrorResponse(res);
  //   }
  // }
};
