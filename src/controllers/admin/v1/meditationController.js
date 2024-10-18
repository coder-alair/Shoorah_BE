'use strict';

const { Meditation, ContentApproval } = require('@models');
const Response = require('@services/Response');
const {
  addEditMeditationValidation,

  deleteMeditationValidation,
  getMeditationValidation
} = require('@services/adminValidations/meditationValidations');
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
const { audioToSrtHandler } = require('@services/adminServices/audioToSrtConversion');

module.exports = {
  /**
   * @description This function is used to add or edit meditation
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  addEditMeditation: (req, res) => {
    try {
      const reqParam = req.body;
      addEditMeditationValidation(reqParam, res, async (validate) => {
        if (validate) {
          let updateData = {
            display_name: reqParam.meditationName.trim(),
            meditation_type: reqParam.meditationType,
            description: reqParam.description,
            duration: reqParam.duration,
            focus_ids: reqParam.focusIds,
            // meditation_by: reqParam.meditationBy,
            status: reqParam.meditationStatus,
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
          let meditationImageUrl;
          if (reqParam.meditationUrl) {
            const audioExtension = reqParam.meditationUrl.split('/')[1];
            const audioName = `${unixTimeStamp(new Date())}-${makeRandomDigit(
              4
            )}.${audioExtension}`;
            audioPreSignUrl = await getUploadURL(
              reqParam.meditationUrl,
              audioName,
              ADMIN_MEDIA_PATH.MEDITATION_AUDIO
            );
            updateData = {
              ...updateData,
              meditation_url: audioName
            };
          }
          if (reqParam.meditationImage) {
            const imageExtension = reqParam.meditationImage.split('/')[1];
            const meditationImageName = `${unixTimeStamp(new Date())}-${makeRandomDigit(
              4
            )}.${imageExtension}`;
            meditationImageUrl = await getUploadURL(
              reqParam.meditationImage,
              meditationImageName,
              ADMIN_MEDIA_PATH.MEDITATION_IMAGE
            );
            updateData = {
              ...updateData,
              meditation_image: meditationImageName
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
          if (reqParam.meditationId) {
            if (
              reqParam.approvalStatus === CONTENT_STATUS.APPROVED &&
              req.userType !== USER_TYPE.SUPER_ADMIN
            ) {
              if (!reqParam.expertImage || !reqParam.meditationImage || !reqParam.meditationUrl) {
                const existingMedia = await Meditation.findOne({
                  _id: reqParam.meditationId,
                  status: {
                    $ne: STATUS.DELETED
                  }
                }).select('expert_image meditation_url meditation_image');
                updateData = {
                  ...updateData,
                  expert_image: !reqParam.expertImage
                    ? existingMedia.expert_image
                    : updateData.expert_image,
                  meditation_url: !reqParam.meditationUrl
                    ? existingMedia.meditation_url
                    : updateData.meditation_url,
                  meditation_image: !reqParam.meditationImage
                    ? existingMedia.meditation_image
                    : updateData.meditation_image
                };
              }
              const newDataCondition = {
                ...updateData,
                created_by: req.authAdminId
              };
              const newData = await Meditation.findOneAndUpdate(
                {
                  parentId: reqParam.meditationId
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
                content_type: CONTENT_TYPE.MEDITATION,
                display_name: reqParam.meditationName.trim(),
                content_status: CONTENT_STATUS.DRAFT,
                created_by: req.authAdminId,
                comments: addComment
              };
              await ContentApproval.findOneAndUpdate(
                { parentId: reqParam.meditationId },
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
                  CONTENT_TYPE.MEDITATION
                ));

              const presignedData = {
                audioUrl: audioPreSignUrl || null,
                expertImageUrl: expertImageUrl || null,
                meditationImageUrl: meditationImageUrl || null
              };

              if (reqParam.meditationUrl) {
                setTimeout(() => {
                  audioToSrtHandler(
                    newData._id,
                    CONTENT_TYPE.MEDITATION,
                    ADMIN_MEDIA_PATH.MEDITATION_AUDIO,
                    updateData.meditation_url,
                    ADMIN_MEDIA_PATH.MEDITATION_SRT
                  );
                }, INITIATE_TRANSCRIPTION_DELAY);
              }

              // axios.get(`http://13.51.222.131:8500/download_mp3_files/?id=${reqParam.meditationId}`);

              return Response.successResponseWithoutData(
                res,
                res.__('meditationDetailUpdated'),
                SUCCESS,
                presignedData
              );
            } else {
              const filterData = {
                _id: reqParam.meditationId,
                status: {
                  $ne: STATUS.DELETED
                }
              };
              const existingMedia = await Meditation.findOne(filterData).select(
                'expert_image meditation_url meditation_image'
              );
              if (existingMedia) {
                if (existingMedia.meditation_url && reqParam.meditationUrl) {
                  await removeOldImage(
                    existingMedia.meditation_url,
                    ADMIN_MEDIA_PATH.MEDITATION_AUDIO,
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
                if (existingMedia.meditation_image && reqParam.meditationImage) {
                  await removeOldImage(
                    existingMedia.meditation_image,
                    ADMIN_MEDIA_PATH.MEDITATION_IMAGE,
                    res
                  );
                }
              }
              const meditationData = await Meditation.findOneAndUpdate(filterData, updateData, {
                new: true
              }).select('_id');
              if (meditationData) {
                const filterContentCondition = {
                  content_type_id: meditationData._id,
                  content_type: CONTENT_TYPE.MEDITATION,
                  deletedAt: null
                };
                let updateContentCondition = {
                  display_name: reqParam.meditationName.trim(),
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
                    meditationData._id,
                    CONTENT_TYPE.MEDITATION
                  ));

                const presignedData = {
                  audioUrl: audioPreSignUrl || null,
                  expertImageUrl: expertImageUrl || null,
                  meditationImageUrl: meditationImageUrl || null
                };
                // axios.get(`http://13.51.222.131:8500/download_mp3_files/?id=${meditationData._id}`);

                if (reqParam.meditationUrl) {
                  setTimeout(() => {
                    audioToSrtHandler(
                      meditationData._id,
                      CONTENT_TYPE.MEDITATION,
                      ADMIN_MEDIA_PATH.MEDITATION_AUDIO,
                      updateData.meditation_url,
                      ADMIN_MEDIA_PATH.MEDITATION_SRT
                    );
                  }, INITIATE_TRANSCRIPTION_DELAY);
                }

                return Response.successResponseWithoutData(
                  res,
                  res.__('meditationDetailUpdated'),
                  SUCCESS,
                  presignedData
                );
              } else {
                return Response.successResponseWithoutData(
                  res,
                  res.__('invalidMeditationId'),
                  FAIL
                );
              }
            }
          } else {
            const newDataCondition = {
              ...updateData,
              created_by: req.authAdminId
            };
            const newData = await Meditation.create(newDataCondition);
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
                content_type: CONTENT_TYPE.MEDITATION,
                display_name: reqParam.meditationName.trim(),
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
                  CONTENT_TYPE.MEDITATION
                ));
              const presignedData = {
                audioUrl: audioPreSignUrl || null,
                expertImageUrl: expertImageUrl || null,
                meditationImageUrl: meditationImageUrl || null
              };

              if (reqParam.meditationUrl) {
                setTimeout(() => {
                  audioToSrtHandler(
                    newData._id,
                    CONTENT_TYPE.MEDITATION,
                    ADMIN_MEDIA_PATH.MEDITATION_AUDIO,
                    updateData.meditation_url,
                    ADMIN_MEDIA_PATH.MEDITATION_SRT
                  );
                }, INITIATE_TRANSCRIPTION_DELAY);
              }

              // axios.get(`http://13.51.222.131:8500/download_mp3_files/?id=${newData._id}`);

              return Response.successResponseWithoutData(
                res,
                res.__('meditationAddedSuccess'),
                SUCCESS,
                presignedData
              );
            } else {
              return Response.successResponseWithoutData(res, res.__('noMeditationFound'), FAIL);
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
   * @description This function is used to get meditation list
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  meditationList: async (req, res) => {
    try {
      const reqParam = req.query;
      await Meditation.updateMany({ is_draft: { $eq: null } }, { is_draft: false });
      const page = reqParam.page ? parseInt(reqParam.page) : PAGE;
      const perPage = reqParam.perPage ? parseInt(reqParam.perPage) : PER_PAGE;
      const skip = (page - 1) * perPage || 0;
      const sortBy = reqParam.sortBy || SORT_BY;
      const sortOrder = reqParam.sortOrder ? parseInt(reqParam.sortOrder) : SORT_ORDER;

      if (reqParam.id) {
        const meditationDetails = await Meditation.findOne({
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
            id: '$_id',
            display_name: '$display_name',
            meditationUrl: {
              $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.MEDITATION_AUDIO, '/', '$meditation_url']
            },
            meditationImage: {
              $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.MEDITATION_IMAGE, '/', '$meditation_image']
            },
            meditationSrtName: '$meditation_srt',
            srtUrl: {
              $concat: [CLOUDFRONT_URL, 'admins/meditations/srt/', '$meditation_srt']
            },
            duration: 1,
            rating: 1,
            createdOn: '$createdAt',
            meditationBy: '$meditation_by',
            expertName: '$expert_name',
            expertImage: {
              $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.EXPERT_IMAGES, '/', '$expert_image']
            },
            approvedOn: '$approved_on',
            meditationStatus: '$status',
            description: 1,
            meditationType: '$meditation_type'
          })
          .lean();

        if (!meditationDetails) {
          return Response.successResponseWithoutData(res, res.__('noMeditationFound'), FAIL);
        }

        const meditation = meditationDetails && contentResponseObjTransformer(meditationDetails);
        return Response.successResponseData(res, meditation, SUCCESS, res.__('meditationSuccess'));
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
          content_type: CONTENT_TYPE.MEDITATION,
          content_status: reqParam.approvalStatus
            ? parseInt(reqParam.approvalStatus)
            : {
                $ne: CONTENT_STATUS.DRAFT
              }
        };
        const meditationIds = [];
        const cursor = await ContentApproval.find(contentApprovalCondition)
          .select('content_type_id')
          .cursor();
        await cursor.eachAsync((doc) => {
          meditationIds.push(doc.content_type_id);
        });

        filterCondition = {
          _id: {
            $in: meditationIds
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
          ...(reqParam.meditationType && {
            meditation_type: parseInt(reqParam.meditationType)
          }),
          ...(reqParam.approvedBy && { approved_by: toObjectId(reqParam.approvedBy) }),
          ...(reqParam.meditationStatus && { status: parseInt(reqParam.meditationStatus) }),
          ...(reqParam.ratings > 0 && { rating: { $gte: parseInt(reqParam.ratings) } }),

          ...(reqParam.id && { _id: toObjectId(reqParam.id) } &&
            delete contentApprovalCondition.content_status)
        };
      }
      const totalRecords = await Meditation.countDocuments(filterCondition);
      const meditationDetailsList = await Meditation.find(filterCondition)
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
          meditationSrtName: '$meditation_srt',
          meditationUrl: {
            $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.MEDITATION_AUDIO, '/', '$meditation_url']
          },
          srtUrl: {
            $concat: [CLOUDFRONT_URL, 'admins/meditations/srt/', '$meditation_srt']
          },
          duration: 1,
          rating: 1,
          createdOn: '$createdAt',
          expertName: '$expert_name',
          approvedOn: '$approved_on',
          timeSpent: '$played_time',
          timeCounts: '$played_counts',
          played_time: 1,
          played_counts: 1,
          meditationStatus: '$status'
        })
        .lean();
      if (meditationDetailsList.length) {
        meditationDetailsList.map((meditation) => {
          meditation.timeSpent = Math.floor(meditation.timeSpent / 60);
        });
      }
      const meditations = contentResponseObjTransformerList(meditationDetailsList);

      for await (const meditation of meditations) {
        let rateCondition = {
          content_id: toObjectId(meditation._id)
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
            totalRateUsers > 0 ? +Number(rated[0]?.totalRatings / totalRateUsers).toFixed(1) : 0;

          await Meditation.updateOne(
            { _id: toObjectId(meditation._id) },
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
        meditations,
        SUCCESS,
        res.__('meditationListSuccess'),
        {
          page,
          perPage,
          totalRecords
        }
      );
    } catch (err) {
      console.error(err);
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to delete meditation
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  deleteMeditation: (req, res) => {
    try {
      const reqParam = req.query;
      deleteMeditationValidation(reqParam, res, async (validate) => {
        if (validate) {
          const deleteCondition = {
            status: STATUS.DELETED,
            deletedAt: new Date()
          };
          const deletedData = await Meditation.findByIdAndUpdate(
            reqParam.meditationId,
            deleteCondition,
            { new: true }
          ).select('_id');
          if (deletedData) {
            const filterContentCondition = {
              content_type_id: reqParam.meditationId,
              content_type: CONTENT_TYPE.MEDITATION
            };
            await ContentApproval.findOneAndUpdate(filterContentCondition, {
              deletedAt: new Date()
            });
            return Response.successResponseWithoutData(
              res,
              res.__('meditationDeleteSuccess'),
              SUCCESS
            );
          } else {
            return Response.successResponseWithoutData(res, res.__('noMeditationFound'), FAIL);
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
   * @description This function is used to get meditation details by id
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  getMeditation: (req, res) => {
    try {
      const reqParam = req.params;
      getMeditationValidation(reqParam, res, async (validate) => {
        if (validate) {
          const filterCondition = {
            _id: reqParam.id,
            status: {
              $ne: STATUS.DELETED
            }
          };
          const meditationDetails = await Meditation.findOne(filterCondition)
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
              id: '$_id',
              meditationName: '$display_name',
              meditationUrl: {
                $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.MEDITATION_AUDIO, '/', '$meditation_url']
              },
              meditationImage: {
                $concat: [
                  CLOUDFRONT_URL,
                  ADMIN_MEDIA_PATH.MEDITATION_IMAGE,
                  '/',
                  '$meditation_image'
                ]
              },
              meditationSrtName: '$meditation_srt',
              srtUrl: {
                $concat: [CLOUDFRONT_URL, 'admins/meditations/srt/', '$meditation_srt']
              },
              duration: 1,
              createdOn: '$createdAt',
              meditationBy: '$meditation_by',
              expertName: '$expert_name',
              expertImage: {
                $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.EXPERT_IMAGES, '/', '$expert_image']
              },
              approvedOn: '$approved_on',
              meditationStatus: '$status',
              expertId: '$expert_id',
              description: 1,
              meditationType: '$meditation_type'
            })
            .lean();
          const meditation = meditationDetails && contentResponseObjTransformer(meditationDetails);
          return Response.successResponseData(
            res,
            meditation,
            SUCCESS,
            res.__('meditationListSuccess')
          );
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  addEditDraftMeditation: (req, res) => {
    try {
      const reqParam = req.body;
      addEditDraftMeditationValidation(reqParam, res, async (validate) => {
        if (validate) {
          let updateData = {
            display_name: reqParam?.meditationName.trim(),
            meditation_type: reqParam?.meditationType,
            description: reqParam?.description,
            duration: reqParam?.duration,
            focus_ids: reqParam?.focusIds,
            // meditation_by: reqParam?.meditationBy,
            status: reqParam?.meditationStatus,
            is_draft: reqParam.isDraft || true
          };
          if (req.userType === USER_TYPE.SUPER_ADMIN) {
            updateData = {
              ...updateData,
              approved_by: req.authAdminId,
              approved_on: new Date()
            };
          }
          let audioPreSignUrl;
          let expertImageUrl;
          let meditationImageUrl;
          if (reqParam.meditationUrl) {
            const audioExtension = reqParam.meditationUrl.split('/')[1];
            const audioName = `${unixTimeStamp(new Date())}-${makeRandomDigit(
              4
            )}.${audioExtension}`;
            audioPreSignUrl = await getUploadURL(
              reqParam.meditationUrl,
              audioName,
              ADMIN_MEDIA_PATH.MEDITATION_AUDIO
            );
            updateData = {
              ...updateData,
              meditation_url: audioName
            };
          }
          if (reqParam.meditationImage) {
            const imageExtension = reqParam.meditationImage.split('/')[1];
            const meditationImageName = `${unixTimeStamp(new Date())}-${makeRandomDigit(
              4
            )}.${imageExtension}`;
            meditationImageUrl = await getUploadURL(
              reqParam.meditationImage,
              meditationImageName,
              ADMIN_MEDIA_PATH.MEDITATION_IMAGE
            );
            updateData = {
              ...updateData,
              meditation_image: meditationImageName
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
          if (reqParam.meditationId) {
            if (
              reqParam.approvalStatus === CONTENT_STATUS.APPROVED &&
              req.userType !== USER_TYPE.SUPER_ADMIN
            ) {
              if (!reqParam.expertImage || !reqParam.meditationImage || !reqParam.meditationUrl) {
                const existingMedia = await Meditation.findOne({
                  _id: reqParam.meditationId,
                  status: {
                    $ne: STATUS.DELETED
                  }
                }).select('expert_image meditation_url meditation_image');
                updateData = {
                  ...updateData,
                  expert_image: !reqParam.expertImage
                    ? existingMedia.expert_image
                    : updateData.expert_image,
                  meditation_url: !reqParam.meditationUrl
                    ? existingMedia.meditation_url
                    : updateData.meditation_url,
                  meditation_image: !reqParam.meditationImage
                    ? existingMedia.meditation_image
                    : updateData.meditation_image
                };
              }
              const newDataCondition = {
                ...updateData,
                created_by: req.authAdminId
              };
              const newData = await Meditation.findOneAndUpdate(
                {
                  parentId: reqParam.meditationId
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
                content_type: CONTENT_TYPE.MEDITATION,
                display_name: reqParam.meditationName.trim(),
                content_status: CONTENT_STATUS.DRAFT,
                created_by: req.authAdminId,
                comments: addComment
              };
              await ContentApproval.findOneAndUpdate(
                { parentId: reqParam.meditationId },
                newContentData,
                {
                  upsert: true
                }
              );
              const presignedData = {
                audioUrl: audioPreSignUrl || null,
                expertImageUrl: expertImageUrl || null,
                meditationImageUrl: meditationImageUrl || null
              };

              if (reqParam.meditationUrl) {
                setTimeout(() => {
                  audioToSrtHandler(
                    newData._id,
                    CONTENT_TYPE.MEDITATION,
                    ADMIN_MEDIA_PATH.MEDITATION_AUDIO,
                    updateData.meditation_url,
                    ADMIN_MEDIA_PATH.MEDITATION_SRT
                  );
                }, INITIATE_TRANSCRIPTION_DELAY);
              }

              return Response.successResponseWithoutData(
                res,
                res.__('meditationDetailUpdated'),
                SUCCESS,
                presignedData
              );
            } else {
              const filterData = {
                _id: reqParam.meditationId,
                status: {
                  $ne: STATUS.DELETED
                }
              };
              const existingMedia = await Meditation.findOne(filterData).select(
                'expert_image meditation_url meditation_image'
              );
              if (existingMedia) {
                if (existingMedia.meditation_url && reqParam.meditationUrl) {
                  await removeOldImage(
                    existingMedia.meditation_url,
                    ADMIN_MEDIA_PATH.MEDITATION_AUDIO,
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
                if (existingMedia.meditation_image && reqParam.meditationImage) {
                  await removeOldImage(
                    existingMedia.meditation_image,
                    ADMIN_MEDIA_PATH.MEDITATION_IMAGE,
                    res
                  );
                }
              }
              const meditationData = await Meditation.findOneAndUpdate(filterData, updateData, {
                new: true
              }).select('_id');
              if (meditationData) {
                const filterContentCondition = {
                  content_type_id: meditationData._id,
                  content_type: CONTENT_TYPE.MEDITATION,
                  deletedAt: null
                };
                let updateContentCondition = {
                  display_name: reqParam.meditationName.trim(),
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

                const presignedData = {
                  audioUrl: audioPreSignUrl || null,
                  expertImageUrl: expertImageUrl || null,
                  meditationImageUrl: meditationImageUrl || null
                };

                if (reqParam.meditationUrl) {
                  setTimeout(() => {
                    audioToSrtHandler(
                      meditationData._id,
                      CONTENT_TYPE.MEDITATION,
                      ADMIN_MEDIA_PATH.MEDITATION_AUDIO,
                      updateData.meditation_url,
                      ADMIN_MEDIA_PATH.MEDITATION_SRT
                    );
                  }, INITIATE_TRANSCRIPTION_DELAY);
                }

                return Response.successResponseWithoutData(
                  res,
                  res.__('meditationDetailUpdated'),
                  SUCCESS,
                  presignedData
                );
              } else {
                return Response.successResponseWithoutData(
                  res,
                  res.__('invalidMeditationId'),
                  FAIL
                );
              }
            }
          } else {
            const newDataCondition = {
              ...updateData,
              created_by: req.authAdminId
            };
            const newData = await Meditation.create(newDataCondition);
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
                content_type: CONTENT_TYPE.MEDITATION,
                display_name: reqParam.meditationName.trim(),
                focus_ids: reqParam.focusIds,
                content_status: addComment.content_status,
                created_by: req.authAdminId,
                comments: addComment,
                updated_by: req.userType === USER_TYPE.SUPER_ADMIN ? req.authAdminId : null,
                updated_on: req.userType === USER_TYPE.SUPER_ADMIN ? new Date() : null
              };
              await ContentApproval.create(newContentData);

              const presignedData = {
                audioUrl: audioPreSignUrl || null,
                expertImageUrl: expertImageUrl || null,
                meditationImageUrl: meditationImageUrl || null
              };

              if (reqParam.meditationUrl) {
                setTimeout(() => {
                  audioToSrtHandler(
                    newData._id,
                    CONTENT_TYPE.MEDITATION,
                    ADMIN_MEDIA_PATH.MEDITATION_AUDIO,
                    updateData.meditation_url,
                    ADMIN_MEDIA_PATH.MEDITATION_SRT
                  );
                }, INITIATE_TRANSCRIPTION_DELAY);
              }

              return Response.successResponseWithoutData(
                res,
                res.__('meditationDraftSuccess'),
                SUCCESS,
                presignedData
              );
            } else {
              return Response.successResponseWithoutData(res, res.__('noMeditationFound'), FAIL);
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

  draftMeditationList: async (req, res) => {
    try {
      const reqParam = req.query;
      await Meditation.updateMany({ is_draft: { $eq: null } }, { is_draft: false });
      draftMeditationListValidation(reqParam, res, async (validate) => {
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
            ...(reqParam.meditationType && { meditation_type: parseInt(reqParam.meditationType) }),
            ...(reqParam.approvedBy && { approved_by: toObjectId(reqParam.approvedBy) }),
            ...(reqParam.meditationStatus && { status: parseInt(reqParam.meditationStatus) })
          };

          const totalRecords = await Meditation.countDocuments(filterCondition);
          const meditationDetailsList = await Meditation.find(filterCondition)
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
              meditationName: '$display_name',
              meditationUrl: {
                $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.MEDITATION_AUDIO, '/', '$meditation_url']
              },
              duration: 1,
              createdOn: '$createdAt',
              approvedOn: '$approved_on',
              meditationStatus: '$status'
            })
            .lean();
          const meditations = contentResponseObjTransformerList(meditationDetailsList);
          return Response.successResponseData(
            res,
            meditations,
            SUCCESS,
            res.__('draftMeditationListSuccess'),
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
  }
};
