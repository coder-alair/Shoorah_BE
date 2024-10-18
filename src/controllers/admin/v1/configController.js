'use strict';

const { Config } = require('@models');
const { updateConfigValidation } = require('@services/adminValidations/configValidations');
const Response = require('@services/Response');
const { SUCCESS } = require('@services/Constant');

module.exports = {
  /**
   * @description This function is used to update app configs
   * @param {*} req
   * @param {*} res
   * @return {*}
   */
  updateConfig: (req, res) => {
    try {
      const reqParam = req.body;
      updateConfigValidation(reqParam, res, async (validate) => {
        if (validate) {
          const updateData = {
            config_value: reqParam.configValue
          };
          await Config.findOneAndUpdate({ config_key: reqParam.configKey }, updateData, {
            upsert: true
          });
          return Response.successResponseWithoutData(res, res.__('updateConfigSuccess'), SUCCESS);
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to list app config
   * @param {*} req
   * @param {*} res
   * @return {*}
   */
  configList: async (req, res) => {
    try {
      const appConfigs = await Config.find(
        {},
        { id: '$_id', configKey: '$config_key', configValue: '$config_value', _id: 0 }
      );
      if (appConfigs.length > 0) {
        return Response.successResponseData(res, appConfigs, SUCCESS, res.__('configListSuccess'));
      } else {
        return Response.successResponseWithoutData(res, res.__('noConfigFound'), SUCCESS);
      }
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  }

};
