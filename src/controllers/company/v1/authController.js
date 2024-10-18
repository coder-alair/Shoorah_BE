'use strict';

const Bcrypt = require('bcrypt');
const { DeviceTokens } = require('@models');
const { sendPassword } = require('@services/Mailer');
const { generatePassword } = require('@services/authServices');
const { getUploadURL, removeOldImage } = require('@services/s3Services');

const {
  removeAdminDeviceTokenValidation,
  addEditDeviceTokenValidation
} = require('@services/companyValidations/companyValidations');
const { RESPONSE_CODE, FAIL, SUCCESS, CLOUDFRONT_URL } = require('@services/Constant');
const {
  issueCompanyToken,
  verifyCompanyRefreshToken,
  issueCompanyRefreshToken
} = require('@services/JwToken');
const Response = require('@services/Response');
const { storeDeviceToken } = require('@services/authServices');
const { COMPANY_MEDIA_PATH, USER_TYPE, MAIL_SUBJECT } = require('../../../services/Constant');
const Company = require('../../../models/Company');
const {
  companyLoginValidations
} = require('../../../services/companyValidations/companyLoginValidations');
const { newCompanyNotify } = require('../../../services/adminServices/companyStatusNotify');
const Users = require('../../../models/Users');
const { unixTimeStamp, makeRandomDigit, makeRandomString } = require('@services/Helper');
const { sendB2BPassword } = require('../../../services/Mailer');
const CompanySubscriptions = require('../../../models/CompanySubscription');
const { toObjectId } = require('../../../services/Helper');

module.exports = {
  /**
   * @description This function is used for company login
   * @param {*} req
   * @param {*} res
   * @return {*}
   */
  companyLogin: (req, res) => {
    try {
      const reqParam = req.body;
      companyLoginValidations(reqParam, res, async (validate) => {
        if (validate) {
          const reqEmail = reqParam.email.toLowerCase().trim();
          const findUserCondition = {
            company_email: reqEmail
          };
          const user = await Company.findOne(findUserCondition);

          if (user) {
            user.company_logo =
              CLOUDFRONT_URL + COMPANY_MEDIA_PATH.COMPANY_PROFILE + '/' + user.company_logo;
            Bcrypt.compare(reqParam.password, user.password, async (err, result) => {
              if (!result) {
                return Response.errorResponseData(
                  res,
                  res.__('companyPasswordNotMatch'),
                  RESPONSE_CODE.BAD_REQUEST
                );
              }
              if (result) {
                const meta = {
                  token: issueCompanyToken({
                    id: user._id
                  }),
                  refreshToken: issueCompanyRefreshToken({
                    id: user._id
                  })
                };
                const resObj = {
                  id: user._id,
                  companyName: user.company_name,
                  companyEmail: user.company_email,
                  contactNumber: user.contact_number,
                  contactPerson: user.contact_person,
                  companyLogo: user.company_logo
                };
                return Response.successResponseData(
                  res,
                  resObj,
                  SUCCESS,
                  res.__('loginSuccess'),
                  meta
                );
              }
            });
          } else {
            return Response.successResponseWithoutData(res, res.__('companyNotFound'), FAIL);
          }
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      console.log(err);
      return Response.internalServerErrorResponse(res);
    }
  },

  updateCompany: async (req, res) => {
    try {
      let {
        company_logo,
        company_name,
        company_address,
        company_email,
        contact_person,
        contact_number,
        no_of_seat_bought,
        seat_price,
        seat_active,
        contract_start_date,
        contract_end_date,
        contract_progress,
        b2b_interest_via,
        terms_agreed,
        contract_sent,
        contract_signed,
        invoice_raised,
        payment_complete,
        restrict_company,
        salesman,
        role,
        currency,
        company_type,
        shuru_usage
      } = req.body;

      company_name = company_name?.toLowerCase();
      company_address = company_address?.toLowerCase();
      company_email = company_email?.toLowerCase();
      contact_person = contact_person?.toLowerCase();
      company_type = company_type?.toLowerCase();

      let { id } = req.params;
      if (!id) {
        id = req.authCompanyId;
      }

      const company = await Company.findOne({ _id: id });
      if (!company)
        return Response.errorResponseWithoutData(
          res,
          'No Company with this id',
          RESPONSE_CODE.NOT_FOUND
        );

      let uploadURL = null;

      if (company_logo) {
        // delete old logo from the server and save in database
        await removeOldImage(company.company_logo, COMPANY_MEDIA_PATH.COMPANY_PROFILE, res);

        const imageExtension = company_logo.split('/')[1];
        const companyImage = `${unixTimeStamp(new Date())}-${makeRandomDigit(4)}.${imageExtension}`;

        let uploaded = await getUploadURL(
          company_logo,
          companyImage,
          COMPANY_MEDIA_PATH.COMPANY_PROFILE
        );

        uploadURL = uploaded?.uploadURL;
        company_logo = uploaded?.filename;
      }

      if (company_email) {
        if (company_email != company.company_email) {
          let password = makeRandomDigit(2) + makeRandomString(5) + makeRandomDigit(4);
          const hashPassword = await generatePassword(password);

          await Company.findByIdAndUpdate(id, {
            company_logo,
            company_name,
            company_address,
            contact_person,
            company_email,
            contact_number,
            no_of_seat_bought,
            seat_price,
            currency,
            seat_active,
            contract_start_date,
            contract_end_date,
            contract_progress,
            b2b_interest_via,
            terms_agreed,
            contract_sent,
            contract_signed,
            invoice_raised,
            payment_complete,
            restrict_company,
            salesman,
            role,
            shuru_usage,
            company_type
          });

          await Users.updateOne(
            { company_id: id, user_type: USER_TYPE.COMPANY_ADMIN },
            {
              $set: {
                email: company_email,
                name: contact_person,
                password: hashPassword,
                user_profile: company_logo
              }
            }
          );

          const locals = {
            name: company_name,
            email: company_email,
            password: password,
            subject: 'Welcome to Shoorah'
          };
          await sendB2BPassword(company_email, MAIL_SUBJECT.B2B_WELCOME, locals);

          const updated = await Company.findOne({ _id: id });
          return Response.successResponseData(
            res,
            updated,
            SUCCESS,
            res.__('companyDetailsUpdated'),
            { uploadURL }
          );
        }
      }

      await Company.findByIdAndUpdate(id, {
        company_logo,
        company_name,
        company_address,
        contact_person,
        contact_number,
        no_of_seat_bought,
        seat_price,
        currency,
        seat_active,
        contract_start_date,
        contract_end_date,
        contract_progress,
        b2b_interest_via,
        terms_agreed,
        contract_sent,
        contract_signed,
        invoice_raised,
        payment_complete,
        restrict_company,
        salesman,
        role,
        company_type,
        shuru_usage
      });

      await Users.updateOne(
        { company_id: id, user_type: USER_TYPE.COMPANY_ADMIN },
        {
          $set: {
            name: contact_person,
            user_profile: company_logo
          }
        }
      );

      const updated = await Company.findOne({ _id: id }).lean();
      const companyAdmin = await Users.findOne({
        company_id: id,
        user_type: USER_TYPE.COMPANY_ADMIN
      }).lean();

      updated.status = companyAdmin.status;
      updated.adminId = companyAdmin._id;

      if (no_of_seat_bought != company.no_of_seat_bought) {
        await newCompanyNotify(
          companyAdmin.name,
          companyAdmin._id,
          id,
          ` has updated company seats.`
        );
      }

      return Response.successResponseData(res, updated, SUCCESS, res.__('companyDetailsUpdated'), {
        uploadURL
      });
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
        } else if (error.message.includes('contact_number_1')) {
          return Response.errorResponseWithoutData(
            res,
            'Company Number is already registered !',
            RESPONSE_CODE.BAD_REQUEST
          );
        } else {
          return Response.errorResponseWithoutData(res, error.message, RESPONSE_CODE.BAD_REQUEST);
        }
      }
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to add update device token.
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  addEditDeviceToken: (req, res) => {
    try {
      const reqParam = {
        deviceType: req.headers.devicetype,
        deviceToken: req.headers.devicetoken
      };
      addEditDeviceTokenValidation(reqParam, res, async (validate) => {
        if (validate) {
          await storeDeviceToken(req.authCompanyId, reqParam.deviceToken, reqParam.deviceType);
          return Response.successResponseWithoutData(res, res.__('deviceTokenUpdated'), SUCCESS);
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @descriptiom This function is used to remove device token
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  removeCompanyDeviceToken: (req, res) => {
    try {
      const reqParam = req.headers;
      reqParam.deviceToken = req.headers.devicetoken;
      removeAdminDeviceTokenValidation(reqParam, res, async (validate) => {
        if (validate) {
          await DeviceTokens.findOneAndDelete({
            user_id: req.authCompanyId,
            device_token: reqParam.deviceToken
          });
          return Response.successResponseWithoutData(res, res.__('deviceTokenRemoved'), SUCCESS);
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },
  /**
   * @description This function is used for refresh the token
   * @param {*} req
   * @param {*} res
   */

  refreshJwtToken: async (req, res) => {
    try {
      const reqParam = req.headers;
      reqParam.refreshToken = reqParam['refresh-token'];
      refreshTokenValidation(reqParam, res, async (validData) => {
        if (validData) {
          verifyAdminRefreshToken(reqParam.refreshToken, async (err, decoded) => {
            if (err) {
              return Response.errorResponseData(
                res,
                res.__('invalidToken'),
                RESPONSE_CODE.UNAUTHORIZED
              );
            }
            const meta = {
              token: issueAdminToken({
                id: decoded.id
              })
            };
            return Response.successResponseWithoutData(res, res.__('tokenRefresh'), SUCCESS, meta);
          });
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  getCompanyStatus: async (req, res) => {
    try {
      const reqParam = req.query;
      let existing = await Company.findOne({ _id: toObjectId(reqParam.id) });
      if (existing) {
        let existingSubs = await CompanySubscriptions.findOne({ company_id: existing._id });
        if (existingSubs) {
          let resObj = {
            productId: existingSubs.product_id,
            expiresDate: existingSubs.expires_date,
            autoRenew: existingSubs.auto_renew,
            trialEndsAt: existingSubs.trial_ends_at,
            firstPurchase: existingSubs.first_purchase,
            priceId: existingSubs?.price_id
          };

          const currentDateTime = new Date();
          const expiresDateTime = new Date(existingSubs?.expires_date);
          const trialExpiresDateTime = new Date(existingSubs?.trial_ends_at);

          if (existingSubs.is_under_trial) {
            resObj = {
              ...resObj,
              account: trialExpiresDateTime <= currentDateTime ? `Expired` : `Trial`
            };
          } else {
            if (existingSubs.product_id) {
              if (expiresDateTime <= currentDateTime) {
                resObj = {
                  ...resObj,
                  account: `Expired`
                };
              } else {
                resObj = {
                  ...resObj,
                  account: `Subscribed`
                };
              }
            } else {
              resObj = {
                ...resObj,
                account: `Expired`
              };
            }
          }

          return Response.successResponseData(res, resObj, SUCCESS, res.__('getSubsSuccess'));
        } else {
          return Response.successResponseData(
            res,
            { data: null },
            SUCCESS,
            res.__('noSubscription')
          );
        }
      } else {
        return Response.successResponseData(res, { data: null }, FAIL, res.__('noCompanyFound'));
      }
    } catch (error) {
      console.error(error);
      return Response.internalServerErrorResponse(res);
    }
  }
};
