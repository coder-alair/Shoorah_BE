'use strict';

const { Affirmation, Reminder } = require('@models');
const Response = require('@services/Response');
const { STATUS, CONTENT_TYPE, REMINDER_TYPE, SUCCESS } = require('@services/Constant');
const { toObjectId } = require('@services/Helper');
const {
  addEditAffirmationValidation,
  affirmationListValidation,
  deleteAffirmationValidation
} = require('../../../services/userValidations/affirmationValidation');
const { UserAffirmation, Category, ContentCounts } = require('../../../models');
const {
  FAIL,
  PAGE,
  PER_PAGE,
  USER_MEDIA_PATH,
  CLOUDFRONT_URL,
  CATEGORY_TYPE,
  BADGE_TYPE
} = require('@services/Constant');
const { unixTimeStamp, makeRandomDigit, currentDateOnly } = require('@services/Helper');
const { getUploadURL, removeOldImage } = require('@services/s3Services');
const { default: axios } = require('axios');
const { analyzeSentiment } = require('./historyController');

module.exports = {
  /**
   * @description This function is used to get today's affirmation based on user interest
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  todayAffirmation: async (req, res) => {
    try {
      let offset = 0;
      let affirmationData;
      const offsetData = await Reminder.findOne({ user_id: req.authUserId }).select(
        'reminder offset'
      );
      if (offsetData) {
        offset = offsetData.offset + 5;
        offset = offsetData.offset + 1;
        const filterData = {
          user_id: req.authUserId,
          deletedAt: null
        };
        await Reminder.findOneAndUpdate(filterData, { offset });
      } else {
        const filterData = {
          user_id: req.authUserId,
          deletedAt: null
        };
        const updateReminder = [];
        Object.values(REMINDER_TYPE).map((value) => {
          const tempObj = {
            reminder_type: value,
            interval: 1
          };
          updateReminder.push(tempObj);
        });
        const updateData = {
          reminder: updateReminder,
          offset: 0
        };
        await Reminder.findOneAndUpdate(filterData, updateData, {
          upsert: true
        });
      }
      const affirmations = await Affirmation.aggregate([
        {
          $match: {
            status: STATUS.ACTIVE,
            is_draft: false,
            approved_by: {
              $ne: null
            }
          }
        },
        {
          $limit: (offset || 0) + 10
        },
        {
          $skip: offset || 0
        },
        {
          $lookup: {
            from: 'bookmarks',
            let: {
              affirmationId: '$_id'
            },
            pipeline: [
              {
                $match: {
                  deletedAt: null,
                  user_id: toObjectId(req.authUserId),
                  content_type: CONTENT_TYPE.AFFIRMATION,
                  $expr: {
                    $eq: ['$content_id', '$$affirmationId']
                  }
                }
              },
              {
                $project: {
                  content_id: 1
                }
              }
            ],
            as: 'bookmarks'
          }
        },
        {
          $match: {
            $expr: {
              $eq: [
                {
                  $size: '$bookmarks'
                },
                0
              ]
            }
          }
        },
        {
          $lookup: {
            from: 'user_interests',
            let: {
              user_id: toObjectId(req.authUserId)
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ['$user_id', '$$user_id']
                  }
                }
              }
            ],
            as: 'userInterests'
          }
        },
        {
          $unwind: {
            path: '$userInterests',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $unwind: {
            path: '$focus_ids',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $match: {
            $expr: {
              $cond: {
                if: {
                  $gt: ['$userInterest.affirmation_focus_ids', 0]
                },
                then: {
                  $in: ['$focus_ids', '$userInterest.affirmation_focus_ids']
                },
                else: {
                  $ne: ['$_id', null]
                }
              }
            }
          }
        },
        {
          $group: {
            _id: '$_id',
            displayName: {
              $first: '$display_name'
            },
            createdAt: {
              $first: '$createdAt'
            }
          }
        },
        {
          $project: {
            id: '$_id',
            displayName: 1,
            _id: 0
          }
        },
        {
          $sort: {
            createdAt: -1
          }
        }
      ]);
      if (affirmations.length > 0) {
        affirmationData = affirmations[affirmations.length - 1];
        if (!affirmationData) {
          affirmationData = affirmations[0];
        }
      } else {
        const allAffirmations = await Affirmation.aggregate([
          {
            $match: {
              status: STATUS.ACTIVE,
              is_draft: false,
              approved_by: {
                $ne: null
              }
            }
          },
          {
            $limit: (offset || 0) + 10
          },
          {
            $skip: offset || 0
          },
          {
            $lookup: {
              from: 'bookmarks',
              let: {
                affirmationId: '$_id'
              },
              pipeline: [
                {
                  $match: {
                    deletedAt: null,
                    user_id: toObjectId(req.authUserId),
                    content_type: CONTENT_TYPE.AFFIRMATION,
                    $expr: {
                      $eq: ['$content_id', '$$affirmationId']
                    }
                  }
                },
                {
                  $project: {
                    content_id: 1
                  }
                }
              ],
              as: 'bookmarks'
            }
          },
          {
            $match: {
              $expr: {
                $eq: [
                  {
                    $size: '$bookmarks'
                  },
                  0
                ]
              }
            }
          },
          {
            $project: {
              id: '$_id',
              displayName: '$display_name',
              _id: 0
            }
          }
        ]);
        if (allAffirmations.length > 0) {
          affirmationData = allAffirmations[allAffirmations.length - 1];
          if (!affirmationData) {
            affirmationData = allAffirmations[0];
          }
        }
      }
      return Response.successResponseData(
        res,
        affirmationData,
        SUCCESS,
        res.__('todayAffirmationSuccess')
      );
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  addEditAffirmation: async (req, res) => {
    try {
      const reqParam = req.body;
      addEditAffirmationValidation(reqParam, res, async (validate) => {
        if (validate) {
          let updateData = {
            title: reqParam.title,
            is_saved: reqParam.isSaved,
            description: reqParam.description || null
          };
          let affirmationImageUrl;
          if (reqParam.isSaved) {
            updateData = {
              ...updateData,
              completed_on: new Date()
            };
          }
          if (reqParam.imageUrl) {
            const imageExtension = reqParam.imageUrl.split('/')[1];
            const affirmationImage = `${unixTimeStamp(new Date())}-${makeRandomDigit(
              4
            )}.${imageExtension}`;
            affirmationImageUrl = await getUploadURL(
              reqParam.imageUrl,
              affirmationImage,
              USER_MEDIA_PATH.AFFIRMATION
            );
            updateData = {
              ...updateData,
              image_url: affirmationImage
            };
          }
          if (reqParam.isImageDeleted) {
            updateData = {
              ...updateData,
              image_url: null
            };
          }
          let response = await analyzeSentiment(updateData.title);
          updateData = {
            ...updateData,
            positivity: response ? response : false
          };
          if (reqParam.affirmationId) {
            const filterCondition = {
              _id: reqParam.affirmationId,
              user_id: req.authUserId,
              deletedAt: null
            };
            if (reqParam.imageUrl || reqParam.isImageDeleted) {
              const existingImageUrl =
                await UserAffirmation.findOne(filterCondition).select('image_url');
              if (existingImageUrl && existingImageUrl.image_url) {
                await removeOldImage(existingImageUrl.image_url, USER_MEDIA_PATH.AFFIRMATION, res);
              }
            }
            await UserAffirmation.findOneAndUpdate(filterCondition, updateData);
          } else {
            let { data: sentiments } = await axios.post(
              `https://suru-therapy.shoorah.io/match?input_text=${reqParam.title}`
            );
            let newData = {
              ...updateData,
              user_id: req.authUserId,
              sentiments
            };
            let response = await analyzeSentiment(newData.title);
            newData = {
              ...newData,
              positivity: response ? response : false
            };
            await UserAffirmation.create(newData);
          }
          // const AffirmationCount = await UserAffirmation.countDocuments({
          //   user_id: req.authUserId,
          //   is_saved: true,
          //   is_completed: true,
          //   deletedAt: null
          // });
          // let badgeReceived = false;
          // switch (goalsCount) {
          //   case 1:
          //     badgeReceived = await updateBadges(
          //       req.authUserId,
          //       CATEGORY_TYPE.GOALS,
          //       BADGE_TYPE.BRONZE
          //     );
          //     badgeReceived &&
          //       (await sendBadgeNotification(
          //         req.authUserId,
          //         CATEGORY_TYPE.GOALS,
          //         BADGE_TYPE.BRONZE
          //       ));
          //     break;
          //   case 3:
          //     badgeReceived = await updateBadges(
          //       req.authUserId,
          //       CATEGORY_TYPE.GOALS,
          //       BADGE_TYPE.SILVER
          //     );
          //     badgeReceived &&
          //       (await sendBadgeNotification(
          //         req.authUserId,
          //         CATEGORY_TYPE.GOALS,
          //         BADGE_TYPE.SILVER
          //       ));
          //     break;
          //   case 5:
          //     badgeReceived = await updateBadges(
          //       req.authUserId,
          //       CATEGORY_TYPE.GOALS,
          //       BADGE_TYPE.GOLD
          //     );
          //     badgeReceived &&
          //       (await sendBadgeNotification(req.authUserId, CATEGORY_TYPE.GOALS, BADGE_TYPE.GOLD));
          //     break;
          //   case 10:
          //     badgeReceived = await updateBadges(
          //       req.authUserId,
          //       CATEGORY_TYPE.GOALS,
          //       BADGE_TYPE.PLATINUM
          //     );
          //     badgeReceived &&
          //       (await sendBadgeNotification(
          //         req.authUserId,
          //         CATEGORY_TYPE.GOALS,
          //         BADGE_TYPE.PLATINUM
          //       ));
          //     break;
          //   case 15:
          //     badgeReceived = await updateBadges(
          //       req.authUserId,
          //       CATEGORY_TYPE.GOALS,
          //       BADGE_TYPE.DIAMOND
          //     );
          //     badgeReceived &&
          //       (await sendBadgeNotification(
          //         req.authUserId,
          //         CATEGORY_TYPE.GOALS,
          //         BADGE_TYPE.DIAMOND
          //       ));
          //     break;
          // }
          return Response.successResponseWithoutData(
            res,
            reqParam.affirmationId
              ? res.__('affirmationUpdateSuccess')
              : res.__('affirmationAddSuccess'),
            SUCCESS,
            affirmationImageUrl || null
          );
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  affirmationDetailedList: (req, res) => {
    try {
      const reqParam = req.query;
      affirmationListValidation(reqParam, res, async (validate) => {
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
            user_id: toObjectId(req.authUserId),
            is_saved: JSON.parse(reqParam.isSaved),
            deletedAt: null
          };
          if (reqParam.searchKey) {
            if (reqParam.searchKey.startsWith('(') || reqParam.searchKey.startsWith(')')) {
              return Response.successResponseWithoutData(
                res,
                res.__('Character not allowed'),
                FAIL
              );
            } else {
              filterCondition = {
                ...filterCondition,
                $or: [{ title: { $regex: '.*' + reqParam.searchKey + '.*', $options: 'i' } }]
              };
            }
          }
          const aggregationPipeline = [
            {
              $match: filterCondition
            },
            {
              $project: {
                affirmationId: '$_id',
                _id: 0,
                title: 1,
                description: 1,
                imageUrl: {
                  $concat: [CLOUDFRONT_URL, USER_MEDIA_PATH.AFFIRMATION, '/', '$image_url']
                },
                createdOn: '$createdAt',
                updatedAt: 1
              }
            },
            {
              $sort: {
                updatedAt: -1
              }
            },
            {
              $facet: {
                metaData: [{ $count: 'totalCount' }, { $addFields: { page, perPage } }],
                data: [{ $skip: skip }, { $limit: perPage }]
              }
            }
          ];
          const affirmationData = await UserAffirmation.aggregate(aggregationPipeline);

          return affirmationData.length > 0
            ? Response.successResponseData(
              res,
              affirmationData[0].data,
              SUCCESS,
              res.__('affirmationListSucess'),
              affirmationData[0].metaData[0]
            )
            : Response.successResponseWithoutData(res, res.__('noAffirmationFound'), FAIL);
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  deleteAffirmation: (req, res) => {
    try {
      const reqParam = req.query;
      deleteAffirmationValidation(reqParam, res, async (validate) => {
        if (validate) {
          const filterCondition = {
            _id: reqParam.affirmationId,
            user_id: req.authUserId
          };
          const deleteAffirmation = await UserAffirmation.findOneAndUpdate(
            filterCondition,
            {
              deletedAt: new Date()
            },
            { new: true }
          );
          return Response.successResponseWithoutData(
            res,
            deleteAffirmation ? res.__('deleteAffirmationSuccess') : res.__('noAffirmationFound'),
            deleteAffirmation ? SUCCESS : FAIL
          );
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  shoorahAffirmations: async (req, res) => {
    try {
      const reqParam = req.query;
      if (reqParam.categoryId) {
        let category = await Category.findOne({
          _id: reqParam.categoryId,
          contentType: CONTENT_TYPE.AFFIRMATION
        });
        reqParam.focusIds = category?.focuses;
        reqParam.focusIds = reqParam?.focusIds?.map((objectId) => objectId.toString());
      }

      affirmationListValidation(reqParam, res, async (validate) => {
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
          let filterAffirmation = {
            status: STATUS.ACTIVE,
            approved_by: {
              $ne: null
            },
            deletedAt: null
          };
          if (reqParam.searchKey) {
            filterAffirmation = {
              ...filterAffirmation,
              display_name: {
                $regex: '.*' + reqParam.searchKey + '.*',
                $options: 'i'
              }
            };
          }
          const aggregateCondition = [
            {
              $match: filterAffirmation
            },
            {
              $unwind: {
                path: '$focus_ids',
                preserveNullAndEmptyArrays: false
              }
            }
          ];
          if (reqParam.focusIds && reqParam.focusIds.length > 0) {
            const objFocusIds = [];
            reqParam.focusIds.map((el) => {
              objFocusIds.push(toObjectId(el));
            });
            aggregateCondition.push({
              $match: {
                $expr: {
                  $in: ['$focus_ids', objFocusIds]
                }
              }
            });
          }
          aggregateCondition.push(
            {
              $group: {
                _id: '$_id',
                focus_ids: {
                  $addToSet: '$focus_ids'
                },
                display_name: {
                  $first: '$display_name'
                },
                updatedAt: {
                  $first: '$updatedAt'
                }
              }
            },
            // {
            //   $lookup: {
            //     from: 'user_affirmations',
            //     let: {
            //       affirmationId: '$_id'
            //     },
            //     pipeline: [
            //       {
            //         $match: {
            //           user_id: toObjectId(req.authUserId),
            //           $expr: {
            //             $in: ['$$affirmationId', '$ritual_ids']
            //           }
            //         }
            //       },
            //       {
            //         $project: {
            //           ritual_ids: 1
            //         }
            //       }
            //     ],
            //     as: 'userRituals'
            //   }
            // },
            // {
            //   $match: {
            //     $expr: {
            //       $eq: [{ $size: '$userRituals' }, 0]
            //     }
            //   }
            // },
            {
              $lookup: {
                from: 'focus',
                let: {
                  focusIds: '$focus_ids'
                },
                pipeline: [
                  {
                    $match: {
                      status: 1,
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
                as: 'focus'
              }
            },
            {
              $match: {
                $expr: {
                  $gt: [{ $size: '$focus' }, 0]
                }
              }
            },
            {
              $project: {
                id: '$_id',
                affirmationName: '$display_name',
                focusName: '$focus.display_name',
                updatedAt: 1,
                _id: 0
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
          const affirmationData = await Affirmation.aggregate(aggregateCondition);
          return affirmationData.length > 0
            ? Response.successResponseData(
              res,
              affirmationData[0].data,
              SUCCESS,
              res.__('affirmationList'),
              affirmationData[0].metaData[0]
            )
            : Response.successResponseWithoutData(res, res.__('somethingWrong'), FAIL);
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  }
};
