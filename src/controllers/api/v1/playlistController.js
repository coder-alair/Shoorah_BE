'use strict';

const {
  Playlist,
  Users,
  Breathwork,
  Meditation,
  ShoorahPods,
  Sound,
  UserInterest
} = require('@models');
const {
  SUCCESS,
  CLOUDFRONT_URL,
  ADMIN_MEDIA_PATH,
  PER_PAGE,
  STATUS,
  CONTENT_TYPE
} = require('@services/Constant');
const Response = require('@services/Response');
const { toObjectId } = require('@services/Helper');

module.exports = {
  createPlaylist: async (req, res) => {
    try {
      const reqParam = req.body;
      const user = await Users.findById(reqParam.user_id, 'name');
      if (user) {
        const playlist = await Playlist.create({
          name: reqParam.name,
          created_by: reqParam.user_id
        });

        const playlistData = {
          id: playlist._id,
          name: playlist.name,
          created_by: user.name
        };

        return Response.successResponseData(res, playlistData, SUCCESS, 'createPlaylistSuccess');
      } else {
        return Response.errorResponseData(res, 'Invalid user');
      }
    } catch (err) {
      console.log(err);
      return Response.internalServerErrorResponse(res);
    }
  },
  deletePlaylist: async (req, res) => {
    try {
      const reqParam = req.query;
      const playlistExist = await Playlist.findById(reqParam.id);
      if (playlistExist) {
        await Playlist.findByIdAndDelete(reqParam.id);
        return Response.successResponseWithoutData(res, 'deletePlaylistSuccess', SUCCESS);
      } else {
        return Response.errorResponseData(res, 'Invalid playlist');
      }
    } catch (err) {
      console.log(err);
      return Response.internalServerErrorResponse(res);
    }
  },
  getPlaylist: async (req, res) => {
    try {
      const reqParam = req.query;
      const { userId, id } = reqParam;

      let filterCondition = {};
      if (userId) {
        filterCondition = { created_by: toObjectId(userId) };
      } else if (id) {
        filterCondition = { _id: toObjectId(id) };
      } else {
        return Response.errorResponseData(res, 'Invalid request');
      }

      let playlist = await Playlist.aggregate([
        {
          $match: filterCondition
        },
        {
          $lookup: {
            from: 'breathworks',
            localField: 'audios.audioId',
            foreignField: '_id',
            as: 'breathworksAudios'
          }
        },
        {
          $lookup: {
            from: 'meditations',
            localField: 'audios.audioId',
            foreignField: '_id',
            as: 'meditationsAudios'
          }
        },
        {
          $lookup: {
            from: 'shoorah_pods',
            localField: 'audios.audioId',
            foreignField: '_id',
            as: 'shoorahPodsAudios'
          }
        },
        {
          $lookup: {
            from: 'sounds',
            localField: 'audios.audioId',
            foreignField: '_id',
            as: 'soundsAudios'
          }
        },
        {
          $unwind: {
            path: '$audios',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $addFields: {
            audio: {
              $switch: {
                branches: [
                  {
                    case: { $eq: ['$audios.audioType', 'breathwork'] },
                    then: {
                      $arrayElemAt: [
                        '$breathworksAudios',
                        { $indexOfArray: ['$breathworksAudios._id', '$audios.audioId'] }
                      ]
                    }
                  },
                  {
                    case: { $eq: ['$audios.audioType', 'meditation'] },
                    then: {
                      $arrayElemAt: [
                        '$meditationsAudios',
                        { $indexOfArray: ['$meditationsAudios._id', '$audios.audioId'] }
                      ]
                    }
                  },
                  {
                    case: { $eq: ['$audios.audioType', 'shoorah_pod'] },
                    then: {
                      $arrayElemAt: [
                        '$shoorahPodsAudios',
                        { $indexOfArray: ['$shoorahPodsAudios._id', '$audios.audioId'] }
                      ]
                    }
                  },
                  {
                    case: { $eq: ['$audios.audioType', 'sound'] },
                    then: {
                      $arrayElemAt: [
                        '$soundsAudios',
                        { $indexOfArray: ['$soundsAudios._id', '$audios.audioId'] }
                      ]
                    }
                  }
                ],
                default: null
              }
            }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'created_by',
            foreignField: '_id',
            as: 'createdBy'
          }
        },
        {
          $group: {
            _id: '$_id',
            name: { $first: '$name' },
            description: { $first: '$description' },
            createdBy: { $first: { $arrayElemAt: ['$createdBy.name', 0] } },
            totalDuration: { $first: '$total_duration' },
            audios: {
              $push: {
                type: '$audios.audioType',
                id: '$audios.audioId',
                name: '$audio.display_name',
                duration: '$audio.duration',
                description: '$audio.description',
                isVideo: {
                  $switch: {
                    branches: [
                      {
                        case: { $eq: ['$audios.audioType', 'breathwork'] },
                        then: {
                          $cond: {
                            if: { $eq: ['$audio.breathwork_type', 2] },
                            then: true,
                            else: false
                          }
                        }
                      },
                      {
                        case: { $eq: ['$audios.audioType', 'meditation'] },
                        then: {
                          $cond: {
                            if: { $eq: ['$audio.meditation_type', 2] },
                            then: true,
                            else: false
                          }
                        }
                      },
                      {
                        case: { $eq: ['$audios.audioType', 'shoorah_pod'] },
                        then: {
                          $cond: {
                            if: { $eq: ['$audio.pods_type', 2] },
                            then: true,
                            else: false
                          }
                        }
                      },
                      {
                        case: { $eq: ['$audios.audioType', 'sound'] },
                        then: false
                      }
                    ],
                    default: null
                  }
                },
                focusIds: {
                  $cond: {
                    if: { $eq: ['$audios.audioType', 'breathwork'] },
                    then: [],
                    else: '$audio.focus_ids'
                  }
                },
                expertId: '$audio.expert_id',
                srtUrl: {
                  $switch: {
                    branches: [
                      {
                        case: { $eq: ['$audios.audioType', 'breathwork'] },
                        then: {
                          $cond: {
                            if: {
                              $and: [
                                { $ne: ['$audio.breathwork_srt', null] },
                                { $ne: ['$audio.breathwork_srt', ''] }
                              ]
                            },
                            then: {
                              $concat: [
                                CLOUDFRONT_URL,
                                ADMIN_MEDIA_PATH.BREATHWORK_SRT,
                                '/',
                                '$audio.breathwork_srt'
                              ]
                            },
                            else: ''
                          }
                        }
                      },
                      {
                        case: { $eq: ['$audios.audioType', 'meditation'] },
                        then: {
                          $cond: {
                            if: {
                              $and: [
                                { $ne: ['$audio.meditation_srt', null] },
                                { $ne: ['$audio.meditation_srt', ''] }
                              ]
                            },
                            then: {
                              $concat: [
                                CLOUDFRONT_URL,
                                ADMIN_MEDIA_PATH.MEDITATION_SRT,
                                '/',
                                '$audio.meditation_srt'
                              ]
                            },
                            else: ''
                          }
                        }
                      },
                      {
                        case: { $eq: ['$audios.audioType', 'shoorah_pod'] },
                        then: {
                          $cond: {
                            if: {
                              $and: [
                                { $ne: ['$audio.pods_srt', null] },
                                { $ne: ['$audio.pods_srt', ''] }
                              ]
                            },
                            then: {
                              $concat: [
                                CLOUDFRONT_URL,
                                ADMIN_MEDIA_PATH.SHOORAH_PODS_SRT,
                                '/',
                                '$audio.pods_srt'
                              ]
                            },
                            else: ''
                          }
                        }
                      },
                      {
                        case: { $eq: ['$audios.audioType', 'sound'] },
                        then: {
                          $cond: {
                            if: {
                              $and: [
                                { $ne: ['$audio.sound_srt', null] },
                                { $ne: ['$audio.sound_srt', ''] }
                              ]
                            },
                            then: {
                              $concat: [
                                CLOUDFRONT_URL,
                                ADMIN_MEDIA_PATH.SOUND_SRT,
                                '/',
                                '$audio.sound_srt'
                              ]
                            },
                            else: ''
                          }
                        }
                      }
                    ],
                    default: null
                  }
                },
                url: {
                  $switch: {
                    branches: [
                      {
                        case: { $eq: ['$audios.audioType', 'breathwork'] },
                        then: {
                          $concat: [
                            CLOUDFRONT_URL,
                            ADMIN_MEDIA_PATH.BREATHWORK_AUDIO,
                            '/',
                            '$audio.breathwork_url'
                          ]
                        }
                      },
                      {
                        case: { $eq: ['$audios.audioType', 'meditation'] },
                        then: {
                          $concat: [
                            CLOUDFRONT_URL,
                            ADMIN_MEDIA_PATH.MEDITATION_AUDIO,
                            '/',
                            '$audio.meditation_url'
                          ]
                        }
                      },
                      {
                        case: { $eq: ['$audios.audioType', 'shoorah_pod'] },
                        then: {
                          $concat: [
                            CLOUDFRONT_URL,
                            ADMIN_MEDIA_PATH.SHOORAH_PODS_AUDIO,
                            '/',
                            '$audio.pods_url'
                          ]
                        }
                      },
                      {
                        case: { $eq: ['$audios.audioType', 'sound'] },
                        then: {
                          $concat: [
                            CLOUDFRONT_URL,
                            ADMIN_MEDIA_PATH.SOUND_AUDIO,
                            '/',
                            '$audio.sound_url'
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
                        case: { $eq: ['$audios.audioType', 'breathwork'] },
                        then: {
                          $concat: [
                            CLOUDFRONT_URL,
                            ADMIN_MEDIA_PATH.BREATHWORK_IMAGE,
                            '/',
                            '$audio.breathwork_image'
                          ]
                        }
                      },
                      {
                        case: { $eq: ['$audios.audioType', 'meditation'] },
                        then: {
                          $concat: [
                            CLOUDFRONT_URL,
                            ADMIN_MEDIA_PATH.MEDITATION_IMAGE,
                            '/',
                            '$audio.meditation_image'
                          ]
                        }
                      },
                      {
                        case: { $eq: ['$audios.audioType', 'shoorah_pod'] },
                        then: {
                          $concat: [
                            CLOUDFRONT_URL,
                            ADMIN_MEDIA_PATH.SHOORAH_PODS_IMAGE,
                            '/',
                            '$audio.pods_image'
                          ]
                        }
                      },
                      {
                        case: { $eq: ['$audios.audioType', 'sound'] },
                        then: {
                          $concat: [
                            CLOUDFRONT_URL,
                            ADMIN_MEDIA_PATH.SOUND_IMAGES,
                            '/',
                            '$audio.sound_image'
                          ]
                        }
                      }
                    ],
                    default: null
                  }
                }
              }
            }
          }
        },
        {
          $lookup: {
            from: 'pod_experts',
            localField: 'audios.expertId',
            foreignField: '_id',
            as: 'expertDetails'
          }
        },
        {
          $lookup: {
            from: 'focus',
            localField: 'audios.focusIds',
            foreignField: '_id',
            as: 'focusDetails'
          }
        },
        {
          $lookup: {
            from: 'bookmarks',
            let: {
              audio_ids: '$audios.id'
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $in: ['$content_id', '$$audio_ids']
                  },
                  deletedAt: null,
                  user_id: toObjectId(req.authUserId)
                }
              },
              {
                $project: {
                  _id: 1,
                  content_id: 1
                }
              }
            ],
            as: 'bookmarksList'
          }
        },
        {
          $project: {
            id: '$_id',
            _id: 0,
            name: 1,
            description: { $ifNull: ['$description', ''] },
            totalDuration: 1,
            createdBy: 1,
            audios: {
              $filter: {
                input: {
                  $map: {
                    input: '$audios',
                    as: 'audio',
                    in: {
                      type: '$$audio.type',
                      expertId: '$$audio.expertId',
                      contentName: {
                        $cond: {
                          if: { $ne: ['$$audio.name', null] },
                          then: '$$audio.name',
                          else: '$$REMOVE'
                        }
                      },
                      description: {
                        $cond: {
                          if: { $ne: ['$$audio.description', null] },
                          then: '$$audio.description',
                          else: '$$REMOVE'
                        }
                      },
                      thumbnail: '',
                      url: {
                        $cond: {
                          if: { $ne: ['$$audio.url', null] },
                          then: '$$audio.url',
                          else: '$$REMOVE'
                        }
                      },
                      duration: {
                        $cond: {
                          if: { $ne: ['$$audio.duration', null] },
                          then: '$$audio.duration',
                          else: '$$REMOVE'
                        }
                      },
                      expertName: {
                        $arrayElemAt: [
                          '$expertDetails.name',
                          { $indexOfArray: ['$expertDetails._id', '$$audio.expertId'] }
                        ]
                      },
                      expertImage: {
                        $let: {
                          vars: {
                            imageElement: {
                              $arrayElemAt: [
                                '$expertDetails.image',
                                { $indexOfArray: ['$expertDetails._id', '$$audio.expertId'] }
                              ]
                            }
                          },
                          in: {
                            $cond: {
                              if: {
                                $and: [
                                  { $ne: ['$$imageElement', null] },
                                  { $ne: ['$$imageElement', ''] }
                                ]
                              },
                              then: {
                                $concat: [
                                  CLOUDFRONT_URL,
                                  ADMIN_MEDIA_PATH.POD_EXPERT_IMAGE,
                                  '/',
                                  '$$imageElement'
                                ]
                              },
                              else: ''
                            }
                          }
                        }
                      },
                      isBookmarked: {
                        $let: {
                          vars: {
                            matchIndex: {
                              $indexOfArray: ['$bookmarksList.content_id', '$$audio.id']
                            }
                          },
                          in: {
                            $cond: {
                              if: { $eq: ['$$matchIndex', -1] },
                              then: false,
                              else: true
                            }
                          }
                        }
                      },
                      bookmarkId: {
                        $let: {
                          vars: {
                            matchIndex: {
                              $indexOfArray: ['$bookmarksList.content_id', '$$audio.id']
                            },
                            matchBookmark: {
                              $arrayElemAt: [
                                '$bookmarksList',
                                {
                                  $indexOfArray: ['$bookmarksList.content_id', '$$audio.id']
                                }
                              ]
                            }
                          },
                          in: {
                            $cond: {
                              if: { $eq: ['$$matchIndex', -1] },
                              then: '',
                              else: '$$matchBookmark._id'
                            }
                          }
                        }
                      },
                      contentId: '$$audio.id',
                      isVideo: '$$audio.isVideo',
                      image: {
                        $cond: {
                          if: { $ne: ['$$audio.image', null] },
                          then: '$$audio.image',
                          else: '$$REMOVE'
                        }
                      },
                      contentType: {
                        $switch: {
                          branches: [
                            {
                              case: { $eq: ['$$audio.type', 'breathwork'] },
                              then: CONTENT_TYPE.BREATHWORK
                            },
                            {
                              case: { $eq: ['$$audio.type', 'meditation'] },
                              then: CONTENT_TYPE.MEDITATION
                            },
                            {
                              case: { $eq: ['$$audio.type', 'shoorah_pod'] },
                              then: CONTENT_TYPE.SHOORAH_PODS
                            },
                            {
                              case: { $eq: ['$$audio.type', 'sound'] },
                              then: CONTENT_TYPE.SOUND
                            }
                          ],
                          default: ''
                        }
                      },
                      focus: {
                        $cond: {
                          if: { $gt: [{ $size: { $ifNull: ['$$audio.focusIds', []] } }, 0] },
                          then: {
                            $reduce: {
                              input: '$$audio.focusIds',
                              initialValue: [],
                              in: {
                                $cond: {
                                  if: {
                                    $in: [
                                      {
                                        $arrayElemAt: [
                                          '$focusDetails.display_name',
                                          { $indexOfArray: ['$focusDetails._id', '$$this'] }
                                        ]
                                      },
                                      '$$value'
                                    ]
                                  },
                                  then: '$$value',
                                  else: {
                                    $concatArrays: [
                                      '$$value',
                                      [
                                        {
                                          $arrayElemAt: [
                                            '$focusDetails.display_name',
                                            { $indexOfArray: ['$focusDetails._id', '$$this'] }
                                          ]
                                        }
                                      ]
                                    ]
                                  }
                                }
                              }
                            }
                          },
                          else: []
                        }
                      },
                      playedDuration: 0,
                      srtUrl: '$$audio.srtUrl',
                      imagePath: '',
                      podPath: ''
                    }
                  }
                },
                as: 'filteredAudio',
                cond: { $ne: [{ $objectToArray: '$$filteredAudio' }, []] }
              }
            }
          }
        }
      ]);

      if (playlist.length) {
        playlist = playlist.map((item) => {
          if (item.audios.length) {
            item.audios = item.audios.filter(
              (audio) => audio.type && audio.contentName && audio.contentType
            );
          }
          return item;
        });
      }

      return Response.successResponseData(res, playlist, SUCCESS, 'getPlaylistSuccess');
    } catch (err) {
      console.log(err);
      return Response.internalServerErrorResponse(res);
    }
  },
  updatePlaylist: async (req, res) => {
    try {
      const reqParam = req.body;
      const playlist = await Playlist.findById(reqParam.id);
      if (!playlist) {
        return Response.errorResponseData(res, res.__('invalidPlaylist'));
      }
      playlist.name = reqParam.name || playlist.name;
      playlist.description = reqParam.description || playlist.description;
      if (reqParam.order) {
        if (playlist.audios.length !== reqParam.order.length) {
          return Response.errorResponseData(res, res.__('invalidOrderData'));
        }
        const idx = new Set();
        const newAudios = new Array(playlist.audios.length);
        for (const { audioId, index } of reqParam.order) {
          if (idx.has(index)) {
            return Response.errorResponseData(res, res.__('invalidIndexing'));
          }
          idx.add(index);
          const audioExist = playlist.audios.find((audio) => audio.audioId.toString() === audioId);
          if (!audioExist) {
            return Response.errorResponseData(res, res.__('invalidAudioId'));
          }
          audioExist.index = index;
          newAudios[index] = audioExist;
        }
        playlist.audios = newAudios;
      }
      await playlist.save();
      return Response.successResponseWithoutData(res, res.__('updatePlaylistSuccess'), SUCCESS);
    } catch (err) {
      console.log(err);
      return Response.internalServerErrorResponse(res);
    }
  },
  getSuggestedContent: async (req, res) => {
    try {
      const reqParam = req.query;
      const limit = parseInt(reqParam.limit) || PER_PAGE;

      let existingPlaylistAudioIds = await Playlist.findById(
        reqParam.playlistId,
        'audios.audioId'
      ).lean();
      if (!existingPlaylistAudioIds) {
        return Response.errorResponseData(res, 'Invalid playlist');
      }
      existingPlaylistAudioIds = existingPlaylistAudioIds.audios.map((audio) => audio.audioId);

      const userInterest = await UserInterest.findOne(
        {
          user_id: req.authUserId,
          deleted_at: null
        },
        { _id: 0, main_focus_ids: 1 }
      ).lean();

      const filterCondition = {
        _id: { $nin: existingPlaylistAudioIds },
        is_draft: false,
        status: {
          $ne: STATUS.DELETED
        },
        ...(userInterest && {
          focus_ids: { $elemMatch: { $in: userInterest.main_focus_ids } }
        }),
        ...(reqParam.search && {
          $or: [
            { display_name: { $regex: new RegExp(reqParam.search, 'i') } },
            { description: { $regex: new RegExp(reqParam.search, 'i') } }
          ]
        })
      };

      const createPipeline = (type) => [
        { $match: filterCondition },
        {
          $project: {
            type: { $literal: type },
            _id: 0,
            id: '$_id',
            name: '$display_name',
            duration: 1,
            description: 1,
            expertId: '$expert_id',
            url: {
              $switch: {
                branches: [
                  {
                    case: { $eq: [type, 'breathwork'] },
                    then: {
                      $concat: [
                        CLOUDFRONT_URL,
                        ADMIN_MEDIA_PATH.BREATHWORK_AUDIO,
                        '/',
                        '$breathwork_url'
                      ]
                    }
                  },
                  {
                    case: { $eq: [type, 'meditation'] },
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
                    case: { $eq: [type, 'shoorah_pod'] },
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
                    case: { $eq: [type, 'sound'] },
                    then: {
                      $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.SOUND_AUDIO, '/', '$sound_url']
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
                    case: { $eq: [type, 'breathwork'] },
                    then: {
                      $concat: [
                        CLOUDFRONT_URL,
                        ADMIN_MEDIA_PATH.BREATHWORK_IMAGE,
                        '/',
                        '$breathwork_image'
                      ]
                    }
                  },
                  {
                    case: { $eq: [type, 'meditation'] },
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
                    case: { $eq: [type, 'shoorah_pod'] },
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
                    case: { $eq: [type, 'sound'] },
                    then: {
                      $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.SOUND_IMAGES, '/', '$sound_image']
                    }
                  }
                ],
                default: null
              }
            }
          }
        },
        { $sample: { size: limit } }
      ];

      const pipeline = [
        ...createPipeline('breathwork'),
        {
          $unionWith: {
            coll: 'meditations',
            pipeline: createPipeline('meditation')
          }
        },
        {
          $unionWith: {
            coll: 'shoorah_pods',
            pipeline: createPipeline('shoorah_pod')
          }
        },
        {
          $unionWith: {
            coll: 'sounds',
            pipeline: createPipeline('sound')
          }
        },
        { $sample: { size: limit } }
      ];

      const audios = await Breathwork.aggregate(pipeline);

      return Response.successResponseData(
        res,
        audios,
        SUCCESS,
        res.__('getSuggestedContentSuccess'),
        { limit }
      );
    } catch (err) {
      console.log(err);
      return Response.internalServerErrorResponse(res);
    }
  },
  addAudioToPlaylist: async (req, res) => {
    try {
      const reqParam = req.body;
      const playlist = await Playlist.findById(reqParam.playlistId);
      if (!playlist) {
        return Response.errorResponseData(res, 'Invalid playlist');
      }
      const audioExist = playlist.audios.some(
        (audio) =>
          audio.audioId.toString() === reqParam.audioId && audio.audioType === reqParam.audioType
      );
      if (audioExist) {
        return Response.errorResponseData(res, 'Audio already exist in playlist');
      }
      let audio;
      switch (reqParam.audioType) {
        case 'breathwork':
          audio = await Breathwork.findById(reqParam.audioId);
          if (!audio) {
            return Response.errorResponseData(res, 'Invalid breathwork');
          }
          break;
        case 'meditation':
          audio = await Meditation.findById(reqParam.audioId);
          if (!audio) {
            return Response.errorResponseData(res, 'Invalid meditation');
          }
          break;
        case 'shoorah_pod':
          audio = await ShoorahPods.findById(reqParam.audioId);
          if (!audio) {
            return Response.errorResponseData(res, 'Invalid shoorah pod');
          }
          break;
        case 'sound':
          audio = await Sound.findById(reqParam.audioId);
          if (!audio) {
            return Response.errorResponseData(res, 'Invalid sound');
          }
          break;
        default:
          return Response.errorResponseData(res, 'Invalid audio type');
      }

      playlist.audios.push({ audioId: reqParam.audioId, audioType: reqParam.audioType });
      await playlist.save();
      return Response.successResponseWithoutData(res, 'addAudioToPlaylistSuccess', SUCCESS);
    } catch (err) {
      console.log(err);
      return Response.internalServerErrorResponse(res);
    }
  },
  removeAudioFromPlaylist: async (req, res) => {
    try {
      const reqParam = req.body;
      const playlist = await Playlist.findById(reqParam.playlistId);
      if (!playlist) {
        return Response.errorResponseData(res, 'Invalid playlist');
      }
      const audioIndex = playlist.audios.findIndex(
        (audio) =>
          audio.audioId.toString() === reqParam.audioId && audio.audioType === reqParam.audioType
      );
      if (audioIndex === -1) {
        return Response.errorResponseData(res, 'Audio doest not exist in playlist');
      }

      playlist.audios.splice(audioIndex, 1);
      await playlist.save();

      return Response.successResponseWithoutData(res, 'removeAudioFromPlaylistSuccess', SUCCESS);
    } catch (err) {
      console.log(err);
      return Response.internalServerErrorResponse(res);
    }
  }
};
