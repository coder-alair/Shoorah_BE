'use strict';

const { PodExpert } = require('@models');
const {
  SUCCESS,
  RESPONSE_CODE,
  USER_TYPE,
  CLOUDFRONT_URL,
  ADMIN_MEDIA_PATH,
  PAGE,
  PER_PAGE
} = require('@services/Constant');

const Response = require('@services/Response');
const { unixTimeStamp, makeRandomDigit } = require('@services/Helper');
const { removeOldImage, getUploadImage } = require('@services/s3Services');

const {
  getPodExpertsValidation,
  addPodExpertValidation,
  updatePodExpertValidation
} = require('@services/adminValidations/podExpertsValidations');

module.exports = {
  getPodExperts: async (req, res) => {
    try {
      const reqParam = req.query;
      getPodExpertsValidation(reqParam, res, async (validate) => {
        try {
          if (validate) {
            if (reqParam.id) {
              const podExpert = await PodExpert.findById(reqParam.id, {
                _id: 0,
                id: '$_id',
                name: 1,
                description: 1,
                image: {
                  $cond: {
                    if: { $and: [{ $ne: ['$image', null] }, { $ne: ['$image', ''] }] },
                    then: {
                      $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.POD_EXPERT_IMAGE, '/', '$image']
                    },
                    else: '$$REMOVE'
                  }
                },
                isActive: 1
              });

              return Response.successResponseData(res, podExpert, SUCCESS, 'getPodExpertsSuccess');
            }

            const page = parseInt(reqParam.page) || PAGE;
            const limit = parseInt(reqParam.limit) || PER_PAGE;
            const skip = (page - 1) * limit;
            const searchQuery = reqParam.search ? decodeURIComponent(reqParam.search.trim()) : null;

            let matchQuery = {};
            if (searchQuery) {
              matchQuery = {
                $or: [
                  { name: { $regex: searchQuery, $options: 'i' } },
                  { description: { $regex: searchQuery, $options: 'i' } }
                ]
              };
            }
            const [{ metaData, podExperts }] = await PodExpert.aggregate([
              { $match: matchQuery },
              {
                $lookup: {
                  from: 'users',
                  localField: 'createdBy',
                  foreignField: '_id',
                  as: 'created_by'
                }
              },
              {
                $project: {
                  _id: 0,
                  id: '$_id',
                  name: 1,
                  description: 1,
                  image: {
                    $cond: {
                      if: { $and: [{ $ne: ['$image', null] }, { $ne: ['$image', ''] }] },
                      then: {
                        $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.POD_EXPERT_IMAGE, '/', '$image']
                      },
                      else: ''
                    }
                  },
                  createdBy: { $arrayElemAt: ['$created_by.name', 0] },
                  createdAt: 1,
                  isActive: { $ifNull: ['$isActive', true] }
                }
              },
              {
                $facet: {
                  metaData: [{ $count: 'total' }, { $addFields: { page, limit } }],
                  podExperts: [{ $sort: { name: 1 } }, { $skip: skip }, { $limit: limit }]
                }
              }
            ]);

            return Response.successResponseData(
              res,
              podExperts,
              SUCCESS,
              'getPodExpertsSuccess',
              metaData[0]
            );
          }
        } catch (err) {
          console.log(err);
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      console.log('err', err);
      return Response.internalServerErrorResponse(res);
    }
  },
  addPodExpert: async (req, res) => {
    try {
      const reqParam = req.body;
      const imageFile = req.files && req.files.length > 0 ? req.files[0] : null;
      addPodExpertValidation(reqParam, res, async (validate) => {
        try {
          if (validate) {
            const { name, description, isActive } = reqParam;

            let image = '',
              podExpertImage = null;

            if (imageFile) {
              image = `${unixTimeStamp(new Date())}-${makeRandomDigit(4)}.${imageFile.mimetype.split('/')[1]}`;
              podExpertImage = await getUploadImage(
                imageFile.mimetype,
                image,
                ADMIN_MEDIA_PATH.POD_EXPERT_IMAGE,
                imageFile.buffer
              );
            }

            await PodExpert.create({
              name,
              description,
              image,
              isActive,
              createdBy: req.authAdminId
            });

            return Response.successResponseWithoutData(
              res,
              'addPodExpertSuccess',
              SUCCESS,
              podExpertImage
            );
          }
        } catch (err) {
          console.log(err);
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      console.log(err);
      return Response.internalServerErrorResponse(res);
    }
  },
  updatePodExpert: async (req, res) => {
    try {
      const reqParam = req.body;
      const imageFile = req.files?.length ? req.files[0] : null;
      if (imageFile) reqParam.imageType = imageFile.mimetype;
      updatePodExpertValidation(reqParam, res, async (validate) => {
        try {
          if (validate) {
            const podExpert = await PodExpert.findById(reqParam.id);
            if (!podExpert) {
              return Response.errorResponseData(res, 'podExpertNotFound', RESPONSE_CODE.NOT_FOUND);
            }

            podExpert.name = reqParam.name || podExpert.name;
            podExpert.description = reqParam.description || podExpert.description;
            podExpert.isActive = reqParam.isActive || podExpert.isActive;

            let podExpertImage = null;

            if (imageFile) {
              if (podExpert.image) {
                await removeOldImage(podExpert.image, ADMIN_MEDIA_PATH.POD_EXPERT_IMAGE, res);
              }

              const image = `${unixTimeStamp(new Date())}-${makeRandomDigit(4)}.${imageFile.mimetype.split('/')[1]}`;
              podExpertImage = await getUploadImage(
                imageFile.mimetype,
                image,
                ADMIN_MEDIA_PATH.POD_EXPERT_IMAGE,
                imageFile.buffer
              );

              podExpert.image = image;
            }

            await podExpert.save();

            return Response.successResponseWithoutData(
              res,
              'updatePodExpertSuccess',
              SUCCESS,
              podExpertImage
            );
          }
        } catch (err) {
          console.log(err);
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      console.log(err);
      return Response.internalServerErrorResponse(res);
    }
  },
  getPodExpertNameList: async (req, res) => {
    try {
      const podExperts = await PodExpert.find({ isActive: true }, { _id: 1, name: 1 });

      const expertNames = podExperts.map((expert) => ({ id: expert._id, name: expert.name }));

      return Response.successResponseData(res, expertNames, SUCCESS, 'getPodExpertsNamesSuccess');
    } catch (err) {
      console.log('err', err);
      return Response.internalServerErrorResponse(res);
    }
  }
};
