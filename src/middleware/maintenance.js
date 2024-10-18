'use strict';

const { Config } = require('@models');
const { internalServerErrorResponse, errorResponseData } = require('@services/Response');
const { CONFIG_TYPE, RESPONSE_CODE, DEVICE_TYPE } = require('@services/Constant');
const {
  maintenanceMiddlewareValidation
} = require('@services/userValidations/maintenanceMiddlewareValidations');

module.exports = {
  maintenance: async (req, res, next) => {
    try {
      const reqParam = req.headers;
      reqParam.deviceType = parseInt(req.headers.devicetype);
      maintenanceMiddlewareValidation(reqParam, res, async (validate) => {
        if (validate) {
          const appConfigs = await Config.findOne(
            {
              config_key: CONFIG_TYPE.MAINTENANCE_MODE
            },
            { _id: 0, config_value: 1 }
          );
          if (appConfigs) {
            if (
              (appConfigs.config_value.ios && reqParam.deviceType === DEVICE_TYPE.IOS) ||
              (appConfigs.config_value.android && reqParam.deviceType === DEVICE_TYPE.ANDROID) ||
              (appConfigs.config_value.website && reqParam.deviceType === DEVICE_TYPE.WEB)
            ) {
              return errorResponseData(res, res.__('maintenanceMode'), RESPONSE_CODE.MAINTENANCE);
            } else {
              next();
            }
          } else {
            next();
          }
        }
      });
    } catch (err) {
      internalServerErrorResponse(res);
    }
  }
};
