'use strict';

const { Conversation } = require('@models');
const axios = require('axios');
const OpenAI = require('openai');
const Response = require('@services/Response');
const { generatePassword } = require('@services/authServices');

const {
  downloadMoodReportValidation
} = require('../../../services/userValidations/moodValidations');
const {
  MOOD_REPORT_DURATION,
  MOOD_PDF_SIZE,
  NODE_ENVIRONMENT,
  SHURU_REPORT_MESSAGES,
  RESPONSE_CODE,
  SUCCESS,
  FAIL,
  CATEGORY_TYPE,
  BADGE_TYPE,
  CLOUDFRONT_URL,
  USER_MEDIA_PATH,
  CONTENT_TYPE,
  ADMIN_MEDIA_PATH,
  STATUS,
  ACCOUNT_TYPE,
  USER_TYPE
} = require('../../../services/Constant');
const {
  currentDateOnly,
  toObjectId,
  convertObjectKeysToCamelCase,
  makeRandomString,
  makeRandomDigit
} = require('../../../services/Helper');
const { default: puppeteer } = require('puppeteer');
const pug = require('pug');
const {
  ContentCounts,
  Usage,
  Cleanse,
  Goals,
  UserNotes,
  UserAffirmation,
  UserGratitude,
  RecentlyPlayed,
  RippleConversation,
  RippleUser,
  Users
} = require('../../../models');
const {
  updateBadges,
  sendBadgeNotification
} = require('../../../services/userServices/badgeServices');
const moment = require('moment');
const { sendPassword, sendRipplePassword } = require('../../../services/Mailer');
const openai = new OpenAI(process.env.OPENAI_API_KEY);

const setAppUsage = async (userId) => {
  try {
    if (userId) {
      const currentDate = new Date();
      const userUsage = await Usage.findOne({
        user_id: userId,
        createdAt: {
          $gte: moment(currentDate).startOf('day').toDate(),
          $lt: moment(currentDate).endOf('day').toDate()
        }
      });

      const content = await ContentCounts.findOne({
        user_id: userId,
        streak_updated_at: {
          $gte: moment(currentDate).subtract(1, 'day').startOf('day').toDate(),
          $lt: moment(currentDate).startOf('day').toDate()
        }
      });

      if (content) {
        await ContentCounts.updateOne(
          { user_id: userId },
          { $inc: { streak: 1, days_used: 1 }, streak_updated_at: currentDate }
        );
      } else {
        const previousContent = await ContentCounts.findOne({
          user_id: userId,
          streak_updated_at: {
            $gte: moment(currentDate).startOf('day').toDate(),
            $lt: moment(currentDate).endOf('day').toDate()
          }
        });

        if (!previousContent) {
          await ContentCounts.updateOne(
            { user_id: userId },
            { $set: { streak: 0, streak_updated_at: currentDate } }
          );
          await ContentCounts.updateOne(
            { user_id: userId },
            { $inc: { days_used: 1 }, streak_updated_at: currentDate }
          );
        }
      }

      if (!userUsage) {
        await Usage.create({
          user_id: userId
        });
      }
      return true;
    }
  } catch (err) {
    console.error(err);
    return false;
  }
};

module.exports = {
  setAppUsage,
  /**
   * @description This function is used for finding session wise chat
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  RipplegetSession: async (req, res) => {
    const pageNumber = parseInt(req.query.page_number) || 1;
    const limitNumber = parseInt(req.query.limit) || 10;
    const skip = (pageNumber - 1) * limitNumber;

    const userId = req.authUserId;
    const getEdges = await Conversation.find({
      $and: [
        { userId: userId },
        { isSessionStart: true },
        { moodId: { $exists: false } },
        { _id: { $gte: req.query.chat_id } }
      ]
    })
      .sort({ createdAt: 1 }) // Descending order based on created_at
      .skip(0)
      .limit(2);

    let data = [];
    if (getEdges.length === 1) {
      data = await Conversation.find({
        userId: userId,
        moodId: { $exists: false },
        _id: { $gte: getEdges[0]._id }
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber);
    } else if (getEdges.length === 2) {
      data = await Conversation.find({
        $and: [
          { userId: userId },
          { moodId: { $exists: false } },
          { _id: { $gte: getEdges[0]._id, $lt: getEdges[1]._id } }
        ]
      })
        .sort({ _id: 1 })
        .skip(skip)
        .limit(limitNumber);
    }

    res.status(200).send({ data: data });
  },

  /**
   * @description This function is used for finding session wise chat
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  RipplechatSession: async (req, res) => {
    const pageNumber = parseInt(req.query.page_number) || 1;
    const limitNumber = parseInt(req.query.limit) || 10;
    const user_id = req.authUserId;
    const skip = (pageNumber - 1) * limitNumber;

    const start_date = req.query.start_date;
    const end_date = req.query.end_date;

    let start = new Date(start_date);
    const numberOfDaysToAdd = 1;
    let end = new Date(end_date);
    end.setDate(end.getDate() + numberOfDaysToAdd);

    const length = await Conversation.find({
      $and: [
        { userId: user_id },
        { isSessionStart: true },
        { createdAt: { $gte: start, $lte: end } },
        { moodId: { $exists: false } }
      ]
    }).countDocuments();

    const data = await Conversation.aggregate([
      {
        $match: {
          $and: [
            { userId: user_id },
            { isSessionStart: true },
            { createdAt: { $gte: start, $lte: end } },
            { moodId: { $exists: false } }
          ]
        }
      },
      {
        $sort: { userId: 1, _id: 1 }
      },
      {
        $project: {
          _id: '$_id',
          userId: '$userId',
          message: '$message',
          to: '$to',
          isSessionStart: '$isSessionStart',
          createdAt: '$createdAt',
          updatedAt: '$updatedAt'
        }
      },
      {
        $facet: {
          paginatedResult: [{ $skip: (pageNumber - 1) * limitNumber }, { $limit: limitNumber }],
          totalCount: [{ $count: 'count' }]
        }
      },
      {
        $unwind: '$totalCount'
      },
      {
        $project: {
          paginatedResult: 1,
          totalCount: '$totalCount.count'
        }
      }
    ]);

    let paginateArr = typeof data[0] !== 'undefined' ? data[0].paginatedResult : [];
    let dataForMood = [];
    await Promise.all(
      paginateArr.map(async (rec, idx) => {
        dataForMood = await Conversation.findOne({
          userId: req.authUserId,
          moodId: { $exists: true },
          _id: { $lt: rec._id }
        }).sort({ _id: -1 });
        if (dataForMood) {
          let mood = {};
          switch (dataForMood.moodId) {
            case '1':
              mood = { mood: 'angry', moodId: '1' };
              break;
            case '2':
              mood = { mood: 'anxious', moodId: '2' };
              break;
            case '3':
              mood = { mood: 'content', moodId: '3' };
              break;
            case '4':
              mood = { mood: 'excited', moodId: '4' };
              break;
            case '5':
              mood = { mood: 'stress', moodId: '5' };
              break;
            case '6':
              mood = { mood: 'happy', moodId: '6' };
              break;
            case '7':
              mood = { mood: 'sad', moodId: '7' };
              break;
            case '8':
              mood = { mood: 'surprised', moodId: '8' };
              break;
            case '9':
              mood = { mood: 'tired', moodId: '9' };
              break;
            default:
              break;
          }
          paginateArr[idx] = { ...rec, ...mood };
        }
      })
    );

    const obj = {
      page: pageNumber,
      limit: limitNumber,
      length: typeof data[0] != 'undefined' ? data[0].totalCount : 0,
      data: typeof data[0] != 'undefined' ? paginateArr : null
    };

    res.status(200).send({
      data: obj
    });
  },

  /**
   * @description This function is used for finding chat summary
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  RippletimeSpent: async (req, res) => {
    const { limit, page_number } = req.query;
    const PAGE_SIZE = parseInt(limit) || 10; // Number of documents per page
    const PAGE_NUMBER = parseInt(page_number) || 1; // Page number (1-based index)

    const startDate = new Date(req.query.start_date);
    const endDate = new Date(req.query.end_date);

    const start = new Date(startDate);
    const numberOfDaysToAdd = 1;
    const end = new Date(endDate);
    end.setDate(end.getDate() + numberOfDaysToAdd);

    const timeSpent = await Conversation.aggregate([
      {
        $match: {
          userId: req.authUserId,
          isSessionStart: true,
          to: 'BOT',
          createdAt: {
            $gte: start,
            $lte: end
          }
        }
      },
      {
        $sort: { userId: 1, _id: 1 }
      },
      {
        $group: {
          _id: { userId: '$userId', day: { $dayOfYear: '$createdAt' } },
          message: { $first: '$message' },
          sessionStartId: { $first: '$_id' },
          sessionStart: { $first: '$createdAt' },
          nextSessionStartId: { $last: '$_id' },
          nextSessionStart: { $last: '$createdAt' }
        }
      },
      {
        $project: {
          _id: 0,
          userId: '$_id.userId',
          message: '$message',
          day: '$_id.day',
          sessionStartId: '$sessionStartId',
          sessionStart: '$sessionStart',
          nextSessionStartId: '$nextSessionStartId',
          nextSessionStart: '$nextSessionStart',
          sessionDurationInHours: {
            $round: [
              {
                $divide: [
                  {
                    $subtract: ['$nextSessionStart', '$sessionStart']
                  },
                  60000 * 60
                ]
              },
              2
            ]
          }
        }
      },
      {
        $facet: {
          paginatedResult: [{ $skip: (PAGE_NUMBER - 1) * PAGE_SIZE }, { $limit: PAGE_SIZE }],
          totalCount: [{ $count: 'count' }]
        }
      },
      {
        $unwind: '$totalCount'
      },
      {
        $project: {
          paginatedResult: 1,
          totalCount: '$totalCount.count'
        }
      }
    ]);

    const timeSpentAll = await Conversation.aggregate([
      {
        $match: {
          userId: req.authUserId,
          isSessionStart: true,
          to: 'BOT'
        }
      },
      {
        $sort: { userId: 1, _id: 1 }
      },
      {
        $group: {
          _id: { userId: '$userId', day: { $dayOfYear: '$createdAt' } },
          message: { $first: '$message' },
          sessionStartId: { $first: '$_id' },
          sessionStart: { $first: '$createdAt' },
          nextSessionStartId: { $last: '$_id' },
          nextSessionStart: { $last: '$createdAt' }
        }
      },
      {
        $project: {
          _id: 0,
          userId: '$_id.userId',
          message: '$message',
          day: '$_id.day',
          sessionStartId: '$sessionStartId',
          sessionStart: '$sessionStart',
          nextSessionStartId: '$nextSessionStartId',
          nextSessionStart: '$nextSessionStart',
          sessionDurationInHours: {
            $round: [
              {
                $divide: [
                  {
                    $subtract: ['$nextSessionStart', '$sessionStart']
                  },
                  60000 * 60
                ]
              },
              2
            ]
          }
        }
      }
    ]);

    // conversion ratio
    const conversion = (data) => {
      const hours = Math.floor(data);
      const minutes = Math.round((data - hours) * 60);

      const hourLabel = hours === 1 ? 'hour' : 'hours';
      const minuteLabel = minutes === 1 ? 'minute' : 'minutes';

      return `${hours > 0 ? `${hours} ${hourLabel}` : ''}${hours > 0 && minutes > 0 ? ' and ' : ''}${minutes > 0 ? `${minutes} ${minuteLabel}` : '0 mins'}`;
    };

    let paginateArr = typeof timeSpent[0] !== 'undefined' ? timeSpent[0].paginatedResult : [];
    let paginateArrAll = typeof timeSpentAll[0] !== 'undefined' ? timeSpentAll : [];

    let dataForMood = [];
    let totalUsage = 0;
    await Promise.all(
      paginateArr.map(async (rec, idx) => {
        dataForMood = await Conversation.findOne({
          userId: req.authUserId,
          moodId: { $exists: true },
          _id: { $lt: rec.sessionStartId }
        }).sort({ _id: -1 });
        if (dataForMood) {
          let mood = {};
          switch (dataForMood.moodId) {
            case '1':
              mood = { mood: 'angry', moodId: '1' };
              break;
            case '2':
              mood = { mood: 'anxious', moodId: '2' };
              break;
            case '3':
              mood = { mood: 'content', moodId: '3' };
              break;
            case '4':
              mood = { mood: 'excited', moodId: '4' };
              break;
            case '5':
              mood = { mood: 'stress', moodId: '5' };
              break;
            case '6':
              mood = { mood: 'happy', moodId: '6' };
              break;
            case '7':
              mood = { mood: 'sad', moodId: '7' };
              break;
            case '8':
              mood = { mood: 'surprised', moodId: '8' };
              break;
            case '9':
              mood = { mood: 'tired', moodId: '9' };
              break;
            default:
              break;
          }
          paginateArr[idx] = { ...rec, ...mood };
        }
        let chatTime = { chatTime: conversion(rec.sessionDurationInHours) };
        paginateArr[idx] = { ...rec, ...chatTime };
      })
    );

    await Promise.all(
      paginateArrAll.map(async (rec, idx) => {
        totalUsage += parseFloat(rec.sessionDurationInHours).toFixed(2);
      })
    );

    let existingTime = await ContentCounts.findOne({ user_id: req.authUserId });
    if (existingTime) {
      await ContentCounts.updateOne(
        { user_id: req.authUserId },
        {
          $set: {
            shuru_time: parseFloat(totalUsage).toFixed(2)
          }
        }
      );

      let badgeReceived = false;
      switch (true) {
        case totalUsage >= 250:
          badgeReceived = await updateBadges(
            req.authUserId,
            CATEGORY_TYPE.SHURU_USAGE,
            BADGE_TYPE.DIAMOND
          );
          badgeReceived &&
            (await sendBadgeNotification(
              req.authUserId,
              CATEGORY_TYPE.SHURU_USAGE,
              BADGE_TYPE.DIAMOND
            ));
        // fall through
        case totalUsage >= 100:
          badgeReceived = await updateBadges(
            req.authUserId,
            CATEGORY_TYPE.SHURU_USAGE,
            BADGE_TYPE.PLATINUM
          );
          badgeReceived &&
            (await sendBadgeNotification(
              req.authUserId,
              CATEGORY_TYPE.SHURU_USAGE,
              BADGE_TYPE.PLATINUM
            ));
        // fall through
        case totalUsage >= 50:
          badgeReceived = await updateBadges(
            req.authUserId,
            CATEGORY_TYPE.SHURU_USAGE,
            BADGE_TYPE.GOLD
          );
          badgeReceived &&
            (await sendBadgeNotification(
              req.authUserId,
              CATEGORY_TYPE.SHURU_USAGE,
              BADGE_TYPE.GOLD
            ));
        // fall through
        case totalUsage >= 25:
          badgeReceived = await updateBadges(
            req.authUserId,
            CATEGORY_TYPE.SHURU_USAGE,
            BADGE_TYPE.SILVER
          );
          badgeReceived &&
            (await sendBadgeNotification(
              req.authUserId,
              CATEGORY_TYPE.SHURU_USAGE,
              BADGE_TYPE.SILVER
            ));
        // fall through
        case totalUsage >= 10:
          badgeReceived = await updateBadges(
            req.authUserId,
            CATEGORY_TYPE.SHURU_USAGE,
            BADGE_TYPE.BRONZE
          );
          badgeReceived &&
            (await sendBadgeNotification(
              req.authUserId,
              CATEGORY_TYPE.SHURU_USAGE,
              BADGE_TYPE.BRONZE
            ));
          break;
        default:
          // Handle any other cases
          break;
      }
    } else {
      await ContentCounts.create({
        $set: {
          shuru_time: parseFloat(totalUsage).toFixed(2),
          user_id: req.authUserId
        }
      });

      let badgeReceived = false;
      switch (true) {
        case totalUsage >= 250:
          badgeReceived = await updateBadges(
            req.authUserId,
            CATEGORY_TYPE.SHURU_USAGE,
            BADGE_TYPE.DIAMOND
          );
          badgeReceived &&
            (await sendBadgeNotification(
              req.authUserId,
              CATEGORY_TYPE.SHURU_USAGE,
              BADGE_TYPE.DIAMOND
            ));
        // fall through
        case totalUsage >= 100:
          badgeReceived = await updateBadges(
            req.authUserId,
            CATEGORY_TYPE.SHURU_USAGE,
            BADGE_TYPE.PLATINUM
          );
          badgeReceived &&
            (await sendBadgeNotification(
              req.authUserId,
              CATEGORY_TYPE.SHURU_USAGE,
              BADGE_TYPE.PLATINUM
            ));
        // fall through
        case totalUsage >= 50:
          badgeReceived = await updateBadges(
            req.authUserId,
            CATEGORY_TYPE.SHURU_USAGE,
            BADGE_TYPE.GOLD
          );
          badgeReceived &&
            (await sendBadgeNotification(
              req.authUserId,
              CATEGORY_TYPE.SHURU_USAGE,
              BADGE_TYPE.GOLD
            ));
        // fall through
        case totalUsage >= 25:
          badgeReceived = await updateBadges(
            req.authUserId,
            CATEGORY_TYPE.SHURU_USAGE,
            BADGE_TYPE.SILVER
          );
          badgeReceived &&
            (await sendBadgeNotification(
              req.authUserId,
              CATEGORY_TYPE.SHURU_USAGE,
              BADGE_TYPE.SILVER
            ));
        // fall through
        case totalUsage >= 10:
          badgeReceived = await updateBadges(
            req.authUserId,
            CATEGORY_TYPE.SHURU_USAGE,
            BADGE_TYPE.BRONZE
          );
          badgeReceived &&
            (await sendBadgeNotification(
              req.authUserId,
              CATEGORY_TYPE.SHURU_USAGE,
              BADGE_TYPE.BRONZE
            ));
          break;
        default:
          // Handle any other cases
          break;
      }
    }

    const obj = {
      page_number: page_number,
      limit: limit,
      length: typeof timeSpent[0] != 'undefined' ? timeSpent[0].totalCount : 0,
      paginatedResult: typeof timeSpent[0] != 'undefined' ? paginateArr : null
    };

    res.status(200).send({
      data: obj
    });
  },

  /**
   * @description This function is used to ask question from bot
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  RippleaskMe: async (req, res) => {
    const userId = req.body.userId;
    let formattedHistory = [];
    const chatHistoryCnt = 20;
    if (!req.body.isSessionStart) {
      const lastSessionId = await RippleConversation.findOne({
        user_id: userId,
        isSessionStart: true
      }).sort({ _id: -1 });
      const history = await RippleConversation.find({
        user_id: userId,
        moodId: { $exists: false },
        _id: { $gte: lastSessionId._id }
      })
        .sort({ _id: -1 })
        .limit(chatHistoryCnt);
      if (history.length > 1) {
        history.forEach((item, key) => {
          if (item.isSessionStart) {
            return;
          }
          if (item.to === 'USER') {
            formattedHistory.push({
              user:
                typeof history[key + 1] !== 'undefined' && history[key + 1].to === 'BOT'
                  ? history[key + 1].message
                  : '',
              bot: item.message
            });
          }
        });
      }
    }
    if (typeof req.body.sessionId !== 'undefined') {
      if (formattedHistory.length < chatHistoryCnt / 2) {
        const getEdges = await RippleConversation.find({
          $and: [
            { user_id: userId },
            { isSessionStart: true },
            { mood_id: { $exists: false } },
            { _id: { $gte: req.body.sessionId } }
          ]
        })
          .sort({ createdAt: 1 }) // Descending order based on created_at
          .skip(0)
          .limit(2);
        console.log('getEdges = ', getEdges);
        let oldSessionChats = [];
        if (getEdges.length === 2) {
          oldSessionChats = await Conversation.find({
            $and: [
              { user_id: userId },
              { mood_id: { $exists: false } },
              { _id: { $gte: getEdges[0]._id, $lt: getEdges[1]._id } }
            ]
          })
            .sort({ _id: 1 })
            .limit(chatHistoryCnt);
          oldSessionChats.forEach((item, key) => {
            if (item.isSessionStart) {
              return;
            }
            if (item.to === 'USER') {
              formattedHistory.push({
                user:
                  typeof oldSessionChats[key + 1] !== 'undefined' &&
                  oldSessionChats[key + 1].to === 'BOT'
                    ? oldSessionChats[key + 1].message
                    : '',
                bot: item.message
              });
            }
          });
        }
      }
    }
    const obj = new RippleConversation({
      user_id: userId,
      message: req.body.message,
      to: req.body.to.toUpperCase(),
      isSessionStart: req.body.isSessionStart
    });

    obj.save();
    let botAnswer = '';
    const url = 'http://13.51.222.131/ask';
    const data = {
      query: req.body.message,
      username: "",
      history: formattedHistory.reverse(),
      timezone: typeof req.body.timezone !== 'undefined' ? req.body.timezone : ''
    };
    const config = {
      method: 'post',
      url: url,
      headers: {},
      data: data
    };

    try {
      const response = await axios(config);
      const responseData = JSON.parse(response.data);
      botAnswer = responseData.response;
      let { data: sentiments } = await axios.post(
        `https://suru-therapy.shoorah.io/match?input_text=${req.body.message}`
      );

      const obj2 = new RippleConversation({
        user_id: userId,
        message: botAnswer,
        to: 'USER',
        isSessionStart: false,
        sentiments
      });
      await obj2.save(); // Wait for the save operation to complete
      res.status(200).send({ data: botAnswer, _id: obj2._id });
    } catch (error) {
      console.error('Error:', error);
      res.status(500).send({ error: 'An error occurred' });
    }
  },
  /**
   * @description This function is used to get the history
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  RipplegetHistory: async (req, res) => {
    try {
      if (!req.query.start_date && !req.query.end_date) {
        const pageNumber = parseInt(req.query.page_number) || 1;
        const limitNumber = parseInt(req.query.limit) || 10;
        const user_id = req.authUserId;
        const skip = (pageNumber - 1) * limitNumber;

        const length = await Conversation.find({
          userId: user_id,
          moodId: { $exists: false }
        }).countDocuments();

        const sortedData = await Conversation.find({ userId: user_id, moodId: { $exists: false } })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNumber);

        let obj = {
          page: pageNumber,
          limit: limitNumber,
          length: length,
          paginatedResult: sortedData
        };

        res.status(200).send({
          data: obj
        });
      } else {
        const pageNumber = parseInt(req.query.page_number) || 1;
        const limitNumber = parseInt(req.query.limit) || 10;
        const user_id = req.authUserId;
        const skip = (pageNumber - 1) * limitNumber;

        const start_date = req.query.start_date;
        const end_date = req.query.end_date;

        let start = new Date(start_date);
        // let end = new Date(end_date);
        const numberOfDaysToAdd = 1;
        let end = new Date(end_date);

        // const increasedDate = new Date(initialDate);
        end.setDate(end.getDate() + numberOfDaysToAdd);

        const length = await Conversation.find({
          $and: [
            { userId: user_id },
            { createdAt: { $gte: start, $lte: end } },
            { moodId: { $exists: false } }
          ]
        }).countDocuments();

        const chatHistory = await Conversation.find({
          $and: [
            { userId: user_id },
            { createdAt: { $gte: start, $lte: end } },
            { moodId: { $exists: false } }
          ]
        })
          .sort({ createdAt: -1 }) // Descending order based on created_at
          .skip(skip)
          .limit(limitNumber);

        let obj = {
          page: pageNumber,
          limit: limitNumber,
          length: length,
          paginatedResult: chatHistory
        };

        res.status(200).send({
          data: obj
        });
      }
      // const recored = await Mood.find();
    } catch (error) {
      res.status(500).send({ message: error.message });
    }
    // const getData=await Conversation.find({userId:req.authUserId})
    // res.status(200).send({getData})
  },

  Rippleopenai: async (req, res) => {
    try {
      const { avgPositive, avgNegative, oldSolution, businessType, filters, solutionType } =
        req.body;

      // for overall well being score calculation
      if (solutionType == 1) {
        let prependText = '';
        let countryText = '';
        let ethnicityText = '';
        let genderText = '';
        let emotionText = '';
        let ageGroupText = '';

        if (filters.country) {
          countryText = 'situated in ' + filters.country;
        }
        if (filters.ethnicity) {
          ethnicityText = 'and of ethnicity: ' + filters.ethnicity;
        }
        if (filters.gender) {
          if (filters.gender != 'Non Prefer to say') genderText = filters.gender;
        }
        if (filters.emotion) {
          emotionText = 'due to ' + filters.emotion;
        }
        if (filters.ageGroup) {
          ageGroupText = 'having age group ' + filters.age;
        }

        if (avgPositive >= 1 && avgPositive <= 20) {
          prependText =
            'Your business has recorded a Very Poor score which indicates a substantial need for improvement or a complete reevaluation of the situation to rectify the underlying issues and move towards a more satisfactory or successful outcome. Check out our Shoorah business solutions to help you move forward from here.';
        } else if (avgPositive >= 21 && avgPositive <= 40) {
          prependText =
            'Your business has recorded a Poor score which signifies that there are significant issues or drawbacks that detract from the overall quality or satisfaction. This rating suggests that improvements are needed to raise the level of performance or experience to a more acceptable standard within your workplace. Visit Shoorah’s business solutions to help you make the necessary improvements going forwards';
        } else if (avgPositive >= 41 && avgPositive <= 60) {
          prependText =
            'Your business recorded an Average rating, which represents a neutral position, suggesting that you are meeting basic expectations without surpassing them. There is still much room for improvement so check out Shoorah’s business solutions to begin implementing actions that will help improve this score.';
        } else if (avgPositive >= 61 && avgPositive <= 80) {
          prependText =
            'Your business has recorded a Good rating which represents a strong performance that has exceeded expectations and is highly satisfactory. While there might be slight room for improvement, this rating reflects a level of quality that is indicative of a strong effort and a job well done. For a continued focus on constantly learning and improving, visit our Shoorah business solutions to learn how to keep building from here.';
        } else if (avgPositive >= 81 && avgPositive <= 100) {
          prependText =
            'Your business has recorded a Very Good rating. This represents an exceptionally high level of excellence and signifies a level of performance or quality that is truly outstanding and that sets a high very standard. Visit our Shoorah business solutions for ideas on how to maintain this rating into the future.';
        }
        const systemMessage = {
          role: 'system',
          content: 'You are a helpful assistant.'
        };

        const userMessage = {
          role: 'user',
          content: `${businessType} COMPANY ${countryText}, ${filters.department} department, 
          OVERALL WELLBEING SCORE IS ${avgNegative}% ${genderText} employees ${ageGroupText} ${ethnicityText} don't like the work ${emotionText}. 
          Previous solution used by company that did not work is as follows: "${oldSolution}".
          
          How can we give a solution to the company owners to help them with this situation?`
        };

        const completion = await openai.chat.completions.create({
          messages: [systemMessage, userMessage],
          model: 'gpt-3.5-turbo'
        });

        const openaiResponse =
          completion.choices &&
          completion.choices[0] &&
          completion.choices[0].message &&
          completion.choices[0].message.content;

        return res.status(200).send({
          data: `${prependText}\n ${openaiResponse}`
        });
      }

      // for moods and emotions score
      if (solutionType == 2) {
        let prependText = '';
        let countryText = '';
        let ethnicityText = '';
        let genderText = '';
        let emotionText = '';
        let ageGroupText = '';

        if (filters.country) {
          countryText = 'situated in ' + filters.country;
        }
        if (filters.ethnicity) {
          ethnicityText = 'and of ethnicity: ' + filters.ethnicity;
        }
        if (filters.gender) {
          if (filters.gender != 'Non Prefer to say') genderText = filters.gender;
        }
        if (filters.emotion) {
          emotionText = 'due to ' + filters.emotion;
        }
        if (filters.ageGroup) {
          ageGroupText = 'having age group ' + filters.age;
        }

        if (avgPositive >= 1 && avgPositive <= 20) {
          prependText =
            'Your employees moods and emotions has recorded a Very Poor score which indicates a substantial need for improvement or a complete reevaluation of the situation to rectify the underlying issues and move towards a more satisfactory or successful outcome. Check out our Shoorah moods and emotions solutions to help you move forward from here.';
        } else if (avgPositive >= 21 && avgPositive <= 40) {
          prependText =
            'Your employees moods and emotions has recorded a Poor score which signifies that there are significant issues or drawbacks that detract from the overall quality or satisfaction. This rating suggests that improvements are needed to raise the level of performance or experience to a more acceptable standard within your workplace. Visit Shoorah’s moods and emotions solutions to help you make the necessary improvements going forwards';
        } else if (avgPositive >= 41 && avgPositive <= 60) {
          prependText =
            'Your employees moods and emotions recorded an Average rating, which represents a neutral position, suggesting that you are meeting basic expectations without surpassing them. There is still much room for improvement so check out Shoorah’s moods and emotions solutions to begin implementing actions that will help improve this score.';
        } else if (avgPositive >= 61 && avgPositive <= 80) {
          prependText =
            'Your employees moods and emotions has recorded a Good rating which represents a strong performance that has exceeded expectations and is highly satisfactory. While there might be slight room for improvement, this rating reflects a level of quality that is indicative of a strong effort and a job well done. For a continued focus on constantly learning and improving, visit our Shoorah moods and emotions solutions to learn how to keep building from here.';
        } else if (avgPositive >= 81 && avgPositive <= 100) {
          prependText =
            'Your employees moods and emotions has recorded a Very Good rating. This represents an exceptionally high level of excellence and signifies a level of performance or quality that is truly outstanding and that sets a high very standard. Visit our Shoorah moods and emotions solutions for ideas on how to maintain this rating into the future.';
        }
        const systemMessage = {
          role: 'system',
          content: 'You are a helpful assistant.'
        };

        const userMessage = {
          role: 'user',
          content: `${businessType} COMPANY ${countryText}, ${filters.department} department, 
          MOODS & EMOTIONS SCORE IS ${avgNegative}% ${genderText} employees ${ageGroupText} ${ethnicityText} don't like the work ${emotionText}. 
          Previous solution used by company owner that did not work is as follows: "${oldSolution}".
          How can we give a solution to the company owners to help them with this overcome situation and help their company to grow?`
        };

        const completion = await openai.chat.completions.create({
          messages: [systemMessage, userMessage],
          model: 'gpt-3.5-turbo'
        });

        const openaiResponse =
          completion.choices &&
          completion.choices[0] &&
          completion.choices[0].message &&
          completion.choices[0].message.content;

        return res.status(200).send({
          data: `${prependText}\n ${openaiResponse}`
        });
      }

      // for shuru and journal theraphy
      if (solutionType == 3) {
        let prependText = '';
        let countryText = '';
        let ethnicityText = '';
        let genderText = '';
        let emotionText = '';
        let ageGroupText = '';

        if (filters.country) {
          countryText = 'situated in ' + filters.country;
        }
        if (filters.ethnicity) {
          ethnicityText = 'and of ethnicity: ' + filters.ethnicity;
        }
        if (filters.gender) {
          if (filters.gender != 'Non Prefer to say') genderText = filters.gender;
        }
        if (filters.emotion) {
          emotionText = 'due to ' + filters.emotion;
        }
        if (filters.ageGroup) {
          ageGroupText = 'having age group ' + filters.age;
        }

        if (avgPositive >= 1 && avgPositive <= 20) {
          prependText =
            'Your employees shuru & journal theraphy has recorded a Very Poor score which indicates a substantial need for improvement or a complete reevaluation of the situation to rectify the underlying issues and move towards a more satisfactory or successful outcome. Check out our Shoorah shuru & journal theraphy solutions to help you move forward from here.';
        } else if (avgPositive >= 21 && avgPositive <= 40) {
          prependText =
            'Your employees shuru & journal theraphy has recorded a Poor score which signifies that there are significant issues or drawbacks that detract from the overall quality or satisfaction. This rating suggests that improvements are needed to raise the level of performance or experience to a more acceptable standard within your workplace. Visit Shoorah’s shuru & journal theraphy solutions to help you make the necessary improvements going forwards';
        } else if (avgPositive >= 41 && avgPositive <= 60) {
          prependText =
            'Your employees shuru & journal theraphy recorded an Average rating, which represents a neutral position, suggesting that you are meeting basic expectations without surpassing them. There is still much room for improvement so check out Shoorah’s shuru & journal theraphy solutions to begin implementing actions that will help improve this score.';
        } else if (avgPositive >= 61 && avgPositive <= 80) {
          prependText =
            'Your employees shuru & journal theraphy has recorded a Good rating which represents a strong performance that has exceeded expectations and is highly satisfactory. While there might be slight room for improvement, this rating reflects a level of quality that is indicative of a strong effort and a job well done. For a continued focus on constantly learning and improving, visit our Shoorah shuru & journal theraphy solutions to learn how to keep building from here.';
        } else if (avgPositive >= 81 && avgPositive <= 100) {
          prependText =
            'Your employees shuru & journal theraphy has recorded a Very Good rating. This represents an exceptionally high level of excellence and signifies a level of performance or quality that is truly outstanding and that sets a high very standard. Visit our Shoorah shuru & journal theraphy solutions for ideas on how to maintain this rating into the future.';
        }
        const systemMessage = {
          role: 'system',
          content: 'You are a helpful assistant.'
        };

        const userMessage = {
          role: 'user',
          content: `${businessType} COMPANY ${countryText}, ${filters.department} department, 
          SHURU & JOURNAL THERAPHY IS ${avgNegative}% ${genderText} employees ${ageGroupText} ${ethnicityText} don't like it ${emotionText}. 
          Previous solution used by company owner that did not work is as follows: "${oldSolution}".
          How can we give a solution to the company owners to help them with this overcome situation and help their company employees to stay happy and longer with them?`
        };

        const completion = await openai.chat.completions.create({
          messages: [systemMessage, userMessage],
          model: 'gpt-3.5-turbo'
        });

        const openaiResponse =
          completion.choices &&
          completion.choices[0] &&
          completion.choices[0].message &&
          completion.choices[0].message.content;

        return res.status(200).send({
          data: `${prependText}\n ${openaiResponse}`
        });
      } else {
        return Response.successResponseWithoutData(res, res.__('wrongSolutionType'), FAIL);
      }
    } catch (error) {
      console.log(error);
      return Response.internalServerErrorResponse(res);
    }
  },

  RippledownloadShuruReport: (req, res) => {
    try {
      const reqParam = req.query;
      downloadMoodReportValidation(reqParam, res, async (validate) => {
        if (validate) {
          let fromDate = currentDateOnly();
          let toDate = currentDateOnly();
          if (reqParam.reportFromDate) {
            fromDate = new Date(reqParam.reportFromDate);
          }
          if (reqParam.reportToDate) {
            toDate = new Date(reqParam.reportToDate);
          }
          toDate.setDate(toDate.getDate() + 1);
          switch (parseInt(reqParam.reportType)) {
            case MOOD_REPORT_DURATION.LAST_30_DAYS:
              fromDate.setDate(fromDate.getDate() - 30);
              break;
            case MOOD_REPORT_DURATION.LAST_60_DAYS:
              fromDate.setDate(fromDate.getDate() - 60);
              break;
          }

          const moods = [
            { id: '1', name: 'Angry', percent: 0, count: 0 },
            { id: '2', name: 'Anxious', percent: 0, count: 0 },
            { id: '3', name: 'Content', percent: 0, count: 0 },
            { id: '4', name: 'Excited', percent: 0, count: 0 },
            { id: '5', name: 'Stress', percent: 0, count: 0 },
            { id: '6', name: 'Happy', percent: 0, count: 0 },
            { id: '7', name: 'Sad', percent: 0, count: 0 },
            { id: '8', name: 'Surprised', percent: 0, count: 0 },
            { id: '9', name: 'Tired', percent: 0, count: 0 }
          ];
          const moodNamesMap = new Map(moods.map((mood) => [mood.id, mood.name]));

          const result = await Conversation.aggregate([
            {
              $match: {
                userId: req.authUserId,
                message: { $exists: false },
                to: { $exists: false },
                createdAt: {
                  $gte: fromDate,
                  $lte: toDate
                }
              }
            },
            {
              $group: {
                _id: '$moodId',
                totalCount: { $sum: 1 }
              }
            },
            {
              $group: {
                _id: null,
                moodData: {
                  $push: {
                    moodId: '$_id',
                    count: '$totalCount'
                  }
                }
              }
            },
            {
              $project: {
                _id: 0,
                moodData: {
                  $map: {
                    input: '$moodData',
                    as: 'item',
                    in: {
                      moodId: '$$item.moodId',
                      moodCount: '$$item.count',
                      roundedPercentage: {
                        $add: [
                          {
                            $cond: [
                              {
                                $gt: [
                                  {
                                    $mod: [
                                      {
                                        $multiply: [
                                          100,
                                          { $divide: ['$$item.count', { $sum: '$moodData.count' }] }
                                        ]
                                      },
                                      1
                                    ]
                                  },
                                  0.5
                                ]
                              },
                              1,
                              0
                            ]
                          },
                          {
                            $floor: {
                              $multiply: [
                                { $divide: ['$$item.count', { $sum: '$moodData.count' }] },
                                100
                              ]
                            }
                          }
                        ]
                      }
                    }
                  }
                }
              }
            }
          ]);
          if (typeof result[0] !== 'undefined') {
            result[0].moodData.map((i) => {
              const moodName = moodNamesMap.get(i.moodId);
              i.moodName = moodName;

              // Find the corresponding mood in the 'moods' array and update the 'percent' value
              const correspondingMood = moods.find((mood) => mood.id === i.moodId);
              if (correspondingMood) {
                correspondingMood.percent = i.roundedPercentage;
                correspondingMood.count = i.moodCount;
              }
            });

            const locals = {
              name: req.authName,
              moods,
              // negativePercentage,
              // moodCount,
              fromDate: fromDate.toLocaleDateString('en-gb', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              }),
              toDate: toDate.toLocaleDateString('en-gb', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              }),
              happySmallIcon: process.env.PDF_HAPPY_SMALL_ICON,
              sadSmallIcon: process.env.PDF_SAD_SMALL_ICON,
              finalIcon: process.env.PDF_HAPPY_ICON,
              finalIconText: '',
              finalMessage:
                SHURU_REPORT_MESSAGES[Math.floor(Math.random() * SHURU_REPORT_MESSAGES.length)]
            };

            // switch (true) {
            //   case postivePercentage > negativePercentage:
            //     locals.finalIcon = process.env.PDF_HAPPY_ICON;
            //     locals.finalIconText = 'Positive';
            //     switch (true) {
            //       case postivePercentage < 30:
            //         locals.finalMessage = MOOD_REPORT_POSITIVE_MESSGE.LESS_THEN_30;
            //         break;
            //       case postivePercentage >= 30 && postivePercentage < 60:
            //         locals.finalMessage = MOOD_REPORT_POSITIVE_MESSGE.THIRTY_TO_SIXTY;
            //         break;
            //       case postivePercentage >= 60:
            //         locals.finalMessage = MOOD_REPORT_POSITIVE_MESSGE.SIXTY_TO_100;
            //         break;
            //     }
            //     break;
            //   case postivePercentage < negativePercentage:
            //     locals.finalIcon = process.env.PDF_SAD_ICON;
            //     locals.finalIconText = 'Negative';
            //     switch (true) {
            //       case negativePercentage < 30:
            //         locals.finalMessage = MOOD_REPORT_NEGATIVE_MESSGE.LESS_THEN_30;
            //         break;
            //       case negativePercentage >= 30 && negativePercentage < 70:
            //         locals.finalMessage = MOOD_REPORT_NEGATIVE_MESSGE.THIRTY_TO_SEVENTY;
            //         break;
            //       case negativePercentage >= 70 && negativePercentage < 90:
            //         locals.finalMessage = MOOD_REPORT_NEGATIVE_MESSGE.SEVENTY_TO_90;
            //         break;
            //       case negativePercentage >= 90:
            //         locals.finalMessage = MOOD_REPORT_NEGATIVE_MESSGE.MORE_THEN_NINETY;
            //         break;
            //     }
            //     break;
            //   case postivePercentage === negativePercentage:
            //     locals.finalIcon = process.env.PDF_NEUTRAL_ICON;
            //     locals.finalIconText = 'Neutral';
            //     locals.finalMessage = MOOD_REPORT_NEUTRAL_MESSAGE;
            //     break;
            // }

            const compiledFunction = pug.compileFile('src/views/shuruReport.pug');
            const html = compiledFunction(locals);
            const browser = await puppeteer.launch({
              executablePath:
                process.env.NODE_ENV === NODE_ENVIRONMENT.DEVELOPMENT
                  ? null
                  : '/usr/bin/google-chrome',
              ignoreDefaultArgs: ['--disable-extensions'],
              headless: true,
              args: ['--no-sandbox', '--disabled-setupid-sandbox']
            });
            const page = await browser.newPage();
            await page.setContent(html);
            const pdf = await page.pdf({
              format: MOOD_PDF_SIZE,
              printBackground: true
            });
            await browser.close();
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename=file.pdf');
            res.setHeader('Content-Length', pdf.length);
            res.send(pdf);
          } else {
            if (!result.length > 0) {
              return Response.errorResponseData(
                res,
                res.__('NoShuruMoodDataFound'),
                RESPONSE_CODE.NOT_FOUND
              );
            }
          }
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  RipplegetShuruFeedback: async (req, res) => {
    try {
      const userId = req.authUserId;

      if (req.body.chatId) {
        const getEdges = await Conversation.find({
          $and: [{ userId: userId }, { _id: { $gte: req.body.chatId } }]
        })
          .sort({ createdAt: 1 })
          .skip(0)
          .limit(1);

        if (getEdges.length === 1) {
          await Conversation.updateOne(
            { _id: getEdges[0]._id },
            {
              $set: {
                feedback_type: req.body.feedbackType,
                feedback_value: req.body.feedbackValue
              }
            }
          );

          let message = 'Feedback successfully';
          return Response.successResponseData(res, { message }, SUCCESS, res.__('feedbackSuccess'));
        } else {
          return Response.successResponseWithoutData(res, res.__('noConversationFound'), FAIL);
        }
      } else {
        return Response.successResponseWithoutData(res, res.__('noChatId'), FAIL);
      }
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  RipplegetHistoryDates: async (req, res) => {
    try {
      const userId = req.authUserId;
      const dates = await Usage.find({ user_id: userId }).sort();
      let historyDates = dates.map((i) => new Date(i.createdAt).toISOString().split('T')[0]);
      return Response.successResponseData(
        res,
        historyDates,
        SUCCESS,
        res.__('getHistoryDatesSuccess')
      );
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  RipplegetHistories: async (req, res) => {
    try {
      const reqParam = req.query;
      const particularDate = reqParam.date;
      const startDate = new Date(particularDate);
      const endDate = new Date(moment(particularDate).endOf('day'));
      let filterCondition = {
        user_id: toObjectId(req.authUserId),
        deletedAt: null,
        updatedAt: { $gte: startDate, $lt: endDate }
      };

      const cleanses = await Cleanse.aggregate([
        {
          $match: filterCondition
        },
        {
          $project: {
            userId: '$user_id',
            title: '$title',
            imageUrl: {
              $concat: [CLOUDFRONT_URL, USER_MEDIA_PATH.CLEANSE, '/', '$image_url']
            }
          }
        }
      ]);
      const goals = await Goals.aggregate([
        {
          $match: filterCondition
        },
        {
          $project: {
            userId: '$user_id',
            title: '$title',
            imageUrl: {
              $concat: [CLOUDFRONT_URL, USER_MEDIA_PATH.GOALS, '/', '$image_url']
            }
          }
        }
      ]);

      const notes = await UserNotes.aggregate([
        {
          $match: filterCondition
        },
        {
          $project: {
            userId: '$user_id',
            title: '$title',
            imageUrl: {
              $concat: [CLOUDFRONT_URL, USER_MEDIA_PATH.NOTES, '/', '$image_url']
            }
          }
        }
      ]);

      const affirmations = await UserAffirmation.aggregate([
        {
          $match: filterCondition
        },
        {
          $project: {
            userId: '$user_id',
            title: '$title',
            imageUrl: {
              $concat: [CLOUDFRONT_URL, USER_MEDIA_PATH.AFFIRMATION, '/', '$image_url']
            }
          }
        }
      ]);

      const gratitudes = await UserGratitude.aggregate([
        {
          $match: filterCondition
        },
        {
          $project: {
            userId: '$user_id',
            title: '$display_name',
            imageUrl: {
              $concat: [CLOUDFRONT_URL, USER_MEDIA_PATH.GRATITUDE, '/', '$image_url']
            }
          }
        }
      ]);

      const meditations = await RecentlyPlayed.aggregate([
        {
          $match: {
            user_id: toObjectId(req.authUserId),
            deletedAt: null,
            updatedAt: { $gte: startDate, $lt: endDate },
            content_type: CONTENT_TYPE.MEDITATION
          }
        },
        {
          $lookup: {
            from: 'meditations',
            let: {
              content_id: '$content_id',
              content_type: '$content_type'
            },
            pipeline: [
              {
                $match: {
                  status: STATUS.ACTIVE,
                  approved_by: {
                    $ne: null
                  },
                  $expr: {
                    $eq: ['$_id', '$$content_id']
                  }
                }
              },
              {
                $project: {
                  updatedAt: 1,
                  contentId: '$_id',
                  contentName: '$display_name',
                  _id: 0,
                  content_type: 1,
                  contentType: 3,
                  duration: 1,
                  imageUrl: {
                    $concat: [
                      CLOUDFRONT_URL,
                      ADMIN_MEDIA_PATH.MEDITATION_IMAGE,
                      '/',
                      '$meditation_image'
                    ]
                  }
                }
              }
            ],
            as: 'content'
          }
        },
        {
          $unwind: {
            path: '$content',
            preserveNullAndEmptyArrays: false
          }
        },
        {
          $project: {
            contentId: '$content.contentId',
            contentType: '$content.content_type',
            title: '$content.contentName',
            imageUrl: '$content.imageUrl',
            duration: '$content.duration'
          }
        }
      ]);

      const sleeps = await RecentlyPlayed.aggregate([
        {
          $match: {
            user_id: toObjectId(req.authUserId),
            deletedAt: null,
            updatedAt: { $gte: startDate, $lt: endDate },
            content_type: CONTENT_TYPE.SOUND
          }
        },
        {
          $lookup: {
            from: 'sounds',
            let: {
              content_id: '$content_id',
              content_type: '$content_type'
            },
            pipeline: [
              {
                $match: {
                  status: STATUS.ACTIVE,
                  approved_by: {
                    $ne: null
                  },
                  $expr: {
                    $eq: ['$_id', '$$content_id']
                  }
                }
              },
              {
                $project: {
                  updatedAt: 1,
                  contentId: '$_id',
                  contentName: '$display_name',
                  _id: 0,
                  content_type: 1,
                  contentType: 3,
                  duration: 1,
                  imageUrl: {
                    $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.SOUND_IMAGES, '/', '$sound_image']
                  }
                }
              }
            ],
            as: 'content'
          }
        },
        {
          $unwind: {
            path: '$content',
            preserveNullAndEmptyArrays: false
          }
        },
        {
          $project: {
            contentId: '$content.contentId',
            title: '$content.contentName',
            imageUrl: '$content.imageUrl',
            duration: '$content.duration'
          }
        }
      ]);

      const pods = await RecentlyPlayed.aggregate([
        {
          $match: {
            user_id: toObjectId(req.authUserId),
            deletedAt: null,
            updatedAt: { $gte: startDate, $lt: endDate },
            content_type: CONTENT_TYPE.SHOORAH_PODS
          }
        },
        {
          $lookup: {
            from: 'shoorah_pods',
            let: {
              content_id: '$content_id',
              content_type: '$content_type'
            },
            pipeline: [
              {
                $match: {
                  status: STATUS.ACTIVE,
                  approved_by: {
                    $ne: null
                  },
                  $expr: {
                    $eq: ['$_id', '$$content_id']
                  }
                }
              },
              {
                $project: {
                  updatedAt: 1,
                  contentId: '$_id',
                  contentName: '$display_name',
                  _id: 0,
                  content_type: 1,
                  duration: 1,
                  contentType: 3,
                  imageUrl: {
                    $concat: [
                      CLOUDFRONT_URL,
                      ADMIN_MEDIA_PATH.SHOORAH_PODS_IMAGE,
                      '/',
                      '$pods_image'
                    ]
                  }
                }
              }
            ],
            as: 'content'
          }
        },
        {
          $unwind: {
            path: '$content',
            preserveNullAndEmptyArrays: false
          }
        },
        {
          $project: {
            contentId: '$content.contentId',
            title: '$content.contentName',
            imageUrl: '$content.imageUrl',
            duration: '$content.duration'
          }
        }
      ]);

      const chats = await Conversation.aggregate([
        {
          $match: {
            userId: req.authUserId,
            createdAt: { $gte: startDate, $lt: endDate },
            isSessionStart: true
          }
        },
        {
          $project: {
            title: '$message',
            createdAt: 1
          }
        }
      ]);

      const chatsMoods = await Conversation.aggregate([
        {
          $match: {
            userId: req.authUserId,
            moodId: { $exists: true },
            createdAt: { $gte: startDate, $lt: endDate }
          }
        }
      ]);

      if (chats.length > 0) {
        for (const chat of chats) {
          const getEdges = await Conversation.find({
            $and: [
              { userId: req.authUserId },
              { isSessionStart: true },
              { moodId: { $exists: false } },
              { _id: { $gte: chat._id } }
            ]
          })
            .sort({ createdAt: 1 })
            .skip(0)
            .limit(2);

          const chatMood = await Conversation.find({
            $and: [
              { userId: req.authUserId },
              { moodId: { $exists: true } },
              { createdAt: { $lt: new Date(chat.createdAt) } }
            ]
          })
            .sort({ createdAt: 1 })
            .limit(1);
          let data = [];
          if (getEdges.length === 1) {
            data = await Conversation.find({
              userId: req.authUserId,
              moodId: { $exists: false },
              _id: { $gte: getEdges[0]._id }
            }).sort({ createdAt: 1 });
          } else if (getEdges.length === 2) {
            data = await Conversation.find({
              $and: [
                { userId: req.authUserId },
                { moodId: { $exists: false } },
                { _id: { $gte: getEdges[0]._id, $lt: getEdges[1]._id } }
              ]
            }).sort({ _id: 1 });
          }

          if (data.length > 1) {
            chat.duration = Math.round(
              (new Date(data[data.length - 1].createdAt) - new Date(data[0].createdAt)) / 60000
            );
          } else {
            chat.duration = 0;
          }
          chat.mood = chatsMoods[0].moodId;
        }
      }

      let resObj = {
        cleanses,
        goals,
        notes,
        affirmations,
        gratitudes,
        meditations,
        sleeps,
        pods,
        chats
      };

      return Response.successResponseData(
        res,
        convertObjectKeysToCamelCase(resObj),
        SUCCESS,
        res.__('getHistoryDataSuccess')
      );
    } catch (err) {
      console.error(err);
      return Response.internalServerErrorResponse(res);
    }
  },

  RippleaddEditTimeSpent: async (req, res) => {
    try {
      const reqParam = req.body;
      // app duration update
      if (reqParam.type == 1) {
        await Usage.updateOne(
          { user_id: req.authUserId },
          { $inc: { app_durations: reqParam.duration } }
        );
        await ContentCounts.updateOne(
          { user_id: req.authUserId },
          { $inc: { app_durations: reqParam.duration } }
        );
      }
      // listen duration update
      if (reqParam.type == 2) {
        await ContentCounts.updateOne(
          { user_id: req.authUserId },
          { $inc: { listen_durations: reqParam.duration } }
        );
      }

      if (!reqParam.type || reqParam.type > 2 || reqParam.type < 1) {
        return Response.successResponseWithoutData(res, res.__('typeNotFound'), FAIL);
      }

      return Response.successResponseWithoutData(res, res.__('addEditTimeSpent'), SUCCESS);
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  RipplegetInsights: async (req, res) => {
    try {
      let journalConditions = {
        deletedAt: null,
        user_id: req.authUserId
      };

      const gratitudeCount = await UserGratitude.find(journalConditions);
      const gratitudeCounts = gratitudeCount.length;
      const affirmationCount = await UserAffirmation.find(journalConditions);
      const affirmationCounts = affirmationCount.length;
      const cleanseCount = await Cleanse.find(journalConditions);
      const cleanseCounts = cleanseCount.length;
      const goalCount = await Goals.find(journalConditions);
      const goalCounts = goalCount.length;
      const noteCount = await UserNotes.find(journalConditions);
      const noteCounts = noteCount.length;
      const journalCounts =
        gratitudeCounts + affirmationCounts + cleanseCounts + goalCounts + noteCounts;

      const userContent = await ContentCounts.findOne({ user_id: req.authUserId });
      let daysUsage, appDuration, listenDuration, streakCounts;
      if (userContent) {
        daysUsage = userContent.days_used;
        appDuration = Math.round(userContent?.app_durations / 60) || 0;
        listenDuration = Math.round(userContent?.listen_durations) || 0;
        streakCounts = userContent?.streak || 0;
      } else {
        daysUsage = 0;
        appDuration = 0;
        listenDuration = 0;
        streakCounts = 0;
      }

      const resObj = {
        journalCounts,
        daysUsage,
        appDuration,
        listenDuration,
        streakCounts
      };

      return Response.successResponseData(res, resObj, SUCCESS, res.__('userInsightSuccess'));
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  RipplesetMood: async (req, res) => {
    const obj = new RippleConversation({
      user_id: req.body.user_id,
      mood_id: `${req.body.mood_id}`
    });
    obj.save();

    // let existingMood = await ContentCounts.findOne({ user_id: req.authUserId });
    // let moods = [1, 2, 5, 7, 9];
    // if (existingMood) {
    //   if (moods.includes(existingMood.shuru_mood) && moods.includes(parseInt(req.body.moodid))) {
    //     await ContentCounts.updateOne({ user_id: req.authUserId }, {
    //       $set: {
    //         shuru_mood: req.body.moodid,
    //         shuru_mood_count: existingMood.shuru_mood_count + 1,
    //       }
    //     })
    //   }
    //   else {
    //     await ContentCounts.updateOne({ user_id: req.authUserId }, {
    //       $set: {
    //         shuru_mood: req.body.moodid,
    //         shuru_mood_count: 0,
    //       }
    //     })
    //   }
    // } else {
    //   let newContentCount = {
    //     user_id: req.authUserId,
    //     shuru_mood: req.body.moodid,
    //     shuru_mood_count: 0,
    //   }
    //   await ContentCounts.create(newContentCount);
    // }

    let msg = {
      6: {
        morning: {
          message1:
            "Good Morning. It's fantastic to hear that you're feeling happy! 😃 \n\nWhat's bringing you this joy today? I'd love to know! Let's carry that positive energy throughout the day and spread it like sunshine",
          message2:
            "Good Morning. It's truly wonderful to know that you're experiencing happiness! 😄 \n\nWhat's the source of this happiness today? I'm genuinely curious! Let's keep that positivity alive throughout the day, sharing its warmth with everyone around us.",
          message3:
            "Good Morning! It's a real joy to hear that happiness is flowing through you! 😄 \n\nWhat's the secret ingredient behind your happiness today? I'm genuinely intrigued! Let's ride this wave of positivity and share its radiance with others throughout the day"
        },
        afternoon: {
          message1:
            "Good Afternoon! 🌤️I hope your day has been as bright and joyful as your mood! It's so heartwarming to hear that you're feeling happy!\n\nIs there something special that's making your day great? Lets keep that wonderful energy going as you continue through the day ",
          message2:
            "Good Afternoon! 🌤️I trust your day is shining just as much as your mood! It's truly delightful to learn that you're carrying a sense of happiness!\n\n😄 Is there a particular reason behind this upbeat spirit today? Keep those positive vibes alive as you journey through the rest of your da",
          message3:
            "Good Afternoon! 🌤️I hope your day is as radiant as your mood! It's genuinely heartwarming to hear that happiness is lighting up your day!\n\n😄 What's the special spark behind your joyful spirit today? Let's harness that positivity and carry it with us as we continue on this journey through the afternoon."
        },
        evening: {
          message1:
            "Good Evening! 🌙As the day winds down, I'm thrilled to hear that you're feeling happy! 😊What a wonderfulway to wrap up the day!\n\nIs there something specific that brought a smile to your face? I'd love to hear about it",
          message2:
            "Good Evening! 🌙As the sun sets on the day, it's truly heartwarming to know that happiness is by your side! 😊 What a lovely note to end the day on!\n\nCould there be a special reason behind this joyful spirit? I'm here and eager to listen if you'd like to share. Let's embrace the positivity that's lighting up your evening",
          message3:
            "Good Evening! 🌙As the day winds down, it's a delight to know that happiness is accompanying you! 😊What a beautiful way to close the chapter of today!\n\nIs there something particular that has sparked this joyful feeling within you? I'm here to lend an listening ear.."
        },
        latenight: {
          message1:
            "Hey, I'm so glad you're feeling happy!\n\nBut as it's quite late, I hope everything's okay. I'd love to join you in your happiness, are you just here to enjoy a late-night chat, or is there something keeping you up?",
          message2:
            "Hey, I'm genuinely thrilled to hear that happiness is in the air for you!\n\nHowever, considering the late hour, I'm hoping all is well. Are you here for a late-night chat to share your happy mood, or is there something on your mind that's keeping you awake",
          message3:
            "Hey, it warms my heart to know that you feel happy! \n\nYet, with the clock ticking towards the late hours, I'm also concerned about your well-being. Is everything alright, or is there something that's nudging your thoughts awake at this time? Whether you're seeking a friendly conversation or simply sharing your joy, I'm here to listen and chat.Your happiness matters, and I hope you're taking care of yourself as the night unfolds."
        }
      },
      3: {
        morning: {
          message1:
            "Good morning! ☀️It's a pleasure to start the day with your contentment in mind. Your sense of contentment is truly wonderful!\n\n� Is there something specific that's contributing to your content mood today? I'd love to know more about what's bringing you this peaceful feeling? I'm here to make your morning even brighter! ",
          message2:
            "Good Morning! ☀️Welcoming the day with your contentment in mind is truly a delight.😊\n\nIs there a particular reason behind your content mood today? I'm here to listen and share in your positivity. Whether there's something exciting on your agenda or a thought you'd like to discuss, I'm all ears. Let's infuse your morning with an extra dose of positivity! Anything you'd like to share or chat about?",
          message3:
            "Good Morning! ☀️Starting the day with your contentment in focus is a wonderful way to embrace the morning. 😊 \n\nIs there a certain reason behind this tranquil mood today? I'm here to lend an ear and join you in celebrating these positive vibes. Let's ensure your morning is wrapped in positivity! Is there something you'd like to discuss or share? "
        },
        afternoon: {
          message1:
            "Good afternoon to you! It's so wonderful to hear that you're feeling content.\n\n☺ Are you feeling content because of something specific, or is it just one of those days where everything is going your way?",
          message2:
            "Good Afternoon! I hope this message finds you well. It's truly heartening to know that you're experiencing a sense of contentment. ☺️\n\ns there something in particular that's contributing to your content mood today, or are you simply enjoying a day filled with positivity?",
          message3:
            "Good Afternoon! It warms my heart to learn that you're embracing a feeling of contentment. ☺️ \n\nIs there a specific reason behind your content mood today, or are you relishing a day brimming with positivity?"
        },
        evening: {
          message1:
            "Good Evening, I'm glad you're feeling content. Are you just naturally feeling at peace, or is something specific contributing to this positive state of mind?",
          message2:
            "Good Evening! It's a pleasure to connect with you. I'm glad to hear that you're experiencing contentment. 😊 Are you just naturally feeling quite balanced or is there a specific reason behind your positive mindset today?",
          message3:
            "Good Evening! It's lovely to engage with you. I'm pleased to learn that you're embracing a feeling of contentment. 😊Tell me more about why you're feeling balanced? I'd love to hear..."
        },
        latenight: {
          message1:
            "Hey,. It's quite late, and I'm glad to hear that you're feeling content. 😃 \n\nHowever, considering the hour, I also want to make sure you're doing alright. If you're still up, is everything okay? Remember to take care of yourself, and if there's anything on your mind, I'm here to chat",
          message2:
            "Hey, As the night grows late, I'm heartened to know that you're experiencing contentment. 😊\n\nHow are you holding up at this hour? If you're still awake, I want to ensure everything is alright? Don't hesitate to share if anything is on your mind. Your well-being matters, and I'm here to lend an ear. ",
          message3:
            "Hey, as the night advances, it warms my heart to learn that you're feeling content. 😊\n\n How are you faring at this late hour? If you're still awake, I want to make sure everything is alright. If there's anything on your mind, please feel free to share"
        }
      },
      7: {
        morning: {
          message1:
            "Good Morning. I hope you're holding up okay. I noticed that you're feeling sad, and I want you to know that I'm here to listen and support you. It's okay to have days when you're not feeling your best.\n\nIf you're comfortable, would you like to share what's on your mind? Sometimes, expressing our feelings can help lighten the load.Remember, you don't have to go through this alone. Whether you want to talk about your feelings or just have a conversation, I'm here for you.",
          message2:
            "Good Morning. I hope you're holding up okay. I noticed that you're feeling sad, and I want you to know that I'm here to listen and support you. It's okay to have days when you're not feeling your best. 😔\n\nIf you're comfortable, would you like to share what's on your mind? Sometimes, expressing our feelings can help lighten the load. Remember, you don't have to go through this alone. Whether you want to talk about your feelings or just have a conversation, I'm here for you. 🌼 ",
          message3:
            "Good Morning. I hope you're doing alright. I've noticed that you're experiencing sadness, and I want you to know that I'm here to lend an empathetic ear and offer my support. It's completely okay to have days when you're not feeling your best. 😔 \n\nIf you're comfortable, would you mind sharing what's weighing on your mind? Sometimes, sharing our feelings can help alleviate some of the heaviness. Remember, you're not alone in this journey. Whether you'd like to delve into your emotions or simply have a chat, I'm here with no judgement �"
        },
        afternoon: {
          message1:
            " Good Afternoon. I'm sorry to hear that you're feeling sad. Your emotions are valid, and I'm here to listen and provide support. Sometimes, a caring conversation can help ease the weight of sadness.\n\nRemember, reaching out and talking about your feelings can be a step towards healing. Whether you want to discuss your emotions or simply chat about anything else, I'm here for you.",
          message2:
            "Good Afternoon. I'm sorry to earn that you're feeling sad. Your emotions are completely valid, and I'm here to lend an understanding ear and offer support. Often, a caring conversation can help lift some of the burden that comes with sadness. 🌼🌟\n\nIf you're open to it, you're welcome to share what's on your mind. It's important to remember that reaching out and talking about your feelings can be a step toward healing. Whether you're seeking to delve into your emotions or simply want to chat about anything at all, I'm here for you. Please take your time, and know that you're not alone in this. �",
          message3:
            "Good Afternoon. I'm here with an abundance of empathy now that I know that you're feeling sad. Your emotions are completely valid, and I want you to know that I'm here to provide a listening ear and support. Sometimes, a compassionate conversation can help lighten the weight of sadness. 🌼🌟\n\nIf you're open to it, you're more than welcome to share what's on your mind. It's important to recognize that reaching out and discussing your feelings can be a step toward finding relief. Whether you're looking to explore your emotions or simply wish to have a casual chat about anything, I'm here to be your companion. Take your time, and remember that you're not navigating this journey alone. 💙�"
        },
        evening: {
          message1:
            "Good Evening. I'm sorry to hear that you're feeling sad as the day comes to a close. Your emotions are important, and I'm here to provide a listening ear and support. Sometimes, sharing our feelings can help alleviate the burden of sadness.\n\nIf you're open to it, you can talk about what's on your mind. Remember, reaching out and discussing your feelings can be a step toward healing. Whether you want to delve into your emotions or just have a casual chat about anything, I'm here for you",
          message2:
            "Good Evening. It's with compassion that I acknowledge your feelings of sadness as the day winds down. Your emotions matter, and I'm here to lend an attentive ear and offer my support. Often, sharing our feelings can help lighten the load of sadness. 🌙😔\n\nIf you're comfortable, please feel free to open up about what's on your mind. �",
          message3:
            "Good Evening. I acknowledge your feelings of sadness as the day comes to a close. Your emotions hold significance, and I'm here to offer a listening ear and provide support. Sharing our feelings can often help ease the burden of sadness. 🌙😔\n\nIf you feel comfortable please feel free to open up about what's weighing on your mind?"
        },
        latenight: {
          message1:
            "Hey, I'm sorry to hear that you're feeling sad. It's okay to have moments of sadness, and I'm here to lend an understanding ear, even at this late hour.\n\nI'm a bit worried, though, as it's quite late. Is there something specific on your mind that's contributing to your sadness? If you're comfortable sharing, talking about it might help",
          message2:
            "Hey, I'm sorry to learn that you're feeling sad. It's natural to experience moments of sadness, and I'm here to offer a ,listening ear, even at this late hour. 🌙😔\n\n,I am, however, a bit concerned due to the late hour. Is there something specific on your mind that's contributing to your sadness? ,Sharing your thoughts might provide some relief. �",
          message3:
            "Hey, I'm sorry to hear that you're feeling sad. It's natural to have moments of sadness, and I'm here to provide a listening ear even during these late hours.🌙😔 \n\nHowever, I'm a bit concerned about the late hour. Is there something specific on your mind that's contributing to your sadness? Sharing your ,thoughts might provide some relief"
        }
      },
      8: {
        morning: {
          message1:
            "Good Morning! 🌄How delightful to hear that you're feeling surprised! 😲Life has a way of surprising us in the most wonderful ways.\n\nWhat's brought about this unexpected joy for you? Let's carry that positive energy throughout the day. If you'd like to share more or just have a chat, I'm here and ready to listen ",
          message2:
            "Good morning! 🌄How wonderful it is to learn that you're experiencing surprise! 😲Life has a charming way of catching us off guard with delightful moments.\n\nCould you tell me what has brought about this unexpected joy for you? Let's keep that positive energy alive as we journey through the day. Whether you're keen on sharing more about this or simply wish to have a chat, I'm here and eager to listen.",
          message3:
            "Good morning! 🌄How delightful to hear that you're feeling surprised! 😲Life has an enchanting way of bringing unexpected moments that truly brighten our day.\n\nWhat's the story behind this delightful surprise you're experiencing? Let's bask in the glow of this unexpected joy as we venture through the day. Whether you're eager to share more about it or simply want to have a conversation, I'm here and ready to listen..."
        },
        afternoon: {
          message1:
            "Good Afternoon! 🌤️How wonderful to hear that you're feeling surprised! 😲Life has a way of throwing in delightful twists, doesn't it? What's brought about this unexpected joy for you today? I'd love to hear more about it. Let's carry that positivity forward as we continue through the day.",
          message2:
            "Good afternoon! 🌤️How delightful it is to discover that you're embracing the feeling of surprise! 😲Life has a knack for weaving in these enchanting moments, doesn't it?\n\nCould you share what has led to this unexpected joy for you today? I'm genuinely interested in hearing more. Let's ride this wave of positivity and carry it forward as we journey through the rest of the day together",
          message3:
            "Good afternoon! 🌤️How wonderful to hear that you're feeling surprised! 😲Life has an incredible way of weaving in these magical moments, doesn't it?\n\nIs there a special reason behind this delightful surprise you're experiencing today? I'm genuinely curious and excited to learn more. If you'd like to share more about your surprise or simply want to chat, I'm here and eager to listen! "
        },
        evening: {
          message1:
            "Good Evening! How delightful it is to hear that you're feeling surprised! 😲Life has a way of bringing unexpected moments.\n\nhat's the story behind this unexpected joy you're experiencing? Let's bask in the glow of this surprise as we wind down for the evening. If you'd like to share more or simply have a chat, I'm here and eager to listen.",
          message2:
            "Good evening! How wonderful it is to discover that you're embracing the feeling of surprise! 😲Life has a way of weaving in these unexpected moments that light up our souls.\n\nould you please share the tale behind this unexpected joy you're encountering? Let's savor the warmth of this surprise as we prepare to unwind for the night. Whether you're inclined to share more or simply wish to chat, know that I'm here, ready to lend an ear.",
          message3:
            "Good evening! 🌆How delightful to hear that you're feeling surprised! 😲Life has this unique way of weaving in these unexpected moments that bring so much joy.\n\n Would you be willing to share the story behind this delightful surprise that's brightening your evening? Let's bask in the glow of this positivity as we wind down for the night..."
        },
        latenight: {
          message1:
            "Hey, How wonderful to hear that you're feeling surprised! 😲Even in these quiet hours, life can still manage to offer unexpected moments of joy. Tell me what's the tale behind this delightful surprise you're experiencing \n\nHowever, I must admit I'm a bit concerned as it's quite late (or early!). Are you doing okay staying up at this hour? While surprises are fantastic, your well-being is paramount. If you're able, consider getting some rest to recharge for the day ahead. But if you'd like to share your surprise or simply chat, I'm here and ready to listen",
          message2:
            "Hey, How wonderful it is to discover that you're embracing the feeling of surprise! 😲Even in these serene hours, life finds a way to gift us unexpected moments of joy.\n\nHowever, I must admit I'm a touch concerned about the late (or early!) hour. How are you managing to stay awake? While surprises are truly special, your well-being remains a priority. If possible, consider getting some rest to rejuvenate for the upcoming day. Still, if you're inclined to share your surprise or simply engage in a chat, I'm here, ready to listen and connect...",
          message3:
            "Hey, How wonderful it is to learn that you're embracing the feeling of surprise! 😲Even during these tranquil hours, life manages to gift us with unexpected moments of joy.\n\nCould you reveal the story behind this delightful surprise that's brought a spark to your night? I'm genuinely interested in hearing more.\n\nHowever, I must express a bit of concern regarding the late hour. How are you managing to stay awake? While surprises are truly special, your wellbeing remains a priority. If possible, consider getting some rest to rejuvenate for the upcoming day. Still, if you're inclined to share your surprise or simply engage in a chat, I'm here, ready to listen and connect. �"
        }
      },
      1: {
        morning: {
          message1:
            "Good Morning! I'm sorry to hear that you're feeling angry. It's okay to have moments of frustration, and I'm here to lend a listening ear and offer support. What's been causing this feeling for you? Sharing your thoughts can sometimes help ease the intensity. Remember, you're not alone in your emotions. If you'd like to discuss your anger or anything else on your mind to help lighten the weight of your feelings feel free to share...",
          message2:
            "Good morning! 🌄I'm here to acknowledge your feelings of anger, and I'm sorry to learn that you're experiencing this. It's perfectly okay to have moments of frustration, and I'm here to provide a caring ear and support. Often, expressing your thoughts can help alleviate it's intensity. What's been triggering this emotion for you?",
          message3:
            "Good morning! 🌄I'm here to acknowledge your feelings of anger, and I'm sorry to learn that you're experiencing this. It's completely natural to have moments of frustration, and I'm here to provide a listening ear and support. What's been causing this emotion for you? Sometimes, expressing your thoughts can help alleviate its intensity. Let's start the day with a conversation that might offer some relief and understanding. 🌟"
        },
        afternoon: {
          message1:
            "Good Afternoon! 🌤️I'm sorry to hear that you're feeling angry. It's okay to experience frustration, and I'm here to provide a listening ear and some understanding. What's been triggering this feeling for you today? Whether it's a recent event or an ongoing situation, sharing your thoughts can sometimes help release some of the tension...",
          message2:
            "Good afternoon! 🌤️I'm here to acknowledge that you're grappling with feelings of anger, and I'm sorry to hear that. It's natural to encounter moments of frustration. What's been the trigger for this emotion in your day? . Let's take a step together toward gaining clarity and working through the frustration...",
          message3:
            "Good afternoon! 🌤️I'm sorry to hear that you're feeling angry. It's natural to encounter moments of frustration, and I'm here to provide a sympathetic ear and understanding. What's been the trigger for this emotion in your day? Let's chat together toward gaining clarity and working through the frustration. 🌟�"
        },
        evening: {
          message1:
            "Good evening! I'm sorry to hear that you're feeling angry. It's completely okay to have moments of frustration,and I'm here to lend an empathetic ear and offer support. What's been causing this feeling for you as the day winds down? Sharing your thoughts can sometimes help alleviate the intensity.Let's end the day with a conversation that might help ease the weight of your frustration...",
          message2:
            "Good evening! It's absolutely normal to experience moments of frustration and anger and I'm here to offer an empathetic ear and provide support. What has been contributing to this emotion for you as the day comes to a close? Sharing your thoughts can sometimes offer relief from its intensity. I'm here and ready to listen, it might help lighten the load of your frustration...",
          message3:
            "Good evening! It's ok to feel angry at times and I'm here for you and provide support. What has been contributing to this emotion for you as the day comes to a close? Sharing your thoughts can sometimes offer relief from its intensity and I'm here to offer a safe space for conversation. Let's wrap up the day with a conversation that might help lighten the load of your frustration"
        },
        latenight: {
          message1:
            "Hey, I'm sorry to hear that you're feeling angry. Emotions can run high, especially during these quieter hours.What's been causing this feeling for you? Sharing your thoughts can sometimes help in processing the intensity. However, I'm also concerned about the late hour (or early morning!) as it's important to get some rest. Are you alright staying up at this time?",
          message2:
            "Hey, I'm sorry that you're experiancing anger. Emotions can definitely surge, especially during these more tranquil hours. 😔 What's at the root of this feeling for you? Expressing your thoughts can sometimes aid in understanding and processing its intensity.However, I must also express my concern about the late hour (or early morning!). How are you managing at this time?\n\nWhile delving into your emotions is essential, please remember that your well-being also holds great importance. If feasible, consider taking sometime to rest and recharge. �",
          message3:
            "Hey, I'm sorry to learn that you're grappling with anger. Emotions can definitely surge, especially during these more tranquil hours. 😔\n\nWhat's at the root of this feeling for you? Expressing your thoughts can sometimes aid in understanding and processing its intensity. However, I must also express my concern about the late hour (or early morning!). How are you managing at this time? "
        }
      },
      9: {
        morning: {
          message1:
            "Good Morning! I'm here to help you start the day, even if you're feeling tired. Mornings can sometimes be a bit challenging, especially when you're not as rested as you'd like to be. Is there anything specific that's been keeping you up or making you feel tired?",
          message2:
            "Good morning! I'm here to accompany you as you begin your day, even if you're experiencing tiredness. Mornings can prove to be a bit demanding, particularly when you're feeling restless.\n\nIs there a particular reason that's led to sleeplessness or tiredness for you?",
          message3:
            "Good morning! I'm sorry you're feeling tired at this time of the day. I want you to feel rejuvinated as you begin your day.Is there a specific reason that's led to sleeplessness or tiredness for you?"
        },
        afternoon: {
          message1:
            "Good Afternoon! 🌤️I hope your day is going well, even if you're feeling a bit tired. Afternoons can sometimes bring a dip in energy, especially when you're not as well-rested as you'd like to be. Is there anything specific that's contributing to your tiredness today? I'm here and ready to listen...",
          message2:
            "Good afternoon! 🌤️I hope your day is going well, even if you're feeling a tad tired. Afternoons can sometimes bring a dip in energy, especially when you're not as well-rested as you'd like to be.\n\nIs there anything specific that's contributing to your tiredness today? Remember, it's absolutely fine to take breaks and prioritize your well-being. If you'd like to chat about your tiredness or anything else on your mind, I'm here and ready to listen..",
          message3:
            "Good afternoon! ☀️ I trust you're having a splendid day, even if you're feeling a tad weary. Afternoons can occasionally bring a bit of a lull in vitality, particularly when you haven't quite had the rest you'd hoped for.\n\nIs there anything in particular contributing to your fatigue today? If you'd fancy a chat about it or anything else that's on your mind, I'm here and all ears..."
        },
        evening: {
          message1:
            "Good Evening! I hope you've had a productive day, even if you're feeling a bit tired. Evenings can bring a sense of weariness, especially when you've been busy. Is there something specific that's been contributing to your tiredness today? I'm here and ready to chat",
          message2:
            "Good evening! I trust your day has been productive, even if you're experiencing a touch of tiredness. Evenings often come with a sense of weariness, particularly after a busy day.\n\nIs there anything particular that's been adding to your tiredness today? I'm here, prepared to engage.",
          message3:
            "Good evening! I hope your day has been quite productive, even if you're feeling a hint of fatigue. Evenings often arrive with a touch of weariness, especially following a long day.\n\nIs there something specific that's been contributing to your tiredness today? If you'd like a conversation about your weariness or any other subject that's been on your mind, please know that I'm here and ready to chat"
        },
        latenight: {
          message1:
            "Hey, I hope you're doing alright, even if it's quite late. I hear that you're feeling tired, and that's completely understandable, especially at this hour. Is there something that's been keeping you up or making you feel tired?",
          message2:
            "Hey, I hope you're holding up, even at this late hour. I understand that you're experiencing tiredness, which is completely reasonable, especially given the time.\n\n Is there a specific reason contributing to your current state of tiredness? Lets chat and know that I'm here for you.",
          message3:
            "Hey, I trust you're holding up well, even in these late hours. I gather that you're grappling with tiredness, which is entirely understandable, especially at this hour.\n\n Is there something in particular that is keeping you up and away from sleep at this hour? let chat as I'm here and keen to listen..."
        }
      },
      2: {
        morning: {
          message1:
            "Good Morning! ☀️I'm here to start your day with support and understanding. I sense that you're experiencing some anxiety, and I want you to know that you're not alone in feeling this way. Sharing your thoughts can sometimes help in navigating through these feelings. Is there something specific that's been causing your anxiety this morning",
          message2:
            "Good Morning! ☀️I'm sorry to sense that you're experiencing some anxiety.\n\n Is there a particular factor that has given rise to your anxiety this morning? Sharing your thoughts can often ease your emotions..",
          message3:
            "Good Afternoon! 🌤️II'm sorry to hear that you are feeling anxious.\n\n I want to assure you that I'm here to offer an ear and understanding. Is there something specific that's been occupying your thoughts, contributing to your anxiety this afternoon? It's important to remember that you're not navigating these feelings alone, and sometimes sharing your thoughts can help ease the weight. What's on your mind?"
        },
        afternoon: {
          message1:
            "Good Afternoon! 🌤️I'm here to connect with you and provide a supportive space during your day. I see that you're feeling anxious, and I want you to know that I'm here to listen and offer understanding. Is there something specific that's been on your mind, contributing to your anxiety today? I'm here to chat whenever you're ready. Let's work together to find moments of peace in your da",
          message2:
            "Good Afternoon! 🌤️It seems that anxiety has found its way into your thoughts, and I want to reassure you that I'm here to provide an attentive ear and understanding.\n\n Is there a particular matter that's been occupying your thoughts, contributing to your afternoon anxiety? It's worth keeping in mind that you're not navigating these emotions alone, and sharing your thoughts can sometimes alleviate their weight. If you feel comfortable, lets chat...",
          message3:
            "Good Afternoon! 🌤️II'm sorry to hear that you are feeling anxious. I want to assure you that I'm here to offer an ear and understanding.\n\nIs there something specific that's been occupying your thoughts, contributing to your anxiety this afternoon? It's important to remember that you're not navigating these feelings alone, and sometimes sharing your thoughts can help ease the weight. What's on your mind?"
        },
        evening: {
          message1:
            "Good Evening! I'm here to support you as the day comes to a close. I've noticed that you're feeling anxious, and I want you to know that your feelings are valid. Is there something specific that's been causing your anxiety today? Remember,you're not alone in this. If you're comfortable sharing, I'm here to listen",
          message2:
            "Good Evening! I'm here to extend my support as the day winds down. I've picked up on your sense of anxiety, and I want to affirm the validity of your feelings.\n\nIs there a particular factor that's been contributing to your anxiety throughout the day? Your insights are valuable, and together, we can explore ways to alleviate those anxieties. ",
          message3:
            "Good Evening! I'm here to offer my support as the day draws to a close so if you feel comfortable lets discuss if you know why you're feeling anxious? \n\nIt's worth keeping in mind that you're not navigating these emotions alone. Your insights are important, and together, we can explore ways to alleviate those anxieties. "
        },
        latenight: {
          message1:
            "Hey, I'm sorry to hear that you're feeling anxious \n\n I'm glad you reached out to talk about what you're going through. Before we continue, I'd like to express my support for you during this time. Let's discuss what's on your mind. Okay?",
          message2:
            "Hey, I'm genuinely sorry to hear that you're experiencing feelings that are causing anxiety.\n\nBefore delving into deeper topics, I'd like to assure you that I'm here to support you. How about we focus on addressing your thoughts and concerns? Are you comfortable with that?",
          message3:
            "Hey, I'm really sorry to hear that you're struggling with feelings of anxiety. 😔\n\n I just want you to know that I'm here to help and listen. How about we talk about what's on your mind? Are you up for that?"
        }
      },
      5: {
        morning: {
          message1:
            "Good Morning! ☀️ I'm sorry to hear that you are feeling stressed, I'm here to chat. Remember, expressing your feelings can sometimes make them a bit more manageable. Whether you're looking for a distraction or someone to listen, I'm here for you. What is stressing you?",
          message2:
            "Good Morning! ☀️I'm sorry to sense that you're experiencing some stress.\n\nIs there a particular factor that is triggering your stress levels? Sharing your thoughts can often ease your emotions & I'm here for you to chat",
          message3:
            "Good Morning! ☀️ I'm sorry your day isn't starting off as smoothly as you would like. I'm here to have a chat, and it seems that you are feeling stressed. I'm here to provide support. Let's take the day step by step, tackling each challenge as it comes. Tell me what is making you feel this way"
        },
        afternoon: {
          message1:
            "Good Afternoon! 🌤️I've noticed that you're feeling stressed, and I want you to know that it's okay. Your feelings are valid, and you're not alone in this. Is there something specific that's causing your stress levels to peak today? Talking about it can sometimes help in easing its grip. I'm here to help..",
          message2:
            "Good afternoon! 🌤️I've observed that you're experiencing feelings of stress, and I want to reassure you that this is entirely acceptable. Life can be stressful at times. Lets chat to see if we can relieve any pressure thats occuring",
          message3:
            "Good Afternoon! 🌤️I've noticed that you're grappling with feelings of stress, and I want to assure you that this can be completely normal. Your emotions are important, and you're certainly not alone in experiencing this sensation. Is there a specific factor that's triggering your stress today?"
        },
        evening: {
          message1:
            "Good Evening! It's okay to experience stress, especially as the day comes to a close. If you're open to it, can you share with me what may of caused you to feeling stressed? Sometimes, talking about it can help to alleviate your worries",
          message2:
            "Good evening! I've observed that you're grappling with feelings of stress, and I'm here to affirm that your emotions hold significance. It's absolutely acceptable to feel this way as the day winds down. I'm here to support you in any way. What's making you feeling overwhelmed?",
          message3:
            "Good Evening! I've noticed that you're dealing with feelings of stress and you shouldn't go through this alone. It's entirely normal to come across stress, especially as the day draws to a close. If you're open to it, feel free to share what's causing your stress levels to peak?Good Morning,! ☀️ I'm sorry your day isn't starting off as smoothly as you would like. I'm here to have a chat, and it seems that you are feeling stressed. I'm here to provide support. Let's take the day step by step, tackling each challenge as it comes. Tell me what is making you feel this way?"
        },
        latenight: {
          message1:
            "Hey, I'm sorry to hear that you're feeling stressed. I'm here for you, even in the late hours. It's completely okay to have these emotions, and I appreciate you reaching out If there's anything specific on your mind that's causing you to feel stressed, feel free to share with me. I am here for you...",
          message2:
            "Hey, I'm sorry to learn that you're grappling with feelings of stress. I want you to know that I'm here for you, even during the later hours. It's entirely natural to experience such emotions, and I commend you for reaching out. 🌙\n\n Do you have an idea as to what may be causing your stress?",
          message3:
            "Hey, I'm sorry to hear that you're contending with feelings of stress. I want you to understand that I'm here to provide support,even as the hours grow later. Experiencing such emotions is entirely natural, and I applaud your courage for reaching out. 🌙\n\n If there's a particular concern that's contributing to your stress, please feel free to share it with me..."
        }
      },
      4: {
        morning: {
          message1:
            "Good Morning! ☀️It's fantastic to start the day off on an excited note! 😄I can sense your enthusiasm, and that's truly infectious. What's making you so excited today? Whether it's a new opportunity, a special plan, or simply the joy of a new morning, I'd love to know more...",
          message2:
            "Good morning! ☀️What a delightful way to begin the day, with your excitement lighting up the morning! 😄Your enthusiasm is truly contagious, and I'm thrilled to be a part of it. What's igniting this spark of excitement within you today? Let's embark on this day together with your positivity leading the way.",
          message3:
            "Good Morning! ☀️What a wonderful start to the day, with your excitement infusing the morning with brightness! 😄Your enthusiasm is truly infectious, and I'm genuinely excited to be part of the experience. What's fueling this surge of excitement within you today?"
        },
        afternoon: {
          message1:
            "Good Afternoon! 🌤️Your excitement is absolutely contagious, and I'm here to share in your positive energy!😄Whether it's a thrilling achievement, a new discovery, or something unexpected, I'd love to hear more about it. What's bringing all this enthusiasm into your day? ",
          message2:
            "Good afternoon! 🌤️Your enthusiasm is truly infectious, and it's a joy to join you in embracing this positive vibe!😄What's behind this surge of excitement that's lighting up your day?",
          message3:
            "Good Afternoon! 🌤️I am here for your enthusiasm!😄What's driving this wave of excitement that's adding a glow to your day? Is there a certain subject or upcoming event that's lighting you up, or perhaps there's something you'd like to talk about? "
        },
        evening: {
          message1:
            "Good Evening! Your excitement is shining through, and I'm thrilled to be part of your evening! 😄What's lighting up your day with such positivity? I'm here to listen whenever you're ready to chat!",
          message2:
            "Good evening! Your excitement is radiating, and it's wonderful to connect with your positive spirit! 😄What's sparking this enthusiasm in your day?",
          message3:
            "Good Evening! Your excitement is truly shining through,and I'm here for your optimistic energy! 😄What's setting off this wave of enthusiasm in your day?"
        },
        latenight: {
          message1:
            "Hey, It's great to hear that you're feeling excited! 😄I'm here to share in your enthusiasm,  even though it's quitelate. Tell me what's lifting your mood?",
          message2:
            "Hey! 😄I'm delighted to know you're embracing excitement!  Even though it's getting late, I'm here to be part of your enthusiasm.\n\nI also want to make sure everything's alright with you. Staying up late is exciting, but taking care of yourself and getting enough rest is equally important. Are you managing to strike a balance between your excitement and your well-being?",
          message3:
            "Hey! 😄I'm thrilled to hear that you're wholeheartedly embracing excitement! Despite the late hour, I'm here to share in your enthusiasm, tell me whats caused this excitement?\n\n I also want to make sure you're doing well. Staying up late can indeed be invigorating, yet we need to make sure you're taking care of yourself and getting ample rest is just as crucial. Are you finding a way to maintain a balance between your excitement and your well-being?"
        }
      }
    };

    function getRandomMessage(moodId, timing, userName) {
      if (msg[moodId] && msg[moodId][timing.toLowerCase()]) {
        const messages = msg[moodId][timing.toLowerCase()];
        const length = Object.keys(messages).length;
        const randomIndex = Math.floor(Math.random() * length);
        return messages['message' + (randomIndex + 1)].replaceAll('CUSTOMERNAME', userName);
      }
    }

    const finalResponse = getRandomMessage(req.body.mood_id, req.body.time, req.body.user_id);
    res.status(200).send({ data: finalResponse });
  },

  RipplegetMood: (req, res) => {
    let data = [
      {
        id: '1',
        name: 'angry'
      },
      {
        id: '2',
        name: 'anxious'
      },
      {
        id: '3',
        name: 'content'
      },
      {
        id: '4',
        name: 'excited'
      },
      {
        id: '5',
        name: 'stress'
      },
      {
        id: '6',
        name: 'happy'
      },
      {
        id: '7',
        name: 'sad'
      },
      {
        id: '8',
        name: 'surprised'
      },
      {
        id: '9',
        name: 'tired'
      },
      {
        id: '10',
        name: 'calm'
      },
      {
        id: '11',
        name: 'need_support'
      },
      {
        id: '12',
        name: 'demotivated'
      },
      {
        id: '13',
        name: 'motivated'
      },
      {
        id: '14',
        name: 'low'
      },
      {
        id: '15',
        name: 'i_can_manage'
      },
      {
        id: '16',
        name: 'helpless'
      },
      {
        id: '17',
        name: 'tired'
      },
      // {
      //   "id": "18",
      //   "name": "stressed"
      // },
      {
        id: '18',
        name: 'balanced'
      },
      {
        id: '19',
        name: 'energised'
      }
    ];
    res.status(200).send({ data: data });
  },

  RipplegetMoodRecord: async (req, res) => {
    try {
      const { start_date, end_date, limit, page_number } = req.query;
      const userId = req.authUserId;
      const pageNumber = parseInt(page_number) || 1;
      const limitNumber = parseInt(limit) || 10;
      const skip = (pageNumber - 1) * limitNumber;

      let start = new Date(start_date);
      const numberOfDaysToAdd = 1;
      let end = new Date(end_date);
      end.setDate(end.getDate() + numberOfDaysToAdd);

      const length = await Conversation.find({
        $and: [
          { userId },
          { createdAt: { $gte: start, $lte: end } },
          { message: { $exists: false } }
        ]
      }).countDocuments();

      const record = await Conversation.find({
        $and: [
          { userId },
          { createdAt: { $gte: start, $lte: end } },
          { message: { $exists: false } }
        ]
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber);

      let obj = {
        page: pageNumber,
        limit: limitNumber,
        length: length,
        paginatedResult: record
      };

      res.status(200).send({
        data: obj
      });
    } catch (error) {
      res.status(500).send({ message: error.message });
    }
  },

  RipplegetUserMood: async (req, res) => {
    const startDate = new Date(req.query.start_date);
    const endDate = new Date(req.query.end_date);

    const start = new Date(startDate);
    const numberOfDaysToAdd = 1;
    const end = new Date(endDate);
    end.setDate(end.getDate() + numberOfDaysToAdd);

    const result = await Conversation.aggregate([
      {
        $match: {
          userId: req.authUserId,
          message: { $exists: false },
          to: { $exists: false },
          createdAt: {
            $gte: start,
            $lte: end
          }
        }
      },
      {
        $group: {
          _id: '$moodId',
          totalCount: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: null,
          moodData: {
            $push: {
              moodId: '$_id',
              count: '$totalCount'
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          moodData: {
            $map: {
              input: '$moodData',
              as: 'item',
              in: {
                moodId: '$$item.moodId',
                roundedPercentage: {
                  $add: [
                    {
                      $cond: [
                        {
                          $gt: [
                            {
                              $mod: [
                                {
                                  $multiply: [
                                    100,
                                    { $divide: ['$$item.count', { $sum: '$moodData.count' }] }
                                  ]
                                },
                                1
                              ]
                            },
                            0.5
                          ]
                        },
                        1,
                        0
                      ]
                    },
                    {
                      $floor: {
                        $multiply: [{ $divide: ['$$item.count', { $sum: '$moodData.count' }] }, 100]
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      }
    ]);
    if (typeof result[0] !== 'undefined') {
      res.status(200).send({ data: result[0] });
    } else {
      res.status(200).send({ data: {} });
    }
  },
  RippleUser: async (req, res) => {
    try {
      let userId = `guest${makeRandomString(2)}${Math.floor(Math.random() * 123456789)}${makeRandomString(2)}`;
      let code = 1;
      const rippleUser = await RippleUser.findOne({ anon_id: userId }).lean();
      if (rippleUser) {
        if (rippleUser.session_complete === true) {
          code = 0;
          let response = {
            message: 'Session is completed',
            code: 0
          };
          return res.send(response);
        } else {
          rippleUser.code = 0;
          return res.send(rippleUser);
        }
      } else {
        code = 1;
        userId = `guest${makeRandomString(2)}${Math.floor(Math.random() * 123456789)}${makeRandomString(2)}`;
        await RippleUser.create({
          anon_id: userId,
          session_start: new Date()
        });
      }

      let response = {
        code,
        userId
      };

      return res.send(response);
    } catch (error) {
      console.error('Error:', error);
      res.status(500).send({ error: 'An error occurred' });
    }
  },

  RippleAddUser: async (req, res) => {
    try {
      let reqParam = req.body;
      let code = 1;
      if (!reqParam.email) {
        code = 0;
        let message = 'Kindly provide email address';
        return res.send({ code, message });
      }

      let user = await Users.findOne({ email: reqParam.email, deletedAt: null });
      if (!user) {
        let trialStart = new Date();
        let trialEndAt = new Date(trialStart);
        trialEndAt.setDate(trialStart.getDate() + 30);
        const atIndex = reqParam.email.indexOf('@');
        const name = reqParam.email.slice(0, atIndex);
        let password = makeRandomDigit(2) + makeRandomString(5) + makeRandomDigit(4);
        const hashPassword = await generatePassword(password);

        let payload = {
          name,
          password: hashPassword,
          email: reqParam.email,
          account_type: ACCOUNT_TYPE.IS_UNDER_TRIAL,
          user_type: USER_TYPE.USER,
          is_under_trial: true,
          trial_starts_from: trialStart,
          trial_ends_at: trialEndAt,
          user_added_by: 'ripple'
        };

        await Users.create(payload);
        if (reqParam.anonId) {
          await RippleUser.updateOne(
            { anon_id: reqParam.anonId },
            {
              $set: {
                email: reqParam.email,
                trial_activated: true
              }
            }
          );
        }
        const locals = {
          name: name,
          email: reqParam.email,
          password: password,
          subject: 'Welcome to Shoorah'
        };
        await sendRipplePassword(reqParam.email, locals);
        let message = 'Check your email for the gift received from shoorah.';

        let response = {
          code,
          message
        };

        return res.send(response);
      } else {
        code = 2;
        let message = 'Email already exist.';
        return res.send({ code, message });
      }
    } catch (error) {
      console.error('Error:', error);
      res.status(500).send({ error: 'An error occurred' });
    }
  }
};
