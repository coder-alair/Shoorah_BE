'use strict';

const {
  ContentApproval,
  Focus,
  Survey,
  Idea,
  Affirmation,
  Meditation,
  Sound,
  Gratitude,
  Ritual,
  ShoorahPods
} = require('@models');
const Response = require('@services/Response');
const {
  contentApprovalListValidation,
  contentApprovalValidation,
  getContentDetailsValidation
} = require('@services/adminValidations/contentApprovalValidations');
const {
  PAGE,
  PER_PAGE,
  SUCCESS,
  FAIL,
  CONTENT_TYPE,
  CONTENT_STATUS,
  CONTENT_APPROVAL_MESSAGE,
  CONTENT_APPROVAL_TITLE,
  NOTIFICATION_ACTION,
  SORT_BY,
  SORT_ORDER,
  STATUS,
  USER_TYPE,
  RESPONSE_CODE,
  CLOUDFRONT_URL,
  ADMIN_MEDIA_PATH
} = require('@services/Constant');
const { sendNotification } = require('@services/Notify');
const { toObjectId, dynamicModelName } = require('@services/Helper');
const {
  createContentApprovalStatusNotification
} = require('@services/adminServices/contentApprovalServices');
const {
  contentResponseObjTransformerList
} = require('@services/adminServices/contentManagementServices');
const AppSurveys = require('../../../models/AppSurveys');
const { SURVEY_APPROVAL_TITLE, SURVEY_REPORTED } = require('../../../services/Constant');
const { createB2BContentApprovalStatusNotification } = require('../../../services/adminServices/companyStatusNotify');

module.exports = {
  /**
   * @description This function is used to get list of content approval data
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  b2BContentApprovalList: (req, res) => {
    try {
      if (req.userType !== USER_TYPE.COMPANY_ADMIN) {
        return Response.errorResponseData(res, res.__('accessDenied'), RESPONSE_CODE.UNAUTHORIZED);
      }

      const reqParam = req.query;
      contentApprovalListValidation(reqParam, res, async (validate) => {
        await ContentApproval.updateMany({ company_id: { $exists: false } }, { company_id: null });
        if (validate) {
          const page = reqParam.page ? parseInt(reqParam.page) : PAGE;
          const perPage = reqParam.perPage ? parseInt(reqParam.perPage) : PER_PAGE;
          const skip = (page - 1) * perPage || 0;
          const sortBy = reqParam.sortBy || SORT_BY;
          const sortOrder = reqParam.sortOrder ? parseInt(reqParam.sortOrder) : SORT_ORDER;
          const filterCondition = {
            deletedAt: null,
            content_type: CONTENT_TYPE.SURVEY,
            company_id: toObjectId(req.authCompanyId),
            ...(reqParam.searchKey && {
              display_name: { $regex: '.*' + reqParam.searchKey + '.*', $options: 'i' }
            }),
            ...(reqParam.id && { _id: toObjectId(reqParam.id) }),
            ...(reqParam.contentStatus && { content_status: parseInt(reqParam.contentStatus) }),
            ...(reqParam.createdBy && { created_by: toObjectId(reqParam.createdBy) }),
            ...(reqParam.updatedBy && { updated_by: toObjectId(reqParam.updatedBy) })
          };
          const totalRecords = await ContentApproval.countDocuments(filterCondition);
          const contentData = await ContentApproval.find(filterCondition)
            .populate({
              path: 'created_by',
              select: 'name'
            })
            .populate({ path: 'updated_by', select: 'name' })
            .sort({ [sortBy]: sortOrder })
            .skip(skip)
            .limit(perPage)
            .select({
              contentType: '$content_type',
              displayName: '$display_name',
              createdOn: '$createdAt',
              updatedOn: '$updated_on',
              id: '$_id',
              contentId: '$content_type_id',
              content_type_id: 1,
              content_type: 1,
              parentId: 1,
              contentStatus: '$content_status'
            })
            .lean();
          const content = contentResponseObjTransformerList(contentData);

          for (const item of content) {
            const lookupModel = await dynamicModelName(item.content_type);
            const aggregationCondition = [
              {
                $match: {
                  deletedAt: null,
                  _id: toObjectId(item._id)
                }
              },
              {
                $lookup: {
                  from: lookupModel,
                  pipeline: [
                    {
                      $match: {
                        _id: toObjectId(item.content_type_id)
                      }
                    },
                    {
                      $limit: 1
                    },
                    {
                      $project: {
                        expertName: '$expert_name'
                      }
                    }
                  ],
                  as: 'content'
                }
              },
              {
                $unwind: {
                  path: '$content',
                  preserveNullAndEmptyArrays: false
                }
              },
              {
                $project: {
                  expertName: '$content.expertName'
                }
              }
            ];
            const contentDetail = await ContentApproval.aggregate(aggregationCondition);
            item.expertName = contentDetail[0]?.expertName || null;
          }

          return Response.successResponseData(res, content, SUCCESS, res.__('contentListSuccess'), {
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
   * @description This function is used to update content approval status
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  b2bContentApproval: (req, res) => {
    try {
      if (req.userType !== USER_TYPE.COMPANY_ADMIN) {
        return Response.errorResponseData(res, res.__('accessDenied'), RESPONSE_CODE.UNAUTHORIZED);
      }
      const reqParam = req.body;
      contentApprovalValidation(reqParam, res, async (validate) => {
        if (validate) {
          let updateContentData = {
            content_status: reqParam.contentStatus,
            updated_by: req.authAdminId,
            updated_on: new Date()
          };
          let addComment;
          if (reqParam.comment) {
            addComment = {
              comment: reqParam.comment.trim(),
              commented_by: req.authAdminId,
              commented_on: new Date(),
              content_status: reqParam.contentStatus
            };
          }
          if (reqParam.contentStatus === CONTENT_STATUS.APPROVED) {
            addComment = {
              comment: null,
              commented_by: req.authAdminId,
              commented_on: new Date(),
              content_status: reqParam.contentStatus
            };
          }
          updateContentData = {
            ...updateContentData,
            $push: { comments: addComment }
          };
          const filterData = {
            _id: reqParam.id,
            deletedAt: null
          };
          const updatedData = await ContentApproval.findOneAndUpdate(
            filterData,
            updateContentData,
            {
              new: true
            }
          ).populate({
            path: 'created_by',
            select: '_id',
            populate: {
              path: 'deviceToken',
              select: 'device_token'
            }
          });

          if (updatedData) {
            let contentName = 'Focus';
            if (reqParam.contentStatus === CONTENT_STATUS.APPROVED) {
              if (updatedData.parentId) {
                const updateContentApproval = {
                  display_name: updatedData.display_name,
                  focus_ids: updatedData.focus_ids,
                  content_status: updatedData.content_status,
                  comments: updatedData.comments,
                  updated_by: updatedData.updated_by,
                  updated_on: updatedData.updated_on
                };
                await ContentApproval.bulkWrite([
                  {
                    updateOne: {
                      filter: { content_type_id: updatedData.parentId },
                      update: updateContentApproval
                    }
                  },
                  {
                    deleteOne: { filter: { parentId: updatedData.parentId } }
                  }
                ]);
              }
              let updateData = {
                approved_by: req.authAdminId,
                approved_on: new Date(),
                status: updatedData.content_status,
                parentId: null
              };
              switch (updatedData.content_type) {
                case CONTENT_TYPE.SURVEY:
                  contentName = 'Survey';

                  if (updatedData.parentId) {
                    const latestData = await AppSurveys.findOne({
                      parentId: updatedData.parentId
                    }).select('-_id -parentId -approved_by -approved_on');
                    updateData = {
                      ...updateData,
                      ...latestData._doc
                    };
                  }
                  await AppSurveys.bulkWrite([
                    {
                      updateOne: {
                        filter: {
                          _id: updatedData.content_type_id
                        },
                        update: updateData
                      }
                    },
                    // {
                    //   deleteOne: { filter: { parentId: updatedData.parentId } }
                    // }
                  ]);
                  break;
                default:
                  return Response.successResponseWithoutData(
                    res,
                    res.__('noContentTypeFound'),
                    FAIL
                  );
              }
            }
            const deviceTokens = updatedData.created_by.deviceToken.map((x) => x.device_token);
            const notifyObj = {
              title: SURVEY_APPROVAL_TITLE,
              message:
                req.authAdminName +
                (reqParam.contentStatus === CONTENT_STATUS.APPROVED
                  ? SURVEY_REPORTED.APPROVE + ' - ' + contentName
                  : reqParam.contentStatus === CONTENT_STATUS.REJECTED
                    ? SURVEY_REPORTED.REJECTED + ' - ' + contentName
                    : SURVEY_REPORTED.DRAFT + ' - ' + contentName),
              from_user_id: req.authAdminId,
              to_user_ids: updatedData.created_by._id,
              company_id: toObjectId(req.authCompanyId),
              content_id: updatedData.parentId ? updatedData.parentId : updatedData.content_type_id,
              content_type: updatedData.content_type
            };
            const newNotifyData = await createB2BContentApprovalStatusNotification(notifyObj);
            if (deviceTokens.length > 0) {
              const reqData = {
                title: process.env.APP_NAME,
                message: newNotifyData.message,
                notificationType: newNotifyData.type
              };
              await sendNotification(
                deviceTokens,
                reqData.message,
                reqData,
                NOTIFICATION_ACTION.MAIN_ACTIVITY
              );
            }
            return Response.successResponseWithoutData(
              res,
              res.__('contentStatusUpdated'),
              SUCCESS
            );
          } else {
            return Response.successResponseWithoutData(res, res.__('noContentFound'), FAIL);
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
   * @description This function is used to get content details by its id and content type
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  b2bGetContentDetails: (req, res) => {
    try {
      const reqParam = req.params;
      getContentDetailsValidation(reqParam, res, async (validate) => {
        if (validate) {
          reqParam.contentType = 8;
          const lookupModel = await dynamicModelName(reqParam.contentType);

          if (parseInt(reqParam.contentType) == 8) {
            let filterCondition = {
              _id: toObjectId(reqParam.contentId),
              company_id: toObjectId(req.authCompanyId),
            };

            const approval = await ContentApproval.aggregate([
              {
                $match: {
                  deletedAt: null,
                  content_type: reqParam.contentType,
                  company_id: toObjectId(req.authCompanyId),
                  content_type_id: toObjectId(reqParam.contentId)
                }
              },
              {
                $unwind: "$comments"
              },
              {
                $lookup: {
                  from: "users",
                  localField: "comments.commented_by",
                  foreignField: "_id",
                  as: "commented_by_user"
                }
              },
              {
                $unwind: {
                  path: "$commented_by_user",
                  preserveNullAndEmptyArrays: true
                }
              },
              {
                $group: {
                  _id: "$_id",
                  updated_by: { $first: "$updated_by" },
                  content_status: { $first: "$content_status" },
                  comments: {
                    $push: {
                      comment: "$comments.comment",
                      commented_by: "$commented_by_user.name", // Use the user's name
                      commented_on: "$comments.commented_on",
                      content_status: "$comments.content_status",
                      _id: "$comments._id"
                    }
                  }
                }
              },
              {
                $project: {
                  _id: 1,
                  updated_by: 1,
                  content_status: 1,
                  comments: 1
                }
              }
            ]);

            const survey = await AppSurveys.aggregate([
              { $match: filterCondition },
              {
                $lookup: {
                  from: 'users', // Collection name for 'created_by'
                  localField: 'created_by',
                  foreignField: '_id',
                  as: 'created_by',
                },
              },
              { $unwind: '$created_by' }, // Unwind created_by array
              {
                $lookup: {
                  from: 'users', // Collection name for 'approved_by'
                  localField: 'approved_by',
                  foreignField: '_id',
                  as: 'approved_by',
                },
              },
              { $unwind: { path: '$approved_by', preserveNullAndEmptyArrays: true } }, // Unwind approved_by array
              {
                $lookup: {
                  from: 'app_survey_categories', // Collection name for 'survey_category'
                  localField: 'survey_category',
                  foreignField: '_id',
                  as: 'survey_category',
                },
              },
              { $unwind: { path: '$survey_category', preserveNullAndEmptyArrays: true } }, // Unwind survey_category array
              {
                $lookup: {
                  from: 'survey_questions', // Collection name for 'questions'
                  localField: 'questions',
                  foreignField: '_id',
                  as: 'questions',
                },
              },
              {
                $project: {
                  surveyTitle: '$survey_title',
                  createdBy: {
                    id: '$created_by._id', // Get the ID from created_by
                    name: '$created_by.name' // Get the name from created_by
                  },
                  surveyCategory: '$survey_category._id',
                  approvedBy: {
                    id: '$approved_by._id', // Get the ID from created_by
                    name: '$approved_by.name' // Get the name from created_by
                  },
                  questions: '$questions',
                  status: '$status',
                  isTemplate: '$is_template',
                  isDraft: '$is_draft',
                  surveyLogo: {
                    $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.SURVEY_LOGO, '/', '$survey_logo']
                  },
                  surveyImage: {
                    $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.SURVEY_IMAGE, '/', '$survey_image']
                  },
                  templateCategory: '$template_category',
                  notifyTime: '$notify_time',
                  surveyArea: '$survey_area',
                  surveyDuration: '$survey_duration',
                  approvedOn: '$approved_on',
                  surveyId: '$_id',
                  createdOn: '$createdAt',
                  _id: 0
                },
              },
            ]);

            if (survey && survey?.length) {
              survey[0].id = approval.length ? approval[0]?._id : null;
              survey[0].updatedBy = approval.length ? approval[0]?.updated_by : null;
              survey[0].contentStatus = approval.length ? approval[0]?.content_status : 0;
              survey[0].comments = approval.length ? approval[0]?.comments : [];

              return Response.successResponseData(
                res,
                survey[0],
                SUCCESS,
                res.__('getSurveySuccess'),
              );
            } else {
              return Response.successResponseWithoutData(
                res,
                res.__('getSurveyFail'),
                FAIL,
              );
            }

          } else {
            const aggregationCondition = [
              {
                $match: {
                  deletedAt: null,
                  content_type: reqParam.contentType,
                  content_type_id: toObjectId(reqParam.contentId)
                }
              },
              {
                $lookup: {
                  from: 'users',
                  let: {
                    createdById: '$created_by'
                  },
                  pipeline: [
                    {
                      $match: {
                        $expr: {
                          $eq: ['$$createdById', '$_id']
                        }
                      }
                    },
                    {
                      $limit: 1
                    },
                    {
                      $project: {
                        name: 1
                      }
                    }
                  ],
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
                  let: {
                    updatedById: '$updated_by'
                  },
                  pipeline: [
                    {
                      $match: {
                        $expr: {
                          $eq: ['$$updatedById', '$_id']
                        }
                      }
                    },
                    {
                      $limit: 1
                    },
                    {
                      $project: {
                        name: 1
                      }
                    }
                  ],
                  as: 'updatedBy'
                }
              },
              {
                $unwind: {
                  path: '$updatedBy',
                  preserveNullAndEmptyArrays: true
                }
              },
              {
                $unwind: {
                  path: '$comments',
                  preserveNullAndEmptyArrays: true
                }
              },
              {
                $lookup: {
                  from: 'users',
                  let: {
                    commentedBy: '$comments.commented_by'
                  },
                  pipeline: [
                    {
                      $match: {
                        $expr: {
                          $eq: ['$$commentedBy', '$_id']
                        }
                      }
                    },
                    {
                      $limit: 1
                    },
                    {
                      $project: {
                        name: 1
                      }
                    }
                  ],
                  as: 'comments.commented_by'
                }
              },
              {
                $unwind: {
                  path: '$comments.commented_by',
                  preserveNullAndEmptyArrays: true
                }
              },
              {
                $sort: {
                  'comments.commented_on': -1
                }
              },
              {
                $group: {
                  _id: '$_id',
                  comments: {
                    $push: {
                      comment: '$comments.comment',
                      commented_by: '$comments.commented_by.name',
                      commented_on: '$comments.commented_on',
                      content_status: '$comments.content_status'
                    }
                  },
                  focus: {
                    $first: '$focus_ids'
                  },
                  contentType: {
                    $first: '$content_type'
                  },
                  contentStatus: {
                    $first: '$content_status'
                  },
                  createdOn: {
                    $first: '$createdAt'
                  },
                  updatedOn: {
                    $first: '$updated_on'
                  },
                  createdBy: {
                    $first: '$createdBy'
                  },
                  updatedBy: {
                    $first: '$updatedBy'
                  },
                  updatedAt: {
                    $first: '$updatedAt'
                  },
                  parentId: {
                    $first: '$parentId'
                  },
                  contentId: {
                    $first: '$content_type_id'
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
                $lookup: {
                  from: lookupModel,
                  pipeline: [
                    {

                      $match: {
                        _id: toObjectId(reqParam.contentId)
                      }
                    },
                    {
                      $limit: 1
                    },
                    {
                      $project: {
                        displayName: '$display_name',
                        focusType: '$focus_type',
                        parentId: 1,
                        url: {
                          $switch: {
                            branches: [
                              {
                                case: { $eq: [reqParam.contentType, CONTENT_TYPE.MEDITATION] },
                                then: {
                                  $concat: [
                                    CLOUDFRONT_URL,
                                    ADMIN_MEDIA_PATH.MEDITATION_AUDIO,
                                    '/',
                                    '$meditation_url'
                                  ]
                                }
                              },
                              {
                                case: { $eq: [reqParam.contentType, CONTENT_TYPE.SOUND] },
                                then: {
                                  $concat: [
                                    CLOUDFRONT_URL,
                                    ADMIN_MEDIA_PATH.SOUND_AUDIO,
                                    '/',
                                    '$sound_url'
                                  ]
                                }
                              },
                              {
                                case: { $eq: [reqParam.contentType, CONTENT_TYPE.SHOORAH_PODS] },
                                then: {
                                  $concat: [
                                    CLOUDFRONT_URL,
                                    ADMIN_MEDIA_PATH.SHOORAH_PODS_AUDIO,
                                    '/',
                                    '$pods_url'
                                  ]
                                }
                              }
                            ],
                            default: null
                          }
                        },
                        image: {
                          $switch: {
                            branches: [
                              {
                                case: { $eq: [reqParam.contentType, CONTENT_TYPE.MEDITATION] },
                                then: {
                                  $concat: [
                                    CLOUDFRONT_URL,
                                    ADMIN_MEDIA_PATH.MEDITATION_IMAGE,
                                    '/',
                                    '$meditation_image'
                                  ]
                                }
                              },
                              {
                                case: { $eq: [reqParam.contentType, CONTENT_TYPE.SOUND] },
                                then: {
                                  $concat: [
                                    CLOUDFRONT_URL,
                                    ADMIN_MEDIA_PATH.SOUND_IMAGES,
                                    '/',
                                    '$sound_image'
                                  ]
                                }
                              },
                              {
                                case: { $eq: [reqParam.contentType, CONTENT_TYPE.SHOORAH_PODS] },
                                then: {
                                  $concat: [
                                    CLOUDFRONT_URL,
                                    ADMIN_MEDIA_PATH.SHOORAH_PODS_IMAGE,
                                    '/',
                                    '$pods_image'
                                  ]
                                }
                              }
                            ],
                            default: null
                          }
                        },
                        contentBy: {
                          $switch: {
                            branches: [
                              {
                                case: { $eq: [reqParam.contentType, CONTENT_TYPE.MEDITATION] },
                                then: '$meditation_by'
                              },
                              {
                                case: { $eq: [reqParam.contentType, CONTENT_TYPE.SOUND] },
                                then: '$sound_by'
                              },
                              {
                                case: { $eq: [reqParam.contentType, CONTENT_TYPE.SHOORAH_PODS] },
                                then: '$pods_by'
                              }
                            ],
                            default: null
                          }
                        },
                        duration: 1,
                        description: 1,
                        expertName: '$expert_name',
                        expertImage: {
                          $concat: [
                            CLOUDFRONT_URL,
                            ADMIN_MEDIA_PATH.EXPERT_IMAGES,
                            '/',
                            '$expert_image'
                          ]
                        }
                      }
                    }
                  ],
                  as: 'content'
                }
              },
              {
                $unwind: {
                  path: '$content',
                  preserveNullAndEmptyArrays: true
                }
              },
              {
                $project: {
                  displayName: '$content.displayName',
                  url: '$content.url',
                  image: '$content.image',
                  duration: '$content.duration',
                  description: '$content.description',
                  expertName: '$content.expertName',
                  expertImage: '$content.expertImage',
                  contentBy: '$content.contentBy',
                  focusType: '$content.focusType',
                  contentType: 1,
                  createdOn: 1,
                  comments: 1,
                  updatedOn: 1,
                  'createdBy.id': '$createdBy._id',
                  'createdBy.name': 1,
                  'updatedBy.id': '$updatedBy._id',
                  'updatedBy.name': '$updatedBy.name',
                  'focus.display_name': 1,
                  'focus._id': 1,
                  id: '$_id',
                  _id: 0,
                  updatedAt: 1,
                  parentId: 1,
                  contentStatus: 1,
                  contentId: 1
                }
              }
            ];
            const contentDetail = await ContentApproval.aggregate(aggregationCondition);

            return Response.successResponseData(
              res,
              contentDetail[0] || [],
              SUCCESS,
              res.__('contentListSuccess')
            );
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
