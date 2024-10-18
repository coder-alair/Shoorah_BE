'use strict';

const { Bookmarks } = require('@models');
const Response = require('@services/Response');
const {
  addToBookmarksValidation,
  bookmarksListValidation,
  removeBookmarkValidation,
  allBookMarksListValidation
} = require('@services/userValidations/bookmarkValidations');
const {
  FAIL,
  SUCCESS,
  PAGE,
  PER_PAGE,
  STATUS,
  CLOUDFRONT_URL,
  ADMIN_MEDIA_PATH,
  CONTENT_TYPE
} = require('@services/Constant');
const { toObjectId, dynamicModelName } = require('@services/Helper');

module.exports = {
  /**
   * @description This function is used to add bookmarks
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  addToBookmarks: (req, res) => {
    try {
      const reqParam = req.body;
      addToBookmarksValidation(reqParam, res, async (validate) => {
        if (validate) {
          const filterData = {
            user_id: req.authUserId,
            content_type: reqParam.contentType,
            content_id: reqParam.contentId
          };
          const existingBookmark = await Bookmarks.findOne(filterData).select('_id');
          if (existingBookmark) {
            return Response.successResponseWithoutData(res, res.__('alreadyBookmarked'), FAIL);
          } else {
            await Bookmarks.create(filterData);
            return Response.successResponseWithoutData(
              res,
              parseInt(reqParam.contentType) === CONTENT_TYPE.AFFIRMATION
                ? res.__('AffirmationSaveSuccess')
                : parseInt(reqParam.contentType) === CONTENT_TYPE.MEDITATION
                  ? res.__('meditationSaveSuccess')
                  : parseInt(reqParam.contentType) === CONTENT_TYPE.SOUND
                    ? res.__('soundSaveSuccess')
                    : parseInt(reqParam.contentType) === CONTENT_TYPE.SHOORAH_PODS
                      ? res.__('podSaveSuccess')
                      : res.__('addedToBookmark'),
              SUCCESS
            );
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
   * @description This function is used to get logged in user bookmarked list based on content type.
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  bookmarksList: (req, res) => {
    try {
      const reqParam = req.query;
      bookmarksListValidation(reqParam, res, async (validate) => {
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
          const filterCondition = {
            user_id: toObjectId(req.authUserId),
            content_type: parseInt(reqParam.contentType),
            deletedAt: null
          };
          const lookupModel = await dynamicModelName(filterCondition.content_type);

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
                      status: STATUS.ACTIVE,
                      approved_by: {
                        $ne: null
                      },
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
              $lookup: {
                from: 'focus',
                let: {
                  focusId: '$content.focus_ids'
                },
                pipeline: [
                  {
                    $match: {
                      status: STATUS.ACTIVE,
                      approved_by: {
                        $ne: null
                      },
                      $expr: {
                        $in: ['$_id', '$$focusId']
                      }
                    }
                  }
                ],
                as: 'content.focus_ids'
              }
            },
            {
              $project: {
                bookmarkId: '$_id',
                updatedAt: 1,
                contentId: '$content._id',
                contentName: '$content.display_name',
                contentType: '$content_type',
                focus: '$content.focus_ids.display_name',
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
                },
                srtUrl: {
                  $switch: {
                    branches: [
                      {
                        case: { $eq: ['$content_type', CONTENT_TYPE.MEDITATION] },
                        then: {
                          $concat: [CLOUDFRONT_URL, 'admins/meditations/srt/', '$meditation_srt']
                        }
                      },
                      {
                        case: { $eq: ['$content_type', CONTENT_TYPE.SOUND] },
                        then: {
                          $concat: [CLOUDFRONT_URL, 'admins/sounds/srt/', '$sound_srt']
                        }
                      },
                      {
                        case: { $eq: ['$content_type', CONTENT_TYPE.SHOORAH_PODS] },
                        then: {
                          $concat: [CLOUDFRONT_URL, 'admins/shoorah_pods/srt/', '$pods_srt']
                        }
                      }
                    ],
                    default: null
                  }
                }
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
          ];

          const myBookmarks = await Bookmarks.aggregate(aggregateCondition);

          return myBookmarks.length > 0
            ? Response.successResponseData(
                res,
                myBookmarks[0].data,
                SUCCESS,
                res.__('bookmarksList'),
                myBookmarks[0].metaData[0]
              )
            : Response.successResponseWithoutData(res, res.__('noBookmarkFound'), FAIL);
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to remove content from my bookmark.
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  removeBookmark: (req, res) => {
    try {
      const reqParam = req.query;
      removeBookmarkValidation(reqParam, res, async (validate) => {
        if (validate) {
          const filterCondition = {
            user_id: req.authUserId,
            $or: [
              {
                _id: reqParam.bookmarkId
              },
              {
                content_id: reqParam.bookmarkId
              }
            ]
          };
          const data = await Bookmarks.findOneAndDelete(filterCondition);
          Response.successResponseWithoutData(
            res,
            data?.content_type === CONTENT_TYPE.AFFIRMATION
              ? res.__('affirmationRemoved')
              : data?.content_type === CONTENT_TYPE.MEDITATION
                ? res.__('meditationRemoved')
                : data?.content_type === CONTENT_TYPE.SOUND
                  ? res.__('soundRemoved')
                  : data?.content_type === CONTENT_TYPE.SHOORAH_PODS
                    ? res.__('podRemoved')
                    : res.__('bookmarkRemoved'),
            SUCCESS
          );
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to get all bookmarked data list of user.
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  allBookMarksList: (req, res) => {
    try {
      const reqParam = req.query;
      allBookMarksListValidation(reqParam, res, async (validate) => {
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
          const filterCondition = {
            user_id: toObjectId(req.authUserId),
            deletedAt: null,
            content_type: {
              $in: [CONTENT_TYPE.MEDITATION, CONTENT_TYPE.SOUND, CONTENT_TYPE.SHOORAH_PODS]
            }
          };
          const letCondition = {
            contentId: '$content_id',
            content_type: '$content_type',
            bookmarkId: '$_id'
          };
          const pipelineCondition = [
            {
              $match: {
                status: STATUS.ACTIVE,
                approved_by: {
                  $ne: null
                },
                $expr: {
                  $eq: ['$$contentId', '$_id']
                }
              }
            },
            {
              $project: {
                contentType: '$$content_type',
                bookmarkId: '$_id',
                updatedAt: 1,
                contentId: '$_id',
                contentName: '$display_name',
                _id: 0,
                duration: '$duration',
                description: '$description',
                expertName: '$expert_name',
                expertImage: {
                  $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.EXPERT_IMAGES, '/', '$expert_image']
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
                          $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.SOUND_AUDIO, '/', '$sound_url']
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
                          $concat: [CLOUDFRONT_URL, 'admins/meditations/srt/', '$meditation_srt']
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
                      }
                    ],
                    default: null
                  }
                }
              }
            }
          ];
          const aggregateCondition = [
            {
              $match: filterCondition
            },
            {
              $lookup: {
                from: 'meditations',
                let: letCondition,
                pipeline: pipelineCondition,
                as: 'meditations'
              }
            },
            {
              $lookup: {
                from: 'sounds',
                let: letCondition,
                pipeline: pipelineCondition,
                as: 'sounds'
              }
            },
            {
              $lookup: {
                from: 'shoorah_pods',
                let: letCondition,
                pipeline: pipelineCondition,
                as: 'shoorahPods'
              }
            },
            {
              $unwind: {
                path: '$meditations',
                preserveNullAndEmptyArrays: true
              }
            },
            {
              $unwind: {
                path: '$sounds',
                preserveNullAndEmptyArrays: true
              }
            },
            {
              $unwind: {
                path: '$shoorahPods',
                preserveNullAndEmptyArrays: true
              }
            },
            {
              $group: {
                _id: '$user_id',
                meditations: {
                  $addToSet: '$meditations'
                },
                sounds: {
                  $addToSet: '$sounds'
                },
                shoorahPods: {
                  $addToSet: '$shoorahPods'
                }
              }
            },
            {
              $project: {
                content: {
                  $setUnion: ['$meditations', '$sounds', '$shoorahPods']
                }
              }
            },
            {
              $unwind: {
                path: '$content',
                preserveNullAndEmptyArrays: true
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
            },
            {
              $project: {
                metaData: 1,
                data: '$data.content'
              }
            }
          ];
          const bookmarksData = await Bookmarks.aggregate(aggregateCondition);
          return Response.successResponseData(
            res,
            bookmarksData[0].data,
            SUCCESS,
            res.__('bookmarksList'),
            bookmarksData[0].metaData[0]
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
