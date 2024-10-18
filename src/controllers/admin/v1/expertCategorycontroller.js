'use strict';

const ExpertCategory = require('../../../models/expertCategory');
const Response = require('@services/Response');
const { SUCCESS, FAIL, PAGE, PER_PAGE } = require('@root/src/services/Constant');
const { toObjectId } = require('@root/src/services/Helper');

module.exports = {
  getExpertCategory: async (req, res) => {
    try {
      const reqParam = req.query;
      const { categoryId, search } = reqParam;
      const filter = {
        ...(categoryId && { _id: toObjectId(categoryId) }),
        ...(search && { label: { $regex: '.*' + search + '.*', $options: 'i' } })
      };

      const page = parseInt(reqParam.page) || PAGE;
      const limit = parseInt(reqParam.limit) || PER_PAGE;
      const skip = (page - 1) * limit;
      const condition = [
        {
          $sort: { label: -1 }
        },
        {
          $skip: skip
        },
        {
          $limit: limit
        },
        {
          $lookup: {
            from: 'specialisations',
            localField: '_id',
            foreignField: 'category_id',
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$is_visible', true] }
                    ]
                  }
                }
              },
              {
                $project: {
                  _id: 1,
                  spec_label: 1,
                  spec_value: 1,
                  type: 1,
                  is_visible: 1
                }
              }
            ],
            as: 'specialisations'
          }
        },
        {
          $project: {
            _id: 1,
            label: 1,
            value: 1,
            specialisations: 1
          }
        }
      ];
      if (Object.keys(filter).length) condition.unshift({ $match: filter });
      const expertCategories = await ExpertCategory.aggregate(condition);

      const total = await ExpertCategory.countDocuments(filter);
      if (!total) {
        return Response.successResponseData(res, [], SUCCESS, 'GetExpertCategoryListSuccess', {
          total,
          page,
          limit
        });
      }

      return Response.successResponseData(
        res,
        expertCategories,
        SUCCESS,
        res.__('GetExpertCategoryListSuccess'),
        { total, page, limit }
      );
    } catch (err) {
      console.log('err', err);
      return Response.internalServerErrorResponse(res);
    }
  }
};
