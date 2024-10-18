'use strict';

const { Cms } = require('@models');
const Response = require('@services/Response');
const { cmsDetailedListValidation } = require('@services/userValidations/cmsValidations');
const { SUCCESS } = require('@services/Constant');

module.exports = {
  /**
   * @description This function is used to list CMS data based on alias
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  cmsDetailedList: (req, res) => {
    try {
      const reqParam = req.query;
      cmsDetailedListValidation(reqParam, res, async (validate) => {
        if (validate) {
          const cmsData = await Cms.findOne({ alias: reqParam.cmsAlias, deletedAt: null }).select(
            'title description -_id'
          );
          return Response.successResponseData(res, cmsData, SUCCESS, res.__('cmsListSuccess'));
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  }
};
