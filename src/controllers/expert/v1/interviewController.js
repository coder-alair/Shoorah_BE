'use strict';

const Response = require('@services/Response');
const { google } = require('googleapis');
const axios = require('axios');
const app = require('express')();
const { Users, InterviewSchedual, Notification, Expert } = require('@models');
const {
  USER_TYPE,
  SUCCESS,
  RESPONSE_CODE,
  NOTIFICATION_TYPE,
  SENT_TO_USER_TYPE
} = require('@services/Constant');
const {
  createInterviewSchedualValidation,
  getInterviewSchedualValidation
} = require('../../../services/adminValidations/expertValidations');
const { sendInterviewConfirmation } = require('@root/src/services/Mailer');
module.exports = {
  /**
   * @description This function is used to create an interview schedule
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  createInterviewSchedual: async (req, res) => {
    try {
      if (req.userType !== USER_TYPE.EXPERT) {
        return Response.errorResponseData(res, res.__('accessDenied'), RESPONSE_CODE.UNAUTHORIZED);
      }
      console.log('req.authAdminId', req.authAdminId);
      console.log('req.userType', req.userType);
      const reqParam = req.body;
      createInterviewSchedualValidation(reqParam, res, async (validate) => {
        if (validate) {
          const userExist = await Users.findOne({ _id: req.authAdminId });
          console.log('🚀 ~ createInterviewSchedualValidation ~ userExist:', userExist);
          if (!userExist) {
            return Response.errorResponseData(
              res,
              res.__('userNotExist'),
              RESPONSE_CODE.BAD_REQUEST
            );
          }

          // Check if the same time_slot already exists for the same schedual_time
          const findSchedualForExpert = await InterviewSchedual.findOne({
            user_id: req.authAdminId
          });
          if (!findSchedualForExpert) {
            return Response.errorResponseData(
              res,
              res.__('youHaveNotBeenInvitedYet'),
              RESPONSE_CODE.BAD_REQUEST
            );
          }
          const existingSchedual = await InterviewSchedual.findOne({
            user_id: req.authAdminId
            // schedual_date: reqParam.schedualDate,
            // time_slot: reqParam.timeSlot
          });

          if (existingSchedual.time_slot) {
            return Response.errorResponseData(
              res,
              res.__('timeSlotHasBeenAlreadyBooked'),
              RESPONSE_CODE.BAD_REQUEST
            );
          }

          // Store the interview schedule date and time slot
          findSchedualForExpert.schedual_date = reqParam.schedualDate;
          findSchedualForExpert.time_slot = reqParam.timeSlot;
          findSchedualForExpert.meetLink = reqParam.meetLink?reqParam.meetLink:'https://meet.google.com/ikm-ihtb-fxw';

          const expertDetails = await Expert.findOne({ user_id: req.authAdminId }).populate({
            path: 'user_id',
            select: 'first_name email' // Specify the fields you want
          });
          // Code for confirmation email to expert
          const locals = {
            firstName: expertDetails.user_id.first_name,
            // Temporary meet link is static
            meetingLink: findSchedualForExpert.meetLink,
            date: findSchedualForExpert.schedual_date.toLocaleDateString('en-CA'),
            time: findSchedualForExpert.time_slot
          };

          // send the email template to the expert
          await sendInterviewConfirmation(expertDetails.user_id.email, locals);
          // ==============================
          await findSchedualForExpert.save();
          // Send notification to the super admin who invited the expert
          let newData = {
            title: 'Expert has booked an interview schedule',
            message: 'Expert has booked an interview schedule date and time slot',
            sent_to_user_type: SENT_TO_USER_TYPE.CUSTOM_LIST,
            from_user_id: req.authAdminId,
            type: NOTIFICATION_TYPE.EXPERT_BOOKED_SCHEDULE,
            expert_id: req.authAdminId,
            to_user_ids: [findSchedualForExpert.invited_by]
          };
          await Notification.create(newData);
          return Response.successResponseData(
            res,
            findSchedualForExpert,
            SUCCESS,
            res.__('interviewSchedualCreated')
          );
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      console.log(err.message);
      return Response.internalServerErrorResponse(res);
    }
  },

  // Your getInterviewSchedual function
  getInterviewSchedual: async (req, res) => {
    try {
      if (req.userType !== USER_TYPE.EXPERT) {
        return Response.errorResponseData(res, res.__('accessDenied'), RESPONSE_CODE.UNAUTHORIZED);
      }

      // // Custom date parser as a normal function
      function parseDate(dateString) {
        const parts = dateString.split('-');
        if (parts.length !== 3) return null;

        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // Months are 0-indexed in JS
        const day = parseInt(parts[2], 10); // Use the provided year directly

        const date = new Date(year, month, day);
        return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day
          ? date
          : null;
      }

      const reqParam = req.query;

      getInterviewSchedualValidation(req, res, async (validate) => {
        if (validate) {
          if (reqParam.userId) {
            const interviewSchedual = await InterviewSchedual.find({
              user_id: req.authAdminId
            });
            return Response.successResponseData(
              res,
              interviewSchedual,
              res.__('interviewSchedual')
            );
          }
          const searchDate = reqParam.search ? parseDate(reqParam.search) : new Date();
          console.log('🚀 ~ getInterviewSchedualValidation ~ searchDate:', searchDate);

          let startOfDay;
          let endOfDay;
          if (searchDate) {
            startOfDay = new Date(searchDate.setHours(0, 0, 0, 0));
            console.log('🚀 ~ getInterviewSchedualValidation ~ startOfDay:', startOfDay);
            endOfDay = new Date(searchDate.setHours(23, 59, 59, 999));
            console.log('🚀 ~ getInterviewSchedualValidation ~ endOfDay:', endOfDay);
          }
          const interviewSchedual = await InterviewSchedual.find({
            ...(searchDate ? { schedual_date: { $gte: startOfDay, $lte: endOfDay } } : {})
          });
          return Response.successResponseData(res, interviewSchedual, res.__('interviewSchedual'));
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      console.log(err.message);
      return Response.internalServerErrorResponse(res);
    }
  },

};
