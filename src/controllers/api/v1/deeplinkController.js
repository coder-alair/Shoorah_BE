'use strict';

const Response = require('@services/Response');
const { STATUS, CONTENT_TYPE, REMINDER_TYPE, SUCCESS } = require('@services/Constant');
const { FAIL, PAGE, PER_PAGE, USER_MEDIA_PATH, CLOUDFRONT_URL } = require('@services/Constant');
// const deeplink = require('node-deeplink');

module.exports = {
  /**
   * @description This function is used to get deep links
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  // getDeepLinks: async (req, res) => {
  //   try {
  //     const reqParam = req.query;

  //     const deepLinkOptions = {
  //       fallback: 'https://webapp.shoorah.io/', // URL to open if the app is not installed
  //       android_package_name: 'com.shoorah.android', // Android package name
  //       ios_store_link: 'https://apps.apple.com/us/app/shoorah-mental-health-calm/id1669683359', // iOS App Store link
  //       url: reqParam.url
  //     };

  //     let url = deeplink(deepLinkOptions);

  //     // If the deeplink library returns a function, call it to get the value
  //     if (typeof url === 'function') {
  //       url = url();
  //     }
  //     console.log({ url });

  //     return Response.successResponseData(res, url, SUCCESS, res.__('deeplinkSuccess'));
  //   } catch (err) {
  //     console.log(err);
  //     return Response.internalServerErrorResponse(res);
  //   }
  // }
};
