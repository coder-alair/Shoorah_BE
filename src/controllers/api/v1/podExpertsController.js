'use strict';

const { PodExpert } = require('@models');
const {
  SUCCESS,
  RESPONSE_CODE,
  CLOUDFRONT_URL,
  ADMIN_MEDIA_PATH,
  PAGE,
  PER_PAGE
} = require('@services/Constant');
const Response = require('@services/Response');

module.exports = {
  getPodExperts: async (req, res) => {
    try {
      const reqParam = req.query;

      if (reqParam.id) {
        const podExpert = await PodExpert.findById(reqParam.id, {
          _id: 0,
          id: '$_id',
          name: 1,
          description: 1,
          monthlyListeners: 1,
          image: {
            $cond: {
              if: { $and: [{ $ne: ['$image', null] }, { $ne: ['$image', ''] }] },
              then: {
                $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.POD_EXPERT_IMAGE, '/', '$image']
              },
              else: '$$REMOVE'
            }
          }
        });

        if (!podExpert) {
          return Response.errorResponseData(res, 'Invalid request id', RESPONSE_CODE.NOT_FOUND);
        }

        return Response.successResponseData(res, podExpert, SUCCESS, 'getPodExpertSuccess');
      }

      const page = parseInt(reqParam.page) || PAGE;
      const limit = parseInt(reqParam.limit) || PER_PAGE;
      const skip = (page - 1) * limit;

      const [{ metaData, podExperts }] = await PodExpert.aggregate([
        { $match: {} },
        {
          $project: {
            _id: 0,
            id: '$_id',
            name: 1,
            image: {
              $cond: {
                if: { $and: [{ $ne: ['$image', null] }, { $ne: ['$image', ''] }] },
                then: {
                  $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.POD_EXPERT_IMAGE, '/', '$image']
                },
                else: '$$REMOVE'
              }
            }
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
    } catch (err) {
      console.log('err', err);
      return Response.internalServerErrorResponse(res);
    }
  }
};
