'use strict';

const { Meditation, ContentApproval } = require('@models');
const Response = require('@services/Response');
const {
  addEditBreathworkValidation,
  breathworkListValidation,
  deleteBreathworkValidation,
  getBreathworkValidation
} = require('@services/adminValidations/breathworkValidation');
const {
  FAIL,
  SUCCESS,
  PAGE,
  PER_PAGE,
  CONTENT_STATUS,
  CONTENT_TYPE,
  STATUS,
  USER_TYPE,
  ADMIN_MEDIA_PATH,
  CLOUDFRONT_URL,
  SORT_BY,
  SORT_ORDER,
  INITIATE_TRANSCRIPTION_DELAY
} = require('@services/Constant');
const { toObjectId, unixTimeStamp, makeRandomDigit } = require('@services/Helper');
const { getUploadURL, removeOldImage } = require('@services/s3Services');
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
  addEditDraftMeditationValidation,
  draftMeditationListValidation
} = require('../../../services/adminValidations/meditationValidations');
const { default: axios } = require('axios');
const Ratings = require('../../../models/Rating');
const Breathwork = require('../../../models/Breathwork');
const { RecentlyPlayed } = require('../../../models');
const BreathworkInterest = require('../../../models/BreathworkInterests');
const {
  SHURU_REPORT_MESSAGES,
  MOOD_PDF_SIZE,
  NODE_ENVIRONMENT,
  BREATHWORK_NOTIFICATION_MESSAGE
} = require('../../../services/Constant');

const puppeteer = require('puppeteer');
const pug = require('pug');
const {
  addEditDraftBreathworkValidation,
  draftBreathworkListValidation,
  deletebreathworkValidation
} = require('../../../services/adminValidations/breathworkValidation');
const { getRandomItem } = require('../../../services/Helper');
const { audioToSrtHandler } = require('@services/adminServices/audioToSrtConversion');

module.exports = {
  /**
   * @description This function is used to add or edit breathwork
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  addEditBreathwork: (req, res) => {
    try {
      const reqParam = req.body;
      addEditBreathworkValidation(reqParam, res, async (validate) => {
        if (validate) {
          let updateData = {
            display_name: reqParam.breathworkName.trim(),
            breathwork_type: reqParam.breathworkType,
            description: reqParam.description,
            duration: reqParam.duration,
            // breathwork_by: reqParam.breathworkBy,
            status: reqParam.breathworkStatus,
            breathwork_category: reqParam.breathworkCategory,
            breathwork_lottie: reqParam.breathworkLottie,
            is_basic: reqParam.isBasic,
            is_draft: reqParam.isDraft || false
          };
          if (reqParam.expertId) {
            updateData = {
              ...updateData,
              expert_id: reqParam.expertId
            };
          }
          if (req.userType === USER_TYPE.SUPER_ADMIN) {
            updateData = {
              ...updateData,
              approved_by: req.authAdminId,
              approved_on: new Date()
            };
          }
          let audioPreSignUrl;
          let expertImageUrl;
          let breathworkImageUrl;
          if (reqParam.breathworkUrl) {
            const audioExtension = reqParam.breathworkUrl.split('/')[1];
            const audioName = `${unixTimeStamp(new Date())}-${makeRandomDigit(
              4
            )}.${audioExtension}`;
            audioPreSignUrl = await getUploadURL(
              reqParam.meditationUrl,
              audioName,
              ADMIN_MEDIA_PATH.BREATHWORK_AUDIO
            );
            updateData = {
              ...updateData,
              breathwork_url: audioName
            };
          }
          if (reqParam.breathworkImage) {
            const imageExtension = reqParam.breathworkImage.split('/')[1];
            const breathworkImageName = `${unixTimeStamp(new Date())}-${makeRandomDigit(
              4
            )}.${imageExtension}`;
            breathworkImageUrl = await getUploadURL(
              reqParam.breathworkImage,
              breathworkImageName,
              ADMIN_MEDIA_PATH.BREATHWORK_IMAGE
            );
            updateData = {
              ...updateData,
              breathwork_image: breathworkImageName
            };
          }
          if (reqParam.expertImage) {
            const imageExtension = reqParam.expertImage.split('/')[1];
            const expertImageName = `${unixTimeStamp(new Date())}-${makeRandomDigit(
              4
            )}.${imageExtension}`;
            expertImageUrl = await getUploadURL(
              reqParam.expertImage,
              expertImageName,
              ADMIN_MEDIA_PATH.EXPERT_IMAGES
            );
            updateData = {
              ...updateData,
              expert_image: expertImageName
            };
          }
          if (reqParam.expertName) {
            updateData = {
              ...updateData,
              expert_name: reqParam.expertName
            };
          }
          if (reqParam.isExpertImageDeleted) {
            updateData = {
              ...updateData,
              expert_image: null
            };
          }
          if (reqParam.breathworkId) {
            if (
              reqParam.approvalStatus === CONTENT_STATUS.APPROVED &&
              req.userType !== USER_TYPE.SUPER_ADMIN
            ) {
              if (!reqParam.expertImage || !reqParam.breathworkImage || !reqParam.breathworkUrl) {
                const existingMedia = await Breathwork.findOne({
                  _id: reqParam.breathworkId,
                  status: {
                    $ne: STATUS.DELETED
                  }
                }).select('expert_image breathwork_url breathwork_image');
                updateData = {
                  ...updateData,
                  expert_image: !reqParam.expertImage
                    ? existingMedia.expert_image
                    : updateData.expert_image,
                  breathwork_url: !reqParam.breathworkUrl
                    ? existingMedia.breathwork_url
                    : updateData.breathwork_url,
                  breathwork_image: !reqParam.breathworkImage
                    ? existingMedia.breathwork_image
                    : updateData.breathwork_image
                };
              }
              const newDataCondition = {
                ...updateData,
                created_by: req.authAdminId
              };
              const newData = await Breathwork.findOneAndUpdate(
                {
                  parentId: reqParam.breathworkId
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
                content_type: CONTENT_TYPE.BREATHWORK,
                display_name: reqParam.breathworkName.trim(),
                content_status: CONTENT_STATUS.DRAFT,
                created_by: req.authAdminId,
                comments: addComment
              };
              await ContentApproval.findOneAndUpdate(
                { parentId: reqParam.breathworkId },
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
                  CONTENT_TYPE.BREATHWORK
                ));

              const presignedData = {
                audioUrl: audioPreSignUrl || null,
                expertImageUrl: expertImageUrl || null,
                breathworkImageUrl: breathworkImageUrl || null
              };

              if (reqParam.breathworkUrl) {
                setTimeout(() => {
                  audioToSrtHandler(
                    newData._id,
                    CONTENT_TYPE.BREATHWORK,
                    ADMIN_MEDIA_PATH.BREATHWORK_AUDIO,
                    updateData.breathwork_url,
                    ADMIN_MEDIA_PATH.BREATHWORK_SRT
                  );
                }, INITIATE_TRANSCRIPTION_DELAY);
              }

              return Response.successResponseWithoutData(
                res,
                res.__('breathworkDetailUpdated'),
                SUCCESS,
                presignedData
              );
            } else {
              const filterData = {
                _id: reqParam.breathworkId,
                status: {
                  $ne: STATUS.DELETED
                }
              };
              const existingMedia = await Breathwork.findOne(filterData).select(
                'expert_image breathwork_url breathwork_image'
              );
              if (existingMedia) {
                if (existingMedia.breathwork_url && reqParam.breathworkUrl) {
                  await removeOldImage(
                    existingMedia.breathwork_url,
                    ADMIN_MEDIA_PATH.BREATHWORK_AUDIO,
                    res
                  );
                }
                if (
                  (existingMedia.expert_image && reqParam.expertImage) ||
                  reqParam.isExpertImageDeleted
                ) {
                  await removeOldImage(
                    existingMedia.expert_image,
                    ADMIN_MEDIA_PATH.EXPERT_IMAGES,
                    res
                  );
                }
                if (existingMedia.breathwork_image && reqParam.breathworkImage) {
                  await removeOldImage(
                    existingMedia.breathwork_image,
                    ADMIN_MEDIA_PATH.BREATHWORK_IMAGE,
                    res
                  );
                }
              }
              const breathworkData = await Breathwork.findOneAndUpdate(filterData, updateData, {
                new: true
              }).select('_id');
              if (breathworkData) {
                const filterContentCondition = {
                  content_type_id: breathworkData._id,
                  content_type: CONTENT_TYPE.BREATHWORK,
                  deletedAt: null
                };
                let updateContentCondition = {
                  display_name: reqParam.breathworkName.trim(),
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
                    breathworkData._id,
                    CONTENT_TYPE.BREATHWORK
                  ));
                const presignedData = {
                  audioUrl: audioPreSignUrl || null,
                  expertImageUrl: expertImageUrl || null,
                  breathworkImageUrl: breathworkImageUrl || null
                };

                if (reqParam.breathworkUrl) {
                  setTimeout(() => {
                    audioToSrtHandler(
                      breathworkData._id,
                      CONTENT_TYPE.BREATHWORK,
                      ADMIN_MEDIA_PATH.BREATHWORK_AUDIO,
                      updateData.breathwork_url,
                      ADMIN_MEDIA_PATH.BREATHWORK_SRT
                    );
                  }, INITIATE_TRANSCRIPTION_DELAY);
                }

                return Response.successResponseWithoutData(
                  res,
                  res.__('breathworkDetailUpdated'),
                  SUCCESS,
                  presignedData
                );
              } else {
                return Response.successResponseWithoutData(
                  res,
                  res.__('invalidBreathworkId'),
                  FAIL
                );
              }
            }
          } else {
            const newDataCondition = {
              ...updateData,
              created_by: req.authAdminId
            };

            if (reqParam.isBasic) {
              await BreathworkInterest.updateMany(
                { basic_status: true }, {
                $set: { basic_status: false }
              })
            }

            const newData = await Breathwork.create(newDataCondition);
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
                content_type: CONTENT_TYPE.BREATHWORK,
                display_name: reqParam.breathworkName.trim(),
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
                  CONTENT_TYPE.BREATHWORK
                ));
              const presignedData = {
                audioUrl: audioPreSignUrl || null,
                expertImageUrl: expertImageUrl || null,
                breathworkImageUrl: breathworkImageUrl || null
              };

              if (reqParam.breathworkUrl) {
                setTimeout(() => {
                  audioToSrtHandler(
                    newData._id,
                    CONTENT_TYPE.BREATHWORK,
                    ADMIN_MEDIA_PATH.BREATHWORK_AUDIO,
                    updateData.breathwork_url,
                    ADMIN_MEDIA_PATH.BREATHWORK_SRT
                  );
                }, INITIATE_TRANSCRIPTION_DELAY);
              }

              return Response.successResponseWithoutData(
                res,
                res.__('breathworkAddedSuccess'),
                SUCCESS,
                presignedData
              );
            } else {
              return Response.successResponseWithoutData(res, res.__('noBreathworkFound'), FAIL);
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
   * @description This function is used to get breathwork list
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  breathworkList: async (req, res) => {
    try {
      const reqParam = req.query;

      await Breathwork.updateMany({ is_draft: { $eq: null } }, { is_draft: false });

      breathworkListValidation(reqParam, res, async (validate) => {
        try {
          if (validate) {
            const page = reqParam.page ? parseInt(reqParam.page) : PAGE;
            const perPage = reqParam.perPage ? parseInt(reqParam.perPage) : PER_PAGE;
            const skip = (page - 1) * perPage || 0;
            const sortBy = reqParam.sortBy || SORT_BY;
            const sortOrder = reqParam.sortOrder ? parseInt(reqParam.sortOrder) : SORT_ORDER;

            if (reqParam.id) {
              const breathworkDetails = await Breathwork.findOne({
                _id: reqParam.id,
                status: {
                  $ne: STATUS.DELETED
                }
              })
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
                  breathworkName: '$display_name',
                  audioUrl: {
                    $concat: [
                      CLOUDFRONT_URL,
                      ADMIN_MEDIA_PATH.BREATHWORK_AUDIO,
                      '/',
                      '$breathwork_url'
                    ]
                  },
                  breathworkSrtName: '$breathwork_srt',
                  srtUrl: {
                    $concat: [CLOUDFRONT_URL, '/admins/breathworks/srt', '/', '$srt_url']
                  },
                  breathworkLottie: '$breathwork_lottie',
                  breathwork_lottie: 1,
                  duration: 1,
                  rating: 1,
                  createdOn: '$createdAt',
                  approvedOn: '$approved_on',
                  breathworkStatus: '$status',
                  description: 1,
                  breathworkBy: '$breathwork_by',
                  breathworkCategory: '$breathwork_category',
                  breathworkType: '$breathwork_type',
                  expertName: '$expert_name',
                  isBasic: '$is_basic',
                  expertImage: {
                    $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.EXPERT_IMAGES, '/', '$expert_image']
                  }
                })
                .lean();

              if (!breathworkDetails) {
                return Response.successResponseWithoutData(res, res.__('noBreathworkFound'), FAIL);
              }

              const breathwork =
                breathworkDetails && contentResponseObjTransformer(breathworkDetails);
              return Response.successResponseData(
                res,
                breathwork,
                SUCCESS,
                res.__('breathworkSuccess')
              );
            }

            let filterCondition = {};

            if (reqParam.expertId) {
              filterCondition = {
                expert_id: reqParam.expertId,
                status: {
                  $ne: STATUS.DELETED
                },
                ...(reqParam.searchKey && {
                  $or: [
                    {
                      display_name: { $regex: '.*' + reqParam.searchKey + '.*', $options: 'i' }
                    },
                    {
                      expert_name: { $regex: '.*' + reqParam.searchKey + '.*', $options: 'i' }
                    }
                  ]
                })
              };
            } else {
              const contentApprovalCondition = {
                content_type: CONTENT_TYPE.BREATHWORK,
                content_status: reqParam.approvalStatus
                  ? parseInt(reqParam.approvalStatus)
                  : {
                    $ne: CONTENT_STATUS.DRAFT
                  }
              };
              const breathworkIds = [];
              const cursor = await ContentApproval.find(contentApprovalCondition)
                .select('content_type_id')
                .cursor();
              await cursor.eachAsync((doc) => {
                breathworkIds.push(doc.content_type_id);
              });

              filterCondition = {
                _id: {
                  $in: breathworkIds
                },
                is_draft: false,
                status: {
                  $ne: STATUS.DELETED
                },
                ...(reqParam.createdBy && { created_by: toObjectId(reqParam.createdBy) }),
                ...(reqParam.searchKey && {
                  $or: [
                    {
                      display_name: { $regex: '.*' + reqParam.searchKey + '.*', $options: 'i' }
                    },
                    {
                      expert_name: { $regex: '.*' + reqParam.searchKey + '.*', $options: 'i' }
                    }
                  ]
                }),
                ...(reqParam.breathworkType && {
                  Breathwork_type: parseInt(reqParam.breathworkType)
                }),
                ...(reqParam.approvedBy && { approved_by: toObjectId(reqParam.approvedBy) }),
                ...(reqParam.breathworkStatus && { status: parseInt(reqParam.breathworkStatus) }),
                ...(reqParam.ratings > 0 && { rating: { $gte: parseInt(reqParam.ratings) } }),
                ...(reqParam.breathworkCategory && {
                  breathwork_category: { $eq: parseInt(reqParam.breathworkCategory) }
                }),

                ...(reqParam.id && { _id: toObjectId(reqParam.id) } &&
                  delete contentApprovalCondition.content_status)
              };
            }

            const totalRecords = await Breathwork.countDocuments(filterCondition);
            const breathworkDetailsList = await Breathwork.find(filterCondition)
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
              .sort({ rating: -1 })
              .sort({ [sortBy]: sortOrder })
              .skip(skip)
              .limit(perPage)
              .select({
                id: '$_id',
                display_name: '$display_name',
                audioUrl: {
                  $concat: [
                    CLOUDFRONT_URL,
                    ADMIN_MEDIA_PATH.BREATHWORK_AUDIO,
                    '/',
                    '$breathwork_url'
                  ]
                },
                breathworkSrtName: '$breathwork_srt',
                srtUrl: {
                  $concat: [CLOUDFRONT_URL, '/admins/breathworks/srt', '/', '$srt_url']
                },
                duration: 1,
                rating: 1,
                createdOn: '$createdAt',
                approvedOn: '$approved_on',
                breathworkBy: '$breathwork_by',
                breathworkCategory: '$breathwork_category',
                breathworkStatus: '$status',
                isBasic: '$is_basic',
                expertName: '$expert_name',
                expertImage: {
                  $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.EXPERT_IMAGES, '/', '$expert_image']
                }
              })
              .lean();
            const breathworks = contentResponseObjTransformerList(breathworkDetailsList);

            for await (const breathwork of breathworks) {
              let rateCondition = {
                content_id: toObjectId(breathwork._id)
              };
              const totalRateUsers = await Ratings.countDocuments(rateCondition);
              if (totalRateUsers > 0) {
                const rated = await Ratings.aggregate([
                  {
                    $match: rateCondition
                  },
                  {
                    $group: {
                      _id: null,
                      totalRatings: {
                        $sum: '$rated'
                      }
                    }
                  }
                ]);

                const averageRate =
                  totalRateUsers > 0
                    ? +Number(rated[0]?.totalRatings / totalRateUsers).toFixed(1)
                    : 0;

                await Breathwork.updateOne(
                  { _id: toObjectId(breathwork._id) },
                  {
                    $set: {
                      rating: averageRate
                    }
                  }
                );
              }
            }

            return Response.successResponseData(
              res,
              breathworks,
              SUCCESS,
              res.__('breathworkListSuccess'),
              {
                page,
                perPage,
                totalRecords
              }
            );
          }
        } catch (error) {
          console.error(error);
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      console.error(err);
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to delete breathwork
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  deleteBreathwork: (req, res) => {
    try {
      const reqParam = req.query;
      deletebreathworkValidation(reqParam, res, async (validate) => {
        if (validate) {
          const deleteCondition = {
            status: STATUS.DELETED,
            deletedAt: new Date()
          };
          const deletedData = await Breathwork.findByIdAndUpdate(
            reqParam.breathworkId,
            deleteCondition,
            { new: true }
          ).select('_id');
          if (deletedData) {
            const filterContentCondition = {
              content_type_id: reqParam.breathworkId,
              content_type: CONTENT_TYPE.BREATHWORK
            };
            await ContentApproval.findOneAndUpdate(filterContentCondition, {
              deletedAt: new Date()
            });
            return Response.successResponseWithoutData(
              res,
              res.__('breathworkDeleteSuccess'),
              SUCCESS
            );
          } else {
            return Response.successResponseWithoutData(res, res.__('noBreathworkFound'), FAIL);
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

  /**
   * @description This function is used to get breathwork details by id
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  getBreathwork: (req, res) => {
    try {
      const reqParam = req.params;
      getBreathworkValidation(reqParam, res, async (validate) => {
        if (validate) {
          const filterCondition = {
            _id: reqParam.id,
            status: {
              $ne: STATUS.DELETED
            }
          };
          const breathworkDetails = await Breathwork.findOne(filterCondition)
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
              breathworkName: '$display_name',
              audioUrl: {
                $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.BREATHWORK_AUDIO, '/', '$breathwork_url']
              },
              breathworkSrtName: '$breathwork_srt',
              srtUrl: {
                $concat: [CLOUDFRONT_URL, '/admins/breathworks/srt', '/', '$srt_url']
              },
              breathworkLottie: '$breathwork_lottie',
              breathwork_lottie: 1,
              duration: 1,
              rating: 1,
              createdOn: '$createdAt',
              approvedOn: '$approved_on',
              breathworkStatus: '$status',
              description: 1,
              breathworkBy: '$breathwork_by',
              breathworkCategory: '$breathwork_category',
              breathworkType: '$breathwork_type',
              expertName: '$expert_name',
              expertId: '$expert_id',
              isBasic: '$is_basic',
              expertImage: {
                $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.EXPERT_IMAGES, '/', '$expert_image']
              }
            })
            .lean();
          const breathwork = breathworkDetails && contentResponseObjTransformer(breathworkDetails);
          return Response.successResponseData(
            res,
            breathwork,
            SUCCESS,
            res.__('breathworkListSuccess')
          );
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  addEditDraftBreathwork: (req, res) => {
    try {
      const reqParam = req.body;
      addEditDraftBreathworkValidation(reqParam, res, async (validate) => {
        if (validate) {
          let updateData = {
            display_name: reqParam.breathworkName.trim(),
            breathwork_type: reqParam.breathworkType,
            description: reqParam.description,
            duration: reqParam.duration,
            // breathwork_by: reqParam.breathworkBy,
            status: reqParam.breathworkStatus,
            breathwork_lottie: reqParam.breathworkLottie,
            breathwork_category: reqParam.breathworkCategory,
            is_basic: reqParam.isBasic,
            is_draft: reqParam.isDraft || true
          };
          if (reqParam.expertId) {
            updateData = {
              ...updateData,
              expert_id: reqParam.expertId
            };
          }
          if (req.userType === USER_TYPE.SUPER_ADMIN) {
            updateData = {
              ...updateData,
              approved_by: req.authAdminId,
              approved_on: new Date()
            };
          }
          let audioPreSignUrl;
          let expertImageUrl;
          let breathworkImageUrl;
          if (reqParam.breathworkUrl) {
            const audioExtension = reqParam.breathworkUrl.split('/')[1];
            const audioName = `${unixTimeStamp(new Date())}-${makeRandomDigit(
              4
            )}.${audioExtension}`;
            audioPreSignUrl = await getUploadURL(
              reqParam.meditationUrl,
              audioName,
              ADMIN_MEDIA_PATH.BREATHWORK_AUDIO
            );
            updateData = {
              ...updateData,
              breathwork_url: audioName
            };
          }
          if (reqParam.breathworkImage) {
            const imageExtension = reqParam.breathworkImage.split('/')[1];
            const breathworkImageName = `${unixTimeStamp(new Date())}-${makeRandomDigit(
              4
            )}.${imageExtension}`;
            breathworkImageUrl = await getUploadURL(
              reqParam.breathworkImage,
              breathworkImageName,
              ADMIN_MEDIA_PATH.BREATHWORK_IMAGE
            );
            updateData = {
              ...updateData,
              breathwork_image: breathworkImageName
            };
          }
          if (reqParam.expertImage) {
            const imageExtension = reqParam.expertImage.split('/')[1];
            const expertImageName = `${unixTimeStamp(new Date())}-${makeRandomDigit(
              4
            )}.${imageExtension}`;
            expertImageUrl = await getUploadURL(
              reqParam.expertImage,
              expertImageName,
              ADMIN_MEDIA_PATH.EXPERT_IMAGES
            );
            updateData = {
              ...updateData,
              expert_image: expertImageName
            };
          }
          if (reqParam.expertName) {
            updateData = {
              ...updateData,
              expert_name: reqParam.expertName
            };
          }
          if (reqParam.isExpertImageDeleted) {
            updateData = {
              ...updateData,
              expert_image: null
            };
          }
          if (reqParam.breathworkId) {
            if (
              reqParam.approvalStatus === CONTENT_STATUS.APPROVED &&
              req.userType !== USER_TYPE.SUPER_ADMIN
            ) {
              if (!reqParam.expertImage || !reqParam.breathworkImage || !reqParam.breathworkUrl) {
                const existingMedia = await Breathwork.findOne({
                  _id: reqParam.breathworkId,
                  status: {
                    $ne: STATUS.DELETED
                  }
                }).select('expert_image breathwork_url breathwork_image');
                updateData = {
                  ...updateData,
                  expert_image: !reqParam.expertImage
                    ? existingMedia.expert_image
                    : updateData.expert_image,
                  breathwork_url: !reqParam.breathworkUrl
                    ? existingMedia.breathwork_url
                    : updateData.breathwork_url,
                  breathwork_image: !reqParam.breathworkImage
                    ? existingMedia.breathwork_image
                    : updateData.breathwork_image
                };
              }
              const newDataCondition = {
                ...updateData,
                created_by: req.authAdminId
              };
              const newData = await Breathwork.findOneAndUpdate(
                {
                  parentId: reqParam.breathworkId
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
                content_type: CONTENT_TYPE.BREATHWORK,
                display_name: reqParam.breathworkName.trim(),
                content_status: CONTENT_STATUS.DRAFT,
                created_by: req.authAdminId,
                comments: addComment
              };
              await ContentApproval.findOneAndUpdate(
                { parentId: reqParam.breathworkId },
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
                  CONTENT_TYPE.BREATHWORK
                ));
              const presignedData = {
                audioUrl: audioPreSignUrl || null,
                expertImageUrl: expertImageUrl || null,
                breathworkImageUrl: breathworkImageUrl || null
              };

              if (reqParam.breathworkUrl) {
                setTimeout(() => {
                  audioToSrtHandler(
                    newData._id,
                    CONTENT_TYPE.BREATHWORK,
                    ADMIN_MEDIA_PATH.BREATHWORK_AUDIO,
                    updateData.breathwork_url,
                    ADMIN_MEDIA_PATH.BREATHWORK_SRT
                  );
                }, INITIATE_TRANSCRIPTION_DELAY);
              }

              return Response.successResponseWithoutData(
                res,
                res.__('breathworkDetailUpdated'),
                SUCCESS,
                presignedData
              );
            } else {
              const filterData = {
                _id: reqParam.breathworkId,
                status: {
                  $ne: STATUS.DELETED
                }
              };
              const existingMedia = await Breathwork.findOne(filterData).select(
                'expert_image breathwork_url breathwork_image'
              );
              if (existingMedia) {
                if (existingMedia.breathwork_url && reqParam.breathworkUrl) {
                  await removeOldImage(
                    existingMedia.breathwork_url,
                    ADMIN_MEDIA_PATH.BREATHWORK_AUDIO,
                    res
                  );
                }
                if (
                  (existingMedia.expert_image && reqParam.expertImage) ||
                  reqParam.isExpertImageDeleted
                ) {
                  await removeOldImage(
                    existingMedia.expert_image,
                    ADMIN_MEDIA_PATH.EXPERT_IMAGES,
                    res
                  );
                }
                if (existingMedia.breathwork_image && reqParam.breathworkImage) {
                  await removeOldImage(
                    existingMedia.breathwork_image,
                    ADMIN_MEDIA_PATH.BREATHWORK_IMAGE,
                    res
                  );
                }
              }
              const breathworkData = await Breathwork.findOneAndUpdate(filterData, updateData, {
                new: true
              }).select('_id');
              if (breathworkData) {
                const filterContentCondition = {
                  content_type_id: breathworkData._id,
                  content_type: CONTENT_TYPE.BREATHWORK,
                  deletedAt: null
                };
                let updateContentCondition = {
                  display_name: reqParam.breathworkName.trim(),
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
                    breathworkData._id,
                    CONTENT_TYPE.BREATHWORK
                  ));
                const presignedData = {
                  audioUrl: audioPreSignUrl || null,
                  expertImageUrl: expertImageUrl || null,
                  breathworkImageUrl: breathworkImageUrl || null
                };

                if (reqParam.breathworkUrl) {
                  setTimeout(() => {
                    audioToSrtHandler(
                      breathworkData._id,
                      CONTENT_TYPE.BREATHWORK,
                      ADMIN_MEDIA_PATH.BREATHWORK_AUDIO,
                      updateData.breathwork_url,
                      ADMIN_MEDIA_PATH.BREATHWORK_SRT
                    );
                  }, INITIATE_TRANSCRIPTION_DELAY);
                }

                return Response.successResponseWithoutData(
                  res,
                  res.__('breathworkDetailUpdated'),
                  SUCCESS,
                  presignedData
                );
              } else {
                return Response.successResponseWithoutData(
                  res,
                  res.__('invalidBreathworkId'),
                  FAIL
                );
              }
            }
          } else {
            const newDataCondition = {
              ...updateData,
              created_by: req.authAdminId
            };
            const newData = await Breathwork.create(newDataCondition);
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
                content_type: CONTENT_TYPE.BREATHWORK,
                display_name: reqParam.breathworkName.trim(),
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
                  CONTENT_TYPE.BREATHWORK
                ));
              const presignedData = {
                audioUrl: audioPreSignUrl || null,
                expertImageUrl: expertImageUrl || null,
                breathworkImageUrl: breathworkImageUrl || null
              };

              if (reqParam.breathworkUrl) {
                setTimeout(() => {
                  audioToSrtHandler(
                    newData._id,
                    CONTENT_TYPE.BREATHWORK,
                    ADMIN_MEDIA_PATH.BREATHWORK_AUDIO,
                    updateData.breathwork_url,
                    ADMIN_MEDIA_PATH.BREATHWORK_SRT
                  );
                }, INITIATE_TRANSCRIPTION_DELAY);
              }

              return Response.successResponseWithoutData(
                res,
                res.__('breathworkDraftSuccess'),
                SUCCESS,
                presignedData
              );
            } else {
              return Response.successResponseWithoutData(res, res.__('noBreathworkFound'), FAIL);
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

  draftBreathworkList: async (req, res) => {
    try {
      const reqParam = req.query;
      await Breathwork.updateMany({ is_draft: { $eq: null } }, { is_draft: false });
      draftBreathworkListValidation(reqParam, res, async (validate) => {
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
              $or: [
                {
                  display_name: { $regex: '.*' + reqParam.searchKey + '.*', $options: 'i' }
                },
                {
                  expert_name: { $regex: '.*' + reqParam.searchKey + '.*', $options: 'i' }
                }
              ]
            }),
            ...(reqParam.BreathworkType && { Breathwork_type: parseInt(reqParam.BreathworkType) }),
            ...(reqParam.approvedBy && { approved_by: toObjectId(reqParam.approvedBy) }),
            ...(reqParam.BreathworkStatus && { status: parseInt(reqParam.BreathworkStatus) }),
            ...(reqParam.ratings > 0 && { rating: { $gte: parseInt(reqParam.ratings) } }),
            ...(reqParam.breathworkCategory && {
              breathwork_category: { $eq: parseInt(reqParam.breathworkCategory) }
            }),

            ...(reqParam.id && { _id: toObjectId(reqParam.id) } &&
              delete contentApprovalCondition.content_status)
          };
          const totalRecords = await Breathwork.countDocuments(filterCondition);
          const breathworkDetailsList = await Breathwork.find(filterCondition)
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
            .sort({ rating: -1 })
            .sort({ [sortBy]: sortOrder })
            .skip(skip)
            .limit(perPage)
            .select({
              id: '$_id',
              breathworkName: '$display_name',
              breathworkUrl: {
                $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.BREATHWORK_AUDIO, '/', '$breathwork_url']
              },
              srtUrl: {
                $concat: [CLOUDFRONT_URL, '/admins/breathwork/srt', '/', '$srt_url']
              },
              duration: 1,
              breathworkLottie: '$breathwork_lottie',
              rating: 1,
              createdOn: '$createdAt',
              approvedOn: '$approved_on',
              breathworkBy: '$breathwork_by',
              breathworkCategory: '$breathwork_category',
              breathworkStatus: '$status',
              isBasic: '$is_basic',
              expertName: '$expert_name',
              expertImage: {
                $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.EXPERT_IMAGES, '/', '$expert_image']
              }
            })
            .lean();
          const breathworks = contentResponseObjTransformerList(breathworkDetailsList);

          for await (const breathwork of breathworks) {
            let rateCondition = {
              content_id: toObjectId(breathwork._id)
            };
            const totalRateUsers = await Ratings.countDocuments(rateCondition);
            if (totalRateUsers > 0) {
              const rated = await Ratings.aggregate([
                {
                  $match: rateCondition
                },
                {
                  $group: {
                    _id: null,
                    totalRatings: {
                      $sum: '$rated'
                    }
                  }
                }
              ]);

              const averageRate =
                totalRateUsers > 0
                  ? +Number(rated[0]?.totalRatings / totalRateUsers).toFixed(1)
                  : 0;

              await Breathwork.updateOne(
                { _id: toObjectId(breathwork._id) },
                {
                  $set: {
                    rating: averageRate
                  }
                }
              );
            }
          }

          return Response.successResponseData(
            res,
            breathworks,
            SUCCESS,
            res.__('breathworkListSuccess'),
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
  },

  getBreathworkInsights: async (req, res) => {
    try {
      const filterCondition = {
        content_type: CONTENT_TYPE.BREATHWORK,
        deletedAt: null
      };

      let sessions = await RecentlyPlayed.find(filterCondition).countDocuments();
      let usersBreathworks = await BreathworkInterest.find();
      let duration = 0;
      if (usersBreathworks.length) {
        for (const i of usersBreathworks) {
          duration += i.sessions_durations;
        }
      }

      let resObj = {
        sessions,
        duration: duration ? Math.round(duration / 3600) : 0
      };

      return Response.successResponseData(
        res,
        resObj,
        SUCCESS,
        res.__('breathworkInsightsSuccess')
      );
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  addSolutionBreathwork: async (req, res) => {
    try {
      let { solutionData, startDate, endDate } = req.body;

      solutionData = solutionData.replace(/\n/g, '<br>');

      const locals = {
        name: 'Shoorah',
        graphName: 'Breathwork Insights',
        solutionData: solutionData,
        department: null,

        fromDate: new Date(startDate).toLocaleDateString('en-gb', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }),
        toDate: new Date(endDate).toLocaleDateString('en-gb', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }),
        happySmallIcon: process.env.PDF_HAPPY_SMALL_ICON,
        sadSmallIcon: process.env.PDF_SAD_SMALL_ICON,
        finalIcon: process.env.PDF_HAPPY_ICON,
        finalIconText: '',
        finalMessage:
          SHURU_REPORT_MESSAGES[Math.floor(Math.random() * SHURU_REPORT_MESSAGES.length)]
      };

      const compiledFunction = pug.compileFile('src/views/solution.pug');
      const html = compiledFunction(locals);
      const browser = await puppeteer.launch({
        executablePath:
          process.env.NODE_ENV === NODE_ENVIRONMENT.DEVELOPMENT ? null : '/usr/bin/google-chrome',
        ignoreDefaultArgs: ['--disable-extensions'],
        headless: true,
        args: ['--no-sandbox', '--disabled-setupid-sandbox']
      });
      const page = await browser.newPage();
      await page.setContent(html);
      const pdf = await page.pdf({
        format: MOOD_PDF_SIZE,
        printBackground: true
      });
      await browser.close();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=file.pdf');
      res.setHeader('Content-Length', pdf.length);

      return res.send(pdf);
    } catch (error) {
      console.error('Error in adding/updating solution:', error);
      return Response.internalServerErrorResponse(res);
    }
  },

  addReportBreathwork: async (req, res) => {
    try {
      let { reportData, startDate, endDate } = req.body;

      const breathworkMessage = getRandomItem(BREATHWORK_NOTIFICATION_MESSAGE);
      const breathworkMessage2 = getRandomItem(BREATHWORK_NOTIFICATION_MESSAGE);

      const locals = {
        name: 'Shoorah',
        graphName: 'Breathwork Report',
        reportData: reportData,
        breathworkMessage,
        breathworkMessage2,
        fromDate: new Date(startDate).toLocaleDateString('en-gb', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }),
        toDate: new Date(endDate).toLocaleDateString('en-gb', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }),
        happySmallIcon: process.env.PDF_HAPPY_SMALL_ICON,
        sadSmallIcon: process.env.PDF_SAD_SMALL_ICON,
        finalIcon: process.env.PDF_HAPPY_ICON,
        finalIconText: '',
        finalMessage:
          SHURU_REPORT_MESSAGES[Math.floor(Math.random() * SHURU_REPORT_MESSAGES.length)]
      };

      const compiledFunction = pug.compileFile('src/views/breathwork-report.pug');
      const html = compiledFunction(locals);
      const browser = await puppeteer.launch({
        executablePath:
          process.env.NODE_ENV === NODE_ENVIRONMENT.DEVELOPMENT ? null : '/usr/bin/google-chrome',
        ignoreDefaultArgs: ['--disable-extensions'],
        headless: true,
        args: ['--no-sandbox', '--disabled-setupid-sandbox']
      });
      const page = await browser.newPage();
      await page.setContent(html);
      const pdf = await page.pdf({
        format: MOOD_PDF_SIZE,
        printBackground: true
      });
      await browser.close();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=file.pdf');
      res.setHeader('Content-Length', pdf.length);

      return res.send(pdf);
    } catch (error) {
      console.error('Error in adding/updating report:', error);
      return Response.internalServerErrorResponse(res);
    }
  }
};
