'use strict';

const { Cleanse } = require('@models');
const Response = require('@services/Response');
const {
  addEditCleanseValidation,
  cleanseDetailedListValidation,
  deleteCleanseValidation
} = require('@services/userValidations/cleanseValidations');
const {
  FAIL,
  SUCCESS,
  PAGE,
  PER_PAGE,
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
   * @description This function is used to add or edit Cleanse.
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  addEditCleanse: (req, res) => {
    try {
      const reqParam = req.body;
      addEditCleanseValidation(reqParam, res, async (validate) => {
        if (validate) {
          let updateData = {
            title: reqParam.title,
            is_saved: reqParam.isSaved
          };
          if (reqParam.description) {
            updateData = {
              ...updateData,
              description: reqParam.description.trim()
            };
          }
          let cleanseImageUrl;
          if (reqParam.imageUrl) {
            const imageExtension = reqParam.imageUrl.split('/')[1];
            const cleanseImage = `${unixTimeStamp(new Date())}-${makeRandomDigit(
              4
            )}.${imageExtension}`;
            cleanseImageUrl = await getUploadURL(
              reqParam.image_url,
              cleanseImage,
              USER_MEDIA_PATH.CLEANSE
            );
            updateData = {
              ...updateData,
              image_url: cleanseImage
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
          if (reqParam.cleanseId) {
            const filterCondition = {
              _id: reqParam.cleanseId,
              user_id: req.authUserId,
              deletedAt: null
            };
            if (reqParam.imageUrl || reqParam.isImageDeleted) {
              const existingImageUrl = await Cleanse.findOne(filterCondition).select('image_url');
              if (existingImageUrl && existingImageUrl.image_url) {
                await removeOldImage(existingImageUrl.image_url, USER_MEDIA_PATH.CLEANSE, res);
              }
            }
            await Cleanse.findOneAndUpdate(filterCondition, updateData);
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
            await Cleanse.create(newData);
          }
          const cleanseCount = await Cleanse.countDocuments({
            user_id: req.authUserId,
            deletedAt: null,
            is_saved: true
          });
          let badgeReceived = false;
          switch (cleanseCount) {
            case 5:
              badgeReceived = await updateBadges(
                req.authUserId,
                CATEGORY_TYPE.CLEANSE,
                BADGE_TYPE.BRONZE
              );
              badgeReceived &&
                (await sendBadgeNotification(
                  req.authUserId,
                  CATEGORY_TYPE.CLEANSE,
                  BADGE_TYPE.BRONZE
                ));
              break;
            case 15:
              badgeReceived = await updateBadges(
                req.authUserId,
                CATEGORY_TYPE.CLEANSE,
                BADGE_TYPE.SILVER
              );
              badgeReceived &&
                (await sendBadgeNotification(
                  req.authUserId,
                  CATEGORY_TYPE.CLEANSE,
                  BADGE_TYPE.SILVER
                ));
              break;
            case 25:
              badgeReceived = badgeReceived = await updateBadges(
                req.authUserId,
                CATEGORY_TYPE.CLEANSE,
                BADGE_TYPE.GOLD
              );
              badgeReceived &&
                (await sendBadgeNotification(
                  req.authUserId,
                  CATEGORY_TYPE.CLEANSE,
                  BADGE_TYPE.GOLD
                ));
              break;
            case 50:
              badgeReceived = await updateBadges(
                req.authUserId,
                CATEGORY_TYPE.CLEANSE,
                BADGE_TYPE.PLATINUM
              );
              badgeReceived &&
                (await sendBadgeNotification(
                  req.authUserId,
                  CATEGORY_TYPE.CLEANSE,
                  BADGE_TYPE.PLATINUM
                ));
              break;
            case 100:
              badgeReceived = await updateBadges(
                req.authUserId,
                CATEGORY_TYPE.CLEANSE,
                BADGE_TYPE.DIAMOND
              );
              badgeReceived &&
                (await sendBadgeNotification(
                  req.authUserId,
                  CATEGORY_TYPE.CLEANSE,
                  BADGE_TYPE.DIAMOND
                ));
              break;
          }
          return Response.successResponseWithoutData(
            res,
            reqParam.cleanseId ? res.__('cleanseUpdateSuccess') : res.__('cleanseAddSuccess'),
            SUCCESS,
            cleanseImageUrl || null
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
   * @descirption This function is used to get detailed list of saved or draft cleanses.
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  cleanseDetailedList: (req, res) => {
    try {
      const reqParam = req.query;
      cleanseDetailedListValidation(reqParam, res, async (validate) => {
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
              $or: [{ title: { $regex: '.*' + reqParam.searchKey + '.*', $options: 'i' } }]
            };
          }

          if (reqParam.startDate || reqParam.endDate) {
            let fromDate = currentDateOnly();
            let toDate = currentDateOnly();
            if (reqParam.startDate) {
              fromDate = new Date(reqParam.startDate);
            }
            if (reqParam.endDate) {
              toDate = new Date(reqParam.endDate);
            }
            toDate.setDate(toDate.getDate() + 1);
            filterCondition = {
              ...filterCondition,
              createdAt: {
                $gt: fromDate,
                $lte: toDate
              }
            };
            delete filterCondition.deletedAt;
          }

          const aggregationPipeline = [
            {
              $match: filterCondition
            },
            {
              $project: {
                cleanseId: '$_id',
                _id: 0,
                title: 1,
                description: 1,
                imageUrl: {
                  $concat: [CLOUDFRONT_URL, USER_MEDIA_PATH.CLEANSE, '/', '$image_url']
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
          const cleanseData = await Cleanse.aggregate(aggregationPipeline);
          const totalCleanses = await Cleanse.find({ user_id: toObjectId(req.authUserId) });
          let existingCount = await ContentCounts.findOne({ user_id: toObjectId(req.authUserId) });
          if (existingCount) {
            await ContentCounts.updateOne(
              { user_id: toObjectId(req.authUserId) },
              {
                $set: {
                  cleanse: totalCleanses.length
                }
              }
            );
          } else {
            await ContentCounts.create({
              cleanse: totalCleanses.length,
              user_id: toObjectId(req.authUserId)
            });
          }
          return cleanseData.length > 0
            ? Response.successResponseData(
              res,
              cleanseData[0].data,
              SUCCESS,
              res.__('cleanseListSucess'),
              cleanseData[0].metaData[0]
            )
            : Response.successResponseWithoutData(res, res.__('noCleanseFound'), FAIL);
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to delete cleanse.
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  deleteCleanse: (req, res) => {
    try {
      const reqParam = req.query;
      deleteCleanseValidation(reqParam, res, async (validate) => {
        if (validate) {
          const filterCondition = {
            _id: reqParam.cleanseId,
            user_id: req.authUserId
          };
          const deleteCleanse = await Cleanse.findOneAndUpdate(
            filterCondition,
            {
              deletedAt: new Date()
            },
            { new: true }
          );
          return Response.successResponseWithoutData(
            res,
            deleteCleanse ? res.__('deleteCleanseSuccess') : res.__('noCleanseFound'),
            deleteCleanse ? SUCCESS : FAIL
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
   * @description this function for the get latest record
   * @param {*} req
   * @param {*} res
   * @returns
   */
  getCleanseTodayRecord: async (req, res) => {
    try {
      const toDate = currentDateOnly();
      const fromDate = currentDateOnly();
      toDate.setDate(toDate.getDate() + 1);
      const cleanseData = await Cleanse.findOne(
        {
          user_id: req.authUserId,
          createdAt: { $gte: fromDate, $lt: toDate },
          deletedAt: null
        },
        {
          title: 1,
          description: 1,
          cleanseId: '$_id',
          imageUrl: {
            $concat: [CLOUDFRONT_URL, USER_MEDIA_PATH.CLEANSE, '/', '$image_url']
          },
          _id: 0
        }
      ).sort({
        createdAt: -1
      });
      const totalCleanse = await Cleanse.countDocuments({
        user_id: req.authUserId,
        deletedAt: null
      });
      if (cleanseData) {
        return Response.successResponseData(
          res,
          cleanseData,
          SUCCESS,
          res.__('latestCleanseData'),
          {
            totalCount: totalCleanse
          }
        );
      } else {
        return Response.successResponseWithoutData(res, res.__('noLatestCleanseData'), FAIL, {
          totalCount: totalCleanse
        });
      }
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  cleanAllCleanse: async (req, res) => {
    try {
      const filterCondition = {
        user_id: req.authUserId
      };
      const deleteCleanse = await Cleanse.updateMany(
        filterCondition,
        {
          deletedAt: new Date()
        },
        { new: true }
      );
      return Response.successResponseWithoutData(
        res,
        deleteCleanse ? res.__('deleteCleanseSuccess') : res.__('noCleanseFound'),
        deleteCleanse ? SUCCESS : FAIL
      );

    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  }



};
