'use strict';

const { Sound } = require('@models');
const Response = require('@services/Response');
const { getSoundValidation } = require('@services/adminValidations/soundValidations');
const {
  STATUS,
  SUCCESS,

  ADMIN_MEDIA_PATH,
  CLOUDFRONT_URL
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
const { convertObjectKeysToCamelCase, dynamicModelName } = require('../../../services/Helper');
const { CONTENT_TYPE } = require('../../../services/Constant');
const { Meditation, ShoorahPods } = require('../../../models');

module.exports = {
  getSoundById: async (req, res) => {
    try {
      const reqParam = req.params;
      if (reqParam.contentType) {
        const filterCondition = {
          _id: toObjectId(reqParam.contentId),
          deletedAt: null
        };
        let content_type = parseInt(reqParam.contentType);
        const lookupModel = await dynamicModelName(content_type);
        console.log(lookupModel);

        const aggregateCondition = [
          {
            $match: filterCondition
          },
          {
            $lookup: {
              from: lookupModel,
              let: {
                contentId: '$content_id'
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $eq: ['$$contentId', '$_id']
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
            $project: {
              updatedAt: 1,
              contentId: '$content._id',
              contentName: '$content.display_name',
              _id: 0,
              duration: '$content.duration',
              description: '$content.description',
              expertName: '$content.expert_name',
              expertImage: {
                $concat: [
                  CLOUDFRONT_URL,
                  ADMIN_MEDIA_PATH.EXPERT_IMAGES,
                  '/',
                  '$content.expert_image'
                ]
              },
              url: {
                $switch: {
                  branches: [
                    {
                      case: { $eq: ['$content_type', CONTENT_TYPE.MEDITATION] },
                      then: {
                        $concat: [
                          CLOUDFRONT_URL,
                          ADMIN_MEDIA_PATH.MEDITATION_AUDIO,
                          '/',
                          '$content.meditation_url'
                        ]
                      }
                    },
                    {
                      case: { $eq: ['$content_type', CONTENT_TYPE.SOUND] },
                      then: {
                        $concat: [
                          CLOUDFRONT_URL,
                          ADMIN_MEDIA_PATH.SOUND_AUDIO,
                          '/',
                          '$content.sound_url'
                        ]
                      }
                    },
                    {
                      case: { $eq: ['$content_type', CONTENT_TYPE.SHOORAH_PODS] },
                      then: {
                        $concat: [
                          CLOUDFRONT_URL,
                          ADMIN_MEDIA_PATH.SHOORAH_PODS_AUDIO,
                          '/',
                          '$content.pods_url'
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
                      case: { $eq: ['$content_type', CONTENT_TYPE.MEDITATION] },
                      then: {
                        $concat: [
                          CLOUDFRONT_URL,
                          ADMIN_MEDIA_PATH.MEDITATION_IMAGE,
                          '/',
                          '$content.meditation_image'
                        ]
                      }
                    },
                    {
                      case: { $eq: ['$content_type', CONTENT_TYPE.SOUND] },
                      then: {
                        $concat: [
                          CLOUDFRONT_URL,
                          ADMIN_MEDIA_PATH.SOUND_IMAGES,
                          '/',
                          '$content.sound_image'
                        ]
                      }
                    },
                    {
                      case: { $eq: ['$content_type', CONTENT_TYPE.SHOORAH_PODS] },
                      then: {
                        $concat: [
                          CLOUDFRONT_URL,
                          ADMIN_MEDIA_PATH.SHOORAH_PODS_IMAGE,
                          '/',
                          '$content.pods_image'
                        ]
                      }
                    }
                  ],
                  default: null
                }
              }
            }
          }
        ];

        let sounds;

        if (reqParam.contentType == CONTENT_TYPE.MEDITATION) {
          sounds = await Meditation.aggregate([
            {
              $match: filterCondition // Your filter condition goes here
            },
            {
              $project: {
                updatedAt: 1,
                contentId: '$_id',
                contentName: '$display_name',
                duration: '$duration',
                description: '$description',
                expertName: '$expert_name',
                expertImage: {
                  $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.EXPERT_IMAGES, '/', '$expert_image']
                },
                url: {
                  $concat: [
                    CLOUDFRONT_URL,
                    ADMIN_MEDIA_PATH.MEDITATION_AUDIO,
                    '/',
                    '$meditation_url'
                  ]
                },
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
                }
              }
            }
          ]);
        }
        if (reqParam.contentType == CONTENT_TYPE.SOUND) {
          sounds = await Sound.aggregate([
            {
              $match: filterCondition // Your filter condition goes here
            },
            {
              $project: {
                updatedAt: 1,
                contentId: '$_id',
                contentName: '$display_name',
                duration: '$duration',
                description: '$description',
                expertName: '$expert_name',
                expertImage: {
                  $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.EXPERT_IMAGES, '/', '$expert_image']
                },
                url: {
                  $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.SOUND_AUDIO, '/', '$sound_url']
                },
                srtUrl: {
                  $concat: [CLOUDFRONT_URL, 'admins/sounds/srt/', '$sound_srt']
                },
                image: {
                  $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.SOUND_IMAGES, '/', '$sound_image']
                }
              }
            }
          ]);
        }

        if (reqParam.contentType == CONTENT_TYPE.SHOORAH_PODS) {
          sounds = await ShoorahPods.aggregate([
            {
              $match: filterCondition // Your filter condition goes here
            },
            {
              $project: {
                updatedAt: 1,
                contentId: '$_id',
                contentName: '$display_name',
                duration: '$duration',
                description: '$description',
                expertName: '$expert_name',
                expertImage: {
                  $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.EXPERT_IMAGES, '/', '$expert_image']
                },
                url: {
                  $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.SHOORAH_PODS_AUDIO, '/', '$pods_url']
                },
                srtUrl: {
                  $concat: [CLOUDFRONT_URL, 'admins/shoorah_pods/srt/', '$pods_srt']
                },
                image: {
                  $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.SHOORAH_PODS_IMAGE, '/', '$pods_image']
                }
              }
            }
          ]);
        }

        return Response.successResponseData(res, sounds, SUCCESS, res.__('soundListSuccess'));
      } else {
        console.log('error');
        return Response.internalServerErrorResponse(res);
      }
    } catch (err) {
      console.log(err);

      return Response.internalServerErrorResponse(res);
    }
  }
};
