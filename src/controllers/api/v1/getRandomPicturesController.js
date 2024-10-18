/* eslint-disable camelcase */
'use strict';

const {
  Users,
  ContentApproval,
  Mood,
  Cleanse,
  UserGratitude,
  Goals,
  UserRituals,
  UserNotes,
  UserBadges
} = require('@models');
const Response = require('@services/Response');
const { generatePassword } = require('@services/authServices');
const csv = require('csv-parser');
const stream = require('stream');
const {
  USER_TYPE,
  ACCOUNT_STATUS,
  PAGE,
  PER_PAGE,
  SUCCESS,
  FAIL,
  CONTENT_STATUS,
  REPORT_TYPE,
  MOOD_REPORT,
  SORT_BY,
  SORT_ORDER,
  CLOUDFRONT_URL,
  USER_MEDIA_PATH,
  PERFORMANCE_CONTENT_TYPE,
  STATUS,
  SHOORAH_GURU,
  BADGE_TYPE,
  BRONZE_CATEGORY_DESCRIPTION,
  CATEGORY_TYPE,
  CATEGORY_TITLE,
  PLATINUM_CATEGORY_DESCRIPTION,
  SILVER_CATEGORY_DESCRIPTION,
  DIAMOND_CATEGORY_DESCRIPTION,
  GOLD_CATEGORY_DESCRIPTION,
  ACCOUNT_TYPE
} = require('@services/Constant');
const {
  makeRandomDigit,
  makeRandomString,
  convertObjectKeysToCamelCase,
  unixTimeStamp,
  addEditKlaviyoUser
} = require('../../../services/Helper');
const { RESPONSE_CODE } = require('../../../services/Constant');
const axios = require('axios');
const access = process.env.ACCESS_KEY || 'XmNHkKdOh_Ldk9n7J2JcfhOVfxY7auAGIdEdFKb12oE';
const unsplashClient = axios.create({
  baseURL: 'https://api.unsplash.com',
  headers: {
    Authorization: `Client-ID ${access}`
  }
});
module.exports = {
  getRandomPictures: async (req, res) => {
    try {
      const reqParam = req.query;
      var response;
      if (reqParam.word == '') {
        response = await unsplashClient.get('/photos');
        var final_array = [];
        if (response.data.length > 0) {
          const imageList = response.data.map((result) => {
            final_array.push({
              image_url: result.urls.regular,
              image_id: result.id,
              created_at: result.created_at,
              name: result.user.first_name + ' ' + result.user.last_name
            });
          });
          return Response.successResponseData(
            res,
            final_array,
            SUCCESS,
            res.__('getImagesSuccess')
          );
        } else {
          return Response.successResponseData(
            res,
            final_array,
            SUCCESS,
            res.__('getNoImagesSuccess')
          );
        }
      } else {
        response = await unsplashClient.get('/search/photos?query=' + reqParam.word);
        var final_array = [];
        if (response.data.results.length > 0) {
          const imageList = response.data.results.map((result) => {
            final_array.push({
              image_url: result.urls.regular,
              image_id: result.id,
              created_at: result.created_at,
              name: result.user.first_name + ' ' + result.user.last_name
            });
          });
          return Response.successResponseData(
            res,
            final_array,
            SUCCESS,
            res.__('getImagesSuccess')
          );
        } else {
          return Response.successResponseData(
            res,
            final_array,
            SUCCESS,
            res.__('getNoImagesSuccess')
          );
        }
      }
    } catch (err) {
      console.log(err);

      return Response.internalServerErrorResponse(res);
    }
  }
};
