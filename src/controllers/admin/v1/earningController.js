'use strict';

const { TransactionHistory } = require('@models');
const Response = require('@services/Response');
const { getEarningListValidation } = require('@services/adminValidations/earningValidations');
const { PAGE, PER_PAGE, SUCCESS } = require('@services/Constant');

module.exports = {
  /**
   * @description This function is used to get list of earnings
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  getEarningList: (req, res) => {
    try {
      const reqParam = req.query;
      getEarningListValidation(reqParam, res, async (validate) => {
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
          let sortBy = 'createdAt';
          let sortOrder = -1;
          if (reqParam.sortBy) {
            sortBy = reqParam.sortBy;
          }
          if (reqParam.sortOrder) {
            sortOrder = parseInt(reqParam.sortOrder);
          }
          let filterUserData = {
            $expr: {
              $eq: ['$$userId', '$_id']
            }
          };
          if (reqParam.searchKey) {
            filterUserData = {
              ...filterUserData,
              $or: [
                { name: { $regex: '.*' + reqParam.searchKey + '.*', $options: 'i' } },
                { email: { $regex: '.*' + reqParam.searchKey + '.*', $options: 'i' } },
                {
                  $expr: {
                    $regexMatch: {
                      input: { $concat: ['$country_code', '$mobile'] },
                      regex: reqParam.searchKey,
                      options: 'i'
                    }
                  }
                }
              ]
            };
          }
          const aggregateCondition = [
            {
              $match: {
                deletedAt: null
              }
            },
            {
              $group: {
                _id: '$user_id',
                transactionId: {
                  $last: '$transaction_id'
                },
                plan: {
                  $last: '$product_id'
                },
                startDate: {
                  $last: '$purchase_date'
                },
                endDate: {
                  $last: '$expires_date'
                },
                createdAt: {
                  $last: '$createdAt'
                },
                purchasedFromDevice: {
                  $last: '$purchased_from_device'
                }
              }
            },
            {
              $lookup: {
                from: 'users',
                let: {
                  userId: '$_id'
                },
                pipeline: [
                  {
                    $match: filterUserData
                  },
                  {
                    $limit: 1
                  },
                  {
                    $project: {
                      email: 1,
                      account_type: 1,
                      is_under_trial: 1,
                      country_code: 1,
                      mobile: 1
                    }
                  }
                ],
                as: 'users'
              }
            },
            {
              $unwind: {
                path: '$users',
                preserveNullAndEmptyArrays: false
              }
            },
            {
              $project: {
                userId: '$_id',
                transactionId: 1,
                plan: {
                  $switch: {
                    branches: [
                      {
                        case: { $eq: ['$plan', 'com.shoorah.monthly'] },
                        then: 'Monthly'
                      },
                      {
                        case: { $eq: ['$plan', 'com.shoorah.sixmonths'] },
                        then: 'Half Yearly'
                      },
                      {
                        case: { $eq: ['$plan', 'com.shoorah.annually'] },
                        then: 'Yearly'
                      }
                    ],
                    default: 'No subscription yet'
                  }
                },
                startDate: 1,
                endDate: 1,
                email: {
                  $cond: [
                    {
                      $gt: ['$users.email', null]
                    },
                    '$users.email',
                    { $concat: ['+', '$users.country_code', '$users.mobile'] }
                  ]
                },
                accountType: {
                  $cond: [
                    {
                      $eq: ['$users.is_under_trial', true]
                    },
                    0,
                    '$users.account_type'
                  ]
                },
                createdAt: 1,
                _id: 0,
                purchasedFromDevice: 1
              }
            },
            {
              $sort: {
                [sortBy]: sortOrder
              }
            },
            {
              $facet: {
                metaData: [
                  {
                    $count: 'totalRecords'
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
          ];
          const earningData = await TransactionHistory.aggregate(aggregateCondition);
          return Response.successResponseData(
            res,
            earningData[0].data,
            SUCCESS,
            res.__('earningListSuccess'),
            earningData[0].metaData[0]
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
