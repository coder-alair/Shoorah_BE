'use strict';

const { Visions } = require('@models');
const VisionBoard = require('../../../models/VisionBoard');
const VisionBoardSetting = require('../../../models/VisionBoardSetting');
const Response = require('@services/Response');
const {
  addEditVisionBoardValidation,
  visionBoardSettingValidation,
  reorderVisionValidation,
  deleteMyDeleteValidation
} = require('@services/userValidations/visionBoardValidations');
const { SUCCESS, FAIL, NODE_ENVIRONMENT } = require('@services/Constant');

const puppeteer = require('puppeteer');
const pug = require('pug');

const {
  professionalMoodValidation
} = require('../../../services/userValidations/visionBoardValidations');
const { MAX_VALUE_OF_MOOD } = require('../../../services/Constant');
const { validate } = require('../../../models/solution');
const { date } = require('joi');
const Conversation = require('../../../models/Conversation');
const {
  noDataFoundInProfessionalMoods,
  convertObjectKeysToCamelCase
} = require('../../../services/Helper');
const { ContentCounts } = require('../../../models');

module.exports = {
  /**
   * @description This function is used to vision board setting.
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  getVisionBoardSetting: async (req, res) => {
    try {
      const reqParam = req.body;
      if (req.authUserId) {
        let visionBoardSetting = await VisionBoardSetting.findOne({
          user_id: req.authUserId
        });
        if (visionBoardSetting) {
          return Response.successResponseData(
            res,
            visionBoardSetting,
            SUCCESS,
            res.__('myVisonSetting')
          );
        } else {
          return Response.successResponseWithoutData(
            res,
            res.__('myVisonSettingNotFound'),
            SUCCESS
          );
        }
      } else {
        return Response.errorResponse(res, res.__('myVisonSettingNotFound'));
      }
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to get vision board setting.
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  visionBoardSetting: async (req, res) => {
    try {
      const reqParam = req.body;
      let visionBoardSetting = await VisionBoardSetting.findOne({
        user_id: req.authUserId
      });
      if (visionBoardSetting) {
        if (visionBoardSetting) {
          let updateVisionSetting = {
            title: reqParam.title,
            bg_image: reqParam.bg_image,
            theme: reqParam.theme || '',
            text_color: reqParam.text_color,
            photo_quality: reqParam.photo_quality
          };

          await VisionBoardSetting.findOneAndUpdate(
            { user_id: req.authUserId },
            updateVisionSetting
          );

          let visionSetting = await VisionBoardSetting.findOne({
            user_id: req.authUserId
          });

          return Response.successResponseData(
            res,
            visionSetting,
            SUCCESS,
            res.__('myVisionSettingUpdated')
          );
        } else {
          return Response.errorResponse(res, res.__('myVisonSettingNotFound'));
        }
      } else {
        visionBoardSettingValidation(reqParam, res, async (validate) => {
          if (validate) {
            const createVisionSetting = {
              user_id: req.authUserId,
              title: reqParam.title || null,
              bg_image: reqParam.bg_image || null,
              theme: reqParam.theme || '',
              text_color: reqParam.text_color || null,
              photo_quality: reqParam.photo_quality || null
            };
            let visionSetting = await VisionBoardSetting.create(createVisionSetting);
            return Response.successResponseData(
              res,
              visionSetting,
              SUCCESS,
              res.__('addVisionBoardSetting')
            );
          } else {
            return Response.internalServerErrorResponse(res);
          }
        });
      }
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },
  /**
   * @description This function is used to get vision.
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  getUserVisonBoard: async (req, res) => {
    let queryObj = {
      user_id: req.authUserId,
      deletedAt: null
    };
    let is_archive = req?.query?.archive;
    console.log(req?.query?.archive);
    if (is_archive == 'false') {
      queryObj = {
        ...queryObj,
        $or: [{ is_archive: false }, { is_archive: null }]
      };
    }

    if (is_archive == 'true') {
      queryObj = {
        ...queryObj,
        is_archive: true
      };
    }
    let visionBoardList = await VisionBoard.find(queryObj).sort({ order_no: 1 });
    if (!visionBoardList || !visionBoardList.length) {
      return Response.successResponseData(res, [], SUCCESS, res.__('myVisonNotFound'));
    }
    if (typeof visionBoardList !== 'undefined') {
      return Response.successResponseData(res, visionBoardList, SUCCESS, res.__('myVisionUpdated'));
    } else {
      return Response.errorResponse(res, res.__('myVisonNotFound'));
    }
  },

  /**
   * @description This function is used to get vision.
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */

  getUserVisonDetails: async (req, res) => {
    try {
      const reqParam = req.query;
      if (reqParam.categoryId) {
        let category = await Category.findOne({
          _id: reqParam.categoryId,
          contentType: CONTENT_TYPE.RITUALS
        });
        reqParam.focusIds = category?.focuses;
        reqParam.focusIds = reqParam?.focusIds?.map((objectId) => objectId.toString());
      }

      ritualsListValidation(reqParam, res, async (validate) => {
        if (validate) {
          let page = PAGE;
          let perPage = PER_PAGE;
          if (reqParam.page) {
            page = parseInt(reqParam.page);
          }
          if (reqParam.perPage) {
            perPage = parseInt(reqParam.perPage);
          }
          const skip = (page - 1) * perPage || 0;
          let filterRituals = {
            status: STATUS.ACTIVE,
            approved_by: {
              $ne: null
            }
          };
          if (reqParam.searchKey) {
            filterRituals = {
              ...filterRituals,
              display_name: {
                $regex: '.*' + reqParam.searchKey + '.*',
                $options: 'i'
              }
            };
          }
          const aggregateCondition = [
            {
              $match: filterRituals
            },
            {
              $unwind: {
                path: '$focus_ids',
                preserveNullAndEmptyArrays: false
              }
            }
          ];
          if (reqParam.focusIds && reqParam.focusIds.length > 0) {
            const objFocusIds = [];
            reqParam.focusIds.map((el) => {
              objFocusIds.push(toObjectId(el));
            });
            aggregateCondition.push({
              $match: {
                $expr: {
                  $in: ['$focus_ids', objFocusIds]
                }
              }
            });
          }
          aggregateCondition.push(
            {
              $group: {
                _id: '$_id',
                focus_ids: {
                  $addToSet: '$focus_ids'
                },
                display_name: {
                  $first: '$display_name'
                },
                updatedAt: {
                  $first: '$updatedAt'
                }
              }
            },
            {
              $lookup: {
                from: 'user_rituals',
                let: {
                  ritualId: '$_id'
                },
                pipeline: [
                  {
                    $match: {
                      user_id: toObjectId(req.authUserId),
                      $expr: {
                        $in: ['$$ritualId', '$ritual_ids']
                      }
                    }
                  },
                  {
                    $project: {
                      ritual_ids: 1
                    }
                  }
                ],
                as: 'userRituals'
              }
            },
            {
              $match: {
                $expr: {
                  $eq: [{ $size: '$userRituals' }, 0]
                }
              }
            },
            {
              $lookup: {
                from: 'focus',
                let: {
                  focusIds: '$focus_ids'
                },
                pipeline: [
                  {
                    $match: {
                      status: 1,
                      approved_by: {
                        $ne: null
                      },
                      $expr: {
                        $in: ['$_id', '$$focusIds']
                      }
                    }
                  },
                  {
                    $project: {
                      display_name: 1
                    }
                  }
                ],
                as: 'focus'
              }
            },
            {
              $match: {
                $expr: {
                  $gt: [{ $size: '$focus' }, 0]
                }
              }
            },
            {
              $project: {
                id: '$_id',
                ritualName: '$display_name',
                focusName: '$focus.display_name',
                updatedAt: 1,
                _id: 0
              }
            },
            {
              $sort: {
                updatedAt: -1
              }
            },
            {
              $facet: {
                metaData: [
                  {
                    $count: 'totalCount'
                  },
                  {
                    $addFields: {
                      page,
                      perPage
                    }
                  }
                ],
                data: [
                  {
                    $skip: skip
                  },
                  {
                    $limit: perPage
                  }
                ]
              }
            }
          );
          const ritualData = await Ritual.aggregate(aggregateCondition);
          return ritualData.length > 0
            ? Response.successResponseData(
              res,
              ritualData[0].data,
              SUCCESS,
              res.__('ritualsList'),
              ritualData[0].metaData[0]
            )
            : Response.successResponseWithoutData(res, res.__('somethingWrong'), FAIL);
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },
  /**
   * @description This function is used to add edit vision.
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  addEditVision: async (req, res) => {
    try {
      const reqParam = req.body;
      console.log('reqParam.visionId-----------', reqParam.visionId);
      if (reqParam.visionId) {
        let vision = await VisionBoard.findOne({
          _id: reqParam.visionId
        });
        if (vision) {
          let updateVision = {
            idea: reqParam.idea,
            title: reqParam.title,
            sub_title: reqParam.sub_title,
            tag: reqParam.tag,
            color: reqParam.color,
            theme: reqParam.theme || '',
            text_color: reqParam.text_color,
            image: reqParam.image,
            reminder: reqParam.reminder,
            reminder_time: reqParam.reminder_time,
            is_archive: reqParam.is_archive
          };

          await VisionBoard.findOneAndUpdate({ _id: reqParam.visionId }, updateVision);

          let vision = await VisionBoard.findOne({
            _id: reqParam.visionId
          });

          return Response.successResponseData(res, vision, SUCCESS, res.__('myVisionUpdated'));
        } else {
          return Response.errorResponse(res, res.__('myVisonNotFound'));
        }
      } else {
        addEditVisionBoardValidation(reqParam, res, async (validate) => {
          console.log('111111111111');
          if (validate) {
            console.log('HHHHHHHHH', req.authUserId);
            const createVision = {
              user_id: req.authUserId,
              idea: reqParam.idea || null,
              title: reqParam.title || null,
              sub_title: reqParam.sub_title || null,
              tag: reqParam.tag || null,
              theme: reqParam.theme || '',
              color: reqParam.color || null,
              text_color: reqParam.text_color || null,
              image: reqParam.image || null,
              reminder: reqParam.reminder,
              reminder_time: reqParam.reminder_time || null,
              is_archive: reqParam.is_archive || null
            };
            let latestVison = await VisionBoard.find({ user_id: req.authUserId })
              .sort({ order_no: -1 })
              .limit(1);
            const latestVisionItem = latestVison?.length > 0 ? latestVison[0] : null;
            console.log(latestVisionItem);
            if (latestVisionItem && latestVisionItem?.order_no) {
              createVision['order_no'] = latestVisionItem.order_no + 1;
            } else {
              createVision['order_no'] = 1;
            }

            let vision = await VisionBoard.create(createVision);
            console.log(createVision);
            res.data = vision;
            return Response.successResponseData(
              res,
              vision,
              SUCCESS,
              reqParam.visionId ? res.__('updateUserMood') : res.__('addUserVisionBoard')
            );
          } else {
            return Response.internalServerErrorResponse(res);
          }
        });
      }
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  deleteMyVision: (req, res) => {
    try {
      const queryParams = req.query;
      deleteMyDeleteValidation(req.query, res, async (validate) => {
        if (validate) {
          const vision = await VisionBoard.findById(req.query.visionId);
          if (vision) {
            let updateVision = {
              deletedAt: new Date()
            };
            await VisionBoard.findOneAndUpdate({ _id: req.query.visionId }, updateVision);
            return Response.successResponseWithoutData(res, res.__('myVisionDeleted'), SUCCESS);
          } else {
            return Response.successResponseWithoutData(res, res.__('visionNotFound'), FAIL);
          }
        } else {
          return Response.successResponseWithoutData(res, res.__('visionNotFound'), FAIL);
        }
      });
    } catch (err) {
      console.log(err);
      return Response.internalServerErrorResponse(res);
    }
  },

  reorderVision: async (req, res) => {
    try {
      const reqParam = req.body;
      reorderVisionValidation(reqParam, res, async (validate) => {
        if (validate) {
          const queryOperation = reqParam.vision_ids.map((id, index) => ({
            updateOne: {
              filter: { _id: id },
              update: { order_no: index + 1 }
            }
          }));

          let data = await VisionBoard.bulkWrite(queryOperation);

          if (data) {
            return Response.successResponseWithoutData(
              res,
              res.__('visionReorderedSuccessfully'),
              SUCCESS
            );
          } else {
            return Response.successResponseWithoutData(res, res.__('visionReorderedFailed'), FAIL);
          }
        } else {
          return Response.successResponseWithoutData(res, res.__('visionIdsNotFound'), FAIL);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  }
};
