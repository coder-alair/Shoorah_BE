'use strict';

const Response = require('@services/Response');

const moment = require('moment');
const { Users, AppIssues } = require('@models');
const { SUCCESS, FAIL, STATUS, USER_MEDIA_PATH } = require('../../../services/Constant');
const { getUploadURL } = require('@services/s3Services');
const {
  convertObjectKeysToCamelCase,
  unixTimeStamp,
  makeRandomDigit
} = require('../../../services/Helper');
const { newAppIssue } = require('../../../services/userServices/notifyAdminServices');

module.exports = {
  /**
   * @description This function is used for adding app issue by users
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */

  addAppIssue: async (req, res) => {
    try {
      const { authUserId } = req;
      const { contentType, contentId, issue, description, image } = req.body;
      let updateData = {
        content_id: contentId,
        content_type: contentType,
        issue: issue,
        status: STATUS.ACTIVE,
        created_by: authUserId,
        description
      };

      let appIssueUrl;
      if (image) {
        const imageExtension = image.split('/')[1];
        const appIssueImage = `${unixTimeStamp(new Date())}-${makeRandomDigit(
          4
        )}.${imageExtension}`;
        appIssueUrl = await getUploadURL(image, appIssueImage, USER_MEDIA_PATH.APP_ISSUE);
        updateData = {
          ...updateData,
          image: appIssueImage
        };
      }

      let newIssue = await AppIssues.create(updateData);
      let user = await Users.findOne({ _id: req.authUserId }).select('email name _id');
      if (user) {
        await newAppIssue(user.name, req.authUserId);
      }
      return Response.successResponseData(
        res,
        convertObjectKeysToCamelCase(newIssue),
        SUCCESS,
        res.__('addAppIssueSuccess'),
        appIssueUrl
      );
    } catch (err) {
      console.log(err);
      return Response.internalServerErrorResponse(res);
    }
  }
};
