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
const {
  COMPANY_MEDIA_PATH,
  KLAVIYO_LIST,
  PARTNER_MEDIA_PATH,
  STATUS,
  PAGE,
  PER_PAGE,
  SORT_ORDER,
  SORT_BY
} = require('../../services/Constant');
const {
  unixTimeStamp,
  toObjectId,
  convertObjectKeysToCamelCase,
  addEditKlaviyoUser
} = require('../../services/Helper');
const { IntroduceCompany, Company, CompanyUsers } = require('../../models');
const { partnerListValidation } = require('../../services/adminValidations/partnerValidations');
const { newIntroduceCompany } = require('../../services/adminServices/partnerIntroduced');
const { sendReusableTemplate } = require('../../services/Mailer');

module.exports = {
  /**
   * @description This function is used for get partner profile
   * @param {*} req
   * @param {*} res
   */

  getIntroducedCompany: async (req, res) => {
    try {
      const reqParam = req.params;
      const findUserCondition = {
        _id: req.authAdminId,
        status: ACCOUNT_STATUS.ACTIVE,
        user_type: USER_TYPE.PARTNER
      };
      let userData = await Users.findOne(findUserCondition, {
        _id: 1,
        name: 1,
        email: 1,
        dob: 1,
        gender: 1,
        user_profile: 1,
        first_name: 1,
        last_name: 1,
        country: 1,
        job_role: 1,
        status: 1,
        account_type: 1,
        company_id: 1,
        commission: 1,
        mobile: 1
      }).lean();

      if (userData) {
        userData.profile =
          CLOUDFRONT_URL + PARTNER_MEDIA_PATH.PARTNER_PROFILE + '/' + userData.user_profile;
        userData.jobRole = userData?.job_role;
        userData.id = userData?._id;

        return Response.successResponseData(
          res,
          userData,
          SUCCESS,
          res.__('getPartnerProfileSuccess')
        );
      } else {
        return Response.successResponseWithoutData(res, res.__('userDataNotFound'), FAIL);
      }
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  addIntroduceCompany: async (req, res) => {
    try {
      const reqParam = req.body;
      const findUserCondition = {
        email: reqParam.company_email,
        status: STATUS.ACTIVE,
        user_type: { $in: [USER_TYPE.COMPANY_ADMIN, USER_TYPE.COMPANY_SUB_ADMIN] }
      };
      let userData = await Users.findOne(findUserCondition, {
        _id: 1,
        name: 1,
        email: 1,
        dob: 1,
        gender: 1,
        user_profile: 1,
        first_name: 1,
        last_name: 1,
        country: 1,
        job_role: 1,
        status: 1,
        account_type: 1,
        company_id: 1
      }).lean();

      const existingCompanyData = await IntroduceCompany.findOne({
        company_email: reqParam.company_email
      });

      if (userData || existingCompanyData) {
        return Response.successResponseWithoutData(res, res.__('userAlreadyExists'), FAIL);
      }

      if (!userData && !existingCompanyData) {
        const reqEmail = reqParam.company_email.toLowerCase().trim();
        let updateData = {
          company_name: reqParam.company_name?.trim(),
          company_email: reqEmail,
          company_address: reqParam.company_address,
          contact_person: reqParam.contact_person,
          contact_number: reqParam.contact_number,
          company_type: reqParam.company_type,
          email_intro_made: reqParam.email_intro_made,
          introduce_by: req.authAdminId
        };
        let userProfileUrl;
        if (reqParam.profile) {
          const existingProfile = await Users.findOne(findUserCondition).select('user_profile');
          if (existingProfile && existingProfile.user_profile) {
            await removeOldImage(
              existingProfile.user_profile,
              COMPANY_MEDIA_PATH.COMPANY_PROFILE,
              res
            );
          }
          const imageExtension = reqParam.company_logo.split('/')[1];
          const profileImage = `${unixTimeStamp(new Date())}-${makeRandomDigit(
            4
          )}.${imageExtension}`;
          userProfileUrl = await getUploadURL(
            reqParam.imageUrl,
            profileImage,
            COMPANY_MEDIA_PATH.COMPANY_PROFILE
          );
          updateData = {
            ...updateData,
            company_logo: profileImage
          };
        }
        const companyData = await IntroduceCompany.create(updateData);
        const partner = await Users.findOne({ _id: req.authAdminId });
        if (partner) {
          await newIntroduceCompany(partner.name, req.authAdminId);
        }

        let superAdmins = await Users.find({
          user_type: USER_TYPE.SUPER_ADMIN,
          deletedAt: null
        }).select('email name');

        if (superAdmins.length) {
          for (const user of superAdmins) {
            let locals = {
              title: 'NEW INTRODUCED COMPANY',
              titleButton: 'Go to dashboard',
              titleButtonUrl: 'https://admin.shoorah.io',
              titleImage: 'https://staging-media.shoorah.io/email_assets/Shoorah_brain.png',
              name: user.name,
              firstLine: `I hope this message finds you well. I am delighted to introduce you to ${companyData.company_name}, where we are passionate about mental health and awareness at ${companyData.company_name}`,
              secondLine: `Please contact ${companyData.company_name} at their email address ${companyData.company_email} `,
              thirdLine: '',
              regards: `${partner.name}`
            };
            await sendReusableTemplate(user.email, locals, 'NEW INTRODUCED COMPANY');
          }
        }

        if (companyData) {
          return Response.successResponseWithoutData(
            res,
            res.__('introduceCompanyAdded'),
            SUCCESS,
            userProfileUrl || null
          );
        }
      } else {
        return Response.successResponseWithoutData(res, res.__('userDataNotFound'), FAIL);
      }
    } catch (error) {
      console.error(error);
      if (error.code == 11000) {
        if (error.message.includes('company_name_1')) {
          return Response.errorResponseWithoutData(
            res,
            'Company Name is already registered !',
            RESPONSE_CODE.BAD_REQUEST
          );
        } else if (error.message.includes('company_email_1')) {
          return Response.errorResponseWithoutData(
            res,
            'Company Email is already registered !',
            RESPONSE_CODE.BAD_REQUEST
          );
        } else {
          return Response.errorResponseWithoutData(res, error.message, RESPONSE_CODE.BAD_REQUEST);
        }
      }
      return Response.internalServerErrorResponse(res);
    }
  },

  getIntroduceCompanies: async (req, res) => {
    try {
      const reqParam = req.query;
      await IntroduceCompany.updateMany(
        { email_intro_made: { $exists: false } },
        {
          $set: {
            email_intro_made: false
          }
        }
      );
      partnerListValidation(reqParam, res, async (validate) => {
        if (validate) {
          const page = reqParam.page ? parseInt(reqParam.page) : PAGE;
          const perPage = reqParam.perPage ? parseInt(reqParam.perPage) : PER_PAGE;
          const skip = (page - 1) * perPage || 0;
          const sortBy = reqParam.sortBy || SORT_BY;
          const sortOrder = reqParam.sortOrder ? parseInt(reqParam.sortOrder) : SORT_ORDER;
          const filterData = {
            introduce_by: { $eq: toObjectId(req.authAdminId) },
            deletedAt: {
              $eq: null
            },
            ...(reqParam.searchKey && {
              $or: [
                { company_name: { $regex: '.*' + reqParam.searchKey + '.*', $options: 'i' } },
                { company_email: { $regex: '.*' + reqParam.searchKey + '.*', $options: 'i' } }
              ]
            })
          };
          const aggregationPipeline = [
            {
              $match: filterData
            },
            {
              $sort: {
                [sortBy]: sortOrder
              }
            },
            {
              $skip: skip
            },
            {
              $limit: perPage
            },
            {
              $project: {
                id: '$_id',
                name: '$company_name',
                profile: {
                  $concat: [
                    CLOUDFRONT_URL,
                    COMPANY_MEDIA_PATH.COMPANY_PROFILE,
                    '/',
                    '$company_logo'
                  ]
                },
                contactPerson: '$contact_person',
                companyType: '$company_type',
                email: '$company_email',
                mobile: '$contact_number',
                email_intro_made: '$email_intro_made',
                createdAt: 1,
                _id: 0
              }
            }
          ];
          const totalRecords = await IntroduceCompany.countDocuments(filterData);
          const introduceCompanies = await IntroduceCompany.aggregate(aggregationPipeline);
          return Response.successResponseData(
            res,
            introduceCompanies,
            SUCCESS,
            res.__('introduceCompaniesListSuccess'),
            {
              page,
              perPage,
              totalRecords
            }
          );
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  getMyIntroduceCompanyList: async (req, res) => {
    try {
      const reqParam = req.query;
      const page = reqParam.page ? parseInt(reqParam.page) : PAGE;
      const perPage = reqParam.perPage ? parseInt(reqParam.perPage) : PER_PAGE;
      const skip = (page - 1) * perPage || 0;
      const sortBy = reqParam.sortBy || 'createdAt';
      const sortOrder = reqParam.sortOrder ? parseInt(reqParam.sortOrder) : SORT_ORDER;
      const searchKey = reqParam.searchKey && reqParam.searchKey.toString();
      const filterData = {
        introduce_by: toObjectId(req.authAdminId)
      };

      if (searchKey) {
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

      const totalRecords = await Company.countDocuments();

      if (companies.length > 0) {
        for (const i of companies) {
          let companyAdmin = await Users.findOne({
            company_id: i._id,
            user_type: USER_TYPE.COMPANY_ADMIN
          })
            .select('status name user_type email _id')
            .lean();
          i.status = companyAdmin.status;
          i.adminId = companyAdmin._id;
          i.company_logo =
            CLOUDFRONT_URL + COMPANY_MEDIA_PATH.COMPANY_PROFILE + '/' + i.company_logo;

          let profile = {
            email: i.email,
            userType: i.user_type,
            firstName: i.name
          };

          await addEditKlaviyoUser(profile);
        }
      }

      return Response.successResponseData(res, companies, SUCCESS, res.__('companiesListSuccess'), {
        page,
        perPage,
        totalRecords
      });
    } catch (err) {
      console.error(err);
      return Response.errorResponseWithoutData(res, err.message, FAIL);
    }
  },

  getEarningsCounts: async (req, res) => {
    try {
      const reqParam = req.query;
      let aggregateCompanyUsersCondition = [];
      let aggregateCompanyCondition = [];
      let totalUsers = 0;

      if (reqParam.companyId && reqParam.companyId != 'All') {
        let users = await Users.find({
          company_id: toObjectId(reqParam.companyId),
          user_type: USER_TYPE.USER
        });
        totalUsers = users.length;

        aggregateCompanyCondition = [
          {
            $match: {
              _id: toObjectId(reqParam.companyId),
              introduce_by: toObjectId(req.authAdminId)
            }
          },
          {
            $project: {
              _id: 0,
              sixMonth: { $multiply: [{ $multiply: ['$no_of_seat_bought', '$seat_price'] }, 6] },
              totalAnnualEarning: {
                $multiply: [{ $multiply: ['$no_of_seat_bought', '$seat_price'] }, 12]
              },
              monthly: { $multiply: ['$no_of_seat_bought', '$seat_price'] }
            }
          }
        ];
      } else {
        let companies = await Company.find({ introduce_by: toObjectId(req.authAdminId) }).select(
          '_id'
        );
        let companyIds = companies.map((company) => company._id);
        let users = await Users.find({
          company_id: { $in: companyIds },
          user_type: USER_TYPE.USER
        });
        totalUsers = users.length;

        aggregateCompanyCondition = [
          {
            $match: {
              restrict_company: false,
              introduce_by: toObjectId(req.authAdminId)
            }
          },
          {
            $group: {
              _id: null,
              totalAnnualEarning: { $sum: { $multiply: ['$no_of_seat_bought', '$seat_price'] } }
            }
          },
          {
            $project: {
              _id: 0,
              totalAnnualEarning: 1,
              sixMonth: { $divide: ['$totalAnnualEarning', 2] },
              monthly: { $divide: ['$totalAnnualEarning', 12] }
            }
          }
        ];
      }
      let partner = await Users.findOne({ _id: req.authAdminId }).select('commission');
      const companyStats = await Company.aggregate(aggregateCompanyCondition);

      const totalCompanyUsers = totalUsers;
      const totalCompanyStats = companyStats[0];
      let updatedStats;
      if (totalCompanyStats) {
        updatedStats = {
          monthly:
            parseFloat((totalCompanyStats?.monthly * partner?.commission) / 100).toFixed(2) || 0,
          sixMonth:
            parseFloat((totalCompanyStats?.sixMonth * partner?.commission) / 100).toFixed(2) || 0,
          totalAnnualEarning:
            parseFloat((totalCompanyStats?.totalAnnualEarning * partner?.commission) / 100).toFixed(
              2
            ) || 0
        };
      } else {
        updatedStats = {
          monthly: 0,
          sixMonth: 0,
          totalAnnualEarning: 0
        };
      }

      const result = {
        totalCompanyUsers: totalCompanyUsers || 0,
        totalCompanyAnnualEarning: updatedStats?.totalAnnualEarning || 0,
        totalCompanySixMonthEarning: updatedStats?.sixMonth || 0,
        totalCompanyMonthlyEarning: updatedStats?.monthly || 0
      };

      return Response.successResponseData(
        res,
        convertObjectKeysToCamelCase(result),
        SUCCESS,
        res.__('myIntroduceEarning')
      );
    } catch (err) {
      console.log(err);
      return Response.internalServerErrorResponse(res);
    }
  }
};
