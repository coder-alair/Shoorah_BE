'use strict';

const {
  TopPicks,
  Focus,
  Affirmation,
  Meditation,
  Sound,
  Gratitude,
  Ritual,
  ContentApproval,
  ShoorahPods
} = require('@models');
const Response = require('@services/Response');
const {
  addEditTopPicksValidation,
  topPicksDetailsValidation,
  deleteTopPicksValidation,
  getContentTypeListValidation,
  bulkUpdateOperationsValidation
} = require('@services/adminValidations/topPicksValidations');
const { SUCCESS, FAIL, PAGE, PER_PAGE, STATUS, CONTENT_TYPE } = require('@services/Constant');
const { pagination } = require('@services/Helper');

module.exports = {
  /**
   * @description This function is used to add or edit top picks
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  addEditTopPicks: (req, res) => {
    try {
      const reqParam = req.body;
      addEditTopPicksValidation(reqParam, res, async (validate) => {
        if (validate) {
          let contentData;
          const findCondition = {
            _id: reqParam.contentTypeId,
            status: STATUS.ACTIVE,
            approved_by: {
              $ne: null
            }
          };
          switch (reqParam.contentType) {
            case CONTENT_TYPE.FOCUS:
              contentData = await Focus.findOne(findCondition, {
                _id: 1
              });
              break;
            case CONTENT_TYPE.AFFIRMATION:
              contentData = await Affirmation.findOne(findCondition, {
                _id: 1
              });
              break;
            case CONTENT_TYPE.MEDITATION:
              contentData = await Meditation.findOne(findCondition, {
                _id: 1
              });
              break;
            case CONTENT_TYPE.SOUND:
              contentData = await Sound.findOne(findCondition, {
                _id: 1
              });
              break;
            case CONTENT_TYPE.GRATITUDE:
              contentData = await Gratitude.findOne(findCondition, {
                _id: 1
              });
              break;
            case CONTENT_TYPE.RITUALS:
              contentData = await Ritual.findOne(findCondition, {
                _id: 1
              });
              break;
            case CONTENT_TYPE.SHOORAH_PODS:
              contentData = await ShoorahPods.findOne(findCondition, {
                _id: 1
              });
              break;
            default:
              return Response.successResponseWithoutData(
                res,
                res.__('selectValidContentType'),
                FAIL
              );
          }
          if (!contentData) {
            return Response.successResponseWithoutData(res, res.__('invalidContent'), FAIL);
          }
          const updateData = {
            content_type: reqParam.contentType,
            content_type_id: reqParam.contentTypeId,
            position: reqParam.position
          };
          if (reqParam.pickId) {
            const filterData = {
              _id: reqParam.pickId,
              deletedAt: null
            };
            const topPicksData = await TopPicks.findOneAndUpdate(filterData, updateData, {
              new: true,
              upsert: true
            }).select('_id');
            if (topPicksData) {
              return Response.successResponseWithoutData(
                res,
                res.__('topPicksDetailUpdated'),
                SUCCESS
              );
            } else {
              return Response.successResponseWithoutData(res, res.__('noTopPicksFound'), FAIL);
            }
          } else {
            await TopPicks.create(updateData);
            return Response.successResponseWithoutData(res, res.__('topPicksDetailAdded'), SUCCESS);
          }
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to get detailed list of top picks
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  topPicksDetails: (req, res) => {
    try {
      const reqParam = req.query;
      topPicksDetailsValidation(reqParam, res, async (validate) => {
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
          let filterCondition = {
            status: STATUS.ACTIVE,
            approved_by: {
              $ne: null
            }
          };
          let topPickCondition = {
            deletedAt: null
          };
          if (reqParam.searchKey) {
            filterCondition = {
              ...filterCondition,
              $or: [{ display_name: { $regex: '.*' + reqParam.searchKey + '.*', $options: 'i' } }]
            };
          }
          if (reqParam.id) {
            topPickCondition = {
              ...topPickCondition,
              _id: reqParam.id
            };
          }
          const topPicksDetailedData = await TopPicks.find(topPickCondition)
            .populate({
              path: 'content_type_id',
              select: 'display_name description status',
              match: filterCondition
            })
            .sort({ createdAt: -1 })
            .select({
              id: '$_id',
              content_type: 1,
              content_type_id: 1,
              createdAt: 1,
              position: 1,
              updatedAt: 1
            });
          if (topPicksDetailedData.length > 0) {
            const filterData = await topPicksDetailedData.filter((x) => x.content_type_id !== null);
            const topPicksData = await pagination(filterData, perPage, skip);
            return Response.successResponseData(
              res,
              topPicksData,
              SUCCESS,
              res.__('topPicksListSuccess'),
              {
                totalRecords: filterData.length,
                page,
                perPage
              }
            );
          } else {
            return Response.successResponseWithoutData(res, res.__('noTopPicksFound'), SUCCESS);
          }
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to get content list by content id
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  getContentTypeList: (req, res) => {
    try {
      const reqParam = req.query;
      getContentTypeListValidation(reqParam, res, async (validate) => {
        const contentType = parseInt(reqParam.contentType);
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
          let filterCondition = {
            status: STATUS.ACTIVE,
            approved_by: {
              $ne: null
            }
          };
          if (reqParam.searchKey) {
            filterCondition = {
              ...filterCondition,
              $or: [{ display_name: { $regex: '.*' + reqParam.searchKey + '.*', $options: 'i' } }]
            };
          }

          let resData;

          switch (contentType) {
            case CONTENT_TYPE.FOCUS:
              resData = await Focus.find(filterCondition, {
                id: '$_id',
                _id: 0,
                disPlayName: '$display_name'
              })
                .limit(perPage)
                .skip(skip);
              break;
            case CONTENT_TYPE.AFFIRMATION:
              resData = await Affirmation.find(filterCondition, {
                id: '$_id',
                _id: 0,
                disPlayName: '$display_name'
              })
                .populate({
                  path: 'focus_ids',
                  select: 'display_name'
                })
                .limit(perPage)
                .skip(skip);
              break;
            case CONTENT_TYPE.MEDITATION:
              resData = await Meditation.find(filterCondition, {
                id: '$_id',
                _id: 0,
                disPlayName: '$display_name',
                url: '$meditation_url',
                thumbnail: '$thumbnail'
              })
                .populate({
                  path: 'focus_ids',
                  select: 'display_name'
                })
                .limit(perPage)
                .skip(skip);
              break;
            case CONTENT_TYPE.SOUND:
              resData = await Sound.find(filterCondition, {
                id: '$_id',
                _id: 0,
                disPlayName: '$display_name',
                url: '$sound_url',
                thumbnail: '$sound_image'
              })
                .populate({
                  path: 'focus_ids',
                  select: 'display_name'
                })
                .limit(perPage)
                .skip(skip);
              break;
            case CONTENT_TYPE.GRATITUDE:
              resData = await Gratitude.find(filterCondition, {
                id: '$_id',
                _id: 0,
                disPlayName: '$display_name',
                url: '$gratitude_url',
                thumbnail: '$thumbnail'
              })
                .populate({
                  path: 'focus_ids',
                  select: 'display_name'
                })
                .limit(perPage)
                .skip(skip);
              break;
            case CONTENT_TYPE.RITUALS:
              resData = await Ritual.find(filterCondition, {
                id: '$_id',
                _id: 0,
                disPlayName: '$display_name',
                url: '$ritual_url',
                thumbnail: '$thumbnail'
              })
                .populate({
                  path: 'focus_ids',
                  select: 'display_name'
                })
                .limit(perPage)
                .skip(skip);
              break;
            case CONTENT_TYPE.SHOORAH_PODS:
              resData = await ShoorahPods.find(filterCondition, {
                id: '$_id',
                _id: 0,
                disPlayName: '$display_name',
                url: '$pods_url'
              })
                .populate({
                  path: 'focus_ids',
                  select: 'display_name'
                })
                .limit(perPage)
                .skip(skip);
              break;
            default:
              return Response.successResponseWithoutData(
                res,
                res.__('selectValidContentType'),
                FAIL
              );
          }
          if (resData.length > 0) {
            return Response.successResponseData(
              res,
              resData,
              SUCCESS,
              res.__('contentTypeListSuccess'),
              {
                page,
                perPage
              }
            );
          } else {
            return Response.successResponseWithoutData(res, res.__('noDataFound'), SUCCESS);
          }
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to delete top picks
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  deleteTopPicks: (req, res) => {
    try {
      const reqParam = req.query;
      deleteTopPicksValidation(reqParam, res, async (validate) => {
        if (validate) {
          const deletedData = await TopPicks.findByIdAndUpdate(
            reqParam.pickId,
            { deletedAt: new Date() },
            { new: true }
          ).select('_id');
          if (deletedData) {
            return Response.successResponseWithoutData(
              res,
              res.__('topPicksDeleteSuccess'),
              SUCCESS
            );
          } else {
            return Response.successResponseWithoutData(res, res.__('noTopPicksFound'), FAIL);
          }
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (er) {
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to perform bulk update of content status.
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  bulkContentStatusUpdate: (req, res) => {
    try {
      const reqParam = req.body;
      bulkUpdateOperationsValidation(reqParam, res, async (validate) => {
        if (validate) {
          const filterData = {
            _id: {
              $in: reqParam.contentIds
            },
            status: {
              $ne: STATUS.DELETED
            },
            deletedAt: null
          };
          const updateData = {
            status: reqParam.contentStatus,
            deletedAt: reqParam.contentStatus === STATUS.DELETED ? new Date() : null
          };
          switch (reqParam.contentType) {
            case CONTENT_TYPE.FOCUS:
              await Focus.bulkWrite([
                {
                  updateMany: {
                    filter: filterData,
                    update: updateData
                  }
                }
              ]);
              if (reqParam.contentStatus === STATUS.DELETED) {
                const filterContentCondition = {
                  content_type_id: {
                    $in: reqParam.contentIds
                  },
                  content_type: CONTENT_TYPE.FOCUS
                };
                await ContentApproval.updateMany(filterContentCondition, {
                  deletedAt: new Date()
                });
              }
              break;
            case CONTENT_TYPE.AFFIRMATION:
              await Affirmation.bulkWrite([
                {
                  updateMany: {
                    filter: filterData,
                    update: updateData
                  }
                }
              ]);
              if (reqParam.contentStatus === STATUS.DELETED) {
                const filterContentCondition = {
                  content_type_id: {
                    $in: reqParam.contentIds
                  },
                  content_type: CONTENT_TYPE.AFFIRMATION
                };
                await ContentApproval.updateMany(filterContentCondition, {
                  deletedAt: new Date()
                });
              }
              break;
            case CONTENT_TYPE.MEDITATION:
              await Meditation.bulkWrite([
                {
                  updateMany: {
                    filter: filterData,
                    update: updateData
                  }
                }
              ]);
              if (reqParam.contentStatus === STATUS.DELETED) {
                const filterContentCondition = {
                  content_type_id: {
                    $in: reqParam.contentIds
                  },
                  content_type: CONTENT_TYPE.MEDITATION
                };
                await ContentApproval.updateMany(filterContentCondition, {
                  deletedAt: new Date()
                });
              }
              break;
            case CONTENT_TYPE.SOUND:
              await Sound.bulkWrite([
                {
                  updateMany: {
                    filter: filterData,
                    update: updateData
                  }
                }
              ]);
              if (reqParam.contentStatus === STATUS.DELETED) {
                const filterContentCondition = {
                  content_type_id: {
                    $in: reqParam.contentIds
                  },
                  content_type: CONTENT_TYPE.SOUND
                };
                await ContentApproval.updateMany(filterContentCondition, {
                  deletedAt: new Date()
                });
              }
              break;
            case CONTENT_TYPE.GRATITUDE:
              await Gratitude.bulkWrite([
                {
                  updateMany: {
                    filter: filterData,
                    update: updateData
                  }
                }
              ]);
              if (reqParam.contentStatus === STATUS.DELETED) {
                const filterContentCondition = {
                  content_type_id: {
                    $in: reqParam.contentIds
                  },
                  content_type: CONTENT_TYPE.GRATITUDE
                };
                await ContentApproval.updateMany(filterContentCondition, {
                  deletedAt: new Date()
                });
              }
              break;
            case CONTENT_TYPE.RITUALS:
              await Ritual.bulkWrite([
                {
                  updateMany: {
                    filter: filterData,
                    update: updateData
                  }
                }
              ]);
              if (reqParam.contentStatus === STATUS.DELETED) {
                const filterContentCondition = {
                  content_type_id: {
                    $in: reqParam.contentIds
                  },
                  content_type: CONTENT_TYPE.RITUALS
                };
                await ContentApproval.updateMany(filterContentCondition, {
                  deletedAt: new Date()
                });
              }
              break;
            case CONTENT_TYPE.SHOORAH_PODS:
              await ShoorahPods.bulkWrite([
                {
                  updateMany: {
                    filter: filterData,
                    update: updateData
                  }
                }
              ]);
              if (reqParam.contentStatus === STATUS.DELETED) {
                const filterContentCondition = {
                  content_type_id: {
                    $in: reqParam.contentIds
                  },
                  content_type: CONTENT_TYPE.SHOORAH_PODS
                };
                await ContentApproval.updateMany(filterContentCondition, {
                  deletedAt: new Date()
                });
              }
              break;
            default:
              return Response.successResponseWithoutData(
                res,
                res.__('selectValidContentType'),
                FAIL
              );
          }
          return Response.successResponseWithoutData(res, res.__('contentUpdatedSuccess'), SUCCESS);
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  }
};
