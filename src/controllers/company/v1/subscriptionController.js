'use strict';

const { Users, Subscriptions, TransactionHistory, OfferRedeemedHistory } = require('@models');
const Response = require('@services/Response');
const {
  SUCCESS,
  DEVICE_TYPE,
  ACCOUNT_TYPE,
  FAIL,
  CATEGORY_TYPE,
  BADGE_TYPE
} = require('@services/Constant');
const {
  verifyInAppPurchaseValidation,
  applePubSubNotificationValidation,
  createAppleSignatureValidation
} = require('@services/userValidations/subscriptionValidations');
const axios = require('axios');
const Verifier = require('google-play-billing-validator');
const JWS = require('jws');
const {
  APPLE_PUBSUB_NOTIFICATION_TYPE,
  APPLE_PUBSUB_SUB_NOTIFICATION_TYPE,
  ANDROID_PUBSUB_NOTIFICATION_TYPE
} = require('@services/Constant');
const { currentDateOnly } = require('@services/Helper');
// eslint-disable-next-line spellcheck/spell-checker
const { v4: uuidv4 } = require('uuid');
const ECKey = require('ec-key');
const { updateBadges, sendBadgeNotification } = require('@services/userServices/badgeServices');
const { KLAVIYO_LIST, USER_TYPE } = require('../../../services/Constant');
const {
  convertObjectKeysToCamelCase,
  addEditKlaviyoUser,
  toObjectId
} = require('../../../services/Helper');
const { ContentCounts, Company } = require('../../../models');
const CompanySubscriptions = require('../../../models/CompanySubscription');
const { sendReusableTemplate } = require('../../../services/Mailer');
const { newAppIssue, companyAutoRenewStatus } = require('../../../services/userServices/notifyAdminServices');

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const calculateOrderAmount = (price) => {
  // Replace this constant with a calculation of the order's amount
  // Calculate the order total on the server to prevent
  // people from directly manipulating the amount on the client
  return price * 100;
};

async function cancelExistingSubscriptions(userId) {
  try {
    // Fetch user's existing subscriptions from your database
    const existingSubscriptions = await Subscriptions.find({ user_id: userId, deletedAt: null });

    // Iterate over each subscription and cancel it in Stripe
    for (const subscription of existingSubscriptions) {
      if (subscription.original_transaction_id.includes('sub_')) {
        await stripe.subscriptions.update(subscription.original_transaction_id, {
          cancel_at_period_end: true
        });

        await stripe.subscriptions.cancel(subscription.original_transaction_id);

        // Mark the subscription as canceled in your database (uncomment if needed)
        await Subscriptions.findByIdAndUpdate(subscription._id, {
          $set: { deletedAt: new Date() }
        });
      }
    }
  } catch (error) {
    console.error('Error canceling subscriptions:', error);
    // throw error; // Rethrow the error or handle it as appropriate for your application
  }
}

async function getSubscriptionDetail(subId) {
  try {
    // Fetch subscription details from Stripe using the subscription ID
    const subscription = await stripe.subscriptions.retrieve(subId);

    // You can now use the 'subscription' object to access various details
    console.log('Subscription Details:', subscription);

    // Return the subscription details or handle it as needed in your application
    return subscription;
  } catch (error) {
    console.error('Error fetching subscription details:', error);
    // throw error; // Rethrow the error or handle it as appropriate for your application
  }
}

module.exports = {
  /**
   * @description This function is used to get stripe payment link of plans
   ** @param {*} req
   * @param {*} res
   * @returns {*}
   */

  getStripePaymentIntend: async (req, res) => {
    try {
      const reqParam = req.body;
      let productId = reqParam.productId;
      let seatPrice = 7;
      let discount = 0;
      console.log({ productId })
      if (productId) {
        if (reqParam.payType == 'Annually' || reqParam.payType == 'Semi Annual' || reqParam.payType == 'Monthly') {
          let payload = {
            line_items: [
              {
                price: productId,
                quantity: reqParam.seats
              }
            ],
            mode: 'subscription',
            success_url: process.env.ADMIN_DOMAIN,
            cancel_url: process.env.ADMIN_DOMAIN,
            client_reference_id: req.authCompanyId,
            metadata: {
              contractLength: reqParam.contractLength,
              companyId: req.authCompanyId,
              seats: reqParam.seats,
              payType: reqParam.payType,
              productId: productId,
              seatPrice,
              priceId: reqParam.productId,
              discount,
              plan: reqParam.plan.value,
              web: true
            },
          }

          if (reqParam.payType == 'Annually') {
            payload = {
              ...payload,
              discounts: [{ coupon: process.env.FREE10 }]
            }
          }
          const session = await stripe.checkout.sessions.create(payload);

          return Response.successResponseData(
            res,
            convertObjectKeysToCamelCase(session),
            SUCCESS,
            res.__('sessionCreatedSuccessfully')
          );
        }

        if (reqParam.payType == 'One Time') {
          const session = await stripe.checkout.sessions.create({
            line_items: [
              {
                price: productId,
                quantity: reqParam.seats * parseInt(reqParam.contractLength) * 12
              }
            ],
            mode: 'payment',
            success_url: process.env.ADMIN_DOMAIN,
            cancel_url: process.env.ADMIN_DOMAIN,
            client_reference_id: req.authCompanyId,
            metadata: {
              contractLength: reqParam.contractLength,
              companyId: req.authCompanyId,
              seats: reqParam.seats,
              payType: reqParam.payType,
              productId: productId,
              seatPrice,
              discount,
              priceId: reqParam.productId,
              plan: reqParam.plan.value,
              web: true
            },
            discounts: [{ coupon: process.env.FREE10 }]
          });

          return Response.successResponseData(
            res,
            convertObjectKeysToCamelCase(session),
            SUCCESS,
            res.__('sessionCreatedSuccessfully')
          );
        }
      } else {
        return Response.errorResponseWithoutData(res, res.__('invalidProductID'), FAIL);
      }
    } catch (err) {
      console.error(err);
      return Response.internalServerErrorResponse(res);
    }
  },

  getStripeSeatsIntend: async (req, res) => {
    try {
      const reqParam = req.body;
      let productId = reqParam.price;
      let seatPrice = 7;
      let months = 1;
      let discount = 0;
      // if (reqParam.payType == 'One Time') {
      //   if (reqParam.plan.value == 'com.shoorah.teamplan') {
      //     productId = process.env.B2B_TEAM_PLAN;
      //     seatPrice = 7;
      //   } else if (reqParam.plan.value == 'com.shoorah.businessplan') {
      //     productId = process.env.B2B_BUSINESS_PLAN;
      //     seatPrice = 6;
      //   } else if (reqParam.plan.value == 'com.shoorah.corporateplan') {
      //     productId = process.env.B2B_CORPORATE_PLAN;
      //     seatPrice = 5;
      //   }
      // }
      // else {
      //   return Response.errorResponseWithoutData(res, res.__('invalidProductType'), FAIL);
      // }

      let lineItem = {
        price: productId,
        quantity: reqParam.seats
      }

      if (reqParam.months > 0) {
        lineItem = {
          ...lineItem,
          quantity: reqParam.seats * parseInt(reqParam.months)
        }
      }

      if (productId) {
        if (reqParam.payType == 'One Time') {
          const session = await stripe.checkout.sessions.create({
            line_items: [
              lineItem
            ],
            mode: 'payment',
            success_url: process.env.ADMIN_DOMAIN,
            cancel_url: process.env.ADMIN_DOMAIN,
            client_reference_id: req.authCompanyId,
            metadata: {
              companyId: req.authCompanyId,
              seats: reqParam.seats,
              payType: reqParam.payType,
              productId: productId,
              seatPrice,
              plan: reqParam.plan.value,
              web: true,
              seatAdd: true
            },
          });

          return Response.successResponseData(
            res,
            convertObjectKeysToCamelCase(session),
            SUCCESS,
            res.__('sessionCreatedSuccessfully')
          );
        }
      } else {
        return Response.errorResponseWithoutData(res, res.__('invalidProductID'), FAIL);
      }
    } catch (err) {
      console.error(err);
      return Response.internalServerErrorResponse(res);
    }
  },

  cancelAutoRenew: async (req, res) => {
    try {
      let company = await Company.findOne({ _id: toObjectId(req.authCompanyId) });
      if (company) {
        let companySub = await CompanySubscriptions.findOne({ company_id: req.authCompanyId });
        if (companySub) {
          if (companySub.auto_renew) {
            if (companySub?.original_transaction_id?.includes('sub_')) {
              await stripe.subscriptions.update(companySub.original_transaction_id, {
                cancel_at_period_end: true
              });
            }
            await CompanySubscriptions.updateOne({ company_id: req.authCompanyId }, { $set: { auto_renew: false } });
            await Company.updateOne({ _id: req.authCompanyId }, { $set: { auto_renew: false } });
            let superAdmins = await Users.find({ user_type: USER_TYPE.SUPER_ADMIN, deletedAt: null }).select('email name');
            if (superAdmins.length) {
              for (const user of superAdmins) {
                let locals = {
                  "title": "Company Subscription Alert",
                  // "titleSubtitle": "one content is updated",
                  "titleButton": "Go to dashboard",
                  "titleButtonUrl": "https://admin.shoorah.io",
                  "titleImage": "https://staging-media.shoorah.io/email_assets/Shoorah_brain.png",
                  "name": user.name,
                  "firstLine": `I hope this message finds you well. The company ${company.company_name} has cancelled there auto renewal today.`,
                  "secondLine": ` `,
                  "thirdLine": "",
                  "regards": `Shoorah`
                }
                await sendReusableTemplate(user.email, locals, "Company Subscription Alert");
              }
            }

            if (company) {
              await companyAutoRenewStatus(company.company_name, req.authAdminId);
            }

            let message = 'Unsubscribed successfully';
            return Response.successResponseData(res, message, SUCCESS, res.__('unsubscribedSuccess'));
          }
        } else {
          let message = 'No Subscription';

          return Response.successResponseData(res, message, FAIL, res.__('noSubscribed'));

        }
      } else {
        let message = 'No Company Found';
        return Response.successResponseData(res, message, FAIL, res.__('noCompany'));
      }
    } catch (err) {
      console.error(err);
      return Response.internalServerErrorResponse(res);
    }
  },

};
