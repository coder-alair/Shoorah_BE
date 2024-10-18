'use strict';

const { TutorialVideos } = require('@models');
const Response = require('@services/Response');
const {
  getTutorialVideoValidation
} = require('@services/adminValidations/tutorialVideosValidations');
const { SUCCESS, CLOUDFRONT_URL, TUTORIAL_MEDIA_PATH } = require('@services/Constant');

module.exports = {
  /**
   * @description This function is used to get tutorial video based on content type
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  getTutorialVideo: (req, res) => {
    try {
      const reqParam = req.query;
      getTutorialVideoValidation(reqParam, res, async (validate) => {
        if (validate) {
          const filterCondition = {
            deletedAt: null
          };
          const tutorialVideo = await TutorialVideos.find(filterCondition)
            .select({
              content_type: 1,
              video_url: 1,
              duration: 1,
              thumbnail: 1,
              heading: 1,
              sub_heading: 1
            })
            .lean();

          if (tutorialVideo.length) {
            for (const tutorialVid of tutorialVideo) {
              if (tutorialVid?.video_url) {
                tutorialVid.videoUrl =
                  CLOUDFRONT_URL + TUTORIAL_MEDIA_PATH.VIDEO + '/' + tutorialVid.video_url;
              }
              if (tutorialVid?.thumbnail) {
                tutorialVid.thumbnail =
                  CLOUDFRONT_URL + TUTORIAL_MEDIA_PATH.THUMBNAIL + '/' + tutorialVid?.thumbnail;
              }
            }
          }

          return Response.successResponseData(
            res,
            tutorialVideo,
            SUCCESS,
            res.__('tutorialVideoListSuccess')
          );
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  }
};
