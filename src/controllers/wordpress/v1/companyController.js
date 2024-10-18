'use strict';

const Response = require('@services/Response');
const { generatePassword } = require('@services/authServices');
const { sendB2BPassword } = require('@services/Mailer');
const { getUploadURL, removeOldImage } = require('@services/s3Services');
const Company = require('../../../models/Company');
const CompanyUsers = require('../../../models/CompanyUsers');
const { unixTimeStamp, makeRandomDigit, makeRandomString } = require('@services/Helper');
const {
  CLOUDFRONT_URL,
  SUCCESS,
  FAIL,
  RESPONSE_CODE,
  ACCOUNT_TYPE,
  USER_TYPE,
  STATUS,
  NOTIFICATION_TYPE,
  NOTIFICATION_ACTION,
  ACCOUNT_STATUS,
  SENT_TO_USER_TYPE,
  MAIL_SUBJECT,
  KLAVIYO_LIST,
  SORT_BY
} = require('../../../services/Constant');
const { Users } = require('../../../models');
const CompanySubscriptions = require('../../../models/CompanySubscription');
const { addEditKlaviyoUser } = require('../../../services/Helper');
const { sendTrialUpdatesReminder } = require('../../../services/Mailer');

module.exports = {
  /**
   * @description This function is used for company sign up
   * @param {*} req
   * @param {*} res
   * @return {*}
   */

  addCompany: async (req, res) => {
    try {
      let {
        company_name,
        company_address,
        company_email,
        contact_person,
        contact_number,
        contract_progress,
        b2b_interest_via,
        currency,
        company_type,
        plan,
        vatTax,
        discount
      } = req.body;

      company_name = company_name?.toLowerCase();
      company_address = company_address?.toLowerCase();
      company_email = company_email?.toLowerCase();
      contact_person = contact_person?.toLowerCase();

      let contract_start_date = new Date();
      let contract_end_date = new Date(contract_start_date);
      contract_end_date.setFullYear(contract_start_date.getFullYear() + 1);

      let password = makeRandomDigit(2) + makeRandomString(5) + makeRandomDigit(4);
      const hashPassword = await generatePassword(password);

      let existing = await Company.findOne({ company_email });
      let existingUser = await Users.findOne({ email: company_email, deletedAt: null });
      if (existing || existingUser) {
        return Response.errorResponseData(
          res,
          'Same email used by other company',
          RESPONSE_CODE.BAD_REQUEST
        );
      }

      let company_new = await Company.create({
        company_name,
        company_address,
        company_email,
        contact_person,
        contact_number: contact_number == '' ? null : contact_number,
        contract_start_date,
        contract_end_date,
        contract_progress,
        b2b_interest_via,
        currency,
        company_type,
        seat_active: false,
        seat_price: 0,
        no_of_seat_bought: 1,
        shuru_usage: true,
        vat_tax: vatTax ? true : false,
        transaction_id: null,
        plan: plan ? plan : 'Monthly',
        discount
      });

      let newComp = await Company.findOne({ company_email });
      if (!newComp) {
        return Response.errorResponseData(
          res,
          'Error in New Company Creation',
          RESPONSE_CODE.NOT_FOUND
        );
      }

      let user = await Users.create({
        email: newComp.company_email,
        dob: null,
        account_type: ACCOUNT_TYPE.PAID,
        name: newComp.contact_person,
        password: hashPassword,
        user_type: USER_TYPE.COMPANY_ADMIN,
        user_profile: newComp.company_logo,
        status: STATUS.ACTIVE,
        is_email_verified: true,
        login_platform: 0,
        company_id: newComp._id
      });

      let profile = {
        email: newComp.company_email,
        userType: USER_TYPE.COMPANY_ADMIN,
        firstName: newComp.name
      };

      await addEditKlaviyoUser(profile);

      const locals = {
        name: newComp.company_name,
        email: newComp.company_email,
        password: password,
        subject: 'Welcome to Shoorah'
      };
      await sendB2BPassword(newComp.company_email, MAIL_SUBJECT.B2B_WELCOME, locals);
      return Response.successResponseData(res, newComp, SUCCESS, res.__('addCompanySuccess'));
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

  /**
   * @description This function is used get company details
   * @param {*} req
   * @param {*} res
   * @return {*}
   */

  getCompany: async (req, res) => {
    try {
      let { company_email } = req.query;
      company_email = company_email?.toLowerCase();
      let existing = await Company.findOne({ company_email, deletedAt: null });
      return Response.successResponseData(res, existing, SUCCESS, res.__('getCompanySuccess'));
    } catch (error) {
      console.error(error);
      return Response.internalServerErrorResponse(res);
    }
  },

  addUpdateCompanyPlan: async (req, res) => {
    try {
      let { company_email, productId, autoRenew, isTrial, transactionId, seatBought, seatPrice } =
        req.query;

      company_email = company_email?.toLowerCase();

      let existing = await Company.findOne({ company_email, deletedAt: null });
      if (existing) {
        let existingSubs = await CompanySubscriptions.findOne({ company_id: existing._id });
        if (existingSubs) {
          let updateData = {
            no_of_seat_bought: parseInt(seatBought),
            seat_price: parseInt(seatPrice),
            auto_renew: autoRenew == 'true' ? true : false,
            product_id: productId,
            expires_date: productId ? existing.contract_end_date : null,
            original_transaction_id: transactionId
          };

          if (productId) {
            updateData = {
              ...updateData,
              is_under_trial: false,
              trial_ends_at: null
            };
          }

          await CompanySubscriptions.updateOne(
            { _id: existingSubs._id },
            {
              $set: updateData
            }
          );

          await Company.updateOne(
            { _id: existingSubs.company_id },
            {
              $set: {
                updateData
              }
            }
          );

          if (transactionId) {
            return res.redirect(process.env.ADMIN_DOMAIN);
          }

          let result = {
            code: 200,
            url: process.env.ADMIN_DOMAIN
          };

          // return Response.successResponseData(res, null, SUCCESS, res.__('updateSubsSuccess'));
          return res.send({ result });
        } else {
          let payload = {
            company_id: existing._id,
            auto_renew: autoRenew == 'true' ? true : false,
            product_id: productId,
            expires_date: productId ? existing.contract_end_date : null,
            original_transaction_id: transactionId
          };

          if (isTrial == 'true') {
            let currentDate = new Date();
            currentDate.setDate(currentDate.getDate() + 14);

            payload = {
              ...payload,
              is_under_trial: isTrial == 'true' ? true : false,
              trial_ends_at: currentDate
            };

            let updateData = {
              no_of_seat_bought: 1,
              seat_price: 0
            };

            await Company.updateOne(
              { _id: existing._id },
              {
                $set: {
                  updateData
                }
              }
            );

            let locals = {
              hours: '14-Day Free Trial',
              name: existing.company_name,
              head: 'Congratulations! from Shoorah',
              text: 'your trial days is coming to end within 24 hour',
              imageUrl:
                'https://staging-media.shoorah.io/email_assets/Shoorah_Alarm_Clock_v1.1.png',
              greetTitle: `Congratulations! your company got a free trial for the shoorah usage.`,
              headTitle: `We hope your team${existing.company_name} is well being and healthy. You have got a trial plan of 14 days from shoorah. You can use our app and dashboard freely. `,
              supportMessage: 'Please contact info@shoorah.io for any assistance needed.'
            };

            sendTrialUpdatesReminder(existing.company_email, locals);
          }
          let subs = await CompanySubscriptions.create(payload);

          if (transactionId) {
            return res.redirect(process.env.ADMIN_DOMAIN);
          }

          let result = {
            code: 200,
            url: process.env.ADMIN_DOMAIN
          };

          return res.send({ result });
        }
      } else {
        return Response.successResponseData(res, null, FAIL, res.__('noCompanyFound'));
      }
    } catch (error) {
      console.error(error);
      return Response.internalServerErrorResponse(res);
    }
  },
  addUpdateCompany: async (req, res) => {
    try {
      let { company_email, plan } = req.query;

      company_email = company_email?.toLowerCase();

      let existing = await Company.findOne({ company_email, deletedAt: null });
      if (existing) {
        await Company.updateOne(
          { company_email },
          {
            $set: {
              plan
            }
          }
        );
      } else {
        return Response.successResponseData(res, null, FAIL, res.__('noCompanyFound'));
      }
    } catch (error) {
      console.error(error);
      return Response.internalServerErrorResponse(res);
    }
  },

  getCompanyPlan: async (req, res) => {
    try {
      const reqParam = req.query;
      let company_email = reqParam.company_email?.toLowerCase();
      let existing = await Company.findOne({ company_email: company_email });
      if (existing) {
        let existingSubs = await CompanySubscriptions.findOne({ company_id: existing._id });
        if (existingSubs) {
          let resObj = {
            productId: existingSubs.product_id,
            expiresDate: existingSubs.expires_date,
            autoRenew: existingSubs.auto_renew
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
