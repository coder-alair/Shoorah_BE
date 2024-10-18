'use strict';

const { ShoorahPods, Sound, Meditation, FeatureRatings } = require('../../../models');
const Ratings = require('../../../models/Rating');
const { FAIL, SUCCESS, CONTENT_TYPE } = require('../../../services/Constant');
const Response = require('@services/Response');
const { toObjectId, convertObjectKeysToCamelCase } = require('../../../services/Helper');

module.exports = {
  /**
   * @description This function is used to add ratings
   * @param {*} req
   * @param {*} res
   * @return {*}
   */

  addRatings: async (req, res) => {
    try {
      const reqParam = req.body;
      let findCondition = {
        user_id: req.authUserId,
        content_id: reqParam.contentId,
        content_type: reqParam.contentType
      };

      const rating = await Ratings.findOne(findCondition);
      if (rating) {
        return Response.successResponseWithoutData(res, res.__('alreadyRated'), FAIL);
      } else {
        let updateData = {
          user_id: req.authUserId,
          content_id: reqParam.contentId,
          content_type: reqParam.contentType,
          rated: reqParam.rating
        };

        await Ratings.create(updateData);

        let rateCondition = {
          content_id: toObjectId(reqParam.contentId)
        };
        const totalRateUsers = await Ratings.countDocuments(rateCondition);
        if (totalRateUsers > 0) {
          const rated = await Ratings.aggregate([
            {
              $match: rateCondition
            },
            {
              $group: {
                _id: null,
                totalRatings: {
                  $sum: '$rated'
                }
              }
            }
          ]);

          const averageRate =
            totalRateUsers > 0 ? +Number(rated[0]?.totalRatings / totalRateUsers).toFixed(1) : 0;

          switch (reqParam.contentType) {
            case CONTENT_TYPE.MEDITATION:
              await Meditation.updateOne(
                { _id: reqParam.contentId },
                {
                  $set: {
                    rating: averageRate
                  }
                }
              );
              break;
            case CONTENT_TYPE.SHOORAH_PODS:
              await ShoorahPods.updateOne(
                { _id: reqParam.contentId },
                {
                  $set: {
                    rating: averageRate
                  }
                }
              );
              break;
            case CONTENT_TYPE.SOUND:
              await Sound.updateOne(
                { _id: reqParam.contentId },
                {
                  $set: {
                    rating: averageRate
                  }
                }
              );
              break;
          }
        }

        return Response.successResponseWithoutData(res, res.__('ratingAddedSuccess'), SUCCESS);
      }
    } catch (err) {
      console.error(err);
      return Response.internalServerErrorResponse(res);
    }
  },
  getRatings: async (req, res) => {
    try {
      const reqParam = req.query;
      let findCondition = {
        user_id: req.authUserId,
        content_id: toObjectId(reqParam.contentId),
        content_type: reqParam.contentType
      };

      const rating = await Ratings.findOne(findCondition).select('rated content_type content_id');
      if (rating) {
        return Response.successResponseData(res, convertObjectKeysToCamelCase(rating), res.__('getRatingSuccess'), SUCCESS);
      } else {
        return Response.successResponseWithoutData(res, res.__('notRated'), FAIL);
      }
    } catch (err) {
      console.error(err);
      return Response.internalServerErrorResponse(res);
    }
  },
  addFeatureRatings: async (req, res) => {
    try {
      const reqParam = req.body;
      let findCondition = {
        user_id: req.authUserId,
        feature_type: reqParam.featureType
      };

      const featureRatings = await FeatureRatings.findOne(findCondition);
      if (featureRatings) {
        await FeatureRatings.updateOne({ _id: featureRatings._id }, {
          $set: {
            rated: reqParam.rated
          }
        })
        return Response.successResponseWithoutData(res, res.__('updatedRated'), SUCCESS);
      } else {
        let updateData = {
          user_id: req.authUserId,
          feature_type: reqParam.featureType,
          rated: reqParam.rated
        };

        await FeatureRatings.create(updateData);

        return Response.successResponseWithoutData(res, res.__('ratingAddedSuccess'), SUCCESS);
      }
    } catch (err) {
      console.error(err);
      return Response.internalServerErrorResponse(res);
    }
  },
  getFeatureRatings: async (req, res) => {
    try {
      const reqParam = req.query;
      let findCondition = {
        user_id: req.authUserId,
        feature_type: reqParam.featureType
      };

      const featureRatings = await FeatureRatings.findOne(findCondition).select('rated feature_type');
      if (featureRatings) {
        return Response.successResponseData(res, convertObjectKeysToCamelCase(featureRatings), res.__('getFeatureRated'), SUCCESS);
      } else {
        return Response.successResponseWithoutData(res, res.__('ratingGetSuccess'), FAIL);
      }
    } catch (err) {
      console.error(err);
      return Response.internalServerErrorResponse(res);
    }
  },
  addContentDuration: async (req, res) => {
    try {
      const reqParam = req.query;
      let collection = Meditation;
      if (parseInt(reqParam.contentType) == 3) {
        collection = Meditation;
      } else if (parseInt(reqParam.contentType) == 4) {
        collection = Sound;
      } else if (parseInt(reqParam.contentType) == 5) {
        collection = ShoorahPods;
      }

      if (reqParam.type == 1) {
        await collection.updateMany({ played_time: { $exists: false } }, {
          played_time: 0,
          played_counts: 0
        })


        await collection.updateOne({ _id: reqParam.contentId },
          { $inc: { played_time: reqParam.duration } }
        )
      }

      if (reqParam.
        type == 2) {
        await collection.updateMany({ played_time: { $exists: false } }, {
          played_time: 0,
          played_counts: 0
        })
        await collection.updateOne({ _id: reqParam.contentId },
          { $inc: { played_counts: reqParam.time } }
        )
      }

      return Response.successResponseWithoutData(res, res.__('updatetime'), SUCCESS);
    } catch (err) {
      console.error(err);
      return Response.internalServerErrorResponse(res);
    }
  },

};
