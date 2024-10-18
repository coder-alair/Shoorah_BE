'use strict';

const { RecentlyPlayed } = require('@models');
const Response = require('@services/Response');

const { toObjectId, dynamicModelName } = require('@services/Helper');
const {
  SUCCESS,
  STATUS,
  CLOUDFRONT_URL,
  ADMIN_MEDIA_PATH,
  CONTENT_TYPE
} = require('@services/Constant');
const { ContentCounts } = require('../../../models');

module.exports = {
  /**
   * @description This function is used to get logged-in user recently played list
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  recentlyPlayedList: async (req, res) => {
    const reqParam = req.query;
    try {
      const filterCondition = {
        user_id: toObjectId(req.authUserId),
        content_type: parseInt(reqParam.contentType),
        deletedAt: null
      };
      const lookupModel = dynamicModelName(filterCondition.content_type);
      const aggregatePipeline = [
        {
          $match: filterCondition
        },
        {
          $lookup: {
            from: lookupModel,
            let: {
              content_id: '$content_id',
              content_type: '$content_type'
            },
            pipeline: [
              {
                $match: {
                  status: STATUS.ACTIVE,
                  approved_by: {
                    $ne: null
                  },
                  $expr: {
                    $eq: ['$_id', '$$content_id']
                  }
                }
              },
              {
                $project: {
                  updatedAt: 1,
                  contentId: '$_id',
                  contentName: '$display_name',
                  focus: '$focus_ids',
                  _id: 0,
                  contentType: '$content_type',
                  content_type: 1,
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
                  },
                  url: {
                    $switch: {
                      branches: [
                        {
                          case: { $eq: ['$$content_type', CONTENT_TYPE.MEDITATION] },
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
                          case: { $eq: ['$$content_type', CONTENT_TYPE.SOUND] },
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
                          case: { $eq: ['$$content_type', CONTENT_TYPE.SHOORAH_PODS] },
                          then: {
                            $concat: [
                              CLOUDFRONT_URL,
                              ADMIN_MEDIA_PATH.SHOORAH_PODS_AUDIO,
                              '/',
                              '$pods_url'
                            ]
                          }
                        },
                        {
                          case: { $eq: ['$$content_type', CONTENT_TYPE.BREATHWORK] },
                          then: {
                            $concat: [
                              CLOUDFRONT_URL,
                              ADMIN_MEDIA_PATH.BREATHWORK_AUDIO,
                              '/',
                              '$breathwork_url'
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
                          case: { $eq: ['$$content_type', CONTENT_TYPE.MEDITATION] },
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
                          case: { $eq: ['$$content_type', CONTENT_TYPE.SOUND] },
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
                          case: { $eq: ['$$content_type', CONTENT_TYPE.SHOORAH_PODS] },
                          then: {
                            $concat: [
                              CLOUDFRONT_URL,
                              ADMIN_MEDIA_PATH.SHOORAH_PODS_IMAGE,
                              '/',
                              '$pods_image'
                            ]
                          }
                        },
                        {
                          case: { $eq: ['$$content_type', CONTENT_TYPE.BREATHWORK] },
                          then: {
                            $concat: [
                              CLOUDFRONT_URL,
                              ADMIN_MEDIA_PATH.BREATHWORK_IMAGE,
                              '/',
                              '$breathwork_image'
                            ]
                          }
                        }
                      ],
                      default: null
                    }
                  },
                  srtUrl: {
                    $switch: {
                      branches: [
                        {
                          case: { $eq: ['$$content_type', CONTENT_TYPE.MEDITATION] },
                          then: {
                            $concat: [
                              CLOUDFRONT_URL,
                              'admins/meditations/srt/',
                              '$meditation_srt'
                            ]
                          }
                        },
                        {
                          case: { $eq: ['$$content_type', CONTENT_TYPE.SOUND] },
                          then: {
                            $concat: [CLOUDFRONT_URL, 'admins/sounds/srt/', '$sound_srt']
                          }
                        },
                        {
                          case: { $eq: ['$$content_type', CONTENT_TYPE.SHOORAH_PODS] },
                          then: {
                            $concat: [CLOUDFRONT_URL, 'admins/shoorah_pods/srt/', '$pods_srt']
                          }
                        },
                        {
                          case: { $eq: ['$$content_type', CONTENT_TYPE.BREATHWORK] },
                          then: {
                            $concat: [CLOUDFRONT_URL, 'admins/breathworks/srt/', '$breathwork_srt']
                          }
                        }
                      ],
                      default: null
                    }
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
            preserveNullAndEmptyArrays: false
          }
        },
        {
          $lookup: {
            from: 'bookmarks',
            let: {
              contentId: '$content_id'
            },
            pipeline: [
              {
                $match: {
                  user_id: toObjectId(req.authUserId),
                  $expr: {
                    $eq: ['$content_id', '$$contentId']
                  }
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
          $lookup: {
            from: 'focus',
            let: {
              focusIds: { $ifNull: ['$content.focus', []] }
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
              },
              {
                $project: {
                  display_name: 1
                }
              }
            ],
            as: 'content.focus'
          }
        },
        {
          $sort: {
            updatedAt: -1
          }
        },
        {
          $group: {
            _id: '$content.contentId',  // Group by contentId to remove duplicates
            content: { $first: '$content' }  // Keep the first occurrence of each content
          }
        },
        {
          $limit: 8
        },
        {
          $project: {
            'focus': '$content.focus.display_name',
            'contentId': '$content.contentId',
            'contentName': '$content.contentName',
            'contentType': '$content.contentType',
            'duration': '$content.duration',
            'description': '$content.description',
            'expertName': '$content.expertName',
            'expertImage': '$content.expertImage',
            'url': '$content.url',
            'image': '$content.image',
            'srtUrl': '$content.srtUrl',
            'isBookmarked': {
              $cond: [
                {
                  $gt: [{ $size: { $ifNull: ['$bookmarks', []] } }, 0]
                },
                true,
                false
              ]
            }
          }
        }
      ];

      const recentData = await RecentlyPlayed.aggregate(aggregatePipeline);

      const totalMusic = await RecentlyPlayed.find({
        user_id: req.authUserId,
        content_type: parseInt(reqParam.contentType)
      });

      let existingCount = await ContentCounts.findOne({ user_id: req.authUserId });
      if (existingCount) {
        if (parseInt(reqParam.contentType) == 3) {
          await ContentCounts.updateOne(
            { user_id: req.authUserId },
            {
              $set: {
                meditation: totalMusic.length
              }
            }
          );
        } else if (parseInt(reqParam.contentType) == 4) {
          await ContentCounts.updateOne(
            { user_id: req.authUserId },
            {
              $set: {
                sleeps: totalMusic.length
              }
            }
          );
        } else if (parseInt(reqParam.contentType) == 5) {
          await ContentCounts.updateOne(
            { user_id: req.authUserId },
            {
              $set: {
                pods: totalMusic.length
              }
            }
          );
        }
      } else {
        if (parseInt(reqParam.contentType) == 3) {
          await ContentCounts.create({
            meditation: totalMusic.length,
            user_id: req.authUserId
          });
        } else if (parseInt(reqParam.contentType) == 4) {
          await ContentCounts.create({
            sleeps: totalMusic.length,
            user_id: req.authUserId
          });
        } else if (parseInt(reqParam.contentType) == 5) {
          await ContentCounts.create({
            pods: totalMusic.length,
            user_id: req.authUserId
          });
        }
      }

      return recentData.length > 0
        ? Response.successResponseData(
          res,
          recentData,
          SUCCESS,
          res.__('recentlyPlayedList')
        )
        : Response.successResponseData(res, [], SUCCESS, res.__('recentlyPlayedList'));
    } catch (err) {
      console.log(err)
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to update recently played list of user.
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  addToRecentlyPlayed: async (req, res) => {
    try {
      const reqParam = req.body;
      const filterCondition = {
        user_id: req.authUserId,
        content_id: reqParam.contentId
      };
      const updateCondition = {
        user_id: req.authUserId,
        content_id: reqParam.contentId,
        content_type: parseInt(reqParam.contentType)
      };
      await RecentlyPlayed.create(updateCondition);
      Response.successResponseWithoutData(res, res.__('addToRecentPlayed'), SUCCESS);
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  }
};
