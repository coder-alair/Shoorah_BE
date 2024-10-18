'use strict';

const { Trending } = require('@models');
const Response = require('@services/Response');
const { toObjectId, shuffleArray, dynamicUserModelName } = require('@services/Helper');
const {
  SUCCESS,
  CONTENT_TYPE,
  STATUS,
  CLOUDFRONT_URL,
  ADMIN_MEDIA_PATH,
  USER_CONTENT_TYPE,
  FAIL
} = require('@services/Constant');
const { getContentDetailsValidation } = require('@services/userValidations/trendingsValidations');

module.exports = {
  /**
   * @description This function is used to get explore section content list
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  exploreList: async (req, res) => {
    try {
      const exploreAggregateCondition = [
        {
          $group: {
            _id: '$content_id',
            contentType: {
              $first: '$content_type'
            },
            content_id: {
              $first: '$content_id'
            },
            deletedAt: {
              $first: '$deletedAt'
            }
          }
        },
        {
          $match: {
            deletedAt: null
          }
        },
        {
          $sample: {
            size: 15
          }
        },
        {
          $lookup: {
            from: 'meditations',
            let: {
              content_id: '$content_id',
              contentType: '$contentType'
            },
            pipeline: [
              {
                $match: {
                  status: STATUS.ACTIVE,
                  $expr: {
                    $eq: ['$$content_id', '$_id']
                  }
                }
              },
              {
                $lookup: {
                  from: 'bookmarks',
                  let: {
                    content_id: '$_id'
                  },
                  pipeline: [
                    {
                      $match: {
                        content_type: CONTENT_TYPE.MEDITATION,
                        deletedAt: null,
                        user_id: toObjectId(req.authUserId),
                        $expr: {
                          $eq: ['$$content_id', '$content_id']
                        }
                      }
                    },
                    {
                      $project: {
                        _id: 1
                      }
                    }
                  ],
                  as: 'bookmark'
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
                  _id: 0,
                  isBookmarked: {
                    $cond: [
                      {
                        $gt: [
                          {
                            $arrayElemAt: ['$bookmark', 0]
                          },
                          null
                        ]
                      },
                      true,
                      false
                    ]
                  }
                }
              },
              {
                $addFields: {
                  contentType: CONTENT_TYPE.MEDITATION
                }
              }
            ],
            as: 'meditation'
          }
        },
        {
          $lookup: {
            from: 'sounds',
            let: {
              content_id: '$content_id'
            },
            pipeline: [
              {
                $match: {
                  status: STATUS.ACTIVE,
                  $expr: {
                    $eq: ['$$content_id', '$_id']
                  }
                }
              },
              {
                $lookup: {
                  from: 'bookmarks',
                  let: {
                    content_id: '$_id'
                  },
                  pipeline: [
                    {
                      $match: {
                        content_type: CONTENT_TYPE.SOUND,
                        deletedAt: null,
                        user_id: toObjectId(req.authUserId),
                        $expr: {
                          $eq: ['$$content_id', '$content_id']
                        }
                      }
                    },
                    {
                      $project: {
                        _id: 1
                      }
                    }
                  ],
                  as: 'bookmark'
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
                  _id: 0,
                  isBookmarked: {
                    $cond: [
                      {
                        $gt: [
                          {
                            $arrayElemAt: ['$bookmark', 0]
                          },
                          null
                        ]
                      },
                      true,
                      false
                    ]
                  }
                }
              },
              {
                $addFields: {
                  contentType: CONTENT_TYPE.SOUND
                }
              }
            ],
            as: 'sound'
          }
        },
        {
          $lookup: {
            from: 'shoorah_pods',
            let: {
              content_id: '$content_id'
            },
            pipeline: [
              {
                $match: {
                  status: STATUS.ACTIVE,
                  $expr: {
                    $eq: ['$$content_id', '$_id']
                  }
                }
              },
              {
                $lookup: {
                  from: 'bookmarks',
                  let: {
                    content_id: '$_id'
                  },
                  pipeline: [
                    {
                      $match: {
                        content_type: CONTENT_TYPE.SHOORAH_PODS,
                        deletedAt: null,
                        user_id: toObjectId(req.authUserId),
                        $expr: {
                          $eq: ['$$content_id', '$content_id']
                        }
                      }
                    },
                    {
                      $project: {
                        _id: 1
                      }
                    }
                  ],
                  as: 'bookmark'
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
                  srtUrl: {
                    $concat: [CLOUDFRONT_URL, 'admins/shoorah_pods/srt/', '$pods_srt']
                  },
                  image: {
                    $concat: [
                      CLOUDFRONT_URL,
                      ADMIN_MEDIA_PATH.SHOORAH_PODS_IMAGE,
                      '/',
                      '$pods_image'
                    ]
                  },
                  expertName: '$expert_name',
                  expertImage: {
                    $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.EXPERT_IMAGES, '/', '$expert_image']
                  },
                  _id: 0,
                  isBookmarked: {
                    $cond: [
                      {
                        $gt: [
                          {
                            $arrayElemAt: ['$bookmark', 0]
                          },
                          null
                        ]
                      },
                      true,
                      false
                    ]
                  }
                }
              },
              {
                $addFields: {
                  contentType: CONTENT_TYPE.SHOORAH_PODS
                }
              }
            ],
            as: 'shoorahPods'
          }
        },
        {
          $unwind: {
            path: '$meditation',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $unwind: {
            path: '$sound',
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
            _id: null,
            meditation: {
              $addToSet: '$meditation'
            },
            sound: {
              $addToSet: '$sound'
            },
            shoorahPods: {
              $addToSet: '$shoorahPods'
            }
          }
        },
        {
          $project: {
            content: {
              $setUnion: ['$meditation', '$sound', '$shoorahPods']
            }
          }
        },
        {
          $lookup: {
            from: 'bookmarks',
            let: {
              deletedAt: '$_id'
            },
            pipeline: [
              {
                $match: {
                  content_type: CONTENT_TYPE.AFFIRMATION,
                  deletedAt: null,
                  $expr: {
                    $eq: ['$$deletedAt', '$$deletedAt']
                  }
                }
              },
              {
                $group: {
                  _id: '$content_id'
                }
              },
              {
                $sample: {
                  size: 5
                }
              },
              {
                $lookup: {
                  from: 'affirmations',
                  let: {
                    content_id: '$_id'
                  },
                  pipeline: [
                    {
                      $match: {
                        status: STATUS.ACTIVE,
                        $expr: {
                          $eq: ['$$content_id', '$_id']
                        }
                      }
                    },
                    {
                      $project: {
                        display_name: 1,
                        isBookmarked: {
                          $cond: [
                            {
                              $eq: ['$user_id', toObjectId(req.authUserId)]
                            },
                            true,
                            false
                          ]
                        }
                      }
                    }
                  ],
                  as: 'affirmation'
                }
              },
              {
                $project: {
                  contentId: '$_id',
                  contentName: {
                    $arrayElemAt: ['$affirmation.display_name', 0]
                  },
                  isBookmarked: {
                    $arrayElemAt: ['$affirmation.isBookmarked', 0]
                  },
                  _id: 0
                }
              },
              {
                $addFields: {
                  contentType: CONTENT_TYPE.AFFIRMATION
                }
              },
              {
                $match: {
                  $expr: {
                    $gt: ['$contentName', null]
                  }
                }
              }
            ],
            as: 'affirmations'
          }
        },
        {
          $lookup: {
            from: 'user_completed_rituals',
            let: {
              deletedAt: '$_id'
            },
            pipeline: [
              {
                $match: {
                  user_id: {
                    $ne: toObjectId(req.authUserId)
                  },
                  $expr: {
                    $eq: ['$$deletedAt', '$deletedAt']
                  }
                }
              },
              {
                $group: {
                  _id: '$ritual_id'
                }
              },
              {
                $sample: {
                  size: 5
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
                        status: 1,
                        $expr: {
                          $eq: ['$$contentId', '$_id']
                        }
                      }
                    },
                    {
                      $project: {
                        display_name: 1
                      }
                    }
                  ],
                  as: 'ritual'
                }
              },
              {
                $project: {
                  contentId: '$_id',
                  contentName: {
                    $arrayElemAt: ['$ritual.display_name', 0]
                  },
                  _id: 0
                }
              },
              {
                $addFields: {
                  contentType: CONTENT_TYPE.RITUALS
                }
              },
              {
                $match: {
                  $expr: {
                    $gt: ['$contentName', null]
                  }
                }
              }
            ],
            as: 'rituals'
          }
        },
        {
          $project: {
            content: {
              $setUnion: ['$content', '$affirmations', '$rituals']
            }
          }
        },
        {
          $addFields: {
            totalCount: {
              $size: '$content'
            }
          }
        }
      ];
      const exploreData = await Trending.aggregate(exploreAggregateCondition);
      if (exploreData.length > 0) {
        const resData = shuffleArray(exploreData[0].content);
        return Response.successResponseData(res, resData, SUCCESS, res.__('exploreListSuccess'), {
          totalCount: exploreData[0].totalCount
        });
      } else {
        return Response.successResponseData(res, [], SUCCESS, res.__('exploreListSuccess'), {
          totalCount: 0
        });
      }
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to get content details based on content type and id
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  getContentDetails: (req, res) => {
    try {
      const reqParam = req.params;
      getContentDetailsValidation(reqParam, res, async (validate) => {
        if (validate) {
          const modelName = await dynamicUserModelName(parseInt(reqParam.contentType));
          if (modelName) {
            let aggregatePipeline;
            const filterCondition = {
              _id: toObjectId(reqParam.contentId),
              approved_by: {
                $ne: null
              },
              status: STATUS.ACTIVE,
              deletedAt: null
            };
            switch (parseInt(reqParam.contentType)) {
              case USER_CONTENT_TYPE.MEDITATION:
                aggregatePipeline = [
                  {
                    $match: filterCondition
                  },
                  {
                    $limit: 1
                  },
                  {
                    $unwind: {
                      path: '$focus_ids',
                      preserveNullAndEmptyArrays: false
                    }
                  },
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
                        $concat: [
                          CLOUDFRONT_URL,
                          ADMIN_MEDIA_PATH.EXPERT_IMAGES,
                          '/',
                          '$expert_image'
                        ]
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
                  }
                ];
                break;
              case USER_CONTENT_TYPE.SOUND:
                aggregatePipeline = [
                  {
                    $match: filterCondition
                  },
                  {
                    $limit: 1
                  },
                  {
                    $unwind: {
                      path: '$focus_ids',
                      preserveNullAndEmptyArrays: false
                    }
                  },
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
                      image: {
                        $concat: [
                          CLOUDFRONT_URL,
                          ADMIN_MEDIA_PATH.SOUND_IMAGES,
                          '/',
                          '$sound_image'
                        ]
                      },
                      srtUrl: {
                        $concat: [CLOUDFRONT_URL, 'admins/sounds/srt/', '$sound_srt']
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
                  }
                ];
                break;
              case USER_CONTENT_TYPE.SHOORAH_PODS:
                aggregatePipeline = [
                  {
                    $match: filterCondition
                  },
                  {
                    $limit: 1
                  },
                  {
                    $unwind: {
                      path: '$focus_ids',
                      preserveNullAndEmptyArrays: false
                    }
                  },
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
                      updatedAt: 1,
                      expertImage: {
                        $concat: [
                          CLOUDFRONT_URL,
                          ADMIN_MEDIA_PATH.EXPERT_IMAGES,
                          '/',
                          '$expert_image'
                        ]
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
                      contentType: CONTENT_TYPE.SHOORAH_PODS
                    }
                  }
                ];
                break;
              case USER_CONTENT_TYPE.BREATHWORK:
                aggregatePipeline = [
                  {
                    $match: filterCondition
                  },
                  {
                    $limit: 1
                  },
                  {
                    $group: {
                      _id: '$_id',
                      display_name: {
                        $first: '$display_name'
                      },
                      description: {
                        $first: '$description'
                      },
                      duration: {
                        $first: '$duration'
                      },
                      breathwork_url: {
                        $first: '$breathwork_url'
                      },
                      breathwork_srt: {
                        $first: '$breathwork_srt'
                      },
                      breathwork_image: {
                        $first: '$breathwork_image'
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
                      image: {
                        $concat: [
                          CLOUDFRONT_URL,
                          ADMIN_MEDIA_PATH.BREATHWORK_IMAGE,
                          '/',
                          '$breathwork_image'
                        ]
                      },
                      srtUrl: {
                        $concat: [CLOUDFRONT_URL, 'admins/breathwork/srt/', '$breathwork_srt']
                      },
                      expertName: '$expert_name',
                      updatedAt: 1,
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
                  },
                  {
                    $addFields: {
                      contentType: CONTENT_TYPE.BREATHWORK
                    }
                  }
                ];
                break;
            }
            const contentData = await modelName.aggregate(aggregatePipeline);
            return Response.successResponseData(
              res,
              contentData[0] || null,
              SUCCESS,
              res.__('contentListSuccess')
            );
          } else {
            return Response.successResponseWithoutData(
              res,
              res.__('getContentDetailsValidationContenttypeOnly'),
              FAIL
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


  getRecommendedList: async (req, res) => {
    try {
      const recommendListAggregation = [
        {
          $group: {
            _id: '$content_id',
            contentType: {
              $first: '$content_type'
            },
            content_id: {
              $first: '$content_id'
            },
            deletedAt: {
              $first: '$deletedAt'
            }
          }
        },
        {
          $match: {
            deletedAt: null
          }
        },
        {
          $sample: {
            size: 15
          }
        },
        {
          $lookup: {
            from: 'meditations',
            let: {
              content_id: '$content_id',
              contentType: '$contentType'
            },
            pipeline: [
              {
                $match: {
                  status: STATUS.ACTIVE,
                  $expr: {
                    $eq: ['$$content_id', '$_id']
                  }
                }
              },
              {
                $lookup: {
                  from: 'bookmarks',
                  let: {
                    content_id: '$_id'
                  },
                  pipeline: [
                    {
                      $match: {
                        content_type: CONTENT_TYPE.MEDITATION,
                        deletedAt: null,
                        user_id: toObjectId(req.authUserId),
                        $expr: {
                          $eq: ['$$content_id', '$content_id']
                        }
                      }
                    },
                    {
                      $project: {
                        _id: 1
                      }
                    }
                  ],
                  as: 'bookmark'
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
                  _id: 0,
                  isBookmarked: {
                    $cond: [
                      {
                        $gt: [
                          {
                            $arrayElemAt: ['$bookmark', 0]
                          },
                          null
                        ]
                      },
                      true,
                      false
                    ]
                  }
                }
              },
              {
                $addFields: {
                  contentType: CONTENT_TYPE.MEDITATION
                }
              }
            ],
            as: 'meditation'
          }
        },
        {
          $lookup: {
            from: 'sounds',
            let: {
              content_id: '$content_id'
            },
            pipeline: [
              {
                $match: {
                  status: STATUS.ACTIVE,
                  $expr: {
                    $eq: ['$$content_id', '$_id']
                  }
                }
              },
              {
                $lookup: {
                  from: 'bookmarks',
                  let: {
                    content_id: '$_id'
                  },
                  pipeline: [
                    {
                      $match: {
                        content_type: CONTENT_TYPE.SOUND,
                        deletedAt: null,
                        user_id: toObjectId(req.authUserId),
                        $expr: {
                          $eq: ['$$content_id', '$content_id']
                        }
                      }
                    },
                    {
                      $project: {
                        _id: 1
                      }
                    }
                  ],
                  as: 'bookmark'
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
                  _id: 0,
                  isBookmarked: {
                    $cond: [
                      {
                        $gt: [
                          {
                            $arrayElemAt: ['$bookmark', 0]
                          },
                          null
                        ]
                      },
                      true,
                      false
                    ]
                  }
                }
              },
              {
                $addFields: {
                  contentType: CONTENT_TYPE.SOUND
                }
              }
            ],
            as: 'sound'
          }
        },
        {
          $lookup: {
            from: 'shoorah_pods',
            let: {
              content_id: '$content_id'
            },
            pipeline: [
              {
                $match: {
                  status: STATUS.ACTIVE,
                  $expr: {
                    $eq: ['$$content_id', '$_id']
                  }
                }
              },
              {
                $lookup: {
                  from: 'bookmarks',
                  let: {
                    content_id: '$_id'
                  },
                  pipeline: [
                    {
                      $match: {
                        content_type: CONTENT_TYPE.SHOORAH_PODS,
                        deletedAt: null,
                        user_id: toObjectId(req.authUserId),
                        $expr: {
                          $eq: ['$$content_id', '$content_id']
                        }
                      }
                    },
                    {
                      $project: {
                        _id: 1
                      }
                    }
                  ],
                  as: 'bookmark'
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
                  srtUrl: {
                    $concat: [CLOUDFRONT_URL, 'admins/shoorah_pods/srt/', '$pods_srt']
                  },
                  image: {
                    $concat: [
                      CLOUDFRONT_URL,
                      ADMIN_MEDIA_PATH.SHOORAH_PODS_IMAGE,
                      '/',
                      '$pods_image'
                    ]
                  },
                  expertName: '$expert_name',
                  expertImage: {
                    $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.EXPERT_IMAGES, '/', '$expert_image']
                  },
                  _id: 0,
                  isBookmarked: {
                    $cond: [
                      {
                        $gt: [
                          {
                            $arrayElemAt: ['$bookmark', 0]
                          },
                          null
                        ]
                      },
                      true,
                      false
                    ]
                  }
                }
              },
              {
                $addFields: {
                  contentType: CONTENT_TYPE.SHOORAH_PODS
                }
              }
            ],
            as: 'shoorahPods'
          }
        },
        {
          $unwind: {
            path: '$meditation',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $unwind: {
            path: '$sound',
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
            _id: null,
            meditation: {
              $addToSet: '$meditation'
            },
            sound: {
              $addToSet: '$sound'
            },
            shoorahPods: {
              $addToSet: '$shoorahPods'
            }
          }
        },
        {
          $project: {
            content: {
              $setUnion: ['$meditation', '$sound', '$shoorahPods']
            }
          }
        },
      ];
      const recommendData = await Trending.aggregate(recommendListAggregation);
      if (recommendData.length > 0) {
        const resData = shuffleArray(recommendData[0].content);
        return Response.successResponseData(res, resData, SUCCESS, res.__('recommendedListSuccess'), {
          totalCount: recommendData[0].totalCount
        });
      } else {
        return Response.successResponseData(res, [], SUCCESS, res.__('recommendedListSuccess'), {
          totalCount: 0
        });
      }
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },
};
