'use strict';

const Response = require('@services/Response');

const moment = require('moment');
const { Users, AppIssues } = require('@models');
const {
  SUCCESS,
  FAIL,
  STATUS,
  PAGE,
  PER_PAGE,
  SORT_ORDER,
  RESPONSE_CODE,
  USER_MEDIA_PATH,
  CLOUDFRONT_URL,
  USER_CONTENT_TYPE,
  ADMIN_MEDIA_PATH,
  CONTENT_TYPE,
  MOOD_PDF_SIZE,
  NODE_ENVIRONMENT,
  APP_ISSUES_TYPE
} = require('../../../services/Constant');
const {
  convertObjectKeysToCamelCase,
  dynamicUserModelName,
  toObjectId
} = require('../../../services/Helper');
const puppeteer = require('puppeteer');
const pug = require('pug');

module.exports = {
  /**
   * @description This function is used for get app issues
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */

  getAppIssues: async (req, res) => {
    const reqParam = req.query;

    try {
      const page = reqParam.page ? parseInt(reqParam.page) : PAGE;
      const perPage = reqParam.perPage ? parseInt(reqParam.perPage) : PER_PAGE;
      const skip = (page - 1) * perPage || 0;
      const sortBy = reqParam.sortBy || 'createdAt';
      const sortOrder = reqParam.sortOrder ? parseInt(reqParam.sortOrder) : SORT_ORDER;

      const filterCondition = {
        deletedAt: null,
        status: STATUS.ACTIVE
      };

      const totalRecords = await AppIssues.countDocuments(filterCondition);
      let appissues = await AppIssues.aggregate([
        {
          $match: filterCondition
        },
        {
          $project: {
            id: '$_id',
            issue: 1,
            sentToDev: '$sent_to_dev',
            issueResolved: '$issue_resolve',
            implemented: 1,
            contentType: '$content_type',
            contentId: '$content_id',
            description: 1,
            imageUrl: {
              $concat: [CLOUDFRONT_URL, USER_MEDIA_PATH.APP_ISSUE, '/', '$image']
            },
            created_by: 1,
            status: 1,
            createdAt: 1
          }
        },
        {
          $sort: { [sortBy]: sortOrder }
        },
        {
          $skip: skip
        },
        {
          $limit: perPage
        },
        {
          $lookup: {
            from: 'users',
            localField: 'created_by',
            foreignField: '_id',
            as: 'createdByDetails'
          }
        },
        {
          $unwind: '$createdByDetails'
        },
        {
          $project: {
            id: 1,
            issue: 1,
            sentToDev: 1,
            issueResolved: 1,
            implemented: 1,
            contentId: 1,
            contentType: 1,
            imageUrl: 1,
            description: 1,
            contentDetails: 1,
            createdById: '$createdByDetails._id',
            createdByName: '$createdByDetails.name',
            createdByEmail: '$createdByDetails.email',
            createdByPhone: '$createdByDetails.phone',
            status: 1,
            createdAt: 1
          }
        }
      ]);

      for await (let issue of appissues) {
        const modelName = await dynamicUserModelName(parseInt(issue.contentType));
        if (modelName) {
          let aggregatePipeline;
          const filterCondition = {
            _id: toObjectId(issue.contentId),
            approved_by: {
              $ne: null
            },
            status: STATUS.ACTIVE,
            deletedAt: null
          };
          switch (parseInt(issue.contentType)) {
            case USER_CONTENT_TYPE.MEDITATION:
              aggregatePipeline = [
                {
                  $match: filterCondition
                },
                {
                  $limit: 1
                },
                {
                  $unwind: {
                    path: '$focus_ids',
                    preserveNullAndEmptyArrays: false
                  }
                },
                {
                  $group: {
                    _id: '$_id',
                    focus_ids: {
                      $addToSet: '$focus_ids'
                    },
                    display_name: {
                      $first: '$display_name'
                    },
                    description: {
                      $first: '$description'
                    },
                    duration: {
                      $first: '$duration'
                    },
                    meditation_url: {
                      $first: '$meditation_url'
                    },
                    meditation_srt: {
                      $first: '$meditation_srt'
                    },
                    meditation_image: {
                      $first: '$meditation_image'
                    },
                    expert_name: {
                      $first: '$expert_name'
                    },
                    expert_image: {
                      $first: '$expert_image'
                    },
                    updatedAt: {
                      $first: '$updatedAt'
                    }
                  }
                },
                {
                  $project: {
                    contentId: '$_id',
                    contentName: '$display_name',
                    description: 1,
                    duration: 1,
                    url: {
                      $concat: [
                        CLOUDFRONT_URL,
                        ADMIN_MEDIA_PATH.MEDITATION_AUDIO,
                        '/',
                        '$meditation_url'
                      ]
                    },
                    srtUrl: {
                      $concat: [CLOUDFRONT_URL, 'admins/meditations/srt/', '$meditation_srt']
                    },
                    contentImage: {
                      $concat: [
                        CLOUDFRONT_URL,
                        ADMIN_MEDIA_PATH.MEDITATION_IMAGE,
                        '/',
                        '$meditation_image'
                      ]
                    },
                    expertName: '$expert_name',
                    updatedAt: 1,
                    expertImage: {
                      $concat: [
                        CLOUDFRONT_URL,
                        ADMIN_MEDIA_PATH.EXPERT_IMAGES,
                        '/',
                        '$expert_image'
                      ]
                    },
                    _id: 0
                  }
                },
                {
                  $addFields: {
                    contentType: CONTENT_TYPE.MEDITATION
                  }
                }
              ];
              break;
            case USER_CONTENT_TYPE.SOUND:
              aggregatePipeline = [
                {
                  $match: filterCondition
                },
                {
                  $limit: 1
                },
                {
                  $unwind: {
                    path: '$focus_ids',
                    preserveNullAndEmptyArrays: false
                  }
                },
                {
                  $group: {
                    _id: '$_id',
                    focus_ids: {
                      $addToSet: '$focus_ids'
                    },
                    display_name: {
                      $first: '$display_name'
                    },
                    description: {
                      $first: '$description'
                    },
                    duration: {
                      $first: '$duration'
                    },
                    sound_url: {
                      $first: '$sound_url'
                    },
                    sound_srt: {
                      $first: '$sound_srt'
                    },
                    sound_image: {
                      $first: '$sound_image'
                    },
                    expert_name: {
                      $first: '$expert_name'
                    },
                    expert_image: {
                      $first: '$expert_image'
                    },
                    updatedAt: {
                      $first: '$updatedAt'
                    }
                  }
                },
                {
                  $project: {
                    contentId: '$_id',
                    contentName: '$display_name',
                    description: 1,
                    duration: 1,
                    url: {
                      $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.SOUND_AUDIO, '/', '$sound_url']
                    },
                    contentImage: {
                      $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.SOUND_IMAGES, '/', '$sound_image']
                    },
                    srtUrl: {
                      $concat: [CLOUDFRONT_URL, 'admins/sounds/srt/', '$sound_srt']
                    },
                    expertName: '$expert_name',
                    expertImage: {
                      $concat: [
                        CLOUDFRONT_URL,
                        ADMIN_MEDIA_PATH.EXPERT_IMAGES,
                        '/',
                        '$expert_image'
                      ]
                    },
                    updatedAt: 1,
                    _id: 0
                  }
                },
                {
                  $addFields: {
                    contentType: CONTENT_TYPE.SOUND
                  }
                }
              ];
              break;
            case USER_CONTENT_TYPE.SHOORAH_PODS:
              aggregatePipeline = [
                {
                  $match: filterCondition
                },
                {
                  $limit: 1
                },
                {
                  $unwind: {
                    path: '$focus_ids',
                    preserveNullAndEmptyArrays: false
                  }
                },
                {
                  $group: {
                    _id: '$_id',
                    focus_ids: {
                      $addToSet: '$focus_ids'
                    },
                    display_name: {
                      $first: '$display_name'
                    },
                    description: {
                      $first: '$description'
                    },
                    duration: {
                      $first: '$duration'
                    },
                    pods_url: {
                      $first: '$pods_url'
                    },
                    pods_srt: {
                      $first: '$pods_srt'
                    },
                    pods_image: {
                      $first: '$pods_image'
                    },
                    expert_name: {
                      $first: '$expert_name'
                    },
                    expert_image: {
                      $first: '$expert_image'
                    },
                    updatedAt: {
                      $first: '$updatedAt'
                    }
                  }
                },
                {
                  $project: {
                    contentId: '$_id',
                    contentName: '$display_name',
                    description: 1,
                    duration: 1,
                    imageUrl: {
                      $concat: [
                        CLOUDFRONT_URL,
                        ADMIN_MEDIA_PATH.SHOORAH_PODS_AUDIO,
                        '/',
                        '$pods_url'
                      ]
                    },
                    contentImage: {
                      $concat: [
                        CLOUDFRONT_URL,
                        ADMIN_MEDIA_PATH.SHOORAH_PODS_IMAGE,
                        '/',
                        '$pods_image'
                      ]
                    },
                    srtUrl: {
                      $concat: [CLOUDFRONT_URL, 'admins/shoorah_pods/srt/', '$pods_srt']
                    },
                    expertName: '$expert_name',
                    updatedAt: 1,
                    expertImage: {
                      $concat: [
                        CLOUDFRONT_URL,
                        ADMIN_MEDIA_PATH.EXPERT_IMAGES,
                        '/',
                        '$expert_image'
                      ]
                    },
                    _id: 0
                  }
                },
                {
                  $addFields: {
                    contentType: CONTENT_TYPE.SHOORAH_PODS
                  }
                }
              ];
              break;
          }
          const contentData = await modelName.aggregate(aggregatePipeline);
          issue.contentDescription = contentData[0]?.description || null;
          issue.contentName = contentData[0]?.contentName || null;
          issue.duration = contentData[0]?.duration || null;
          issue.contentImage = contentData[0]?.contentImage || null;
        }
      }

      return Response.successResponseData(
        res,
        convertObjectKeysToCamelCase(appissues),
        SUCCESS,
        res.__('addAppIssueSuccess'),
        {
          page,
          perPage,
          totalRecords
        }
      );
    } catch (err) {
      console.error(err);
      return Response.internalServerErrorResponse(res);
    }
  },

  updateAppIssue: async (req, res) => {
    const reqParam = req.body;
    try {
      const filterCondition = {
        _id: reqParam.id,
        status: STATUS.ACTIVE
      };

      let issue = await AppIssues.findOne(filterCondition);

      if (!issue) {
        return Response.errorResponseWithoutData(
          res,
          'No Issue with the respective ID.',
          RESPONSE_CODE.NOT_FOUND
        );
      }

      let updatedData = await AppIssues.updateOne(filterCondition, {
        $set: {
          implemented: reqParam.implemented,
          issue_resolve: reqParam.issueResolved,
          sent_to_dev: reqParam.sentToDev
        }
      });

      let message = 'App issue updated successfully';
      return Response.successResponseData(res, message, SUCCESS, res.__('updateAppIssueSuccess'));
    } catch (err) {
      console.error(err);
      return Response.internalServerErrorResponse(res);
    }
  },

  downloadAppIssue: async (req, res) => {
    try {
      const reqParam = req.params;
      let appIssue = await AppIssues.aggregate([
        {
          $match: {
            _id: toObjectId(reqParam.id)
          }
        },
        {
          $project: {
            id: '$_id',
            issue: 1,
            sentToDev: '$sent_to_dev',
            issueResolved: '$issue_resolve',
            implemented: 1,
            contentType: '$content_type',
            contentId: '$content_id',
            description: 1,
            imageUrl: {
              $concat: [CLOUDFRONT_URL, USER_MEDIA_PATH.APP_ISSUE, '/', '$image']
            },
            created_by: 1,
            status: 1,
            createdAt: 1
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'created_by',
            foreignField: '_id',
            as: 'createdByDetails'
          }
        },
        {
          $unwind: '$createdByDetails'
        },
        {
          $project: {
            id: 1,
            issue: 1,
            sentToDev: 1,
            issueResolved: 1,
            implemented: 1,
            contentId: 1,
            contentType: 1,
            imageUrl: 1,
            description: 1,
            contentDetails: 1,
            createdById: '$createdByDetails._id',
            createdByName: '$createdByDetails.name',
            createdByEmail: '$createdByDetails.email',
            createdByPhone: '$createdByDetails.phone',
            status: 1,
            createdAt: 1
          }
        }
      ]);

      if (!appIssue.length) {
        return Response.errorResponseWithoutData(
          res,
          'No Issue with the respective ID.',
          RESPONSE_CODE.NOT_FOUND
        );
      } else {
        const modelName = await dynamicUserModelName(parseInt(appIssue[0].contentType));
        if (modelName) {
          let aggregatePipeline;
          const filterCondition = {
            _id: toObjectId(appIssue[0].contentId),
            approved_by: {
              $ne: null
            },
            status: STATUS.ACTIVE,
            deletedAt: null
          };
          switch (parseInt(appIssue[0]?.contentType)) {
            case USER_CONTENT_TYPE.MEDITATION:
              aggregatePipeline = [
                {
                  $match: filterCondition
                },
                {
                  $limit: 1
                },
                {
                  $unwind: {
                    path: '$focus_ids',
                    preserveNullAndEmptyArrays: false
                  }
                },
                {
                  $group: {
                    _id: '$_id',
                    focus_ids: {
                      $addToSet: '$focus_ids'
                    },
                    display_name: {
                      $first: '$display_name'
                    },
                    description: {
                      $first: '$description'
                    },
                    duration: {
                      $first: '$duration'
                    },
                    meditation_url: {
                      $first: '$meditation_url'
                    },
                    meditation_srt: {
                      $first: '$meditation_srt'
                    },
                    meditation_image: {
                      $first: '$meditation_image'
                    },
                    expert_name: {
                      $first: '$expert_name'
                    },
                    expert_image: {
                      $first: '$expert_image'
                    },
                    updatedAt: {
                      $first: '$updatedAt'
                    }
                  }
                },
                {
                  $project: {
                    contentId: '$_id',
                    contentName: '$display_name',
                    description: 1,
                    duration: 1,
                    url: {
                      $concat: [
                        CLOUDFRONT_URL,
                        ADMIN_MEDIA_PATH.MEDITATION_AUDIO,
                        '/',
                        '$meditation_url'
                      ]
                    },
                    srtUrl: {
                      $concat: [CLOUDFRONT_URL, 'admins/meditations/srt/', '$meditation_srt']
                    },
                    contentImage: {
                      $concat: [
                        CLOUDFRONT_URL,
                        ADMIN_MEDIA_PATH.MEDITATION_IMAGE,
                        '/',
                        '$meditation_image'
                      ]
                    },
                    expertName: '$expert_name',
                    updatedAt: 1,
                    expertImage: {
                      $concat: [
                        CLOUDFRONT_URL,
                        ADMIN_MEDIA_PATH.EXPERT_IMAGES,
                        '/',
                        '$expert_image'
                      ]
                    },
                    _id: 0
                  }
                },
                {
                  $addFields: {
                    contentType: CONTENT_TYPE.MEDITATION
                  }
                }
              ];
              break;
            case USER_CONTENT_TYPE.SOUND:
              aggregatePipeline = [
                {
                  $match: filterCondition
                },
                {
                  $limit: 1
                },
                {
                  $unwind: {
                    path: '$focus_ids',
                    preserveNullAndEmptyArrays: false
                  }
                },
                {
                  $group: {
                    _id: '$_id',
                    focus_ids: {
                      $addToSet: '$focus_ids'
                    },
                    display_name: {
                      $first: '$display_name'
                    },
                    description: {
                      $first: '$description'
                    },
                    duration: {
                      $first: '$duration'
                    },
                    sound_url: {
                      $first: '$sound_url'
                    },
                    sound_srt: {
                      $first: '$sound_srt'
                    },
                    sound_image: {
                      $first: '$sound_image'
                    },
                    expert_name: {
                      $first: '$expert_name'
                    },
                    expert_image: {
                      $first: '$expert_image'
                    },
                    updatedAt: {
                      $first: '$updatedAt'
                    }
                  }
                },
                {
                  $project: {
                    contentId: '$_id',
                    contentName: '$display_name',
                    description: 1,
                    duration: 1,
                    url: {
                      $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.SOUND_AUDIO, '/', '$sound_url']
                    },
                    contentImage: {
                      $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.SOUND_IMAGES, '/', '$sound_image']
                    },
                    srtUrl: {
                      $concat: [CLOUDFRONT_URL, 'admins/sounds/srt/', '$sound_srt']
                    },
                    expertName: '$expert_name',
                    expertImage: {
                      $concat: [
                        CLOUDFRONT_URL,
                        ADMIN_MEDIA_PATH.EXPERT_IMAGES,
                        '/',
                        '$expert_image'
                      ]
                    },
                    updatedAt: 1,
                    _id: 0
                  }
                },
                {
                  $addFields: {
                    contentType: CONTENT_TYPE.SOUND
                  }
                }
              ];
              break;
            case USER_CONTENT_TYPE.SHOORAH_PODS:
              aggregatePipeline = [
                {
                  $match: filterCondition
                },
                {
                  $limit: 1
                },
                {
                  $unwind: {
                    path: '$focus_ids',
                    preserveNullAndEmptyArrays: false
                  }
                },
                {
                  $group: {
                    _id: '$_id',
                    focus_ids: {
                      $addToSet: '$focus_ids'
                    },
                    display_name: {
                      $first: '$display_name'
                    },
                    description: {
                      $first: '$description'
                    },
                    duration: {
                      $first: '$duration'
                    },
                    pods_url: {
                      $first: '$pods_url'
                    },
                    pods_srt: {
                      $first: '$pods_srt'
                    },
                    pods_image: {
                      $first: '$pods_image'
                    },
                    expert_name: {
                      $first: '$expert_name'
                    },
                    expert_image: {
                      $first: '$expert_image'
                    },
                    updatedAt: {
                      $first: '$updatedAt'
                    }
                  }
                },
                {
                  $project: {
                    contentId: '$_id',
                    contentName: '$display_name',
                    description: 1,
                    duration: 1,
                    imageUrl: {
                      $concat: [
                        CLOUDFRONT_URL,
                        ADMIN_MEDIA_PATH.SHOORAH_PODS_AUDIO,
                        '/',
                        '$pods_url'
                      ]
                    },
                    contentImage: {
                      $concat: [
                        CLOUDFRONT_URL,
                        ADMIN_MEDIA_PATH.SHOORAH_PODS_IMAGE,
                        '/',
                        '$pods_image'
                      ]
                    },
                    srtUrl: {
                      $concat: [CLOUDFRONT_URL, 'admins/shoorah_pods/srt/', '$pods_srt']
                    },
                    expertName: '$expert_name',
                    updatedAt: 1,
                    expertImage: {
                      $concat: [
                        CLOUDFRONT_URL,
                        ADMIN_MEDIA_PATH.EXPERT_IMAGES,
                        '/',
                        '$expert_image'
                      ]
                    },
                    _id: 0
                  }
                },
                {
                  $addFields: {
                    contentType: CONTENT_TYPE.SHOORAH_PODS
                  }
                }
              ];
              break;
          }
          const contentData = await modelName.aggregate(aggregatePipeline);
          appIssue[0].contentDescription = contentData[0]?.description || null;
          appIssue[0].contentName = contentData[0]?.contentName || null;
          appIssue[0].duration = contentData[0]?.duration || null;
          appIssue[0].contentImage = contentData[0]?.contentImage || null;
        }
      }

      let contentType;
      let issueType;

      if (appIssue[0].contentType == 3) {
        contentType = 'Meditation';
      } else if (appIssue[0].contentType == 4) {
        contentType = 'Sleep Sounds';
      } else if (appIssue[0].contentType == 5) {
        contentType = 'Shoorah Pods';
      }

      if (appIssue[0].issue == APP_ISSUES_TYPE.SOME_CAPTION_ISSUE) {
        issueType = 'Some caption Issues';
      } else if (appIssue[0].issue == APP_ISSUES_TYPE.ALL_CAPTION_ISSUE) {
        issueType = 'All caption Issues';
      } else if (appIssue[0].issue == APP_ISSUES_TYPE.CAPTION_NOT_SYNC) {
        issueType = 'Caption not sync';
      } else {
        issueType = 'Unknown Issue';
      }

      let checkmark = 'https://img.icons8.com/?size=256&id=91260&format=png';
      let wrong = 'https://img.icons8.com/?size=256&id=I02TdaPxbwRz&format=png';

      let sentToDev, issueResolved, implemented;
      if (appIssue[0].sentToDev) {
        sentToDev = checkmark;
      } else {
        sentToDev = wrong;
      }
      if (appIssue[0].issueResolved) {
        issueResolved = checkmark;
      } else {
        issueResolved = wrong;
      }
      if (appIssue[0].implemented) {
        implemented = checkmark;
      } else {
        implemented = wrong;
      }

      const locals = {
        name: req.authName,
        issue: appIssue[0],
        contentType: contentType,
        issueType,
        checkmark,
        wrong,
        sentToDev,
        issueResolved,
        implemented,
        issuedAt: appIssue[0]?.createdAt.toLocaleDateString('en-gb', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }),
        happySmallIcon: process.env.PDF_HAPPY_SMALL_ICON,
        sadSmallIcon: process.env.PDF_SAD_SMALL_ICON
      };

      const compiledFunction = pug.compileFile('src/views/app-issue.pug');
      const html = compiledFunction(locals);
      const browser = await puppeteer.launch({
        executablePath:
          process.env.NODE_ENV === NODE_ENVIRONMENT.DEVELOPMENT ? null : '/usr/bin/google-chrome',
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
    } catch (err) {
      console.log(err);
      return Response.internalServerErrorResponse(res);
    }
  }
};
