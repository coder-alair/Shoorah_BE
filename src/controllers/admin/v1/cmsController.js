'use strict';

const { Cms } = require('@models');
const {
  addEditCMSValidation,
  cmsListValidation,
  deleteCmsValidation
} = require('@services/adminValidations/cmsValidations');
const Response = require('@services/Response');
const { SUCCESS, PAGE, PER_PAGE } = require('@services/Constant');

module.exports = {
  /**
   * @description This function is used to add or edit CMS data
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  addEditCMS: (req, res) => {
    try {
      const reqParam = req.body;
      addEditCMSValidation(reqParam, res, async (validate) => {
        if (validate) {
          if (reqParam.cmsId) {
            const filterCondition = {
              _id: reqParam.cmsId,
              deletedAt: null
            };
            const updateData = {
              description: reqParam.description.trim(),
              title: reqParam.title.trim(),
              alias: reqParam.alias
            };
            await Cms.updateOne(filterCondition, {
              $set: updateData
            });
            return Response.successResponseWithoutData(res, res.__('cmsDataUpdated'), SUCCESS);
          } else {
            const updateData = {
              alias: reqParam.alias,
              title: reqParam.title
            };
            let cms = await Cms.create(updateData);
            return Response.successResponseData(res, cms, SUCCESS, res.__('cmsDataUpdated'));
          }
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to list all cms data
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  cmsList: (req, res) => {
    try {
      const reqParam = req.query;
      cmsListValidation(reqParam, res, async (validate) => {
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
          let filterData = {
            deletedAt: null
          };
          if (reqParam.searchKey) {
            filterData = {
              ...filterData,
              $or: [
                { title: { $regex: '.*' + reqParam.searchKey + '.*', $options: 'i' } },
                { description: { $regex: '.*' + reqParam.searchKey + '.*', $options: 'i' } }
              ]
            };
          }
          const cmsData = await Cms.find(filterData, {
            id: '$_id',
            title: 1,
            description: 1,
            alias: 1,
            _id: 0
          })
            .limit(perPage)
            .skip(skip)
            .sort({ createdAt: -1 });
          if (cmsData.length > 0) {
            return Response.successResponseData(res, cmsData, SUCCESS, res.__('cmsListSuccess'), {
              page,
              perPage
            });
          } else {
            return Response.successResponseWithoutData(res, res.__('noCMSFound'), SUCCESS);
          }
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to delete cms data
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  deleteCms: (req, res) => {
    try {
      const reqParam = req.query;
      deleteCmsValidation(reqParam, res, async (validate) => {
        if (validate) {
          await Cms.findByIdAndUpdate(reqParam.cmsId, { deletedAt: new Date() });
          return Response.successResponseWithoutData(res, res.__('cmsDeleteSuccess'), SUCCESS);
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  }
};
