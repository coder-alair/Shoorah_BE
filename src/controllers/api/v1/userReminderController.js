'use strict';

const { Reminder } = require('@models');
const Response = require('@services/Response');
const {
  addUpdateReminderValidation
} = require('@services/userValidations/userReminderValidations');
const { SUCCESS, FAIL } = require('@services/Constant');

module.exports = {
  /**
   * @description This function is used to add or update reminder interval
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  addUpdateReminder: (req, res) => {
    try {
      const reqParam = req.body;
      addUpdateReminderValidation(reqParam, res, async (validate) => {
        if (validate) {
          const filterData = {
            user_id: req.authUserId,
            deletedAt: null
          };
          const updateReminder = [];
          await reqParam.reminders.map((values) => {
            const tempObj = {
              reminder_type: values.reminderType,
              reminder_period: values.reminderPeriod,
              interval: values.interval
            };
            updateReminder.push(tempObj);
          });
          const updateData = {
            reminder: updateReminder
          };
          const reminderData = await Reminder.findOneAndUpdate(filterData, updateData, {
            upsert: true,
            new: true
          }).select('_id');
          return Response.successResponseWithoutData(
            res,
            reminderData ? res.__('reminderUpdateSucceess') : res.__('somethingWrong'),
            reminderData ? SUCCESS : FAIL
          );
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to get reminder settings of logged in user.
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  reminderList: async (req, res) => {
    try {
      const reminderList = await Reminder.findOne({
        user_id: req.authUserId,
        deletedAt: null
      }).select('reminder');
      if (reminderList && reminderList.reminder.length > 0) {
        const resData = [];
        reminderList.reminder.map((reminder) => {
          const tempObj = {
            reminderType: reminder.reminder_type,
            reminderPeriod: reminder.reminder_period,
            interval: reminder.interval
          };
          resData.push(tempObj);
        });
        return Response.successResponseData(res, resData, SUCCESS, res.__('reminderListSuccess'));
      } else {
        const resData = [];
        return Response.successResponseData(res, resData, SUCCESS, res.__('reminderListSuccess'));
      }
    } catch (err) {
      console.log(err);
      return Response.internalServerErrorResponse(res);
    }
  }
};
