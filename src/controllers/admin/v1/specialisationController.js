'use strict';

const { snakeCase } = require('lodash');
const { toObjectId } = require('@root/src/services/Helper');
const { SUCCESS, PAGE, PER_PAGE, FAIL } = require('@services/Constant');
const { SPECIALISATION_TYPE } = require('@services/Constant');
const Response = require('@services/Response');
const Specialisation = require('@root/src/models/Specialisation');
const ExpertCategory = require('./../../../models/expertCategory');

module.exports = {
  getSpecialisationList: async (req, res) => {
    try {
      const reqParam = req.query;
      const { categoryId, search } = reqParam;

      const page = parseInt(reqParam.page) || PAGE;
      const limit = parseInt(reqParam.limit) || PER_PAGE;
      const skip = (page - 1) * limit;

      const filter = {
        ...(categoryId && { category_id: toObjectId(categoryId) }),
        ...(search && { spec_label: new RegExp(search, 'i') }),
        type: SPECIALISATION_TYPE.CUSTOM,
        is_visible: false
      };

      const total = await Specialisation.countDocuments(filter);
      if (!total) {
        return Response.successResponseData(res, [], SUCCESS, 'getSpecialisationListSuccess', {
          total,
          page,
          limit
        });
      }

      const condition = [
        {
          $sort: { spec_label: 1 }
        },
        {
          $skip: skip
        },
        {
          $limit: limit
        },
        {
          $lookup: {
            from: 'expert_categories',
            localField: 'category_id',
            foreignField: '_id',
            as: 'category_info'
          }
        },
        {
          $unwind: {
            path: '$category_info'
          }
        },
        {
          $project: {
            _id: 1,
            spec_label: 1,
            spec_value: 1,
            is_visible: 1,
            type: 1,
            createdAt: 1,
            updatedAt: 1,
            category_label: { $ifNull: ['$category_info.label', null] },
            category_value: { $ifNull: ['$category_info.value', null] }
          }
        }
      ];
      if (Object.keys(filter).length) condition.unshift({ $match: filter });
      const specialisationList = await Specialisation.aggregate(condition).collation({
        locale: 'en',
        strength: 2
      });

      return Response.successResponseData(
        res,
        specialisationList,
        SUCCESS,
        'getSpecialisationListSuccess',
        { total, page, limit }
      );
    } catch (err) {
      console.log('err', err);
      return Response.internalServerErrorResponse(res);
    }
  },
  addSpecialisationToList: async (req, res, next) => {
    try {
      const reqParam = req.body;
      const { categoryId } = reqParam;

      const hasCategory = await ExpertCategory.findOne({
        _id: toObjectId(categoryId)
      }).select('_id');
      if (!hasCategory)
        return Response.successResponseWithoutData(res, res.__('noCategoryDataFound'), SUCCESS);

      // update visibility of custom created Specialisation.
      const specialisationIds = reqParam.specialisationIds.split(',');
      const ids = await Specialisation.find({ _id: { $in: specialisationIds } }).select('_id');

      if (ids.length != specialisationIds.length)
        return Response.successResponseWithoutData(
          res,
          res.__('noSpecialisationDataFoundWithGivenId'),
          SUCCESS
        );
      await Promise.all(
        specialisationIds.map(async (id) => {
          await Specialisation.findByIdAndUpdate(id, { is_visible: true });
        })
      );
      return Response.successResponseWithoutData(
        res,
        res.__('specialisationListUpdatedSuccesfully'),
        SUCCESS
      );
    } catch (err) {
      console.log('err', err);
      return Response.internalServerErrorResponse(res);
    }
  } 
};
