'use strict';

const { ShoorahPods, ContentApproval } = require('@models');
const Response = require('@services/Response');
const {
  addEditShoorahPodsValidation,
  shoorahPodsListValidation,
  deleteShoorahPodsValidation,
  getShoorahPodValidation
} = require('@services/adminValidations/shoorahPodsValidations');
const {
  USER_TYPE,
  SUCCESS,
  ADMIN_MEDIA_PATH,
  CONTENT_TYPE,
  CONTENT_STATUS,
  STATUS,
  FAIL,
  PAGE,
  PER_PAGE,
  CLOUDFRONT_URL,
  SORT_BY,
  SORT_ORDER,
  INITIATE_TRANSCRIPTION_DELAY
} = require('@services/Constant');
const { unixTimeStamp, makeRandomDigit, toObjectId } = require('@services/Helper');
const { getUploadURL, removeOldImage } = require('@services/s3Services');
const {
  newContentUploadedNotification
} = require('@services/adminServices/contentApprovalServices');
const {
  contentResponseObjTransformerList,
  contentResponseObjTransformer
} = require('@services/adminServices/contentManagementServices');
const { default: axios } = require('axios');
const { convertObjectKeysToCamelCase } = require('../../../services/Helper');
const { Meditation, Sound } = require('../../../models');
const {
  updateContentUploadedNotification
} = require('../../../services/adminServices/contentApprovalServices');
const {
  addEditDraftShoorahPodsValidation,
  draftShoorahPodsListValidation
} = require('../../../services/adminValidations/shoorahPodsValidations');
const Ratings = require('../../../models/Rating');
const { audioToSrtHandler } = require('@services/adminServices/audioToSrtConversion');

module.exports = {
  /**
   * @description This function is used to add or edit shoorah pods
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  addEditShoorahPods: (req, res) => {
    try {
      const reqParam = req.body;
      addEditShoorahPodsValidation(reqParam, res, async (validate) => {
        if (validate) {
          let updateData = {
            display_name: reqParam.podName.trim(),
            pods_type: reqParam.podType,
            description: reqParam.description,
            duration: reqParam.duration,
            focus_ids: reqParam.focusIds,
            // pods_by: reqParam.podBy,
            status: reqParam.podStatus,
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
          let podImageUrl;
          if (reqParam.podUrl) {
            const audioExtension = reqParam.podUrl.split('/')[1];
            const audioName = `${unixTimeStamp(new Date())}-${makeRandomDigit(
              4
            )}.${audioExtension}`;
            audioPreSignUrl = await getUploadURL(
              reqParam.podUrl,
              audioName,
              ADMIN_MEDIA_PATH.SHOORAH_PODS_AUDIO
            );
            updateData = {
              ...updateData,
              pods_url: audioName
            };
          }
          if (reqParam.podImage) {
            const imageExtension = reqParam.podImage.split('/')[1];
            const podsImageName = `${unixTimeStamp(new Date())}-${makeRandomDigit(
              4
            )}.${imageExtension}`;
            podImageUrl = await getUploadURL(
              reqParam.podImage,
              podsImageName,
              ADMIN_MEDIA_PATH.SHOORAH_PODS_IMAGE
            );
            updateData = {
              ...updateData,
              pods_image: podsImageName
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
          if (reqParam.podId) {
            if (
              reqParam.approvalStatus === CONTENT_STATUS.APPROVED &&
              req.userType !== USER_TYPE.SUPER_ADMIN
            ) {
              if (!reqParam.expertImage || !reqParam.podImage || !reqParam.podUrl) {
                const existingMedia = await ShoorahPods.findOne({
                  _id: reqParam.podId,
                  status: {
                    $ne: STATUS.DELETED
                  }
                }).select('expert_image pods_url pods_image');
                updateData = {
                  ...updateData,
                  expert_image: !reqParam.expertImage
                    ? existingMedia.expert_image
                    : updateData.expert_image,
                  pods_url: !reqParam.podUrl ? existingMedia.pods_url : updateData.pods_url,
                  pods_image: !reqParam.podImage ? existingMedia.pods_image : updateData.pods_image
                };
              }
              const newDataCondition = {
                ...updateData,
                created_by: req.authAdminId
              };
              const newData = await ShoorahPods.findOneAndUpdate(
                {
                  parentId: reqParam.podId
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
                content_type: CONTENT_TYPE.SHOORAH_PODS,
                display_name: reqParam.podName.trim(),
                content_status: CONTENT_STATUS.DRAFT,
                created_by: req.authAdminId,
                comments: addComment
              };
              await ContentApproval.findOneAndUpdate({ parentId: reqParam.podId }, newContentData, {
                upsert: true
              });
              req.userType !== USER_TYPE.SUPER_ADMIN &&
                (await updateContentUploadedNotification(
                  req.authAdminName,
                  req.authAdminId,
                  newData._id,
                  CONTENT_TYPE.SHOORAH_PODS
                ));
              const presignedData = {
                audioUrl: audioPreSignUrl || null,
                expertImageUrl: expertImageUrl || null,
                podImageUrl: podImageUrl || null
              };
              // axios.get(`http://13.51.222.131:8500/download_mp3_files/?id=${reqParam.podId}`);

              if (reqParam.podUrl) {
                setTimeout(() => {
                  audioToSrtHandler(
                    newData._id,
                    CONTENT_TYPE.SHOORAH_PODS,
                    ADMIN_MEDIA_PATH.SHOORAH_PODS_AUDIO,
                    updateData.pods_url,
                    ADMIN_MEDIA_PATH.SHOORAH_PODS_SRT
                  );
                }, INITIATE_TRANSCRIPTION_DELAY);
              }

              return Response.successResponseWithoutData(
                res,
                res.__('podsDetailUpdated'),
                SUCCESS,
                presignedData
              );
            } else {
              const filterData = {
                _id: reqParam.podId,
                status: {
                  $ne: STATUS.DELETED
                }
              };
              const existingMedia = await ShoorahPods.findOne(filterData).select(
                'expert_image pods_url pods_image'
              );
              if (existingMedia) {
                if (existingMedia.pods_url && reqParam.podUrl) {
                  await removeOldImage(
                    existingMedia.pods_url,
                    ADMIN_MEDIA_PATH.SHOORAH_PODS_AUDIO,
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
                if (existingMedia.pods_image && reqParam.podImage) {
                  await removeOldImage(
                    existingMedia.pods_image,
                    ADMIN_MEDIA_PATH.SHOORAH_PODS_IMAGE,
                    res
                  );
                }
              }
              const podsData = await ShoorahPods.findOneAndUpdate(filterData, updateData, {
                new: true
              }).select('_id');
              if (podsData) {
                const filterContentCondition = {
                  content_type_id: podsData._id,
                  content_type: CONTENT_TYPE.SHOORAH_PODS,
                  deletedAt: null
                };
                let updateContentCondition = {
                  display_name: reqParam.podName.trim(),
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
                  podImageUrl: podImageUrl || null
                };
                req.userType !== USER_TYPE.SUPER_ADMIN &&
                  (await updateContentUploadedNotification(
                    req.authAdminName,
                    req.authAdminId,
                    podsData._id,
                    CONTENT_TYPE.SHOORAH_PODS
                  ));
                // axios.get(`http://13.51.222.131:8500/download_mp3_files/?id=${podsData._id}`);
                if (reqParam.podUrl) {
                  setTimeout(() => {
                    audioToSrtHandler(
                      podsData._id,
                      CONTENT_TYPE.SHOORAH_PODS,
                      ADMIN_MEDIA_PATH.SHOORAH_PODS_AUDIO,
                      updateData.pods_url,
                      ADMIN_MEDIA_PATH.SHOORAH_PODS_SRT
                    );
                  }, INITIATE_TRANSCRIPTION_DELAY);
                }

                return Response.successResponseWithoutData(
                  res,
                  res.__('podsDetailUpdated'),
                  SUCCESS,
                  presignedData
                );
              } else {
                return Response.successResponseWithoutData(res, res.__('invalidPodsId'), FAIL);
              }
            }
          } else {
            const newDataCondition = {
              ...updateData,
              created_by: req.authAdminId
            };
            const newData = await ShoorahPods.create(newDataCondition);
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
                content_type: CONTENT_TYPE.SHOORAH_PODS,
                display_name: reqParam.podName.trim(),
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
                  CONTENT_TYPE.SHOORAH_PODS
                ));
              const presignedData = {
                audioUrl: audioPreSignUrl || null,
                expertImageUrl: expertImageUrl || null,
                podImageUrl: podImageUrl || null
              };
              // axios.get(`http://13.51.222.131:8500/download_mp3_files/?id=${newData._id}`);

              if (reqParam.podUrl) {
                setTimeout(() => {
                  audioToSrtHandler(
                    newData._id,
                    CONTENT_TYPE.SHOORAH_PODS,
                    ADMIN_MEDIA_PATH.SHOORAH_PODS_AUDIO,
                    updateData.pods_url,
                    ADMIN_MEDIA_PATH.SHOORAH_PODS_SRT
                  );
                }, INITIATE_TRANSCRIPTION_DELAY);
              }

              return Response.successResponseWithoutData(
                res,
                res.__('podsAddedSuccess'),
                SUCCESS,
                presignedData
              );
            } else {
              return Response.successResponseWithoutData(res, res.__('noPodsFound'), FAIL);
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
   * @description This function is used to get shoorah pods list
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  shoorahPodsList: async (req, res) => {
    try {
      const reqParam = req.query;
      await ShoorahPods.updateMany({ is_draft: { $eq: null } }, { is_draft: false });

      shoorahPodsListValidation(reqParam, res, async (validate) => {
        try {
          if (validate) {
            const page = reqParam.page ? parseInt(reqParam.page) : PAGE;
            const perPage = reqParam.perPage ? parseInt(reqParam.perPage) : PER_PAGE;
            const skip = (page - 1) * perPage || 0;
            const sortBy = reqParam.sortBy || SORT_BY;
            const sortOrder = reqParam.sortOrder ? parseInt(reqParam.sortOrder) : SORT_ORDER;

            if (reqParam.id) {
              const shoorahPodsDetails = await ShoorahPods.findOne({
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
                  podsSrtName: '$pods_srt',
                  audioUrl: {
                    $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.SHOORAH_PODS_AUDIO, '/', '$pods_url']
                  },
                  srtUrl: {
                    $concat: [CLOUDFRONT_URL, 'admins/shoorah_pods/srt/', '$pods_srt']
                  },
                  podImage: {
                    $concat: [
                      CLOUDFRONT_URL,
                      ADMIN_MEDIA_PATH.SHOORAH_PODS_IMAGE,
                      '/',
                      '$pods_image'
                    ]
                  },
                  rating: 1,
                  podType: '$pods_type',
                  podBy: '$pods_by',
                  expertName: '$expert_name',
                  expertImage: {
                    $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.EXPERT_IMAGES, '/', '$expert_image']
                  },
                  approvedOn: '$approved_on',
                  podStatus: '$status',
                  description: '$description',
                  duration: '$duration',
                  createdOn: '$createdAt',
                  createdBy: '$createdBy',
                  approvedBy: '$approvedBy'
                })
                .lean();

              if (!shoorahPodsDetails) {
                return Response.successResponseWithoutData(res, res.__('noShoorahPodsFound'), FAIL);
              }

              const shoorahPod =
                shoorahPodsDetails && contentResponseObjTransformer(shoorahPodsDetails);
              return Response.successResponseData(
                res,
                shoorahPod,
                SUCCESS,
                res.__('shoorahPodsSuccess')
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
                content_type: CONTENT_TYPE.SHOORAH_PODS,
                content_status: reqParam.approvalStatus
                  ? parseInt(reqParam.approvalStatus)
                  : {
                      $ne: CONTENT_STATUS.DRAFT
                    }
              };
              const podIds = [];
              const cursor = await ContentApproval.find(contentApprovalCondition)
                .select('content_type_id')
                .cursor();
              await cursor.eachAsync((doc) => {
                podIds.push(doc.content_type_id);
              });
              filterCondition = {
                _id: {
                  $in: podIds
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
                ...(reqParam.approvedBy && { approved_by: toObjectId(reqParam.approvedBy) }),
                ...(reqParam.podStatus && { status: parseInt(reqParam.podStatus) }),
                ...(reqParam.ratings > 0 && { rating: { $gte: parseInt(reqParam.ratings) } }),

                ...(reqParam.id && { _id: toObjectId(reqParam.id) } &&
                  delete contentApprovalCondition.content_status),
                ...(reqParam.podType && { pods_type: parseInt(reqParam.podType) })
              };
            }

            const totalRecords = await ShoorahPods.countDocuments(filterCondition);
            let shoorahPodsDetails = await ShoorahPods.find(filterCondition)
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
                display_name: '$display_name',
                audioUrl: {
                  $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.SHOORAH_PODS_AUDIO, '/', '$pods_url']
                },
                podsSrtName: '$pods_srt',
                srtUrl: {
                  $concat: [CLOUDFRONT_URL, 'admins/shoorah_pods/srt/', '$pods_srt']
                },
                approvedOn: '$approved_on',
                podStatus: '$status',
                rating: 1,
                expertName: '$expert_name',
                duration: '$duration',
                createdOn: '$createdAt',
                createdBy: '$createdBy',
                approvedBy: '$approvedBy',
                timeSpent: '$played_time',
                timeCounts: '$played_counts'
              })
              .lean();

            if (shoorahPodsDetails.length) {
              shoorahPodsDetails.map((pod) => {
                pod.timeSpent = Math.floor(pod.timeSpent / 60);
              });
            }
            const shoorahPod = contentResponseObjTransformerList(shoorahPodsDetails);

            for await (const pod of shoorahPod) {
              let rateCondition = {
                content_id: toObjectId(pod._id)
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

                await ShoorahPods.updateOne(
                  { _id: toObjectId(pod._id) },
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
              shoorahPod,
              SUCCESS,
              res.__('shoorahPodsListSuccess'),
              {
                page,
                perPage,
                totalRecords
              }
            );
          }
        } catch (error) {
          console.log(error);
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to delete shoorah pods
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  deleteShoorahPods: (req, res) => {
    try {
      const reqParam = req.query;
      deleteShoorahPodsValidation(reqParam, res, async (validate) => {
        if (validate) {
          const deleteCondition = {
            status: STATUS.DELETED,
            deletedAt: new Date()
          };
          const deletedData = await ShoorahPods.findByIdAndUpdate(reqParam.podId, deleteCondition, {
            new: true
          }).select('_id');
          if (deletedData) {
            const filterContentCondition = {
              content_type_id: reqParam.podId,
              content_type: CONTENT_TYPE.SHOORAH_PODS
            };
            await ContentApproval.findOneAndUpdate(filterContentCondition, {
              deletedAt: new Date()
            });
            return Response.successResponseWithoutData(
              res,
              res.__('shoorahPodsDeleteSuccess'),
              SUCCESS
            );
          } else {
            return Response.successResponseWithoutData(res, res.__('noShoorahPodsFound'), FAIL);
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
   * @description This function is used to get shoorah pod by id.
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  getShoorahPod: (req, res) => {
    try {
      const reqParam = req.params;
      getShoorahPodValidation(reqParam, res, async (validate) => {
        if (validate) {
          const filterCondition = {
            _id: reqParam.id,
            status: {
              $ne: STATUS.DELETED
            }
          };
          const shoorahPodsDetails = await ShoorahPods.findOne(filterCondition)
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
              podName: '$display_name',
              podsSrtName: '$pods_srt',
              podUrl: {
                $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.SHOORAH_PODS_AUDIO, '/', '$pods_url']
              },
              srtUrl: {
                $concat: [CLOUDFRONT_URL, 'admins/shoorah_pods/srt/', '$pods_srt']
              },
              podImage: {
                $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.SHOORAH_PODS_IMAGE, '/', '$pods_image']
              },
              podType: '$pods_type',
              podBy: '$pods_by',
              expertName: '$expert_name',
              expertImage: {
                $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.EXPERT_IMAGES, '/', '$expert_image']
              },
              approvedOn: '$approved_on',
              podStatus: '$status',
              description: '$description',
              duration: '$duration',
              createdOn: '$createdAt',
              createdBy: '$createdBy',
              approvedBy: '$approvedBy',
              expertId: '$expert_id'
            })
            .lean();
          const shoorahPod = contentResponseObjTransformer(shoorahPodsDetails);
          return Response.successResponseData(
            res,
            shoorahPod,
            SUCCESS,
            res.__('shoorahPodsListSuccess')
          );
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  getSrtReport: async (req, res) => {
    try {
      let reqParam = req.body;

      if (reqParam.type == 3) {
        await Meditation.updateMany({ meditation_srt: { $eq: null } }, { meditation_srt: '' });

        let filterCondition = {
          deletedAt: null,
          meditation_srt: { $eq: '' }
        };

        let pods = await Meditation.find(filterCondition);
        let result = [];

        for (const sound of pods) {
          let response = await axios.get(
            `http://13.51.222.131:8501/download_mp3_files/?id=${sound._id}`
          );
          result.push(response);
          console.log(result.length + ' of ' + pods.length);
        }

        return Response.successResponseData(
          res,
          convertObjectKeysToCamelCase(result),
          SUCCESS,
          res.__('soundsListSuccess')
        );
      }

      if (reqParam.type == 4) {
        await Sound.updateMany({ sound_srt: { $eq: null } }, { sound_srt: '' });

        let filterCondition = {
          deletedAt: null,
          sound_srt: { $eq: '' }
        };

        let pods = await Sound.find(filterCondition);
        let result = [];

        for (const sound of pods) {
          let response = await axios.get(
            `http://13.51.222.131:8501/download_mp3_files/?id=${sound._id}`
          );
          result.push(response);
          console.log(result.length + ' of ' + pods.length);
        }

        return Response.successResponseData(
          res,
          convertObjectKeysToCamelCase(result),
          SUCCESS,
          res.__('soundsListSuccess')
        );
      }

      if (reqParam.type == 5) {
        await ShoorahPods.updateMany({ pods_srt: { $eq: null } }, { pods_srt: '' });

        let filterCondition = {
          deletedAt: null,
          pods_srt: { $eq: '' }
        };

        let pods = await ShoorahPods.find(filterCondition);
        let result = [];

        for (const sound of pods) {
          let response = await axios.get(
            `http://13.51.222.131:8501/download_mp3_files/?id=${sound._id}`
          );
          result.push(response);
          console.log(result.length + ' of ' + pods.length);
        }

        return Response.successResponseData(
          res,
          convertObjectKeysToCamelCase(result),
          SUCCESS,
          res.__('soundsListSuccess')
        );
      }
    } catch (err) {
      console.log(err);
      return Response.internalServerErrorResponse(res);
    }
  },

  addEditDraftShoorahPods: (req, res) => {
    try {
      const reqParam = req.body;
      addEditDraftShoorahPodsValidation(reqParam, res, async (validate) => {
        if (validate) {
          let updateData = {
            display_name: reqParam?.podName,
            pods_type: reqParam?.podType,
            description: reqParam?.description,
            duration: reqParam?.duration,
            focus_ids: reqParam?.focusIds,
            // pods_by: reqParam?.podBy,
            status: reqParam?.podStatus,
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
          let podImageUrl;
          if (reqParam.podUrl) {
            const audioExtension = reqParam.podUrl.split('/')[1];
            const audioName = `${unixTimeStamp(new Date())}-${makeRandomDigit(
              4
            )}.${audioExtension}`;
            audioPreSignUrl = await getUploadURL(
              reqParam.podUrl,
              audioName,
              ADMIN_MEDIA_PATH.SHOORAH_PODS_AUDIO
            );
            updateData = {
              ...updateData,
              pods_url: audioName
            };
          }
          if (reqParam.podImage) {
            const imageExtension = reqParam.podImage.split('/')[1];
            const podsImageName = `${unixTimeStamp(new Date())}-${makeRandomDigit(
              4
            )}.${imageExtension}`;
            podImageUrl = await getUploadURL(
              reqParam.podImage,
              podsImageName,
              ADMIN_MEDIA_PATH.SHOORAH_PODS_IMAGE
            );
            updateData = {
              ...updateData,
              pods_image: podsImageName
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
          if (reqParam.podId) {
            if (
              reqParam.approvalStatus === CONTENT_STATUS.APPROVED &&
              req.userType !== USER_TYPE.SUPER_ADMIN
            ) {
              if (!reqParam.expertImage || !reqParam.podImage || !reqParam.podUrl) {
                const existingMedia = await ShoorahPods.findOne({
                  _id: reqParam.podId,
                  status: {
                    $ne: STATUS.DELETED
                  }
                }).select('expert_image pods_url pods_image');
                updateData = {
                  ...updateData,
                  expert_image: !reqParam.expertImage
                    ? existingMedia.expert_image
                    : updateData.expert_image,
                  pods_url: !reqParam.podUrl ? existingMedia.pods_url : updateData.pods_url,
                  pods_image: !reqParam.podImage ? existingMedia.pods_image : updateData.pods_image
                };
              }
              const newDataCondition = {
                ...updateData,
                created_by: req.authAdminId
              };
              const newData = await ShoorahPods.findOneAndUpdate(
                {
                  parentId: reqParam.podId
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
                content_type: CONTENT_TYPE.SHOORAH_PODS,
                display_name: reqParam.podName,
                content_status: CONTENT_STATUS.DRAFT,
                created_by: req.authAdminId,
                comments: addComment
              };
              await ContentApproval.findOneAndUpdate({ parentId: reqParam.podId }, newContentData, {
                upsert: true
              });
              req.userType !== USER_TYPE.SUPER_ADMIN &&
                (await updateContentUploadedNotification(
                  req.authAdminName,
                  req.authAdminId,
                  newData._id,
                  CONTENT_TYPE.SHOORAH_PODS
                ));
              const presignedData = {
                audioUrl: audioPreSignUrl || null,
                expertImageUrl: expertImageUrl || null,
                podImageUrl: podImageUrl || null
              };

              if (reqParam.podUrl) {
                setTimeout(() => {
                  audioToSrtHandler(
                    newData._id,
                    CONTENT_TYPE.SHOORAH_PODS,
                    ADMIN_MEDIA_PATH.SHOORAH_PODS_AUDIO,
                    updateData.pods_url,
                    ADMIN_MEDIA_PATH.SHOORAH_PODS_SRT
                  );
                }, INITIATE_TRANSCRIPTION_DELAY);
              }

              return Response.successResponseWithoutData(
                res,
                res.__('podsDraftDetailUpdated'),
                SUCCESS,
                presignedData
              );
            } else {
              const filterData = {
                _id: reqParam.podId,
                status: {
                  $ne: STATUS.DELETED
                }
              };
              const existingMedia = await ShoorahPods.findOne(filterData).select(
                'expert_image pods_url pods_image'
              );
              if (existingMedia) {
                if (existingMedia.pods_url && reqParam.podUrl) {
                  await removeOldImage(
                    existingMedia.pods_url,
                    ADMIN_MEDIA_PATH.SHOORAH_PODS_AUDIO,
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
                if (existingMedia.pods_image && reqParam.podImage) {
                  await removeOldImage(
                    existingMedia.pods_image,
                    ADMIN_MEDIA_PATH.SHOORAH_PODS_IMAGE,
                    res
                  );
                }
              }
              const podsData = await ShoorahPods.findOneAndUpdate(filterData, updateData, {
                new: true
              }).select('_id');
              if (podsData) {
                const filterContentCondition = {
                  content_type_id: podsData._id,
                  content_type: CONTENT_TYPE.SHOORAH_PODS,
                  deletedAt: null
                };
                let updateContentCondition = {
                  display_name: reqParam.podName,
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
                  podImageUrl: podImageUrl || null
                };
                req.userType !== USER_TYPE.SUPER_ADMIN &&
                  (await updateContentUploadedNotification(
                    req.authAdminName,
                    req.authAdminId,
                    podsData._id,
                    CONTENT_TYPE.SHOORAH_PODS
                  ));
                if (reqParam.podUrl) {
                  setTimeout(() => {
                    audioToSrtHandler(
                      podsData._id,
                      CONTENT_TYPE.SHOORAH_PODS,
                      ADMIN_MEDIA_PATH.SHOORAH_PODS_AUDIO,
                      updateData.pods_url,
                      ADMIN_MEDIA_PATH.SHOORAH_PODS_SRT
                    );
                  }, INITIATE_TRANSCRIPTION_DELAY);
                }

                return Response.successResponseWithoutData(
                  res,
                  res.__('podsDraftDetailUpdated'),
                  SUCCESS,
                  presignedData
                );
              } else {
                return Response.successResponseWithoutData(res, res.__('invalidPodsId'), FAIL);
              }
            }
          } else {
            const newDataCondition = {
              ...updateData,
              created_by: req.authAdminId
            };
            const newData = await ShoorahPods.create(newDataCondition);
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
                content_type: CONTENT_TYPE.SHOORAH_PODS,
                display_name: reqParam.podName,
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
                  CONTENT_TYPE.SHOORAH_PODS
                ));
              const presignedData = {
                audioUrl: audioPreSignUrl || null,
                expertImageUrl: expertImageUrl || null,
                podImageUrl: podImageUrl || null
              };

              if (reqParam.podUrl) {
                setTimeout(() => {
                  audioToSrtHandler(
                    newData._id,
                    CONTENT_TYPE.SHOORAH_PODS,
                    ADMIN_MEDIA_PATH.SHOORAH_PODS_AUDIO,
                    updateData.pods_url,
                    ADMIN_MEDIA_PATH.SHOORAH_PODS_SRT
                  );
                }, INITIATE_TRANSCRIPTION_DELAY);
              }

              return Response.successResponseWithoutData(
                res,
                res.__('podsDraftAddedSuccess'),
                SUCCESS,
                presignedData
              );
            } else {
              return Response.successResponseWithoutData(res, res.__('noPodsFound'), FAIL);
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

  draftShoorahPodsList: async (req, res) => {
    try {
      const reqParam = req.query;
      // await ShoorahPods.updateMany({is_draft:{$eq:null}},{is_draft:false});

      draftShoorahPodsListValidation(reqParam, res, async (validate) => {
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
            ...(reqParam.approvedBy && { approved_by: toObjectId(reqParam.approvedBy) }),
            ...(reqParam.podStatus && { status: parseInt(reqParam.podStatus) }),
            ...(reqParam.podType && { pods_type: parseInt(reqParam.podType) })
          };
          const totalRecords = await ShoorahPods.countDocuments(filterCondition);
          const shoorahPodsDetails = await ShoorahPods.find(filterCondition)
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
              podName: '$display_name',
              podUrl: {
                $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.SHOORAH_PODS_AUDIO, '/', '$pods_url']
              },
              approvedOn: '$approved_on',
              podStatus: '$status',
              duration: '$duration',
              createdOn: '$createdAt',
              createdBy: '$createdBy',
              approvedBy: '$approvedBy'
            })
            .lean();
          const shoorahPod = contentResponseObjTransformerList(shoorahPodsDetails);
          return Response.successResponseData(
            res,
            shoorahPod,
            SUCCESS,
            res.__('shoorahPodsDraftListSuccess'),
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
