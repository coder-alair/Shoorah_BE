'use strict';

const Response = require('@services/Response');

const moment = require('moment');
const { Users, Sos } = require('@models');
const { SOSCall } = require('../../../models');
const { SUCCESS, FAIL } = require('../../../services/Constant');

module.exports = {
  /**
   * @description This function is used for sos call and clicks
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */

  sosClick: async (req, res) => {
    try {
      const { authUserId } = req;
      const sosType = req.params.id;
      if (!authUserId) {
        return res.status(500).json({ error: 'Invalid user id or click' });
      }
      const user = await Users.findOne({ _id: authUserId });
      if (!user) {
        return res.status(500).json({ error: 'Invalid user id' });
      }

      if (sosType == 1) {
        const currentTime = moment();
        const twelveHoursAgo = moment().subtract(12, 'hours');
        const sosClickCount = await Sos.countDocuments({
          user_id: authUserId,
          createdAt: { $gte: twelveHoursAgo }
        });

        if (sosClickCount >= 3) {
          let message = ' Maximum SOS clicks reached in the last 12 hours';

          return Response.successResponseData(res, message, FAIL, res.__('SosClickSuccess'));
        } else {
          let Sosclick = new Sos({
            user_id: authUserId
          });
          await Sosclick.save();
          let message = 'SOS Clicked';
          return Response.successResponseData(res, message, SUCCESS, res.__('SosClickSuccess'));
        }
      }

      if (sosType == 2) {
        const twelveHoursAgo = moment().subtract(12, 'hours');
        const sosCallClickCount = await SOSCall.countDocuments({
          user_id: authUserId,
          createdAt: { $gte: twelveHoursAgo }
        });

        if (sosCallClickCount >= 3) {
          let message = ' Maximum SOS Call clicks reached in the last 12 hours';
          return Response.successResponseData(res, message, FAIL, res.__('SosCallClickSuccess'));
        } else {
          let sosCallClick = new SOSCall({
            user_id: authUserId
          });
          await sosCallClick.save();
          let message = 'SOS Call Clicked';
          return Response.successResponseData(res, message, SUCCESS, res.__('SosCallClickSuccess'));
        }
      } else {
        let message = 'Wrong SOS Type';
        return Response.successResponseData(res, message, FAIL, res.__('sosTypeFail'));
      }
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  }
};
