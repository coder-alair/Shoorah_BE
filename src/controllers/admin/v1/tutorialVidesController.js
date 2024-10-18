'use strict';

const { TutorialVideos } = require('@models');
const Response = require('@services/Response');
const {
  addEditTutorialVideosValidation,
  getTutorialVideoValidation
} = require('@services/adminValidations/tutorialVideosValidations');
const { SUCCESS, TUTORIAL_MEDIA_PATH, CLOUDFRONT_URL } = require('@services/Constant');
const { unixTimeStamp, makeRandomDigit } = require('@services/Helper');
const { getUploadURL, removeOldImage } = require('@services/s3Services');

module.exports = {
  /**
   * @description This function is used to add edit tutorial video
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  addEditTutorialVideos: (req, res) => {
    try {
      const reqParam = req.body;
      addEditTutorialVideosValidation(reqParam, res, async (validate) => {
        if (validate) {
          const filterCondition = {
            content_type: reqParam.contentType,
            deletedAt: null
          };
          let updateCondition = {
            duration: reqParam.duration,
            heading: reqParam.heading,
            sub_heading: reqParam.subHeading
          };
          let videoPreSignUrl;
          let thumbnailPreSignUrl;

          const DataExists =
            await TutorialVideos.findOne(filterCondition).select('video_url thumbnail');
          if (DataExists) {
            if (DataExists.video_url && reqParam.isVideoDeleted) {
              await removeOldImage(DataExists.video_url, TUTORIAL_MEDIA_PATH.VIDEO, res);
              updateCondition = {
                ...updateCondition,
                video_url: null
              };
            }
            if (DataExists.thumbnail && reqParam.isImageDeleted) {
              await removeOldImage(DataExists.thumbnail, TUTORIAL_MEDIA_PATH.THUMBNAIL, res);
              updateCondition = {
                ...updateCondition,
                thumbnail: null
              };
            }
          }
          if (reqParam.videoUrl) {
            const videoExtension = reqParam.videoUrl.split('/')[1];
            const videoName = `${unixTimeStamp(new Date())}-${makeRandomDigit(
              4
            )}.${videoExtension}`;
            videoPreSignUrl = await getUploadURL(
              reqParam.video_url,
              videoName,
              TUTORIAL_MEDIA_PATH.VIDEO
            );
            updateCondition = {
              ...updateCondition,
              video_url: videoName
            };
          }
          if (reqParam.thumbnail) {
            const thumbnailExtension = reqParam.thumbnail.split('/')[1];
            const thumbnail = `${unixTimeStamp(new Date())}-${makeRandomDigit(
              4
            )}.${thumbnailExtension}`;
            updateCondition = {
              ...updateCondition,
              thumbnail
            };
            thumbnailPreSignUrl = await getUploadURL(
              reqParam.thumbnail,
              thumbnail,
              TUTORIAL_MEDIA_PATH.THUMBNAIL
            );
          }
          await TutorialVideos.findOneAndUpdate(filterCondition, updateCondition, { upsert: true });
          const presignedData = {
            videoUrl: videoPreSignUrl || null,
            thumbnail: thumbnailPreSignUrl || null
          };
          return Response.successResponseWithoutData(
            res,
            res.__('tutorialVideoAddSuccess'),
            SUCCESS,
            presignedData
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
   * @description This function is used to get tutorial video
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
            content_type: parseInt(reqParam.contentType),
            deletedAt: null
          };
          const tutorialVideo = await TutorialVideos.findOne(filterCondition)
            .select({
              video_url: 1,
              duration: 1,
              thumbnail: 1,
              heading: 1,
              sub_heading: 1
            })
            .lean();

          if (tutorialVideo) {
            if (tutorialVideo?.video_url) {
              tutorialVideo.videoUrl =
                CLOUDFRONT_URL + TUTORIAL_MEDIA_PATH.VIDEO + '/' + tutorialVideo.video_url;
            }
            if (tutorialVideo?.thumbnail) {
              tutorialVideo.thumbnail =
                CLOUDFRONT_URL + TUTORIAL_MEDIA_PATH.THUMBNAIL + '/' + tutorialVideo?.thumbnail;
            }
            if (tutorialVideo?.sub_heading) {
              tutorialVideo.subHeading = tutorialVideo?.sub_heading;
            } else {
              tutorialVideo.subHeading = '';
            }

            if (tutorialVideo?.heading) {
              tutorialVideo.heading = tutorialVideo?.heading;
            } else {
              tutorialVideo.heading = '';
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
