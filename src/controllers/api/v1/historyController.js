'use strict';

const { Conversation } = require('@models');
const axios = require('axios');
const OpenAI = require('openai');
const Response = require('@services/Response');

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
  SHURU_REPORT_POSITIVE_MESSGE,
  SHURU_REPORT_NEGATIVE_MESSGE,
  SHURU_REPORT_NEUTRAL_MESSAGE
} = require('../../../services/Constant');
const {
  currentDateOnly,
  toObjectId,
  convertObjectKeysToCamelCase,
  calculatePercentage
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
  RecentlyPlayed
} = require('../../../models');
const {
  updateBadges,
  sendBadgeNotification
} = require('../../../services/userServices/badgeServices');
const moment = require('moment');
const { historyDataValidation } = require('@root/src/services/userValidations/historyValidations');
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

async function analyzeSentiment(text) {
  try {
    const systemMessage = {
      role: 'system',
      content: 'Please analyze the sentiment of the following text:'
    };

    const userMessage = {
      role: 'user',
      content: text
    };
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo', // Choose the Davinci model for sentiment analysis
      temperature: 0,
      messages: [systemMessage, userMessage],
      stop: ['\n'] // Stop generation after the first line break
    });

    const sentiment = response?.choices[0]?.message?.content.toLowerCase().trim();
    // Convert sentiment to boolean
    const isPositive = sentiment.toLowerCase().includes('positive') ? true : false;
    // Return the sentiment as boolean
    return isPositive;
  } catch (error) {
    console.error('Error analyzing sentiment:', error);
    return null;
  }
}

module.exports = {
  setAppUsage,
  analyzeSentiment,
  /**
   * @description This function is used for finding session wise chat
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  getSession: async (req, res) => {
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
  chatSession: async (req, res) => {
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
  timeSpent: async (req, res) => {
    const { limit, page_number } = req.query;
    const PAGE_SIZE = parseInt(limit) || 10; // Number of documents per page
    const PAGE_NUMBER = parseInt(page_number) || 1; // Page number (1-based index)

    let startDate = new Date(req.query.start_date);
    startDate.setHours(0, 0, 0, 0);

    let endDate = new Date(req.query.end_date);
    endDate.setHours(23, 59, 59, 999);


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
          lastMessage: { $last: '$message' },
          sessionStartId: { $first: '$_id' },
          sessionStart: { $first: '$createdAt' },
          nextSessionStartId: { $last: '$_id' },
          lastMessageCreatedAt: { $last: '$createdAt' },
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
            $divide: [
              {
                $subtract: ['$nextSessionStart', '$sessionStart']
              },
              3600000
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

    const timeSpentTest = await Conversation.aggregate([
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
        $sort: {
          createdAt: 1 // Sort documents by createdAt in ascending order
        }
      },
      {
        $lookup: {
          from: "conversations", // Collection name
          let: { currChatId: "$createdAt" },
          pipeline: [
            {
              $match: {
                userId: req.authUserId,
                // isSessionStart: false,
                // to: 'BOT',
                createdAt: { $lte: "$createdAt" }
              }
            },
            { $sort: { createdAt: -1 } }, // Sort in descending order to get the latest document
            { $limit: 1 } // Limit to only one document, the previous one
          ],
          as: "prevDoc"
        }
      },
      {
        $unwind: {
          path: "$prevDoc",
          preserveNullAndEmptyArrays: true // Preserve documents even if there is no previous document
        }
      }
    ]);

    for await (const chat of timeSpentTest) {
      // let prevDoc=await Conversation.find(before chat id);
      const prevDoc = chat.prevDoc;
      // Do something with prevDoc
      console.log('Previous Document:', prevDoc);
    }
    console.log({ data: timeSpentTest })

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
            $divide: [
              {
                $subtract: ['$nextSessionStart', '$sessionStart']
              },
              3600000
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
  askMe: async (req, res) => {
    const userId = req.authUserId;
    let formattedHistory = [];
    const chatHistoryCnt = 20;
    if (!req.body.isSessionStart) {
      const lastSessionId = await Conversation.findOne({ userId, isSessionStart: true }).sort({
        _id: -1
      });
      const history = await Conversation.find({
        userId,
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
        const getEdges = await Conversation.find({
          $and: [
            { userId: req.authUserId },
            { isSessionStart: true },
            { moodId: { $exists: false } },
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
              { userId: userId },
              { moodId: { $exists: false } },
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
    let analyzeRes = await analyzeSentiment(req.body.message);
    const obj = new Conversation({
      userId: req.authUserId,
      message: req.body.message,
      positivity: analyzeRes ? analyzeRes : analyzeRes,
      to: req.body.to.toUpperCase(),
      isSessionStart: req.body.isSessionStart
    });

    obj.save();
    let botAnswer = '';
    const url = 'http://13.51.222.131/ask';
    const data = {
      query: req.body.message,
      username: req.authName,
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

      let analyzeResponse = await analyzeSentiment(req.body.message);

      const obj2 = new Conversation({
        userId: req.authUserId,
        message: botAnswer,
        to: 'USER',
        isSessionStart: false,
        positivity: analyzeResponse ? analyzeResponse : analyzeResponse,
        sentiments,
      });
      await obj2.save();
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
  getHistory: async (req, res) => {
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

  openai: async (req, res) => {
    try {
      const { avgPositive, avgNegative, oldSolution, businessType, filters, breathwork, solutionType } =
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
      }

      if (solutionType == 4) {
        let prependText = '';
        let countryText = '';
        let ethnicityText = '';
        let genderText = '';
        let emotionText = '';
        let ageGroupText = '';

        if (breathwork.sessions >= 1 && breathwork.sessions <= 20) {
          prependText =
            'Your employees Breathwork sessions has recorded a Very Poor score which indicates a substantial need for improvement or a complete reevaluation of the situation to rectify the underlying issues and move towards a more satisfactory or successful outcome. Check out our Shoorah Breathwork solutions to help you move forward from here.';
        } else if (breathwork.sessions >= 21 && breathwork.sessions <= 40) {
          prependText =
            'Your employees Breathwork sessions has recorded a Poor score which signifies that there are significant issues or drawbacks that detract from the overall quality or satisfaction. This rating suggests that improvements are needed to raise the level of performance or experience to a more acceptable standard within your workplace. Visit Shoorah’s Breathwork sessions solutions to help you make the necessary improvements going forwards';
        } else if (breathwork.sessions >= 41 && breathwork.sessions <= 60) {
          prependText =
            'Your employees Breathwork sessions recorded an Average rating, which represents a neutral position, suggesting that you are meeting basic expectations without surpassing them. There is still much room for improvement so check out Shoorah’s Breathwork sessions solutions to begin implementing actions that will help improve this score.';
        } else if (breathwork.sessions >= 61 && breathwork.sessions <= 80) {
          prependText =
            'Your employees Breathwork sessions has recorded a Good rating which represents a strong performance that has exceeded expectations and is highly satisfactory. While there might be slight room for improvement, this rating reflects a level of quality that is indicative of a strong effort and a job well done. For a continued focus on constantly learning and improving, visit our Shoorah Breathwork sessions solutions to learn how to keep building from here.';
        } else if (breathwork.sessions >= 81 && breathwork.sessions <= 100) {
          prependText =
            'Your employees Breathwork sessions has recorded a Very Good rating. This represents an exceptionally high level of excellence and signifies a level of performance or quality that is truly outstanding and that sets a high very standard. Visit our Shoorah Breathwork sessions solutions for ideas on how to maintain this rating into the future.';
        }
        const systemMessage = {
          role: 'system',
          content: 'You are a helpful assistant.'
        };

        const userMessage = {
          role: 'user',
          content: `BREATHWORK SESSIONS IS ${breathwork.sessions}. 
          Previous solution used by company owner that did not work is as follows: "${oldSolution}".
          How can we give a solution to the company owners to help them with this overcome situation and help their company employees to do breathwork sessions more often?`
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


      else {
        return Response.successResponseWithoutData(res, res.__('wrongSolutionType'), FAIL);
      }
    } catch (error) {
      console.log(error);
      return Response.internalServerErrorResponse(res);
    }
  },

  downloadShuruReport: (req, res) => {
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
          let positiveCounts = 0;
          let negativeCounts = 0;
          let totalCounts = 0;


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
                if ([1, 2, 5, 7, 9].includes(parseInt(correspondingMood.id))) {
                  negativeCounts += i.moodCount;
                  totalCounts += i.moodCount;
                } else {
                  positiveCounts += i.moodCount;
                  totalCounts += i.moodCount;
                }
              }
            });

            let overallPercentage = 0;
            const positivePercentage = calculatePercentage(positiveCounts, totalCounts);
            const negativePercentage = calculatePercentage(negativeCounts, totalCounts);

            let finalIcon = process.env.PDF_HAPPY_ICON;
            let color = 'green';

            if (positivePercentage > negativePercentage) {
              overallPercentage = positivePercentage;
              finalIcon = process.env.PDF_HAPPY_ICON;
              color = 'green';


            } else if (positivePercentage < negativePercentage) {
              overallPercentage = negativePercentage;
              finalIcon = process.env.PDF_SAD_ICON;
              color = 'red';


            } else {
              overallPercentage = positivePercentage;
              finalIcon = process.env.PDF_NEUTRAL_ICON;
              color = 'blue';

            }



            const locals = {
              name: req.authName,
              moods,
              overallPercentage,
              color,
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
              finalIcon: finalIcon,
              finalIconText: '',
              finalMessage:
                SHURU_REPORT_MESSAGES[Math.floor(Math.random() * SHURU_REPORT_MESSAGES.length)]
            };

            switch (true) {
              case positivePercentage > negativePercentage:
                locals.finalIconText = 'Positive';
                switch (true) {
                  case positivePercentage < 30:
                    locals.finalMessage = SHURU_REPORT_POSITIVE_MESSGE.LESS_THEN_30;
                    break;
                  case positivePercentage >= 30 && positivePercentage < 60:
                    locals.finalMessage = SHURU_REPORT_POSITIVE_MESSGE.THIRTY_TO_SIXTY;
                    break;
                  case positivePercentage >= 60:
                    locals.finalMessage = SHURU_REPORT_POSITIVE_MESSGE.SIXTY_TO_100;
                    break;
                }
                break;
              case positivePercentage < negativePercentage:
                locals.finalIconText = 'Negative';
                switch (true) {
                  case negativePercentage < 30:
                    locals.finalMessage = SHURU_REPORT_NEGATIVE_MESSGE.LESS_THEN_30;
                    break;
                  case negativePercentage >= 30 && negativePercentage < 70:
                    locals.finalMessage = SHURU_REPORT_NEGATIVE_MESSGE.THIRTY_TO_SEVENTY;
                    break;
                  case negativePercentage >= 70 && negativePercentage < 90:
                    locals.finalMessage = SHURU_REPORT_NEGATIVE_MESSGE.SEVENTY_TO_90;
                    break;
                  case negativePercentage >= 90:
                    locals.finalMessage = SHURU_REPORT_NEGATIVE_MESSGE.MORE_THEN_NINETY;
                    break;
                }
                break;
              case positivePercentage === negativePercentage:
                locals.finalIconText = 'Neutral';
                locals.finalMessage = SHURU_REPORT_NEUTRAL_MESSAGE;
                break;
            }

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

  getShuruFeedback: async (req, res) => {
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

  getHistoryDates: async (req, res) => {
    try {
      const userId = req.authUserId;
      let filterCondition = {
        user_id: toObjectId(req.authUserId),
        deletedAt: null,
      };
      let cleanseFilterCondition = {
        user_id: toObjectId(req.authUserId),
      };

      const cleanseDates = await Cleanse.find(cleanseFilterCondition).sort();
      const gratitudeDates = await UserGratitude.find(filterCondition).sort();
      const affirmationDates = await UserAffirmation.find(filterCondition).sort();
      const notesDates = await UserNotes.find(filterCondition).sort();
      const goalsDates = await Goals.find(filterCondition).sort();
      const restoreDates = await RecentlyPlayed.find(filterCondition).sort();
      const chatDates = await Conversation.find({
        userId: req.authUserId.toString(),
      }).sort();

      let historyDates;
      let cleanses = cleanseDates.map((i) => new Date(i.createdAt).toISOString().split('T')[0]);
      let gratitudes = gratitudeDates.map((i) => new Date(i.createdAt).toISOString().split('T')[0]);
      let affirmations = affirmationDates.map((i) => new Date(i.createdAt).toISOString().split('T')[0]);
      let notes = notesDates.map((i) => new Date(i.createdAt).toISOString().split('T')[0]);
      let goals = goalsDates.map((i) => new Date(i.createdAt).toISOString().split('T')[0]);
      let restores = restoreDates.map((i) => new Date(i.createdAt).toISOString().split('T')[0]);
      let chats = chatDates.map((i) => new Date(i.createdAt).toISOString().split('T')[0]);

      historyDates = [...new Set(cleanses, gratitudes, affirmations, notes, goals, restores, chats)];
      return Response.successResponseData(
        res,
        historyDates,
        SUCCESS,
        res.__('getHistoryDatesSuccess')
      );
    } catch (err) {
      console.log(err)
      return Response.internalServerErrorResponse(res);
    }
  },

  addEditTimeSpent: async (req, res) => {
    try {
      const reqParam = req.body;
      // app duration update
      const currentDate = new Date();

      if (reqParam.type == 1) {

        const userUsage = await Usage.findOne({
          user_id: req.authUserId,
          createdAt: {
            $gte: moment(currentDate).startOf('day').toDate(),
            $lt: moment(currentDate).endOf('day').toDate()
          }
        });

        if (userUsage) {
          await Usage.updateOne(
            {
              _id: userUsage._id
            },
            { $inc: { app_durations: reqParam.duration } }
          );
          await ContentCounts.updateOne(
            { user_id: req.authUserId },
            { $inc: { app_durations: reqParam.duration } }
          );
        } else {
          await Usage.create({
            user_id: req.authUserId,
            app_durations: reqParam.duration
          });
        }

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
      console.log(err)
      return Response.internalServerErrorResponse(res);
    }
  },

  getInsights: async (req, res) => {
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

  getHistories: (req, res) => {
    try {
      const reqParam = req.query;
      historyDataValidation(reqParam, res, async (validate) => {
        if (validate) {
          const pageNumber = parseInt(req.query.page_number) || 1;
          const limitNumber = parseInt(req.query.limit) || 10;
          let startDate = currentDateOnly();
          let endDate = currentDateOnly();
          endDate.setDate(endDate.getDate() + 1);

          const monthInterval = parseInt(reqParam.monthInterval) || 1 ;
          const yearInterval = parseInt(reqParam.yearInterval) || 1 ;

          switch (parseInt(reqParam.reportType)) {
            case 1:
              startDate.setDate(startDate.getDate() - 1);
              break;
            case 2:
              startDate.setDate(startDate.getDate() - 30 * monthInterval );
              break;
            case 3:
              startDate.setDate(startDate.getDate() - 365 * yearInterval);
              break;
            case 4:
              if (reqParam.fromDate) {
                startDate = new Date(reqParam.fromDate);
              }
              if (reqParam.toDate) {
                endDate = new Date(reqParam.toDate);
              }

              break;
            default:
              throw new Error('Invalid report type');
          }

          let filterCondition = {
            user_id: toObjectId(req.authUserId),
            deletedAt: null,
            createdAt: { $gte: startDate, $lt: endDate }
          };

          let cleanseFilterCondition = {
            user_id: toObjectId(req.authUserId),
            createdAt: { $gte: startDate, $lt: endDate }
          };

          let meditations = [], sleeps = [], pods = [], breathworks = [], cleanses = [], goals = [], chats = [], notes = [], affirmations = [], gratitudes = [], paginateArr = [];
          let resObj;
          switch (parseInt(reqParam.contentType)) {
            case CONTENT_TYPE.MEDITATION:
              meditations = await RecentlyPlayed.aggregate([
                {
                  $match: {
                    user_id: toObjectId(req.authUserId),
                    deletedAt: null,
                    createdAt: { $gte: startDate, $lt: endDate },
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
                          createdAt:1,
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
                  $group: {
                    _id: '$content.contentId',  // Group by contentId to remove duplicates
                    content: { $first: '$content' }  // Keep the first occurrence of each content
                  }
                },
                {
                  $project: {
                    contentId: '$content.contentId',
                    contentType: '$content.content_type',
                    title: '$content.contentName',
                    imageUrl: '$content.imageUrl',
                    duration: '$content.duration',
                    createdAt:'$content.createdAt',
                    updatedAt:'$content.updatedAt'
                  }
                }
              ]);
              resObj={
                meditations
              }
              break;

            case CONTENT_TYPE.SOUND:
              sleeps = await RecentlyPlayed.aggregate([
                {
                  $match: {
                    user_id: toObjectId(req.authUserId),
                    deletedAt: null,
                    createdAt: { $gte: startDate, $lt: endDate },
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
                          createdAt:1,
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
                  $group: {
                    _id: '$content.contentId',  // Group by contentId to remove duplicates
                    content: { $first: '$content' }  // Keep the first occurrence of each content
                  }
                },
                {
                  $project: {
                    contentId: '$content.contentId',
                    title: '$content.contentName',
                    imageUrl: '$content.imageUrl',
                    duration: '$content.duration',
                    createdAt:'$content.createdAt',
                    updatedAt:'$content.updatedAt'
                  }
                }
              ]);
              resObj={
                sleeps
              }
              break;

            case CONTENT_TYPE.BREATHWORK:
              breathworks = await RecentlyPlayed.aggregate([
                {
                  $match: {
                    user_id: toObjectId(req.authUserId),
                    deletedAt: null,
                    createdAt: { $gte: startDate, $lt: endDate },
                    content_type: CONTENT_TYPE.BREATHWORK
                  }
                },
                {
                  $lookup: {
                    from: 'breathworks',
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
                          createdAt:1,
                          contentId: '$_id',
                          contentName: '$display_name',
                          _id: 0,
                          content_type: 1,
                          contentType: 11,
                          duration: 1,
                          imageUrl: {
                            $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.BREATHWORK_IMAGE, '/', '$breathwork_image']
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
                  $group: {
                    _id: '$content.contentId',  // Group by contentId to remove duplicates
                    content: { $first: '$content' }  // Keep the first occurrence of each content
                  }
                },
                {
                  $project: {
                    contentId: '$content.contentId',
                    title: '$content.contentName',
                    imageUrl: '$content.imageUrl',
                    duration: '$content.duration',
                    createdAt:'$content.createdAt',
                    updatedAt:'$content.updatedAt'
                  }
                }
              ]);
              resObj={
                breathworks
              }
              break;

            case CONTENT_TYPE.SHOORAH_PODS:
              pods = await RecentlyPlayed.aggregate([
                {
                  $match: {
                    user_id: toObjectId(req.authUserId),
                    deletedAt: null,
                    createdAt: { $gte: startDate, $lt: endDate },
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
                          createdAt:1,
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
                  $group: {
                    _id: '$content.contentId',  // Group by contentId to remove duplicates
                    content: { $first: '$content' }  // Keep the first occurrence of each content
                  }
                },
                {
                  $project: {
                    contentId: '$content.contentId',
                    title: '$content.contentName',
                    imageUrl: '$content.imageUrl',
                    duration: '$content.duration',
                    createdAt:'$content.createdAt',
                    updatedAt:'$content.updatedAt'
                  }
                }
              ]);
              resObj={
                pods
              }
              break;

            default:

              cleanses = await Cleanse.aggregate([
                {
                  $match: cleanseFilterCondition
                },
                {
                  $project: {
                    userId: '$user_id',
                    title: '$title',
                    createdAt:1,
                    imageUrl: {
                      $concat: [CLOUDFRONT_URL, USER_MEDIA_PATH.CLEANSE, '/', '$image_url']
                    }
                  }
                }
              ]);

              goals = await Goals.aggregate([
                {
                  $match: filterCondition
                },
                {
                  $project: {
                    userId: '$user_id',
                    title: '$title',
                    createdAt:1,
                    imageUrl: {
                      $concat: [CLOUDFRONT_URL, USER_MEDIA_PATH.GOALS, '/', '$image_url']
                    }
                  }
                }
              ]);

              notes = await UserNotes.aggregate([
                {
                  $match: filterCondition
                },
                {
                  $project: {
                    userId: '$user_id',
                    title: '$title',
                    createdAt:1,
                    imageUrl: {
                      $concat: [CLOUDFRONT_URL, USER_MEDIA_PATH.NOTES, '/', '$image_url']
                    }
                  }
                }
              ]);

              affirmations = await UserAffirmation.aggregate([
                {
                  $match: filterCondition
                },
                {
                  $project: {
                    userId: '$user_id',
                    title: '$title',
                    createdAt:1,
                    imageUrl: {
                      $concat: [CLOUDFRONT_URL, USER_MEDIA_PATH.AFFIRMATION, '/', '$image_url']
                    }
                  }
                }
              ]);

              gratitudes = await UserGratitude.aggregate([
                {
                  $match: filterCondition
                },
                {
                  $project: {
                    userId: '$user_id',
                    title: '$display_name',
                    createdAt:1,
                    imageUrl: {
                      $concat: [CLOUDFRONT_URL, USER_MEDIA_PATH.GRATITUDE, '/', '$image_url']
                    }
                  }
                }
              ]);

              chats = await Conversation.aggregate([
                {
                  $match: {
                    $and: [
                      { userId: req.authUserId.toString() },
                      { isSessionStart: true },
                      { createdAt: { $gte: startDate, $lte: endDate } },
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
                    title: '$message',
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

              if (chats.length) {
                paginateArr = typeof chats[0] !== undefined ? chats[0]?.paginatedResult : [];
              }

              if (paginateArr.length > 0) {
                let dataForMood;
                for (const chat of paginateArr) {
                  dataForMood = await Conversation.findOne({
                    userId: req.authUserId,
                    moodId: { $exists: true },
                    _id: { $lt: chat._id }
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
                    chat.mood = mood.moodId;
                    chat.moodName = mood.mood;
                  }
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
                }
              }

              resObj={
                cleanses,
                goals,
                notes,
                affirmations,
                gratitudes,
                chats: paginateArr,
              }

          }

          return Response.successResponseData(
            res,
            convertObjectKeysToCamelCase(resObj),
            SUCCESS,
            res.__('getHistoryDataSuccess')
          );

        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

};
