'use strict';

const { Trending } = require('@models');
const Response = require('@services/Response');
const { addToTrendingValidation } = require('@services/userValidations/trendingsValidations');
const {
  SUCCESS,
  CONTENT_TYPE,
  CLOUDFRONT_URL,
  ADMIN_MEDIA_PATH,
  STATUS
} = require('@services/Constant');
const { toObjectId, currentDateOnly } = require('@services/Helper');
const { FAIL } = require('../../../services/Constant');
const { Users } = require('../../../models');

module.exports = {
  /**
   * @description This function is used to update content
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  addToTrending: (req, res) => {
    try {
      const reqParam = req.body;
      addToTrendingValidation(reqParam, res, async (validate) => {
        if (validate) {
          const fromDate = new Date(reqParam.trendingDate);
          const toDate = new Date(reqParam.trendingDate);
          toDate.setDate(toDate.getDate() + 1);
          const filterCondition = {
            user_id: req.authUserId,
            content_id: reqParam.contentId,
            content_type: reqParam.contentType,
            trending_date: {
              $gte: fromDate,
              $lt: toDate
            },
            deletedAt: null
          };

          let updateCondition = {};

          if (reqParam.duration) {
            updateCondition = {
              $inc: {
                duration: reqParam?.duration,
                views: 1
              },
              trending_date: reqParam.trendingDate
            };
          } else {
            updateCondition = {
              $inc: {
                views: 1
              },
              trending_date: reqParam.trendingDate
            };
          }

          await Trending.findOneAndUpdate(filterCondition, updateCondition, { upsert: true });

          return Response.successResponseWithoutData(res, res.__('trendingUpdateSucess'), SUCCESS);
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to get trendings.
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  getTrending: async (req, res) => {
    try {
      let filterDate = currentDateOnly();
      filterDate.setMonth(filterDate.getMonth() - 1);

      const meditationAggregation = [
        {
          $match: {
            content_type: CONTENT_TYPE.MEDITATION,
            trending_date: {
              $gte: filterDate
            }
          }
        },
        {
          $group: {
            _id: '$content_id',
            totalDuration: {
              $sum: '$duration'
            },
            totalViews: {
              $sum: '$views'
            }
          }
        },
        {
          $lookup: {
            from: 'meditations',
            let: {
              contentId: '$_id'
            },
            pipeline: [
              {
                $match: {
                  status: STATUS.ACTIVE,
                  approved_by: {
                    $ne: null
                  },
                  $expr: {
                    $eq: ['$_id', '$$contentId']
                  }
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
                  expertImage: {
                    $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.EXPERT_IMAGES, '/', '$expert_image']
                  },
                  _id: 0
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
          $sort: {
            totalDuration: -1,
            totalViews: -1
          }
        },
        {
          $limit: 5
        },
        {
          $lookup: {
            from: 'bookmarks',
            let: {
              contentId: '$_id'
            },
            pipeline: [
              {
                $match: {
                  content_type: CONTENT_TYPE.MEDITATION,
                  user_id: toObjectId(req.authUserId),
                  deletedAt: null,
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
          $addFields: {
            'content.isBookmarked': {
              $cond: [
                {
                  $gt: [{ $size: '$bookmarks' }, 0]
                },
                true,
                false
              ]
            }
          }
        }
      ];
      const soundAggregation = [
        {
          $match: {
            content_type: CONTENT_TYPE.SOUND,
            trending_date: {
              $gte: filterDate
            }
          }
        },
        {
          $group: {
            _id: '$content_id',
            totalDuration: {
              $sum: '$duration'
            },
            totalViews: {
              $sum: '$views'
            }
          }
        },
        {
          $lookup: {
            from: 'sounds',
            let: {
              contentId: '$_id'
            },
            pipeline: [
              {
                $match: {
                  status: STATUS.ACTIVE,
                  approved_by: {
                    $ne: null
                  },
                  $expr: {
                    $eq: ['$_id', '$$contentId']
                  }
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
                  _id: 0
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
          $sort: {
            totalDuration: -1,
            totalViews: -1
          }
        },
        {
          $limit: 5
        },
        {
          $lookup: {
            from: 'bookmarks',
            let: {
              contentId: '$_id'
            },
            pipeline: [
              {
                $match: {
                  content_type: CONTENT_TYPE.SOUND,
                  user_id: toObjectId(req.authUserId),
                  deletedAt: null,
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
          $addFields: {
            'content.isBookmarked': {
              $cond: [
                {
                  $gt: [{ $size: '$bookmarks' }, 0]
                },
                true,
                false
              ]
            }
          }
        }
      ];
      const podsAggregation = [
        {
          $match: {
            content_type: CONTENT_TYPE.SHOORAH_PODS,
            trending_date: {
              $gte: filterDate
            }
          }
        },
        {
          $group: {
            _id: '$content_id',
            totalDuration: {
              $sum: '$duration'
            },
            totalViews: {
              $sum: '$views'
            }
          }
        },
        {
          $lookup: {
            from: 'shoorah_pods',
            let: {
              contentId: '$_id'
            },
            pipeline: [
              {
                $match: {
                  status: STATUS.ACTIVE,
                  approved_by: {
                    $ne: null
                  },
                  $expr: {
                    $eq: ['$_id', '$$contentId']
                  }
                }
              },
              {
                $project: {
                  contentId: '$_id',
                  contentName: '$display_name',
                  description: 1,
                  duration: 1,
                  url: {
                    $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.SHOORAH_PODS_AUDIO, '/', '$pods_url']
                  },
                  image: {
                    $concat: [
                      CLOUDFRONT_URL,
                      ADMIN_MEDIA_PATH.SHOORAH_PODS_IMAGE,
                      '/',
                      '$pods_image'
                    ]
                  },
                  srtUrl: {
                    $concat: [CLOUDFRONT_URL, 'admins/shoorah_pods/srt/', '$pods_srt']
                  },
                  expertName: '$expert_name',
                  expertImage: {
                    $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.EXPERT_IMAGES, '/', '$expert_image']
                  },
                  _id: 0
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
          $sort: {
            totalDuration: -1,
            totalViews: -1
          }
        },
        {
          $limit: 5
        },
        {
          $lookup: {
            from: 'bookmarks',
            let: {
              contentId: '$_id'
            },
            pipeline: [
              {
                $match: {
                  content_type: CONTENT_TYPE.MEDITATION,
                  user_id: toObjectId(req.authUserId),
                  deletedAt: null,
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
          $addFields: {
            'content.isBookmarked': {
              $cond: [
                {
                  $gt: [{ $size: '$bookmarks' }, 0]
                },
                true,
                false
              ]
            }
          }
        }
      ];

      const trendingMeditation = await Trending.aggregate(meditationAggregation);
      const trendingSound = await Trending.aggregate(soundAggregation);
      const trendingPods = await Trending.aggregate(podsAggregation);

      const trendingData = [];
      if (trendingMeditation.length > 0) {
        trendingMeditation.map((el) => {
          el.content.contentType = CONTENT_TYPE.MEDITATION;
          el.content.totalViews = el?.totalViews;
          trendingData.push(el);
        });
      }
      if (trendingSound.length > 0) {
        trendingSound.map((el) => {
          el.content.contentType = CONTENT_TYPE.SOUND;
          el.content.totalViews = el?.totalViews;
          trendingData.push(el);
        });
      }
      if (trendingPods.length > 0) {
        trendingPods.map((el) => {
          el.content.contentType = CONTENT_TYPE.SHOORAH_PODS;
          el.content.totalViews = el?.totalViews;
          trendingData.push(el);
        });
      }

      trendingData.sort((a, b) =>
        a.totalDuration > b.totalDuration ? -1 : b.totalDuration > a.totalDuration ? 1 : 0
      );

      const resData = [...trendingData.map((el) => el.content)];
      return Response.successResponseData(res, resData, SUCCESS, res.__('trendingDataSuccess'));
    } catch (err) {
      console.error(err);
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is get top picks contents by content types
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  getTrendingByContentType: async (req, res) => {
    try {
      let filterDate = currentDateOnly();
      filterDate.setMonth(filterDate.getMonth() - 1);
      let reqParam = req.query;

      if (!reqParam.contentType) {
        return Response.successResponseData(res, null, FAIL, res.__('contentTypeNeeded'));
      }

      let filterAggregation = [];

      switch (parseInt(reqParam.contentType)) {
        case CONTENT_TYPE.AFFIRMATION:
          filterAggregation = [
            {
              $match: {
                content_type: CONTENT_TYPE.AFFIRMATION,
                trending_date: {
                  $gte: filterDate
                }
              }
            },
            {
              $group: {
                _id: '$content_id',
                totalViews: {
                  $sum: '$views'
                }
              }
            },
            {
              $lookup: {
                from: 'affirmations',
                let: {
                  contentId: '$_id'
                },
                pipeline: [
                  {
                    $match: {
                      status: STATUS.ACTIVE,
                      approved_by: {
                        $ne: null
                      },
                      $expr: {
                        $eq: ['$_id', '$$contentId']
                      }
                    }
                  },
                  {
                    $project: {
                      contentId: '$_id',
                      contentName: '$display_name',
                      views: 1,
                      _id: 0
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
              $sort: {
                totalViews: -1
              }
            },
            {
              $limit: 5
            },
            {
              $lookup: {
                from: 'bookmarks',
                let: {
                  contentId: '$_id'
                },
                pipeline: [
                  {
                    $match: {
                      content_type: CONTENT_TYPE.AFFIRMATION,
                      user_id: toObjectId(req.authUserId),
                      deletedAt: null,
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
              $addFields: {
                'content.isBookmarked': {
                  $cond: [
                    {
                      $gt: [{ $size: '$bookmarks' }, 0]
                    },
                    true,
                    false
                  ]
                }
              }
            }
          ];
          break;
      
        case CONTENT_TYPE.MEDITATION:
          filterAggregation = [
            {
              $match: {
                content_type: CONTENT_TYPE.MEDITATION,
                trending_date: {
                  $gte: filterDate
                }
              }
            },
            {
              $group: {
                _id: '$content_id',
                totalDuration: {
                  $sum: '$duration'
                },
                totalViews: {
                  $sum: '$views'
                }
              }
            },
            {
              $lookup: {
                from: 'meditations',
                let: {
                  contentId: '$_id'
                },
                pipeline: [
                  {
                    $match: {
                      status: STATUS.ACTIVE,
                      approved_by: {
                        $ne: null
                      },
                      $expr: {
                        $eq: ['$_id', '$$contentId']
                      }
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
                      srtUrl: {
                        $concat: [
                          CLOUDFRONT_URL,
                          'admins/meditations/srt/',
                          '$meditation_srt'
                        ]
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
                      expertImage: {
                        $concat: [
                          CLOUDFRONT_URL,
                          ADMIN_MEDIA_PATH.EXPERT_IMAGES,
                          '/',
                          '$expert_image'
                        ]
                      },
                      _id: 0
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
              $sort: {
                totalDuration: -1,
                totalViews: -1
              }
            },
            {
              $limit: 5
            },
            {
              $lookup: {
                from: 'bookmarks',
                let: {
                  contentId: '$_id'
                },
                pipeline: [
                  {
                    $match: {
                      content_type: CONTENT_TYPE.MEDITATION,
                      user_id: toObjectId(req.authUserId),
                      deletedAt: null,
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
              $addFields: {
                'content.isBookmarked': {
                  $cond: [
                    {
                      $gt: [{ $size: '$bookmarks' }, 0]
                    },
                    true,
                    false
                  ]
                }
              }
            }
          ];
          break;
      
        case CONTENT_TYPE.SOUND:
          filterAggregation = [
            {
              $match: {
                content_type: CONTENT_TYPE.SOUND,
                trending_date: {
                  $gte: filterDate
                }
              }
            },
            {
              $group: {
                _id: '$content_id',
                totalDuration: {
                  $sum: '$duration'
                },
                totalViews: {
                  $sum: '$views'
                }
              }
            },
            {
              $lookup: {
                from: 'sounds',
                let: {
                  contentId: '$_id'
                },
                pipeline: [
                  {
                    $match: {
                      status: STATUS.ACTIVE,
                      approved_by: {
                        $ne: null
                      },
                      $expr: {
                        $eq: ['$_id', '$$contentId']
                      }
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
                          ADMIN_MEDIA_PATH.SOUND_AUDIO,
                          '/',
                          '$sound_url'
                        ]
                      },
                      srtUrl: {
                        $concat: [
                          CLOUDFRONT_URL,
                          'admins/sounds/srt/',
                          '$sound_srt'
                        ]
                      },
                      image: {
                        $concat: [
                          CLOUDFRONT_URL,
                          ADMIN_MEDIA_PATH.SOUND_IMAGES,
                          '/',
                          '$sound_image'
                        ]
                      },
                      expertName: '$expert_name',
                      expertImage: {
                        $concat: [
                          CLOUDFRONT_URL,
                          ADMIN_MEDIA_PATH.EXPERT_IMAGES,
                          '/',
                          '$expert_image'
                        ]
                      },
                      _id: 0
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
              $sort: {
                totalDuration: -1,
                totalViews: -1
              }
            },
            {
              $limit: 5
            },
            {
              $lookup: {
                from: 'bookmarks',
                let: {
                  contentId: '$_id'
                },
                pipeline: [
                  {
                    $match: {
                      content_type: CONTENT_TYPE.SOUND,
                      user_id: toObjectId(req.authUserId),
                      deletedAt: null,
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
              $addFields: {
                'content.isBookmarked': {
                  $cond: [
                    {
                      $gt: [{ $size: '$bookmarks' }, 0]
                    },
                    true,
                    false
                  ]
                }
              }
            }
          ];
          break;
      
        case CONTENT_TYPE.SHOORAH_PODS:
          filterAggregation = [
            {
              $match: {
                content_type: CONTENT_TYPE.SHOORAH_PODS,
                trending_date: {
                  $gte: filterDate
                }
              }
            },
            {
              $group: {
                _id: '$content_id',
                totalDuration: {
                  $sum: '$duration'
                },
                totalViews: {
                  $sum: '$views'
                }
              }
            },
            {
              $lookup: {
                from: 'shoorah_pods',
                let: {
                  contentId: '$_id'
                },
                pipeline: [
                  {
                    $match: {
                      status: STATUS.ACTIVE,
                      approved_by: {
                        $ne: null
                      },
                      $expr: {
                        $eq: ['$_id', '$$contentId']
                      }
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
                          ADMIN_MEDIA_PATH.SHOORAH_PODS_AUDIO,
                          '/',
                          '$pods_url'
                        ]
                      },
                      image: {
                        $concat: [
                          CLOUDFRONT_URL,
                          ADMIN_MEDIA_PATH.SHOORAH_PODS_IMAGE,
                          '/',
                          '$pods_image'
                        ]
                      },
                      srtUrl: {
                        $concat: [CLOUDFRONT_URL, 'admins/shoorah_pods/srt/', '$pods_srt']
                      },
                      expertName: '$expert_name',
                      expertImage: {
                        $concat: [
                          CLOUDFRONT_URL,
                          ADMIN_MEDIA_PATH.EXPERT_IMAGES,
                          '/',
                          '$expert_image'
                        ]
                      },
                      _id: 0
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
              $sort: {
                totalDuration: -1,
                totalViews: -1
              }
            },
            {
              $limit: 5
            },
            {
              $lookup: {
                from: 'bookmarks',
                let: {
                  contentId: '$_id'
                },
                pipeline: [
                  {
                    $match: {
                      content_type: CONTENT_TYPE.MEDITATION,
                      user_id: toObjectId(req.authUserId),
                      deletedAt: null,
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
              $addFields: {
                'content.isBookmarked': {
                  $cond: [
                    {
                      $gt: [{ $size: '$bookmarks' }, 0]
                    },
                    true,
                    false
                  ]
                }
              }
            }
          ];
          break;
      
        case CONTENT_TYPE.RITUALS:
          filterAggregation = [
            {
              $match: {
                content_type: CONTENT_TYPE.RITUALS,
                trending_date: {
                  $gte: filterDate
                }
              }
            },
            {
              $group: {
                _id: '$content_id',
                totalViews: {
                  $sum: '$views'
                }
              }
            },
            {
              $lookup: {
                from: 'rituals',
                let: {
                  contentId: '$_id'
                },
                pipeline: [
                  {
                    $match: {
                      status: STATUS.ACTIVE,
                      approved_by: {
                        $ne: null
                      },
                      $expr: {
                        $eq: ['$_id', '$$contentId']
                      }
                    }
                  },
                  {
                    $project: {
                      contentId: '$_id',
                      contentName: '$display_name',
                      views: 1,
                      _id: 0
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
              $sort: {
                totalViews: -1
              }
            },
            {
              $limit: 5
            }
          ];
          break;

        case CONTENT_TYPE.BREATHWORK:
            filterAggregation = [
              {
                $match: {
                  content_type: CONTENT_TYPE.BREATHWORK,
                  trending_date: {
                    $gte: filterDate
                  }
                }
              },
              {
                $group: {
                  _id: '$content_id',
                  totalDuration: {
                    $sum: '$duration'
                  },
                  totalViews: {
                    $sum: '$views'
                  }
                }
              },
              {
                $lookup: {
                  from: 'breathworks',
                  let: {
                    contentId: '$_id'
                  },
                  pipeline: [
                    {
                      $match: {
                        status: STATUS.ACTIVE,
                        approved_by: {
                          $ne: null
                        },
                        $expr: {
                          $eq: ['$_id', '$$contentId']
                        }
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
                            ADMIN_MEDIA_PATH.BREATHWORK_AUDIO,
                            '/',
                            '$breathwork_url'
                          ]
                        },
                        srtUrl: {
                          $concat: [
                            CLOUDFRONT_URL,
                            'admins/breathworks/srt/',
                            '$srt_url'
                          ]
                        },
                        image: {
                          $concat: [
                            CLOUDFRONT_URL,
                            ADMIN_MEDIA_PATH.BREATHWORK_IMAGE,
                            '/',
                            '$breathwork_image'
                          ]
                        },
                        expertName: '$expert_name',
                        expertImage: {
                          $concat: [
                            CLOUDFRONT_URL,
                            ADMIN_MEDIA_PATH.EXPERT_IMAGES,
                            '/',
                            '$expert_image'
                          ]
                        },
                        _id: 0
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
                $sort: {
                  totalDuration: -1,
                  totalViews: -1
                }
              },
              {
                $limit: 5
              },
              {
                $lookup: {
                  from: 'bookmarks',
                  let: {
                    contentId: '$_id'
                  },
                  pipeline: [
                    {
                      $match: {
                        content_type: CONTENT_TYPE.BREATHWORK,
                        user_id: toObjectId(req.authUserId),
                        deletedAt: null,
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
                $addFields: {
                  'content.isBookmarked': {
                    $cond: [
                      {
                        $gt: [{ $size: '$bookmarks' }, 0]
                      },
                      true,
                      false
                    ]
                  }
                }
              }
            ];
            break;
        

        default:
          return Response.successResponseData(res, null, FAIL, res.__('invalidContentType'));
      }
      
      const trendings = await Trending.aggregate(filterAggregation);

      const trendingData = [];
      if (trendings.length > 0) {
        trendings.map((el) => {
          switch (parseInt(reqParam.contentType)) {
            case CONTENT_TYPE.AFFIRMATION:
              el.content.contentType = CONTENT_TYPE.AFFIRMATION;
              break;
            case CONTENT_TYPE.MEDITATION:
              el.content.contentType = CONTENT_TYPE.MEDITATION;
              break;
            case CONTENT_TYPE.SOUND:
              el.content.contentType = CONTENT_TYPE.SOUND;
              break;
            case CONTENT_TYPE.SHOORAH_PODS:
              el.content.contentType = CONTENT_TYPE.SHOORAH_PODS;
              break;
            case CONTENT_TYPE.RITUALS:
              el.content.contentType = CONTENT_TYPE.RITUALS;
              break;
            case CONTENT_TYPE.BREATHWORK:
              el.content.contentType = CONTENT_TYPE.BREATHWORK;
              break;
            default:
              break;
          }
          el.content.totalViews = el?.totalViews;
          trendingData.push(el);
        });
      }

      trendingData.sort((a, b) =>
        a.totalViews > b.totalViews ? -1 : b.totalViews > a.totalViews ? 1 : 0
      );

      const resData = [...trendingData.map((el) => el.content)];
      return Response.successResponseData(
        res,
        resData,
        SUCCESS,
        res.__('trendingByContentTypeSuccess')
      );
    } catch (err) {
      console.error(err);
      return Response.internalServerErrorResponse(res);
    }
  }


};
