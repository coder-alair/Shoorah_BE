'use strict';

const Response = require('@services/Response');

const { SUCCESS } = require('@services/Constant');
const { Thoughts } = require('../../../models');
const { getRandomThought, makeRandomDigit } = require('../../../services/Helper');
const moment = require('moment');
const { GOALS_NOTIFICATION_MESSAGE } = require('../../../services/Constant');

module.exports = {
  /**
   * @description This function is used to get random thought.
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */

  getThoughtOfDay: async (req, res) => {
    try {
      let thought = await Thoughts.findOne({ deletedAt: null, currentThought: true });
      if (thought) {
        const timeDifference = moment().diff(moment(thought.createdAt), 'hours');
        if (timeDifference >= 24) {
          await Thoughts.updateOne({ deletedAt: new Date(), currentThought: false });
          let newThought = await Thoughts.create({
            name: getRandomThought(),
            currentThought: true
          });
          return Response.successResponseData(res, newThought, SUCCESS, res.__('getThoughtOfDay'));
        }
        return Response.successResponseData(res, thought, SUCCESS, res.__('getThoughtOfDay'));
      } else {
        let newThought = await Thoughts.create({
          name: getRandomThought(),
          currentThought: true
        });
        return Response.successResponseData(res, newThought, SUCCESS, res.__('getThoughtOfDay'));
      }
    } catch (err) {
      console.error(err);
      return Response.internalServerErrorResponse(res);
    }
  },
  getNudges: async (req, res) => {
    try {
      let nudge = GOALS_NOTIFICATION_MESSAGE.GOAL_NOT_COMPLETED[makeRandomDigit(1)];
      return res.send({nudge});
    } catch (err) {
      console.error(err);
      return res.send(err);
    }
  }
};
