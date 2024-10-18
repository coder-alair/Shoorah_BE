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
  CONTENT_TYPE,
  USER_TYPE,
  CONTENT_STATUS,
  SURVEY_STATUS,
  RESPONSE_CODE,
  SURVEY_TYPE
} = require('../../../services/Constant');
const {
  convertObjectKeysToCamelCase,
  toObjectId,
  unixTimeStamp,
  makeRandomDigit
} = require('../../../services/Helper');
const AppSurveys = require('../../../models/AppSurveys');
const { ContentApproval } = require('../../../models');
const SurveysQuestion = require('../../../models/SurveyQuestion');
const AppSurveyCategory = require('../../../models/AppSurveyCategory');
const {
  newContentUploadedNotification,
  updateContentUploadedNotification
} = require('../../../services/adminServices/contentApprovalServices');
const {
  addEditSurveyCategoryValidation
} = require('../../../services/adminValidations/surveyValidations');
const { getUploadURL, removeOldImage, getUploadImage, copyFile } = require('@services/s3Services');
const { sendSurveyNotificationsToUsers } = require('@services/userServices/notifyAdminServices');
const {
  CONTENT_APPROVAL_REQUEST,
  CONTENT_TYPE_MAPPING,
  CONTENT_APPROVAL_MESSAGE,
  NOTIFICATION_TYPE,
  ACCOUNT_STATUS,
  SURVEY_SCOPE,
  SURVEY_INSIGHT_KEYS,
  CONTENT_APPROVAL_STATUS
} = require('@services/Constant');
const { getAdminPlatformURL, stringifyId, hasValue, compareObjectId } = require('@helpers/utils');
const { camelCase } = require('lodash');
const Mongoose = require('mongoose');

module.exports = {
  /**
   * @description This function is used for create survey
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */

  addSurvey: async (req, res) => {
    try {
      const payload = req.body;
      const skipApproval = req.userType === USER_TYPE.SUPER_ADMIN;

      let newData = {
        title: payload.surveyTitle.trim(),
        ...(payload.status && { status: payload.status }),
        ...(payload.surveyType && { survey_type: payload.surveyType }),
        ...(payload.scope && { scope: payload.scope }),
        ...(payload.target.length > 0 && { target: payload.target }),
        category: payload.category,
        ...(payload.surveyDuration && { duration: payload.surveyDuration }),
        ...(payload.notifyTime && { notify_time: payload.notifyTime }),
        created_by: req.authAdminId
      };

      if (skipApproval) {
        newData.approved_by = req.authAdminId;
        newData.approved_on = new Date();
        if (payload.surveyType != SURVEY_TYPE.DRAFT) {
          newData.status = STATUS.ACTIVE;
        } else {
          newData.status = STATUS.INACTIVE;
        }
      }

      const extraMetaData = {
        surveyLogo: null,
        surveyImage: null
      };

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
        newData.logo = surveyLogoName;
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
          if (isSuccess) newData.logo = newLogoFileName;
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
        newData.image = surveyImageName;
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
          if (isSuccess) newData.image = newImageFileName;
        }
      }

      const survey = await AppSurveys.create(newData);
      if (!survey) {
        return Response.successResponseWithoutData(
          res,
          res.__('surveyNotAdded'),
          FAIL,
          extraMetaData
        );
      }

      for (const question of payload?.questions || []) {
        const questionPayload = {
          survey_id: survey._id,
          title: question?.title,
          options: question?.options,
          skipable: question?.skipable
        };

        const questionData = await SurveysQuestion.create(questionPayload);
        survey.questions.push(questionData._id);
      }

      survey.save();

      if (!skipApproval && survey.survey_type !== SURVEY_TYPE.DRAFT) {
        const isTemplate = survey.survey_type === SURVEY_TYPE.TEMPLATE;
        const contentData = {
          content_type_id: survey._id,
          content_type: CONTENT_TYPE.SURVEY,
          display_name: payload.surveyTitle.trim(),
          content_status: CONTENT_STATUS.DRAFT,
          created_by: req.authAdminId,
          updated_by: req.authAdminId,
          comments: []
        };

        await ContentApproval.create(contentData);

        const contentTypeText =
          CONTENT_TYPE_MAPPING[CONTENT_TYPE.SURVEY] + (isTemplate ? ' Template' : '');
        await updateContentUploadedNotification(
          req.authAdminName,
          req.authAdminId,
          survey._id,
          CONTENT_TYPE.SURVEY,
          {
            title: CONTENT_APPROVAL_REQUEST(contentTypeText),
            message: `${req.authAdminName} ${CONTENT_APPROVAL_MESSAGE.REQUEST(contentTypeText)}`,
            notificationType: NOTIFICATION_TYPE.CONTENT_APPROVAL_REQUEST,
            email: {
              titleButton: 'Go to approval',
              titleButtonUrl: `${getAdminPlatformURL()}/view-survey/${survey._id}?type=approval`,
              thirdLine: `${req.authAdminName} ${CONTENT_APPROVAL_MESSAGE.REQUEST(contentTypeText)} on shoorah admin panel. click the go to approval button to go to website. `
            }
          }
        );
      }

      if (skipApproval && survey.survey_type === SURVEY_TYPE.SURVEY) {
        sendSurveyNotificationsToUsers('Shoorah', req.authAdminId, survey.scope);
      }

      return Response.successResponseWithoutData(
        res,
        res.__('surveyAddedSuccess'),
        SUCCESS,
        extraMetaData
      );
    } catch (e) {
      console.error(e);
      return Response.internalServerErrorResponse(res);
    }
  },

  editSurvey: async (req, res) => {
    try {
      const payload = req.body;
      const skipApproval = req.userType === USER_TYPE.SUPER_ADMIN;

      const survey = await AppSurveys.findById(payload.surveyId);
      if (!survey) {
        return Response.errorResponseData(res, res.__('surveyNotFound'), RESPONSE_CODE.NOT_FOUND);
      }

      survey.title = payload.surveyTitle.trim() || survey.title;
      survey.duration = payload.surveyDuration || survey.duration;
      survey.category = payload.category || survey.category;
      survey.scope = payload.templateCategory || survey.scope;
      survey.notify_time = payload.notifyTime || survey.notify_time;
      survey.status = payload.surveyStatus || survey.status;
      survey.target = payload.target.length > 0 ? payload.target : survey.target;

      const extraMetaData = {
        surveyLogo: null,
        surveyImage: null
      };

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
        survey.logo = surveyLogoName;
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
          if (isSuccess) survey.logo = newLogoFileName;
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
        survey.image = surveyImageName;
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
          if (isSuccess) survey.image = newImageFileName;
        }
      }

      if (payload.surveyLogo === null && survey.logo) {
        await removeOldImage(survey.logo, ADMIN_MEDIA_PATH.SURVEY_LOGO, res);
      }
      if (payload.surveyImage === null && survey.image) {
        await removeOldImage(survey.image, ADMIN_MEDIA_PATH.SURVEY_IMAGE, res);
      }

      if (skipApproval && survey.survey_type !== SURVEY_TYPE.DRAFT) {
        survey.approved_by = req.authAdminId;
        survey.approved_on = new Date();
        survey.status = SURVEY_STATUS.ACTIVE;
      }

      survey.save();

      const existingQuestionIds = new Map();
      const questionBulkOperations = [];
      for (const questionId of survey?.questions || []) {
        existingQuestionIds.set(stringifyId(questionId), true);
      }

      for (const question of payload?.questions || []) {
        const questionId = stringifyId(question?.questionId);

        const isExistingQuestion = existingQuestionIds.has(questionId);
        const questionPayload = {
          title: question?.title,
          options: question?.options,
          skipable: question?.skipable
        };

        if (isExistingQuestion) {
          existingQuestionIds.delete(questionId);
          questionBulkOperations.push({
            updateOne: {
              filter: { _id: questionId },
              update: { $set: questionPayload }
            }
          });
        } else {
          questionPayload.survey_id = survey._id;
          questionBulkOperations.push({
            insertOne: {
              document: questionPayload
            }
          });
        }
      }

      if (existingQuestionIds.size) {
        questionBulkOperations.push({
          deleteMany: {
            filter: { _id: { $in: [...existingQuestionIds.keys()].map(toObjectId) } }
          }
        });
      }

      if (questionBulkOperations.length) {
        await SurveysQuestion.bulkWrite(questionBulkOperations, { ordered: false });

        const questionIds = await SurveysQuestion.find({ survey_id: survey._id })
          .select('_id')
          .distinct('_id');
        await AppSurveys.updateOne({ _id: survey._id }, { $set: { questions: questionIds } });
      }

      if (!skipApproval && survey.survey_type !== SURVEY_TYPE.DRAFT) {
        const isTemplate = survey.survey_type === SURVEY_TYPE.TEMPLATE;
        const contentData = {
          content_type_id: survey._id,
          content_type: CONTENT_TYPE.SURVEY,
          display_name: payload.surveyTitle.trim(),
          content_status: CONTENT_STATUS.DRAFT,
          created_by: req.authAdminId,
          updated_by: req.authAdminId,
          comments: []
        };
        const existingApproval = await ContentApproval.findOne({
          content_type_id: survey._id
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

        if (!updateExistingApproval) {
          const contentTypeText =
            CONTENT_TYPE_MAPPING[CONTENT_TYPE.SURVEY] + (isTemplate ? ' Template' : '');
          await updateContentUploadedNotification(
            req.authAdminName,
            req.authAdminId,
            survey._id,
            CONTENT_TYPE.SURVEY,
            {
              title: CONTENT_APPROVAL_REQUEST(contentTypeText),
              message: `${req.authAdminName} ${CONTENT_APPROVAL_MESSAGE.REQUEST(contentTypeText)}`,
              notificationType: NOTIFICATION_TYPE.CONTENT_APPROVAL_REQUEST,
              email: {
                titleButton: 'Go to approval',
                titleButtonUrl: `${getAdminPlatformURL()}/view-survey/${survey._id}?type=approval`,
                thirdLine: `${req.authAdminName} ${CONTENT_APPROVAL_MESSAGE.REQUEST(contentTypeText)} on shoorah admin panel. click the go to approval button to go to website. `
              }
            }
          );
        }
      }

      if (skipApproval && survey.survey_type === SURVEY_TYPE.SURVEY) {
        sendSurveyNotificationsToUsers('Shoorah', req.authAdminId, survey.scope);
      }

      return Response.successResponseWithoutData(
        res,
        res.__('editSurveySuccess'),
        SUCCESS,
        extraMetaData
      );
    } catch (e) {
      console.error(e);
      return Response.internalServerErrorResponse(res);
    }
  },

  getSurveyById: async (req, res) => {
    try {
      const reqParam = req.query;
      let filterCondition = {
        _id: toObjectId(reqParam.surveyId),
        deletedAt: null
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
            approvedBy: '$approved_by.name',
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
            status: '$status',
            surveyType: '$survey_type',
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

  getAllSurveys: async (req, res) => {
    try {
      const reqParam = req.query;
      console.log(reqParam);
      const page = reqParam.page ? parseInt(reqParam.page) : PAGE;
      const perPage = reqParam.perPage ? parseInt(reqParam.perPage) : PER_PAGE;
      const skip = (page - 1) * perPage || 0;
      const sortBy = reqParam.sortBy || 'updatedAt';
      const sortOrder = reqParam.sortOrder ? parseInt(reqParam.sortOrder) : SORT_ORDER;
      const filterCondition = {
        deletedAt: null,
        status: SURVEY_STATUS.ACTIVE,
        survey_type: SURVEY_TYPE.SURVEY,
        company_id: null
      };

      if (hasValue(reqParam.surveyStatus)) {
        filterCondition.status = parseInt(reqParam.surveyStatus);
      }
      if (hasValue(reqParam.surveyType)) {
        filterCondition.survey_type = parseInt(reqParam.surveyType);
        if (filterCondition.survey_type === SURVEY_TYPE.DRAFT) {
          filterCondition.status = SURVEY_STATUS.INACTIVE;
          filterCondition.created_by = toObjectId(req.authAdminId);
        }
      }
      if (hasValue(reqParam.searchKey)) {
        filterCondition.title = { $regex: '.*' + reqParam.searchKey + '.*', $options: 'i' };
      }

      const totalRecords = await AppSurveys.countDocuments(filterCondition);

      const pipeline = [
        { $match: filterCondition },

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
        { $unwind: { path: '$approved_by', preserveNullAndEmptyArrays: true } }, // Unwind approved_by array
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

  addEditSurveyCategory: (req, res) => {
    try {
      const reqParam = req.body;
      if (req.userType !== USER_TYPE.SUPER_ADMIN && req.userType !== USER_TYPE.SUB_ADMIN) {
        return Response.errorResponseData(res, res.__('accessDenied'), RESPONSE_CODE.UNAUTHORIZED);
      }

      addEditSurveyCategoryValidation(reqParam, res, async (validate) => {
        if (validate) {
          let updateData = {
            category_name: reqParam.categoryName.trim()
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
            //   }
            // } else {
            //   return Response.internalServerErrorResponse(res);
            // }
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

  getAllSurveyCategory: async (req, res) => {
    try {
      const filterCondition = {
        status: STATUS.ACTIVE,
        company_id: null,
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

  deleteSurvey: async (req, res) => {
    try {
      const reqParam = req.query;
      const isSuperAdmin = req.userType === USER_TYPE.SUPER_ADMIN;

      const survey = await AppSurveys.findById(reqParam.surveyId).lean();

      if (!survey) {
        return Response.errorResponseData(res, res.__('surveyNotFound'), RESPONSE_CODE.NOT_FOUND);
      }

      if (!isSuperAdmin && survey.created_by.toString() !== req.authAdminId) {
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

  surveyApproval: async (req, res) => {
    try {
      const reqParam = req.body;

      const approvalToUpdate = await ContentApproval.findOne({
        content_type_id: toObjectId(reqParam.surveyId)
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
        { _id: toObjectId(reqParam.surveyId), company_id: null },
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
      await updateContentUploadedNotification(
        req.authAdminName,
        req.authAdminId,
        survey._id.toHexString(),
        CONTENT_TYPE.SURVEY,
        {
          // For queries
          userType: USER_TYPE.SUB_ADMIN,
          userId: survey.created_by,
          // For notifications
          title: CONTENT_APPROVAL_STATUS(contentTypeText, reqParam.surveyStatus, hasComment),
          message: `${req.authAdminName} ${notificationMessageMethod(contentTypeText, hasComment)}`,
          notificationType: NOTIFICATION_TYPE.CONTENT_APPROVAL_STATUS,
          email: {
            titleButton: 'Go to survey',
            titleButtonUrl: `${getAdminPlatformURL()}/pulse-survey/add-edit-survey?id=${survey._id}`,
            thirdLine: `${req.authAdminName} ${notificationMessageMethod(contentTypeText, hasComment)} on shoorah admin panel. click the go to survey button to go to website. `
          }
        }
      );

      if (
        reqParam.surveyStatus === CONTENT_STATUS.APPROVED &&
        survey.survey_type === SURVEY_TYPE.SURVEY
      ) {
        sendSurveyNotificationsToUsers('Shoorah', req.authAdminId, survey.scope);
      }

      return Response.successResponseWithoutData(res, res.__('surveyApprovalSuccess'), SUCCESS);
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  getSurveyDetail: async (req, res) => {
    try {
      const { id } = req.params;
      let filterCondition = {
        survey_id: toObjectId(id)
      };
      const pipeline = [
        { $match: filterCondition }
        // {
        //   $lookup: {
        //     from: 'survey_questions', // Collection name for 'questions'
        //     localField: 'questions',
        //     foreignField: '_id',
        //     as: 'questions'
        //   }
        // }
      ];
      const survey = await SurveysQuestion.aggregate(pipeline);
      if (survey && survey?.length) {
        return Response.successResponseData(res, survey[0], SUCCESS, res.__('getSurveySuccess'));
      } else {
        return Response.successResponseWithoutData(res, res.__('getSurveyFail'), FAIL);
      }
      // return Response.successResponseWithoutData(res, res.__('surveyApprovalSuccess'), SUCCESS);
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  }
  // sendSurveyNotification: (req, res) => {
  //   try {
  //     const reqParam = req.body;
  //     if (req.userType !== USER_TYPE.SUPER_ADMIN && req.userType !== USER_TYPE.SUB_ADMIN) {
  //       return Response.errorResponseData(res, res.__('accessDenied'), RESPONSE_CODE.UNAUTHORIZED);
  //     }
  //     getSurveyValidation(reqParam, res, async (validate) => {
  //       if (validate) {
  //         let filterCondition = {
  //           _id: toObjectId(reqParam.surveyId)
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
  //               localField: 'category',
  //               foreignField: '_id',
  //               as: 'category'
  //             }
  //           },
  //           { $unwind: '$category' }, // Unwind survey_category array
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
  //               surveyTitle: '$title',
  //               isTemplate: '$is_template',
  //               isDraft: '$is_draft',
  //               templateCategory: '$scope',
  //               notifyTime: '$notify_time',
  //               surveyArea: '$target',
  //               id: '$_id',
  //               createdOn: '$createdAt'
  //             }
  //           }
  //         ]);
  //
  //         if (survey && survey.length) {
  //           if (survey.length && survey[0].templateCategory) {
  //             await sendSurveyNotificationsToUsers(
  //               'Shoorah',
  //               req.authAdminId,
  //               survey[0].templateCategory
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
  // }
};
