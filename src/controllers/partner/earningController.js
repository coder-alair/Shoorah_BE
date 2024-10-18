'use strict';

const Bcrypt = require('bcrypt');
const { Users, DeviceTokens } = require('@models');
const { getUploadURL, removeOldImage } = require('@services/s3Services');

const {
  RESPONSE_CODE,
  ACCOUNT_STATUS,
  FAIL,
  SUCCESS,
  USER_TYPE,
  EMAIL_VERIFICATION,
  DAY_LIMIT,
  OTP_LIMIT,
  RESET_PASSWORD,
  MAIL_SUBJECT,
  OTP_LENGTH,
  OTP_EXPIRY,
  CLOUDFRONT_URL,
  ADMIN_MEDIA_PATH
} = require('@services/Constant');
const {
  issueAdminToken,
  verifyAdminRefreshToken,
  issueAdminRefreshToken
} = require('@services/JwToken');
const Response = require('@services/Response');
const { makeRandomDigit } = require('@services/Helper');
const { storeDeviceToken } = require('@services/authServices');
const { sendOtp } = require('@services/Mailer');
const { Company } = require('../../models');
const { convertObjectKeysToCamelCase, toObjectId } = require('../../services/Helper');
const { COMPANY_MEDIA_PATH, PAGE, PER_PAGE, SORT_ORDER } = require('../../services/Constant');

module.exports = {
  /**
   * @description This function is used for get partner profile
   * @param {*} req
   * @param {*} res
   */

  getContentCount: async (req, res) => {
    try {
      let filterData = {
        introduce_by: req.authAdminId
      };
      const companies = await Company.find(filterData).select('_id');
      const company_count = companies.length;

      const total_users = await Users({ company_id: { $in: companies } });
      const total_company_user_count = total_users.length;

      const companyIds = companies.map((company) => company._id);
      const aggregateUserResults = await Users.aggregate([
        {
          $match: {
            company_id: { $in: companyIds },
            user_type: USER_TYPE.USER
          }
        },
        {
          $group: {
            _id: null,
            activeCompaniesUsers: {
              $sum: {
                $cond: [
                  { $eq: ['$status', 1] }, // Status in Users
                  1,
                  0
                ]
              }
            },
            inactiveCompaniesUsers: {
              $sum: {
                $cond: [
                  { $eq: ['$status', 0] }, // Status in Users
                  1,
                  0
                ]
              }
            }
          }
        }
      ]);

      const aggregateResults = await Company.aggregate([
        {
          $match: {
            introduce_by: toObjectId(req.authAdminId)
          }
        },
        {
          $group: {
            _id: null,

            totalSeatsBought: { $sum: '$no_of_seat_bought' },
            activeSeats: {
              $sum: {
                $cond: [{ $eq: ['$seat_active', true] }, '$no_of_seat_bought', 0]
              }
            },
            inactiveSeats: {
              $sum: {
                $cond: [{ $eq: ['$seat_active', false] }, '$no_of_seat_bought', 0]
              }
            },
            activeCompanies: {
              $sum: {
                $cond: [{ $eq: ['$restrict_company', false] }, 1, 0]
              }
            },
            inactiveCompanies: {
              $sum: {
                $cond: [{ $eq: ['$restrict_company', true] }, 1, 0]
              }
            },
            signedActive: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$contract_signed', true] },
                      { $eq: ['$restrict_company', false] }
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            signedInactive: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$contract_signed', true] },
                      { $eq: ['$restrict_company', true] }
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            negotiationActive: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$contract_progress', false] },
                      { $eq: ['$restrict_company', false] }
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            negotiationInactive: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$contract_progress', false] },
                      { $eq: ['$restrict_company', true] }
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            totalSigned: {
              $sum: {
                $cond: [{ $eq: ['$contract_signed', true] }, 1, 0]
              }
            },
            totalnegotiation: {
              $sum: {
                $cond: [{ $eq: ['$contract_progress', false] }, 1, 0]
              }
            }
          }
        }
      ]);

      const activeCompaniesUsers =
        aggregateUserResults && aggregateUserResults[0]
          ? aggregateUserResults[0].activeCompaniesUsers
          : 0;
      const inactiveCompaniesUsers =
        aggregateUserResults && aggregateUserResults[0]
          ? aggregateUserResults[0].inactiveCompaniesUsers
          : 0;
      const activeCompanies =
        aggregateResults && aggregateResults[0] ? aggregateResults[0].activeCompanies : 0;
      const inactiveCompanies =
        aggregateResults && aggregateResults[0] ? aggregateResults[0].inactiveCompanies : 0;
      const totalSeats =
        aggregateResults && aggregateResults[0] ? aggregateResults[0].totalSeatsBought : 0;
      const totalactiveSeats =
        aggregateResults && aggregateResults[0] ? aggregateResults[0].activeSeats : 0;
      const totalinactiveSeats =
        aggregateResults && aggregateResults[0] ? aggregateResults[0].inactiveSeats : 0;
      const signedActive =
        aggregateResults && aggregateResults[0] ? aggregateResults[0].signedActive : 0;
      const signedInactive =
        aggregateResults && aggregateResults[0] ? aggregateResults[0].signedInactive : 0;
      const negotiationActive =
        aggregateResults && aggregateResults[0] ? aggregateResults[0].negotiationActive : 0;
      const negotiationInactive =
        aggregateResults && aggregateResults[0] ? aggregateResults[0].negotiationInactive : 0;
      const totalSigned =
        aggregateResults && aggregateResults[0] ? aggregateResults[0].totalSigned : 0;
      const totalnegotiation =
        aggregateResults && aggregateResults[0] ? aggregateResults[0].totalnegotiation : 0;
      return Response.successResponseData(
        res,
        convertObjectKeysToCamelCase({
          total_company_user_count: total_company_user_count,
          totalCompanies: company_count,
          activeCompanies: activeCompanies,
          inactiveCompanies: inactiveCompanies,
          totalSeats: totalSeats,
          totalactiveSeats: totalactiveSeats,
          totalinactiveSeats: totalinactiveSeats,
          totalSigned: totalSigned,
          signedActive: signedActive,
          signedInactive: signedInactive,
          totalnegotiation: totalnegotiation,
          negotiationActive: negotiationActive,
          negotiationInactive: negotiationInactive,
          activeCompaniesUsers: activeCompaniesUsers,
          inactiveCompaniesUsers: inactiveCompaniesUsers
        }),
        SUCCESS,
        res.__('getContentsCountsSuccess')
      );
    } catch (err) {
      console.log(err);
      return Response.internalServerErrorResponse(res);
    }
  },

  getEarningDetails: async (req, res) => {
    try {
      const reqParam = req.query;
      const page = reqParam.page ? parseInt(reqParam.page) : PAGE;
      const perPage = reqParam.perPage ? parseInt(reqParam.perPage) : PER_PAGE;
      const skip = (page - 1) * perPage || 0;
      const sortBy = reqParam.sortBy || 'createdAt';
      const sortOrder = reqParam.sortOrder ? parseInt(reqParam.sortOrder) : SORT_ORDER;
      const filterData = {
        payment_complete: true || 1,
        introduce_by: toObjectId(req.authAdminId)
      };

      if (reqParam.searchKey) {
        const searchKey = (reqParam?.searchKey).toString();
        filterData.$or = [
          { company_name: { $regex: '.*' + searchKey + '.*', $options: 'i' } },
          { company_email: { $regex: '.*' + searchKey + '.*', $options: 'i' } }
        ];
      }

      let companies = await Company.find(filterData)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(perPage)
        .lean();

      const totalRecords = await Company.countDocuments({
        introduce_by: req.authAdminId,
        payment_complete: true || 1
      });
      const partner = await Users.findOne({ _id: req.authAdminId }).select('commission');

      if (companies.length > 0) {
        companies.map((i) => {
          if (!i.transaction_id) {
            i.transaction_id = Math.floor(Math.random() * 123456789);
          }
          if (!i.plan) {
            i.plan = 'Monthly';
          }

          if (i.plan) {
            i.status = 'Subscribed';
          } else {
            i.status = 'Not Subscribed';
          }

          i.company_logo =
            CLOUDFRONT_URL + COMPANY_MEDIA_PATH.COMPANY_PROFILE + '/' + i.company_logo;
          i.amount = i.no_of_seat_bought * i.seat_price;
          i.myEarning = parseFloat((i.amount * partner?.commission) / 100).toFixed(2) || 0;
        });
      }
      return Response.successResponseData(
        res,
        convertObjectKeysToCamelCase(companies),
        SUCCESS,
        res.__('partnerEarningsListSuccess'),
        {
          page,
          perPage,
          totalRecords
        }
      );
    } catch (err) {
      console.log(err);
      Response.internalServerErrorResponse(res);
    }
  }
};
