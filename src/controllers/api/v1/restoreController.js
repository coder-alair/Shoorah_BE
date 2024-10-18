'use strict';

const { Meditation, Sound, ShoorahPods } = require('@models');
const Response = require('@services/Response');
const {
  restoreMeditationListValidation,
  restoreSoundListValidation,
  shoorahPodsListValidation
} = require('@services/userValidations/restoreValidations');
const {
  PAGE,
  PER_PAGE,
  SUCCESS,
  FAIL,
  STATUS,
  CONTENT_TYPE,
  CLOUDFRONT_URL,
  ADMIN_MEDIA_PATH
} = require('@services/Constant');
const { toObjectId } = require('@services/Helper');
const { Category } = require('../../../models');

module.exports = {
  /**
   * @description This function is used to get restore meditation list
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  restoreMeditationList: async (req, res) => {
    try {
      const reqParam = req.query;
      if (reqParam.categoryId) {
        let category = await Category.findOne({
          _id: reqParam.categoryId,
          contentType: CONTENT_TYPE.MEDITATION
        });
        reqParam.focusIds = category?.focuses;
        reqParam.focusIds = reqParam?.focusIds?.map((objectId) => objectId.toString());
      }

      restoreMeditationListValidation(reqParam, res, async (validate) => {
        if (validate) {
          let page = PAGE;
          let perPage = PER_PAGE;
          if (reqParam.page) {
            page = parseInt(reqParam.page);
          }
          if (reqParam.perPage) {
            perPage = parseInt(reqParam.perPage);
          }
          const skip = (page - 1) * perPage || 0;
          let filterCondition = {
            status: STATUS.ACTIVE,
            approved_by: {
              $ne: null
            }
          };
          if (reqParam.searchKey) {
            filterCondition = {
              ...filterCondition,
              $or: [
                {
                  display_name: { $regex: '.*' + reqParam.searchKey + '.*', $options: 'i' }
                },
                {
                  expert_name: { $regex: '.*' + reqParam.searchKey + '.*', $options: 'i' }
                }
              ]
            };
          }
          const aggregatePipeline = [
            {
              $match: filterCondition
            },
            {
              $unwind: {
                path: '$focus_ids',
                preserveNullAndEmptyArrays: false
              }
            }
          ];
          if (reqParam.focusIds) {
            const objFocusIds = [];
            reqParam.focusIds.map((el) => {
              objFocusIds.push(toObjectId(el));
            });
            aggregatePipeline.push({
              $match: {
                focus_ids: {
                  $in: objFocusIds
                }
              }
            });
          }
          aggregatePipeline.push(
            {
              $group: {
                _id: '$_id',
                focus_ids: {
                  $addToSet: '$focus_ids'
                },
                display_name: {
                  $first: '$display_name'
                },
                description: {
                  $first: '$description'
                },
                duration: {
                  $first: '$duration'
                },
                meditation_url: {
                  $first: '$meditation_url'
                },
                meditation_srt: {
                  $first: '$meditation_srt'
                },
                meditation_image: {
                  $first: '$meditation_image'
                },
                expert_name: {
                  $first: '$expert_name'
                },
                expert_image: {
                  $first: '$expert_image'
                },
                updatedAt: {
                  $first: '$updatedAt'
                }
              }
            },
            {
              $lookup: {
                from: 'bookmarks',
                let: {
                  meditationId: '$_id'
                },
                pipeline: [
                  {
                    $match: {
                      user_id: toObjectId(req.authUserId),
                      deletedAt: null,
                      $expr: {
                        $eq: ['$$meditationId', '$content_id']
                      },
                      content_type: CONTENT_TYPE.MEDITATION
                    }
                  },
                  {
                    $project: {
                      _id: 1
                    }
                  }
                ],
                as: 'bookmarks'
              }
            },
            {
              $project: {
                contentId: '$_id',
                contentName: '$display_name',
                description: 1,
                duration: 1,
                url: {
                  $concat: [
                    CLOUDFRONT_URL,
                    ADMIN_MEDIA_PATH.MEDITATION_AUDIO,
                    '/',
                    '$meditation_url'
                  ]
                },
                meditationSrtName: '$meditation_srt',
                srtUrl: {
                  $concat: [CLOUDFRONT_URL, 'admins/meditations/srt/', '$meditation_srt']
                },
                image: {
                  $concat: [
                    CLOUDFRONT_URL,
                    ADMIN_MEDIA_PATH.MEDITATION_IMAGE,
                    '/',
                    '$meditation_image'
                  ]
                },
                expertName: '$expert_name',
                updatedAt: 1,
                expertImage: {
                  $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.EXPERT_IMAGES, '/', '$expert_image']
                },
                isBookmarked: {
                  $cond: [
                    {
                      $gt: [{ $size: '$bookmarks' }, 0]
                    },
                    true,
                    false
                  ]
                },
                _id: 0
              }
            },
            {
              $addFields: {
                contentType: CONTENT_TYPE.MEDITATION
              }
            },
            {
              $sort: {
                updatedAt: -1
              }
            },
            {
              $facet: {
                metaData: [
                  {
                    $count: 'totalCount'
                  },
                  {
                    $addFields: {
                      page,
                      perPage
                    }
                  }
                ],
                data: [
                  {
                    $skip: skip
                  },
                  {
                    $limit: perPage
                  }
                ]
              }
            }
          );
          const meditationData = await Meditation.aggregate(aggregatePipeline);
          return meditationData.length > 0
            ? Response.successResponseData(
                res,
                meditationData[0].data,
                SUCCESS,
                res.__('restoreMeditationList'),
                meditationData[0].metaData[0]
              )
            : Response.successResponseWithoutData(res, res.__('noRestoreMeditationFound'), FAIL);
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to get restore sounds list
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  restoreSoundList: async (req, res) => {
    try {
      const reqParam = req.query;
      if (reqParam.categoryId) {
        let category = await Category.findOne({
          _id: reqParam.categoryId,
          contentType: CONTENT_TYPE.SOUND
        });
        reqParam.focusIds = category?.focuses;
        reqParam.focusIds = reqParam?.focusIds?.map((objectId) => objectId.toString());
      }
      restoreSoundListValidation(reqParam, res, async (validate) => {
        if (validate) {
          let page = PAGE;
          let perPage = PER_PAGE;
          if (reqParam.page) {
            page = parseInt(reqParam.page);
          }
          if (reqParam.perPage) {
            perPage = parseInt(reqParam.perPage);
          }
          const skip = (page - 1) * perPage || 0;
          let filterCondition = {
            status: STATUS.ACTIVE,
            approved_by: {
              $ne: null
            }
          };
          if (reqParam.searchKey) {
            filterCondition = {
              ...filterCondition,
              $or: [
                {
                  display_name: { $regex: '.*' + reqParam.searchKey + '.*', $options: 'i' }
                },
                {
                  expert_name: { $regex: '.*' + reqParam.searchKey + '.*', $options: 'i' }
                }
              ]
            };
          }
          const aggregationPipeline = [
            {
              $match: filterCondition
            },
            {
              $unwind: {
                path: '$focus_ids',
                preserveNullAndEmptyArrays: false
              }
            }
          ];
          if (reqParam.focusIds) {
            const objFocusIds = [];
            reqParam.focusIds.map((el) => {
              objFocusIds.push(toObjectId(el));
            });
            aggregationPipeline.push({
              $match: {
                focus_ids: {
                  $in: objFocusIds
                }
              }
            });
          }
          aggregationPipeline.push(
            {
              $group: {
                _id: '$_id',
                focus_ids: {
                  $addToSet: '$focus_ids'
                },
                display_name: {
                  $first: '$display_name'
                },
                description: {
                  $first: '$description'
                },
                duration: {
                  $first: '$duration'
                },
                sound_url: {
                  $first: '$sound_url'
                },
                sound_srt: {
                  $first: '$sound_srt'
                },
                sound_image: {
                  $first: '$sound_image'
                },
                expert_name: {
                  $first: '$expert_name'
                },
                expert_image: {
                  $first: '$expert_image'
                },
                updatedAt: {
                  $first: '$updatedAt'
                }
              }
            },
            {
              $lookup: {
                from: 'bookmarks',
                let: {
                  soundId: '$_id'
                },
                pipeline: [
                  {
                    $match: {
                      user_id: toObjectId(req.authUserId),
                      deletedAt: null,
                      $expr: {
                        $eq: ['$$soundId', '$content_id']
                      },
                      content_type: CONTENT_TYPE.SOUND
                    }
                  },
                  {
                    $project: {
                      _id: 1
                    }
                  }
                ],
                as: 'bookmarks'
              }
            },
            {
              $project: {
                contentId: '$_id',
                contentName: '$display_name',
                description: 1,
                duration: 1,
                url: {
                  $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.SOUND_AUDIO, '/', '$sound_url']
                },
                soundSrtName: '$sound_srt',
                srtUrl: {
                  $concat: [CLOUDFRONT_URL, 'admins/sounds/srt/', '$sound_srt']
                },
                image: {
                  $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.SOUND_IMAGES, '/', '$sound_image']
                },
                expertName: '$expert_name',
                expertImage: {
                  $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.EXPERT_IMAGES, '/', '$expert_image']
                },
                updatedAt: 1,
                isBookmarked: {
                  $cond: [
                    {
                      $gt: [{ $size: '$bookmarks' }, 0]
                    },
                    true,
                    false
                  ]
                },
                _id: 0
              }
            },
            {
              $addFields: {
                contentType: CONTENT_TYPE.SOUND
              }
            },
            {
              $sort: {
                updatedAt: -1
              }
            },
            {
              $facet: {
                metaData: [
                  {
                    $count: 'totalCount'
                  },
                  {
                    $addFields: {
                      page,
                      perPage
                    }
                  }
                ],
                data: [
                  {
                    $skip: skip
                  },
                  {
                    $limit: perPage
                  }
                ]
              }
            }
          );
          const soundData = await Sound.aggregate(aggregationPipeline);
          return soundData.length > 0
            ? Response.successResponseData(
                res,
                soundData[0].data,
                SUCCESS,
                res.__('restoreSoundList'),
                soundData[0].metaData[0]
              )
            : Response.successResponseWithoutData(res, res.__('noRestoreSoundFound'), FAIL);
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
      let reqParam = req.query;
      if (reqParam.categoryId) {
        let category = await Category.findOne({
          _id: reqParam.categoryId,
          contentType: CONTENT_TYPE.SHOORAH_PODS
        });
        reqParam.focusIds = category?.focuses;
        reqParam.focusIds = reqParam?.focusIds?.map((objectId) => objectId.toString());
      }

      shoorahPodsListValidation(reqParam, res, async (validate) => {
        if (validate) {
          let page = PAGE;
          let perPage = PER_PAGE;
          if (reqParam.page) {
            page = parseInt(reqParam.page);
          }
          if (reqParam.perPage) {
            perPage = parseInt(reqParam.perPage);
          }
          const skip = (page - 1) * perPage || 0;
          let filterCondition = {
            status: STATUS.ACTIVE,
            approved_by: {
              $ne: null
            }
          };
          if (reqParam.searchKey) {
            filterCondition = {
              ...filterCondition,
              $or: [
                {
                  display_name: { $regex: '.*' + reqParam.searchKey + '.*', $options: 'i' }
                },
                {
                  expert_name: { $regex: '.*' + reqParam.searchKey + '.*', $options: 'i' }
                }
              ]
            };
          }
          const aggregatePipeline = [
            {
              $match: filterCondition
            },
            {
              $unwind: {
                path: '$focus_ids',
                preserveNullAndEmptyArrays: false
              }
            }
          ];
          if (reqParam.focusIds) {
            const objFocusIds = [];
            reqParam.focusIds.map((el) => {
              objFocusIds.push(toObjectId(el));
            });
            aggregatePipeline.push({
              $match: {
                focus_ids: {
                  $in: objFocusIds
                }
              }
            });
          }
          aggregatePipeline.push(
            {
              $group: {
                _id: '$_id',
                focus_ids: {
                  $addToSet: '$focus_ids'
                },
                display_name: {
                  $first: '$display_name'
                },
                description: {
                  $first: '$description'
                },
                duration: {
                  $first: '$duration'
                },
                pods_url: {
                  $first: '$pods_url'
                },
                pods_srt: {
                  $first: '$pods_srt'
                },
                pods_image: {
                  $first: '$pods_image'
                },
                expert_name: {
                  $first: '$expert_name'
                },
                expert_image: {
                  $first: '$expert_image'
                },
                updatedAt: {
                  $first: '$updatedAt'
                }
              }
            },
            {
              $lookup: {
                from: 'bookmarks',
                let: {
                  podsId: '$_id'
                },
                pipeline: [
                  {
                    $match: {
                      user_id: toObjectId(req.authUserId),
                      deletedAt: null,
                      $expr: {
                        $eq: ['$$podsId', '$content_id']
                      },
                      content_type: CONTENT_TYPE.SHOORAH_PODS
                    }
                  },
                  {
                    $project: {
                      _id: 1
                    }
                  }
                ],
                as: 'bookmarks'
              }
            },
            {
              $project: {
                contentId: '$_id',
                contentName: '$display_name',
                description: 1,
                duration: 1,
                podsSrtName: '$pods_srt',
                url: {
                  $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.SHOORAH_PODS_AUDIO, '/', '$pods_url']
                },
                image: {
                  $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.SHOORAH_PODS_IMAGE, '/', '$pods_image']
                },
                srtUrl: {
                  $concat: [CLOUDFRONT_URL, 'admins/shoorah_pods/srt/', '$pods_srt']
                },
                expertImage: {
                  $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.EXPERT_IMAGES, '/', '$expert_image']
                },
                expertName: '$expert_name',
                updatedAt: 1,
                isBookmarked: {
                  $cond: [
                    {
                      $gt: [{ $size: '$bookmarks' }, 0]
                    },
                    true,
                    false
                  ]
                },
                _id: 0
              }
            },
            {
              $addFields: {
                contentType: CONTENT_TYPE.SHOORAH_PODS
              }
            },
            {
              $sort: {
                updatedAt: -1
              }
            },
            {
              $facet: {
                metaData: [
                  {
                    $count: 'totalCount'
                  },
                  {
                    $addFields: {
                      page,
                      perPage
                    }
                  }
                ],
                data: [
                  {
                    $skip: skip
                  },
                  {
                    $limit: perPage
                  }
                ]
              }
            }
          );
          const shoorahPods = await ShoorahPods.aggregate(aggregatePipeline);
          return shoorahPods.length > 0
            ? Response.successResponseData(
                res,
                shoorahPods[0].data,
                SUCCESS,
                res.__('shoorahPodsList'),
                shoorahPods[0].metaData[0]
              )
            : Response.successResponseWithoutData(res, res.__('noShoorahPodsFound'), FAIL);
        }
      });
    } catch (err) {
      console.log(err);
      return Response.internalServerErrorResponse(res);
    }
  }
};
