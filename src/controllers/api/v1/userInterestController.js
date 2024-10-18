'use strict';

const { UserInterest, Focus } = require('@models');
const Response = require('@services/Response');
const {
  addEditUserInterestValidation,
  focusListValidation
} = require('@services/userValidations/userInterestValidations');
const { FAIL, SUCCESS, FOCUS_TYPE, STATUS } = require('@services/Constant');
const { toObjectId } = require('@services/Helper');

module.exports = {
  /**
   * @description This function is required to add/update user interest
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  addUserInterest: (req, res) => {
    try {
      const reqParam = req.body;
      addEditUserInterestValidation(reqParam, res, async (validate) => {
        if (validate) {
          let updateData;
          reqParam.focusType === FOCUS_TYPE.MAIN
            ? (updateData = { main_focus_ids: reqParam.mainFocusIds })
            : (updateData = { affirmation_focus_ids: reqParam.affirmationFocusIds });
          const newData = await UserInterest.findOneAndUpdate(
            { user_id: req.authUserId },
            updateData,
            { upsert: true, new: true }
          );
          if (newData) {
            return Response.successResponseWithoutData(res, res.__('userInterestSucess'), SUCCESS);
          } else {
            return Response.successResponseWithoutData(res, res.__('somethingWrong'), FAIL);
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
   * @description This function is used to get focus list based on focus types
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  focusList: (req, res) => {
    try {
      const reqParam = req.params;
      focusListValidation(reqParam, res, async (validate) => {
        if (validate) {
          const filterCondition = {
            focus_type: parseInt(reqParam.focusType),
            status: STATUS.ACTIVE,
            approved_by: {
              $ne: null
            }
          };
          const aggregationPipeline = [
            {
              $match: filterCondition
            },
            {
              $lookup: {
                from: 'user_interests',
                let: {
                  focusId: '$_id'
                },
                pipeline: [
                  {
                    $match: {
                      user_id: toObjectId(req.authUserId),
                      deletedAt: null
                    }
                  },
                  {
                    $project: {
                      isSaved: {
                        $cond: [
                          {
                            $or: [
                              {
                                $in: ['$$focusId', '$main_focus_ids']
                              },
                              {
                                $in: ['$$focusId', '$affirmation_focus_ids']
                              }
                            ]
                          },
                          true,
                          false
                        ]
                      }
                    }
                  }
                ],
                as: 'userInterest'
              }
            },
            {
              $unwind: {
                path: '$userInterest',
                preserveNullAndEmptyArrays: true
              }
            },
            {
              $project: {
                focusId: '$_id',
                focusName: '$display_name',
                focusImage: '$image_url',
                isSaved: {
                  $cond: [
                    {
                      $gt: ['$userInterest', null]
                    },
                    '$userInterest.isSaved',
                    false
                  ]
                },
                _id: 0
              }
            },
            {
              $sort: {
                isSaved: -1
              }
            }
          ];
          const focusData = await Focus.aggregate(aggregationPipeline);
          if (focusData.length > 0) {
            return Response.successResponseData(
              res,
              focusData,
              SUCCESS,
              res.__('focusListSuccess')
            );
          } else {
            return Response.successResponseWithoutData(res, res.__('noFocusFound'), FAIL);
          }
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },
  getUserInterestdetails: async (req, res) => {
    try {
      const reqParam = req.params;
      focusListValidation(reqParam, res, async (validate) => {
        if (validate) {
          const filterCondition = {
            deletedAt: { $ne: null }
          };
          const userId = reqParam.authUserId || req.body.user_id;

          const userInterest = await UserInterest.findOne({ user_id: userId });

          if (!userInterest) {
            return Response.errorResponseData(res, 'User interest not found.');
          }

          if (parseInt(reqParam.focusType) === 1) {
            return Response.successResponseData(res, {
              main_focus_ids: userInterest.main_focus_ids
            });
          } else if (parseInt(reqParam.focusType) === 2) {
            return Response.successResponseData(res, {
              affirmation_focus_ids: userInterest.affirmation_focus_ids
            });
          } else {
            return Response.errorResponseData(res, 'Invalid focus type.');
          }
        }
      });
    } catch (err) {
      console.error('Error fetching user interest details:', err);
      return Response.internalServerErrorResponse(res);
    }
  },
  myFocuses: async (req, res) => {
    try {
      const reqParam = req.params;
      focusListValidation(reqParam, res, async (validate) => {
        if (validate) {
          const filterCondition = {
            focus_type: parseInt(reqParam.focusType),
            status: STATUS.ACTIVE,
            approved_by: {
              $ne: null
            }
          };
          const aggregationPipeline = [
            {
              $match: filterCondition
            },
            {
              $lookup: {
                from: 'user_interests',
                let: {
                  focusId: '$_id'
                },
                pipeline: [
                  {
                    $match: {
                      user_id: toObjectId(req.authUserId),
                      deletedAt: null
                    }
                  },
                  {
                    $project: {
                      isSaved: {
                        $cond: [
                          {
                            $or: [
                              {
                                $in: ['$$focusId', '$main_focus_ids']
                              },
                              {
                                $in: ['$$focusId', '$affirmation_focus_ids']
                              }
                            ]
                          },
                          true,
                          false
                        ]
                      }
                    }
                  }
                ],
                as: 'userInterest'
              }
            },
            {
              $unwind: {
                path: '$userInterest',
                preserveNullAndEmptyArrays: true
              }
            },
            {
              $project: {
                focusId: '$_id',
                focusName: '$display_name',
                focusImage: '$image_url',
                isSaved: {
                  $cond: [
                    {
                      $gt: ['$userInterest', null]
                    },
                    '$userInterest.isSaved',
                    false
                  ]
                },
                _id: 0
              }
            },
            {
              $sort: {
                isSaved: -1
              }
            }
          ];
          const focusData = await Focus.aggregate(aggregationPipeline);
          if (focusData.length > 0) {
            return Response.successResponseData(
              res,
              focusData,
              SUCCESS,
              res.__('focusListSuccess')
            );
          } else {
            return Response.successResponseWithoutData(res, res.__('noFocusFound'), FAIL);
          }
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  }
};
