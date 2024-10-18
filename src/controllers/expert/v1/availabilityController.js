'use strict';

const Response = require('@services/Response');
const { SUCCESS, FAIL, EXPERT_MEDIA_PATH, USER_TYPE, RESPONSE_CODE, CLOUDFRONT_URL } = require('../../../services/Constant');
const { makeRandomDigit, unixTimeStamp, toObjectId, convertObjectKeysToCamelCase } = require('../../../services/Helper');
const { getUploadURL, removeOldImage } = require('@services/s3Services');
const ExpertAttachment = require('../../../models/ExpertAttachments');
const Expert = require('../../../models/Expert');
const { addEditAttachments, getExpertAttachments, deleteAttachmentValidation, expertAvailabilityValidation, getExpertAvailabilityValidation } = require('../../../services/adminValidations/expertValidations');
const ExpertAvailability = require('../../../models/ExpertAvailability');

module.exports = {
  /**
  * @description This function is used to add edit availability
  * @param {*} req
  * @param {*} res
  * @returns {*}
  */
  addEditExpertAvailability: (req, res) => {
    try {
      const reqParam = req.body;
      if (req.userType !== USER_TYPE.EXPERT) {
        return Response.errorResponseData(res, res.__('accessDenied'), RESPONSE_CODE.UNAUTHORIZED);
      }
      expertAvailabilityValidation(reqParam, res, async (validate) => {
        if (validate) {
          let updateData = {
            user_id: req.authAdminId,
            date: new Date(reqParam.date),
            slots:reqParam.slots
          };
          let expert = await Expert.findOne({ user_id: req.authAdminId, deletedAt: null }).select('_id');
          if (expert) {
            updateData = {
              ...updateData,
              expert_id: expert._id
            };
          } else {
            return Response.successResponseWithoutData(res, res.__('expertNotFound'), FAIL);
          }
          if (reqParam.date) {
            if (reqParam.availabilityId) {
              const newData = await ExpertAvailability.findOneAndUpdate(
                {
                  _id: reqParam.availabilityId
                },
                updateData,
                { upsert: true, new: true }
              );

              return Response.successResponseWithoutData(
                res,
                res.__('availabilityUpdateSuccess'),
                SUCCESS,
              );
            } else {
              const newDataCondition = {
                ...updateData
              };
              const newData = await ExpertAvailability.create(newDataCondition);
              if (newData) {
                return Response.successResponseWithoutData(res, res.__('availabilityAddedSuccess'), SUCCESS);
              } else {
                return Response.successResponseWithoutData(res, res.__('somethingWentWrong'), FAIL);
              }
            }
          } else {
            return Response.successResponseWithoutData(res, res.__('noDateFound'), FAIL);
          }
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      console.log(err);
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to get all availability
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  getExpertAvailability: (req, res) => {
    try {
      const reqParam = req.query;
      if (req.userType !== USER_TYPE.EXPERT) {
        return Response.errorResponseData(res, res.__('accessDenied'), RESPONSE_CODE.UNAUTHORIZED);
      }
      getExpertAvailabilityValidation(reqParam, res, async (validate) => {
        if (validate) {
          let filterCondition = {
            user_id: toObjectId(req.authAdminId),
            deletedAt: null
          };

          if (reqParam.date) {
            filterCondition = {
              ...filterCondition,
              date: reqParam.date,
            }
          }

          const aggregationPipeline = [
            {
              $match: filterCondition
            },
            {
              $project: {
                availabilityId: '$_id',
                date: '$date',
                slots: '$slots',
                createdAt: 1,
                _id: 0
              }
            }
          ];

          const expertAvailability = await ExpertAvailability.aggregate(aggregationPipeline);
          if (expertAvailability.length > 0) {
            return Response.successResponseData(
              res,
              convertObjectKeysToCamelCase(expertAvailability),
              SUCCESS,
              res.__('expertAvailabilityGetSuccess')
            );
          } else {
            return Response.successResponseWithoutData(res, res.__('noAvailabilityFound'), FAIL);
          }
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      console.log(err);
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
 * @description This function is used to delete availability
 * @param {*} req
 * @param {*} res
 * @returns {*}
 */








};
