'use strict';

const { Sound, ContentApproval } = require('@models');
const Response = require('@services/Response');
const {
  addEditSoundValidation,
  getDetailedSoundListValidation,
  deleteSoundValidation,
  getSoundValidation
} = require('@services/adminValidations/soundValidations');
const {
  STATUS,
  FAIL,
  SUCCESS,
  PAGE,
  PER_PAGE,
  CONTENT_STATUS,
  CONTENT_TYPE,
  USER_TYPE,
  SORT_ORDER,
  SORT_BY,
  ADMIN_MEDIA_PATH,
  CLOUDFRONT_URL,
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
  addEditDraftSoundValidation,
  getDetailedDraftSoundListValidation
} = require('../../../services/adminValidations/soundValidations');
const { default: axios } = require('axios');
const Ratings = require('../../../models/Rating');
const { audioToSrtHandler } = require('@services/adminServices/audioToSrtConversion');

module.exports = {
  /**
   * @description This function is used to add or edit sound
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  addEditSound: (req, res) => {
    try {
      const reqParam = req.body;
      addEditSoundValidation(reqParam, res, async (validate) => {
        if (validate) {
          let updateCondition = {
            display_name: reqParam.soundTitle.trim(),
            description: reqParam.description,
            duration: reqParam.duration,
            // sound_by: reqParam.soundBy,
            status: reqParam.soundStatus,
            focus_ids: reqParam.focusIds,
            is_draft: reqParam.isDraft || false
          };
          if (reqParam.expertId) {
            updateCondition = {
              ...updateCondition,
              expert_id: reqParam.expertId
            };
          }
          if (req.userType === USER_TYPE.SUPER_ADMIN) {
            updateCondition = {
              ...updateCondition,
              approved_by: req.authAdminId,
              approved_on: new Date()
            };
          }
          let audioPreSignUrl;
          let expertImageUrl;
          let soundImageUrl;
          if (reqParam.soundUrl) {
            const audioExtension = reqParam.soundUrl.split('/')[1];
            const audioName = `${unixTimeStamp(new Date())}-${makeRandomDigit(
              4
            )}.${audioExtension}`;
            audioPreSignUrl = await getUploadURL(
              reqParam.soundUrl,
              audioName,
              ADMIN_MEDIA_PATH.SOUND_AUDIO
            );
            updateCondition = {
              ...updateCondition,
              sound_url: audioName
            };
          }
          if (reqParam.soundImage) {
            const imageExtension = reqParam.soundImage.split('/')[1];
            const soundImageName = `${unixTimeStamp(new Date())}-${makeRandomDigit(
              4
            )}.${imageExtension}`;
            soundImageUrl = await getUploadURL(
              reqParam.soundImage,
              soundImageName,
              ADMIN_MEDIA_PATH.SOUND_IMAGES
            );
            updateCondition = {
              ...updateCondition,
              sound_image: soundImageName
            };
          }
          if (reqParam.expertName) {
            updateCondition = {
              ...updateCondition,
              expert_name: reqParam.expertName
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
            updateCondition = {
              ...updateCondition,
              expert_image: expertImageName
            };
          }
          if (reqParam.isExpertImageDeleted) {
            updateCondition = {
              ...updateCondition,
              expert_image: null
            };
          }
          if (reqParam.soundId) {
            if (
              reqParam.approvalStatus === CONTENT_STATUS.APPROVED &&
              req.userType !== USER_TYPE.SUPER_ADMIN
            ) {
              if (!reqParam.soundUrl || !reqParam.soundImage || !reqParam.expertImage) {
                const existingMedia = await Sound.findOne({
                  _id: reqParam.soundId,
                  status: {
                    $ne: STATUS.DELETED
                  }
                }).select('sound_url sound_image expert_image');
                updateCondition = {
                  ...updateCondition,
                  sound_url: !reqParam.soundUrl
                    ? existingMedia.sound_url
                    : updateCondition.soundUrl,
                  sound_image: !reqParam.soundImage
                    ? existingMedia.sound_image
                    : updateCondition.soundImage,
                  expert_image: !reqParam.expertImage
                    ? existingMedia.expert_image
                    : updateCondition.expertImage
                };
              }
              const newDataCondition = {
                ...updateCondition,
                created_by: req.authAdminId
              };
              const newData = await Sound.findOneAndUpdate(
                {
                  parentId: reqParam.soundId
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
                content_type: CONTENT_TYPE.SOUND,
                display_name: reqParam.soundTitle.trim(),
                content_status: CONTENT_STATUS.DRAFT,
                created_by: req.authAdminId,
                comments: addComment
              };
              await ContentApproval.findOneAndUpdate(
                { parentId: reqParam.soundId },
                newContentData,
                {
                  upsert: true
                }
              );
              const presignedData = {
                audioUrl: audioPreSignUrl || null,
                expertImageUrl: expertImageUrl || null
              };
              req.userType !== USER_TYPE.SUPER_ADMIN &&
                (await updateContentUploadedNotification(
                  req.authAdminName,
                  req.authAdminId,
                  newData._id,
                  CONTENT_TYPE.SOUND
                ));
              // axios.get(`http://13.51.222.131:8500/download_mp3_files/?id=${reqParam.soundId}`);

              if (reqParam.soundUrl) {
                setTimeout(() => {
                  audioToSrtHandler(
                    newData._id,
                    CONTENT_TYPE.SOUND,
                    ADMIN_MEDIA_PATH.SOUND_AUDIO,
                    updateCondition.sound_url,
                    ADMIN_MEDIA_PATH.SOUND_SRT
                  );
                }, INITIATE_TRANSCRIPTION_DELAY);
              }

              return Response.successResponseWithoutData(
                res,
                res.__('soundDetailUpdated'),
                SUCCESS,
                presignedData
              );
            } else {
              const filterCondition = {
                _id: reqParam.soundId,
                status: {
                  $ne: STATUS.DELETED
                }
              };
              const existingMedia = await Sound.findOne(filterCondition).select(
                'expert_image sound_url sound_image'
              );
              if (existingMedia) {
                if (
                  (existingMedia.sound_url && reqParam.soundUrl) ||
                  reqParam.isExpertImageDeleted
                ) {
                  await removeOldImage(existingMedia.sound_url, ADMIN_MEDIA_PATH.SOUND_AUDIO, res);
                }
                if (existingMedia.expert_image && reqParam.expertImage) {
                  await removeOldImage(
                    existingMedia.expert_image,
                    ADMIN_MEDIA_PATH.EXPERT_IMAGES,
                    res
                  );
                }
                if (existingMedia.sound_image && reqParam.soundImage) {
                  await removeOldImage(
                    existingMedia.sound_image,
                    ADMIN_MEDIA_PATH.SOUND_IMAGES,
                    res
                  );
                }
              }
              const updateData = await Sound.findOneAndUpdate(filterCondition, updateCondition, {
                new: true
              }).select('_id');
              if (updateData) {
                const filterContentCondition = {
                  content_type_id: updateData._id,
                  content_type: CONTENT_TYPE.SOUND,
                  deletedAt: null
                };
                let updateContentCondition = {
                  display_name: reqParam.soundTitle.trim(),
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
                  soundImageUrl: soundImageUrl || null
                };
                req.userType !== USER_TYPE.SUPER_ADMIN &&
                  (await updateContentUploadedNotification(
                    req.authAdminName,
                    req.authAdminId,
                    updateData._id,
                    CONTENT_TYPE.SOUND
                  ));
                // axios.get(`http://13.51.222.131:8500/download_mp3_files/?id=${updateData._id}`);

                if (reqParam.soundUrl) {
                  setTimeout(() => {
                    audioToSrtHandler(
                      updateData._id,
                      CONTENT_TYPE.SOUND,
                      ADMIN_MEDIA_PATH.SOUND_AUDIO,
                      updateCondition.sound_url,
                      ADMIN_MEDIA_PATH.SOUND_SRT
                    );
                  }, INITIATE_TRANSCRIPTION_DELAY);
                }

                return Response.successResponseWithoutData(
                  res,
                  res.__('soundDetailUpdated'),
                  SUCCESS,
                  presignedData
                );
              } else {
                return Response.successResponseWithoutData(res, res.__('invalidSoundId'), FAIL);
              }
            }
          } else {
            const newDataCondition = {
              ...updateCondition,
              created_by: req.authAdminId
            };
            const newData = await Sound.create(newDataCondition);
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
                content_type: CONTENT_TYPE.SOUND,
                display_name: reqParam.soundTitle.trim(),
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
                  CONTENT_TYPE.SOUND
                ));
              const presignedData = {
                audioUrl: audioPreSignUrl || null,
                expertImageUrl: expertImageUrl || null,
                soundImageUrl: soundImageUrl || null
              };
              // axios.get(`http://13.51.222.131:8500/download_mp3_files/?id=${newData._id}`);

              if (reqParam.soundUrl) {
                setTimeout(() => {
                  audioToSrtHandler(
                    newData._id,
                    CONTENT_TYPE.SOUND,
                    ADMIN_MEDIA_PATH.SOUND_AUDIO,
                    updateCondition.sound_url,
                    ADMIN_MEDIA_PATH.SOUND_SRT
                  );
                }, INITIATE_TRANSCRIPTION_DELAY);
              }

              return Response.successResponseWithoutData(
                res,
                res.__('soundDetailAdded'),
                SUCCESS,
                presignedData
              );
            } else {
              return Response.successResponseWithoutData(res, res.__('invalidSoundId'), FAIL);
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
   * @description This function is used to get detailed sound list
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  getDetailedSoundList: async (req, res) => {
    try {
      const reqParam = req.query;
      await Sound.updateMany({ is_draft: { $eq: null } }, { is_draft: false });

      getDetailedSoundListValidation(reqParam, res, async (validate) => {
        try {
          if (validate) {
            const page = reqParam.page ? parseInt(reqParam.page) : PAGE;
            const perPage = reqParam.perPage ? parseInt(reqParam.perPage) : PER_PAGE;
            const skip = (page - 1) * perPage || 0;
            const sortBy = reqParam.sortBy || SORT_BY;
            const sortOrder = reqParam.sortOrder ? parseInt(reqParam.sortOrder) : SORT_ORDER;

            if (reqParam.id) {
              const detailedSound = await Sound.findOne({
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
                  soundStatus: '$status',
                  audioUrl: {
                    $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.SOUND_AUDIO, '/', '$sound_url']
                  },
                  rating: 1,
                  description: '$description',
                  duration: '$duration',
                  soundBy: '$sound_by',
                  expertName: '$expert_name',
                  soundSrtName: '$sound_srt',
                  srtUrl: {
                    $concat: [CLOUDFRONT_URL, 'admins/sounds/srt/', '$sound_srt']
                  },
                  expertImage: {
                    $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.EXPERT_IMAGES, '/', '$expert_image']
                  },
                  soundImage: {
                    $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.SOUND_IMAGES, '/', '$sound_image']
                  },
                  createdBy: '$createdBy',
                  approvedBy: '$approvedBy',
                  approvalStatus: '$contentApproval.content_status',
                  approvedOn: '$approved_on',
                  createdOn: '$createdAt',
                  expert_id: '$expertId'
                })
                .lean();

              if (!detailedSound) {
                return Response.successResponseWithoutData(res, res.__('noSoundFound'), FAIL);
              }

              const sound = detailedSound && contentResponseObjTransformer(detailedSound);
              return Response.successResponseData(res, sound, SUCCESS, res.__('soundSuccess'));
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
                content_type: CONTENT_TYPE.SOUND,
                content_status: reqParam.approvalStatus
                  ? parseInt(reqParam.approvalStatus)
                  : {
                      $ne: CONTENT_STATUS.DRAFT
                    }
              };
              const soundIds = [];
              const cursor = await ContentApproval.find(contentApprovalCondition)
                .select('content_type_id')
                .cursor();
              await cursor.eachAsync((doc) => {
                soundIds.push(doc.content_type_id);
              });
              filterCondition = {
                _id: {
                  $in: soundIds
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
                ...(reqParam.ratings > 0 && { rating: { $gte: parseInt(reqParam.ratings) } }),
                ...(reqParam.soundStatus && { status: parseInt(reqParam.soundStatus) }),
                ...(reqParam.id && { _id: toObjectId(reqParam.id) } &&
                  delete contentApprovalCondition.content_status)
              };
            }
            const totalRecords = await Sound.countDocuments(filterCondition);
            const detailedSoundList = await Sound.find(filterCondition)
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
                soundStatus: '$status',
                soundUrl: {
                  $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.SOUND_AUDIO, '/', '$sound_url']
                },
                soundSrtName: '$sound_srt',
                srtUrl: {
                  $concat: [CLOUDFRONT_URL, 'admins/sounds/srt/', '$sound_srt']
                },
                duration: '$duration',
                soundBy: '$sound_by',
                expertName: '$expert_name',
                createdBy: '$createdBy',
                rating: 1,
                approvedBy: '$approvedBy',
                approvalStatus: '$contentApproval.content_status',
                approvedOn: '$approved_on',
                timeSpent: '$played_time',
                timeCounts: '$played_counts',
                played_time: 1,
                played_counts: 1,
                createdOn: '$createdAt'
              })
              .lean();
            if (detailedSoundList.length) {
              detailedSoundList.map((sound) => {
                sound.timeSpent = Math.floor(sound.timeSpent / 60);
              });
            }
            const sound = contentResponseObjTransformerList(detailedSoundList);

            for await (const sleep of sound) {
              let rateCondition = {
                content_id: toObjectId(sleep._id)
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

                await Sound.updateOne(
                  { _id: toObjectId(sleep._id) },
                  {
                    $set: {
                      rating: averageRate
                    }
                  }
                );
              }
            }

            return Response.successResponseData(res, sound, SUCCESS, res.__('soundListSuccess'), {
              page,
              perPage,
              totalRecords
            });
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
   * @description This function is used to delete sound
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  deleteSound: (req, res) => {
    try {
      const reqParam = req.query;
      deleteSoundValidation(reqParam, res, async (validate) => {
        if (validate) {
          const deleteData = {
            status: STATUS.DELETED,
            deletedAt: new Date()
          };
          const deleteSound = await Sound.findByIdAndUpdate(reqParam.soundId, deleteData, {
            new: true
          }).select('_id');
          if (deleteSound) {
            const filterContentCondition = {
              content_type_id: reqParam.soundId,
              content_type: CONTENT_TYPE.SOUND
            };
            await ContentApproval.findOneAndUpdate(filterContentCondition, {
              deletedAt: new Date()
            });
            return Response.successResponseWithoutData(res, res.__('soundDeleteSuccess'), SUCCESS);
          } else {
            return Response.successResponseWithoutData(res, res.__('noSoundFound'), FAIL);
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
   * @descirpiton This function is used to get sound by id
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  getSound: (req, res) => {
    try {
      const reqParam = req.params;
      getSoundValidation(reqParam, res, async (validate) => {
        if (validate) {
          const filterCondition = {
            _id: reqParam.id,
            status: {
              $ne: STATUS.DELETED
            }
          };
          const detailedSound = await Sound.findOne(filterCondition)
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
              soundTitle: '$display_name',
              soundStatus: '$status',
              soundUrl: {
                $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.SOUND_AUDIO, '/', '$sound_url']
              },
              description: '$description',
              duration: '$duration',
              soundBy: '$sound_by',
              expertName: '$expert_name',
              soundSrtName: '$sound_srt',
              srtUrl: {
                $concat: [CLOUDFRONT_URL, 'admins/sounds/srt/', '$sound_srt']
              },
              expertImage: {
                $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.EXPERT_IMAGES, '/', '$expert_image']
              },
              soundImage: {
                $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.SOUND_IMAGES, '/', '$sound_image']
              },
              createdBy: '$createdBy',
              approvedBy: '$approvedBy',
              approvalStatus: '$contentApproval.content_status',
              approvedOn: '$approved_on',
              createdOn: '$createdAt',
              expertId: '$expert_id'
            })
            .lean();
          const sound = contentResponseObjTransformer(detailedSound);
          return Response.successResponseData(res, sound, SUCCESS, res.__('soundListSuccess'));
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  addEditDraftSound: (req, res) => {
    try {
      const reqParam = req.body;
      addEditDraftSoundValidation(reqParam, res, async (validate) => {
        if (validate) {
          let updateCondition = {
            display_name: reqParam?.soundTitle,
            description: reqParam?.description,
            duration: reqParam?.duration,
            // sound_by: reqParam?.soundBy,
            status: reqParam?.soundStatus,
            focus_ids: reqParam?.focusIds,
            is_draft: reqParam?.isDraft || true
          };

          if (reqParam.expertId) {
            updateCondition = {
              ...updateCondition,
              expert_id: reqParam.expertId
            };
          }
          if (req.userType === USER_TYPE.SUPER_ADMIN) {
            updateCondition = {
              ...updateCondition,
              approved_by: req.authAdminId,
              approved_on: new Date()
            };
          }
          let audioPreSignUrl;
          let expertImageUrl;
          let soundImageUrl;
          if (reqParam.soundUrl) {
            const audioExtension = reqParam.soundUrl.split('/')[1];
            const audioName = `${unixTimeStamp(new Date())}-${makeRandomDigit(
              4
            )}.${audioExtension}`;
            audioPreSignUrl = await getUploadURL(
              reqParam.soundUrl,
              audioName,
              ADMIN_MEDIA_PATH.SOUND_AUDIO
            );
            updateCondition = {
              ...updateCondition,
              sound_url: audioName
            };
          }
          if (reqParam.soundImage) {
            const imageExtension = reqParam.soundImage.split('/')[1];
            const soundImageName = `${unixTimeStamp(new Date())}-${makeRandomDigit(
              4
            )}.${imageExtension}`;
            soundImageUrl = await getUploadURL(
              reqParam.soundImage,
              soundImageName,
              ADMIN_MEDIA_PATH.SOUND_IMAGES
            );
            updateCondition = {
              ...updateCondition,
              sound_image: soundImageName
            };
          }
          if (reqParam.expertName) {
            updateCondition = {
              ...updateCondition,
              expert_name: reqParam.expertName
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
            updateCondition = {
              ...updateCondition,
              expert_image: expertImageName
            };
          }
          if (reqParam.isExpertImageDeleted) {
            updateCondition = {
              ...updateCondition,
              expert_image: null
            };
          }
          if (reqParam.soundId) {
            if (
              reqParam.approvalStatus === CONTENT_STATUS.APPROVED &&
              req.userType !== USER_TYPE.SUPER_ADMIN
            ) {
              if (!reqParam.soundUrl || !reqParam.soundImage || !reqParam.expertImage) {
                const existingMedia = await Sound.findOne({
                  _id: reqParam.soundId,
                  status: {
                    $ne: STATUS.DELETED
                  }
                }).select('sound_url sound_image expert_image');
                updateCondition = {
                  ...updateCondition,
                  sound_url: !reqParam.soundUrl
                    ? existingMedia.sound_url
                    : updateCondition.soundUrl,
                  sound_image: !reqParam.soundImage
                    ? existingMedia.sound_image
                    : updateCondition.soundImage,
                  expert_image: !reqParam.expertImage
                    ? existingMedia.expert_image
                    : updateCondition.expertImage
                };
              }
              const newDataCondition = {
                ...updateCondition,
                created_by: req.authAdminId
              };
              const newData = await Sound.findOneAndUpdate(
                {
                  parentId: reqParam.soundId
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
                content_type: CONTENT_TYPE.SOUND,
                display_name: reqParam.soundTitle,
                content_status: CONTENT_STATUS.DRAFT,
                created_by: req.authAdminId,
                comments: addComment
              };
              await ContentApproval.findOneAndUpdate(
                { parentId: reqParam.soundId },
                newContentData,
                {
                  upsert: true
                }
              );
              const presignedData = {
                audioUrl: audioPreSignUrl || null,
                expertImageUrl: expertImageUrl || null
              };
              req.userType !== USER_TYPE.SUPER_ADMIN &&
                (await updateContentUploadedNotification(
                  req.authAdminName,
                  req.authAdminId,
                  newData._id,
                  CONTENT_TYPE.SOUND
                ));

              if (reqParam.soundUrl) {
                setTimeout(() => {
                  audioToSrtHandler(
                    newData._id,
                    CONTENT_TYPE.SOUND,
                    ADMIN_MEDIA_PATH.SOUND_AUDIO,
                    updateCondition.sound_url,
                    ADMIN_MEDIA_PATH.SOUND_SRT
                  );
                }, INITIATE_TRANSCRIPTION_DELAY);
              }

              return Response.successResponseWithoutData(
                res,
                res.__('soundDraftDetailUpdated'),
                SUCCESS,
                presignedData
              );
            } else {
              const filterCondition = {
                _id: reqParam.soundId,
                status: {
                  $ne: STATUS.DELETED
                }
              };
              const existingMedia = await Sound.findOne(filterCondition).select(
                'expert_image sound_url sound_image'
              );
              if (existingMedia) {
                if (
                  (existingMedia.sound_url && reqParam.soundUrl) ||
                  reqParam.isExpertImageDeleted
                ) {
                  await removeOldImage(existingMedia.sound_url, ADMIN_MEDIA_PATH.SOUND_AUDIO, res);
                }
                if (existingMedia.expert_image && reqParam.expertImage) {
                  await removeOldImage(
                    existingMedia.expert_image,
                    ADMIN_MEDIA_PATH.EXPERT_IMAGES,
                    res
                  );
                }
                if (existingMedia.sound_image && reqParam.soundImage) {
                  await removeOldImage(
                    existingMedia.sound_image,
                    ADMIN_MEDIA_PATH.SOUND_IMAGES,
                    res
                  );
                }
              }
              const updateData = await Sound.findOneAndUpdate(filterCondition, updateCondition, {
                new: true
              }).select('_id');
              if (updateData) {
                const filterContentCondition = {
                  content_type_id: updateData._id,
                  content_type: CONTENT_TYPE.SOUND,
                  deletedAt: null
                };
                let updateContentCondition = {
                  display_name: reqParam.soundTitle,
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
                  soundImageUrl: soundImageUrl || null
                };
                req.userType !== USER_TYPE.SUPER_ADMIN &&
                  (await updateContentUploadedNotification(
                    req.authAdminName,
                    req.authAdminId,
                    updateData._id,
                    CONTENT_TYPE.SOUND
                  ));

                if (reqParam.soundUrl) {
                  setTimeout(() => {
                    audioToSrtHandler(
                      updateData._id,
                      CONTENT_TYPE.SOUND,
                      ADMIN_MEDIA_PATH.SOUND_AUDIO,
                      updateCondition.sound_url,
                      ADMIN_MEDIA_PATH.SOUND_SRT
                    );
                  }, INITIATE_TRANSCRIPTION_DELAY);
                }

                return Response.successResponseWithoutData(
                  res,
                  res.__('soundDraftDetailUpdated'),
                  SUCCESS,
                  presignedData
                );
              } else {
                return Response.successResponseWithoutData(res, res.__('invalidSoundId'), FAIL);
              }
            }
          } else {
            const newDataCondition = {
              ...updateCondition,
              created_by: req.authAdminId
            };
            const newData = await Sound.create(newDataCondition);
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
                content_type: CONTENT_TYPE.SOUND,
                display_name: reqParam.soundTitle,
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
                  CONTENT_TYPE.SOUND
                ));
              const presignedData = {
                audioUrl: audioPreSignUrl || null,
                expertImageUrl: expertImageUrl || null,
                soundImageUrl: soundImageUrl || null
              };

              if (reqParam.soundUrl) {
                setTimeout(() => {
                  audioToSrtHandler(
                    newData._id,
                    CONTENT_TYPE.SOUND,
                    ADMIN_MEDIA_PATH.SOUND_AUDIO,
                    updateCondition.sound_url,
                    ADMIN_MEDIA_PATH.SOUND_SRT
                  );
                }, INITIATE_TRANSCRIPTION_DELAY);
              }

              return Response.successResponseWithoutData(
                res,
                res.__('soundDraftDetailAdded'),
                SUCCESS,
                presignedData
              );
            } else {
              return Response.successResponseWithoutData(res, res.__('invalidSoundId'), FAIL);
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

  getDetailedDraftSoundList: (req, res) => {
    try {
      const reqParam = req.query;
      getDetailedDraftSoundListValidation(reqParam, res, async (validate) => {
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
            ...(reqParam.soundStatus && { status: parseInt(reqParam.soundStatus) })
          };
          const totalRecords = await Sound.countDocuments(filterCondition);
          const detailedSoundList = await Sound.find(filterCondition)
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
              soundTitle: '$display_name',
              soundStatus: '$status',
              soundUrl: {
                $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.SOUND_AUDIO, '/', '$sound_url']
              },
              duration: '$duration',
              soundBy: '$sound_by',
              expertName: '$expert_name',
              createdBy: '$createdBy',
              approvedBy: '$approvedBy',
              approvalStatus: '$contentApproval.content_status',
              approvedOn: '$approved_on',
              createdOn: '$createdAt'
            })
            .lean();
          const sound = contentResponseObjTransformerList(detailedSoundList);
          return Response.successResponseData(
            res,
            sound,
            SUCCESS,
            res.__('soundDraftListSuccess'),
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
