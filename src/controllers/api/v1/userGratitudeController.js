'use strict';

const { UserGratitude, Gratitude } = require('@models');
const Response = require('@services/Response');
const {
  addUserGratitudeValidation,
  userGratitudeDetailedListValidation,
  exploreGratitudesValidation,
  deleteGratitudeValidation
} = require('@services/userValidations/userGratitudeValidations');
const {
  SUCCESS,
  FAIL,
  PAGE,
  PER_PAGE,
  STATUS,
  USER_MEDIA_PATH,
  CLOUDFRONT_URL,
  CATEGORY_TYPE,
  BADGE_TYPE
} = require('@services/Constant');
const { toObjectId, unixTimeStamp, makeRandomDigit, currentDateOnly } = require('@services/Helper');
const { getUploadURL, removeOldImage } = require('@services/s3Services');
const { updateBadges, sendBadgeNotification } = require('@services/userServices/badgeServices');
const { ContentCounts } = require('../../../models');
const { default: axios } = require('axios');
const { analyzeSentiment } = require('./historyController');

module.exports = {
  /**
   * @description This function is used to add or edit gratitude.
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  addUserGratitude: (req, res) => {
    try {
      const reqParam = req.body;
      addUserGratitudeValidation(reqParam, res, async (validate) => {
        if (validate) {
          let updateData = {
            display_name: reqParam.title,
            is_saved: reqParam.isSaved
          };
          if (reqParam.description) {
            updateData = {
              ...updateData,
              description: reqParam.description.trim()
            };
          }
          let gratitudeImageUrl;
          if (reqParam.imageUrl) {
            const imageExtension = reqParam.imageUrl.split('/')[1];
            const gratitudeImage = `${unixTimeStamp(new Date())}-${makeRandomDigit(
              4
            )}.${imageExtension}`;
            gratitudeImageUrl = await getUploadURL(
              reqParam.imageUrl,
              gratitudeImage,
              USER_MEDIA_PATH.GRATITUDE
            );
            updateData = {
              ...updateData,
              image_url: gratitudeImage
            };
          }
          if (reqParam.isImageDeleted) {
            updateData = {
              ...updateData,
              image_url: null
            };
          }
          let response = await analyzeSentiment(updateData.display_name);
            updateData = {
              ...updateData,
              positivity: response ? response : false
            };
          if (reqParam.userGratitudeId) {
            const filterData = {
              _id: reqParam.userGratitudeId,
              user_id: req.authUserId,
              deletedAt: null
            };
            if (reqParam.imageUrl || reqParam.isImageDeleted) {
              const existingImageUrl = await UserGratitude.findOne(filterData).select('image_url');
              if (existingImageUrl && existingImageUrl.image_url) {
                await removeOldImage(existingImageUrl.image_url, USER_MEDIA_PATH.GRATITUDE, res);
              }
            }
            await UserGratitude.findOneAndUpdate(filterData, updateData);
          } else {
            let { data: sentiments } = await axios.post(
              `https://suru-therapy.shoorah.io/match?input_text=${reqParam.title}`
            );
            let newData = {
              ...updateData,
              user_id: req.authUserId,
              sentiments
            };
            let response = await analyzeSentiment(newData.display_name);
            newData = {
              ...newData,
              positivity: response ? response : false
            };
            await UserGratitude.create(newData);
          }

          const myGratitudeCount = await UserGratitude.countDocuments({
            user_id: req.authUserId,
            is_saved: true,
            deletedAt: null
          });
          let badgeReceived = false;
          switch (myGratitudeCount) {
            case 10:
              badgeReceived = await updateBadges(
                req.authUserId,
                CATEGORY_TYPE.USER_GRATITUDE,
                BADGE_TYPE.BRONZE
              );
              badgeReceived &&
                (await sendBadgeNotification(
                  req.authUserId,
                  CATEGORY_TYPE.USER_GRATITUDE,
                  BADGE_TYPE.BRONZE
                ));
              break;
            case 30:
              badgeReceived = await updateBadges(
                req.authUserId,
                CATEGORY_TYPE.USER_GRATITUDE,
                BADGE_TYPE.SILVER
              );
              badgeReceived &&
                (await sendBadgeNotification(
                  req.authUserId,
                  CATEGORY_TYPE.USER_GRATITUDE,
                  BADGE_TYPE.SILVER
                ));
              break;
            case 60:
              badgeReceived = await updateBadges(
                req.authUserId,
                CATEGORY_TYPE.USER_GRATITUDE,
                BADGE_TYPE.GOLD
              );
              badgeReceived &&
                (await sendBadgeNotification(
                  req.authUserId,
                  CATEGORY_TYPE.USER_GRATITUDE,
                  BADGE_TYPE.GOLD
                ));
              break;
            case 100:
              badgeReceived = await updateBadges(
                req.authUserId,
                CATEGORY_TYPE.USER_GRATITUDE,
                BADGE_TYPE.PLATINUM
              );
              badgeReceived &&
                (await sendBadgeNotification(
                  req.authUserId,
                  CATEGORY_TYPE.USER_GRATITUDE,
                  BADGE_TYPE.PLATINUM
                ));
              break;
            case 150:
              badgeReceived = await updateBadges(
                req.authUserId,
                CATEGORY_TYPE.USER_GRATITUDE,
                BADGE_TYPE.DIAMOND
              );
              badgeReceived &&
                (await sendBadgeNotification(
                  req.authUserId,
                  CATEGORY_TYPE.USER_GRATITUDE,
                  BADGE_TYPE.DIAMOND
                ));
              break;
          }
          return Response.successResponseWithoutData(
            res,
            reqParam.userGratitudeId
              ? res.__('myGratitudeUpdateSuccess')
              : res.__('addedMyGratitudeSuccess'),
            SUCCESS,
            gratitudeImageUrl || null
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
   * @description This function is used to get detailed list of logged in user's gratitude
   * @param {*} req
   * @param {*} res
   * @returns {}
   */
  userGratitudeDetailedList: (req, res) => {
    try {
      const reqParam = req.query;
      userGratitudeDetailedListValidation(reqParam, res, async (validate) => {
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
            filterCondition = {
              ...filterCondition,
              $or: [{ display_name: { $regex: '.*' + reqParam.searchKey + '.*', $options: 'i' } }]
            };
          }
          const aggregationPipeline = [
            {
              $match: filterCondition
            },
            {
              $project: {
                userGratitudeId: '$_id',
                displayName: '$display_name',
                description: 1,
                imageUrl: {
                  $concat: [CLOUDFRONT_URL, USER_MEDIA_PATH.GRATITUDE, '/', '$image_url']
                },
                createdOn: '$createdAt',
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
                metaData: [{ $count: 'totalCount' }, { $addFields: { page, perPage } }],
                data: [{ $skip: skip }, { $limit: perPage }]
              }
            }
          ];
          const myGratitudeData = await UserGratitude.aggregate(aggregationPipeline);
          const totalGratitudes = await UserGratitude.find({
            user_id: toObjectId(req.authUserId)
          }).countDocuments();
          let existingCount = await ContentCounts.findOne({ user_id: toObjectId(req.authUserId) });
          if (existingCount) {
            await ContentCounts.updateOne(
              { user_id: toObjectId(req.authUserId) },
              {
                $set: {
                  gratitudes: totalGratitudes
                }
              }
            );
          } else {
            await ContentCounts.create({
              gratitudes: totalGratitudes,
              user_id: toObjectId(req.authUserId)
            });
          }
          return myGratitudeData.length > 0
            ? Response.successResponseData(
                res,
                myGratitudeData[0].data,
                SUCCESS,
                res.__('myGratitudeListSuccess'),
                myGratitudeData[0].metaData[0]
              )
            : Response.successResponseWithoutData(res, res.__('noUserGratitudeFound'), FAIL);
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  exploreGratitudes: (req, res) => {
    try {
      const reqParam = req.query;
      exploreGratitudesValidation(reqParam, res, async (validate) => {
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
              $or: [{ display_name: { $regex: '.*' + reqParam.searchKey + '.*', $options: 'i' } }]
            };
          }
          const myGratitudeData = await Gratitude.find(filterCondition, {
            gratitudeId: '$_id',
            displayName: '$display_name',
            gratitudeUrl: '$gratitude_url',
            thumbnail: 1,
            _id: 0
          })
            .limit(perPage)
            .skip(skip);
          return myGratitudeData.length > 0
            ? Response.successResponseData(
                res,
                myGratitudeData,
                SUCCESS,
                res.__('gratitudeListSuccess'),
                {
                  page,
                  perPage
                }
              )
            : Response.successResponseWithoutData(res, res.__('noGratitudeFound'), FAIL);
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to delete logged in user gratitude.
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  deleteGratitude: (req, res) => {
    try {
      const reqParam = req.query;
      deleteGratitudeValidation(reqParam, res, async (validate) => {
        if (validate) {
          const filterData = {
            _id: reqParam.userGratitudeId,
            user_id: req.authUserId
          };
          const deleteUserGratitude = await UserGratitude.findOneAndUpdate(
            filterData,
            { deletedAt: new Date() },
            { new: true }
          ).select('_id');
          return Response.successResponseWithoutData(
            res,
            deleteUserGratitude
              ? res.__('deleteUserGratitudeSuccess')
              : res.__('noUserGratitudeFound'),
            deleteUserGratitude ? SUCCESS : FAIL
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
   * @description this function for the get latest  gratitude record
   * @param {*} req
   * @param {*} res
   * @returns
   */
  getGratitudeTodayRecord: async (req, res) => {
    try {
      const toDate = currentDateOnly();
      const fromDate = currentDateOnly();
      toDate.setDate(toDate.getDate() + 1);
      const gratitudeData = await UserGratitude.findOne(
        {
          user_id: req.authUserId,
          createdAt: { $gte: fromDate, $lt: toDate },
          deletedAt: null
        },
        {
          displayName: '$display_name',
          description: 1,
          userGratitudeId: '$_id',
          imageUrl: {
            $concat: [CLOUDFRONT_URL, USER_MEDIA_PATH.GRATITUDE, '/', '$image_url']
          },
          _id: 0
        }
      ).sort({
        createdAt: -1
      });
      const gratitudeCount = await UserGratitude.countDocuments({
        user_id: req.authUserId,
        deletedAt: null
      });
      if (gratitudeData) {
        return Response.successResponseData(
          res,
          gratitudeData,
          SUCCESS,
          res.__('latestGratitudeData'),
          {
            totalCount: gratitudeCount
          }
        );
      } else {
        return Response.successResponseWithoutData(res, res.__('noLatestGratitudeData'), FAIL, {
          totalCount: gratitudeCount
        });
      }
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  }
};
