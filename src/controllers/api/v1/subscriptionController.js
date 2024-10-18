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
const { KLAVIYO_LIST } = require('../../../services/Constant');
const {
  convertObjectKeysToCamelCase,
  addEditKlaviyoUser,
  toObjectId
} = require('../../../services/Helper');
const { ContentCounts, Company } = require('../../../models');
const CompanySubscriptions = require('../../../models/CompanySubscription');

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
   * @description This function is used to verify in app purchase
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  verifyInAppPurchase: (req, res) => {
    try {
      const reqParam = req.body;
      reqParam.deviceType = parseInt(req.headers.devicetype);
      verifyInAppPurchaseValidation(reqParam, res, async (validate) => {
        if (validate) {
          switch (reqParam.deviceType) {
            case DEVICE_TYPE.IOS:
              const paymentInfo = await axios
                .post(process.env.IN_APP_PURCHASE_APPLE_URL, {
                  'receipt-data': reqParam.receiptData,
                  password: process.env.APP_SECRET_IOS
                })
                .catch(() => {
                  return Response.internalServerErrorResponse(res);
                });
              let receiptInfo = paymentInfo.data;
              if (!(receiptInfo.status === 0)) {
                const sendBoxPaymentInfo = await axios.post(
                  process.env.IN_APP_PURCHASE_APPLE_URL_SANDBOX,
                  {
                    'receipt-data': reqParam.receiptData,
                    password: process.env.APP_SECRET_IOS
                  }
                );
                if (!(sendBoxPaymentInfo.data.status === 0)) {
                  return Response.errorResponseWithoutData(
                    res,
                    res.__('tokenVerificationUnsuccessfull'),
                    FAIL
                  );
                } else {
                  receiptInfo = sendBoxPaymentInfo.data;
                }
              }
              if (receiptInfo.status === 0) {
                const filterSubscription = {
                  original_transaction_id:
                    receiptInfo.latest_receipt_info[0].original_transaction_id,
                  deletedAt: null,
                  user_id: req.authUserId
                };
                const subscriptionObj = {
                  user_id: req.authUserId,
                  original_transaction_id:
                    receiptInfo.latest_receipt_info[0].original_transaction_id,
                  product_id: receiptInfo.latest_receipt_info[0].product_id,
                  expires_date: new Date(
                    parseInt(receiptInfo.latest_receipt_info[0].expires_date_ms)
                  ),
                  purchased_from_device: parseInt(req.headers.devicetype)
                };
                const subscriptionData =
                  await Subscriptions.findOne(filterSubscription).select('user_id');
                if (subscriptionData) {
                  const transactionHistory = await TransactionHistory.findOne({
                    transaction_id: receiptInfo.latest_receipt_info[0].transaction_id
                  }).select('transaction_id');
                  if (!transactionHistory) {
                    console.log('Duplicate api call');
                    await Subscriptions.findOneAndUpdate(filterSubscription, {
                      product_id: receiptInfo.latest_receipt_info[0].product_id
                    });
                    // sometimes api calls random and update user paid flag (can we manage it by last transaction id  in database and last transaction_id in receipt data)
                    // under testing
                    await Users.findByIdAndUpdate(req.authUserId, {
                      account_type: ACCOUNT_TYPE.PAID
                    });
                  }

                  let user = await Users.findOne({ _id: req.authUserId }).select(
                    'email name user_type'
                  );
                  let profile = {
                    email: user.email,
                    userType: user.user_type,
                    firstName: user.name
                  };

                  await addEditKlaviyoUser(profile);

                  return Response.successResponseWithoutData(
                    res,
                    res.__('tokenVerifiedSuccessfully'),
                    SUCCESS
                  );
                }
                await Subscriptions.create({ ...filterSubscription, ...subscriptionObj });
                const transactionObj = {
                  ...filterSubscription,
                  ...subscriptionObj,
                  transaction_id: receiptInfo.latest_receipt_info[0].transaction_id,
                  original_purchase_date: new Date(
                    parseInt(receiptInfo.latest_receipt_info[0].original_purchase_date_ms)
                  ),
                  purchase_date: new Date(
                    parseInt(receiptInfo.latest_receipt_info[0].purchase_date_ms)
                  )
                };
                await TransactionHistory.create(transactionObj);
                await Users.findByIdAndUpdate(req.authUserId, {
                  is_under_trial: JSON.parse(receiptInfo.latest_receipt_info[0].is_trial_period),
                  trial_starts_from: new Date(),
                  account_type: ACCOUNT_TYPE.PAID
                });

                let user = await Users.findOne({ _id: req.authUserId }).select(
                  'email name user_type'
                );
                let profile = {
                  email: user.email,
                  userType: user.user_type,
                  firstName: user.name
                };

                await addEditKlaviyoUser(profile);

                return Response.successResponseWithoutData(
                  res,
                  res.__('tokenVerifiedSuccessfully'),
                  SUCCESS
                );
              } else {
                return Response.errorResponseWithoutData(
                  res,
                  res.__('tokenVerificationUnsuccessfull'),
                  FAIL
                );
              }
            case DEVICE_TYPE.ANDROID:
              const options = {
                email: process.env.GOOGLE_SERVICE_EMAIL,
                key: process.env.GOOGLE_IN_APP_PRIVATE_KEY
              };
              const verifier = new Verifier(options);

              const receipt = {
                packageName: process.env.APPLE_CLIENT_ID,
                productId: reqParam.productId,
                purchaseToken: reqParam.receiptData
              };

              const promiseData = verifier.verifySub(receipt);
              promiseData
                .then(async (purchaseData) => {
                  if (purchaseData && purchaseData.isSuccessful) {
                    const filterSubscription = {
                      user_id: req.authUserId
                    };
                    const subscriptionObj = {
                      original_transaction_id: reqParam.receiptData,
                      product_id: reqParam.productId,
                      // eslint-disable-next-line spellcheck/spell-checker
                      expires_date: new Date(parseInt(purchaseData.payload.expiryTimeMillis)),
                      purchased_from_device: parseInt(req.headers.devicetype)
                    };
                    await Subscriptions.findOneAndUpdate(filterSubscription, subscriptionObj, {
                      upsert: true
                    });
                    const transactionObj = {
                      ...filterSubscription,
                      ...subscriptionObj,
                      transaction_id: purchaseData.payload.orderId,
                      original_purchase_date: new Date(),
                      // eslint-disable-next-line spellcheck/spell-checker
                      purchase_date: new Date(parseInt(purchaseData.payload.startTimeMillis))
                    };
                    await TransactionHistory.create(transactionObj);
                    let updateUserStatus = {
                      account_type: ACCOUNT_TYPE.PAID
                    };
                    if (!purchaseData.payload.linkedPurchaseToken) {
                      updateUserStatus = {
                        ...updateUserStatus,
                        is_under_trial: true,
                        trial_starts_from: new Date()
                      };
                    }
                    await Users.findByIdAndUpdate(req.authUserId, updateUserStatus);
                    let user = await Users.findOne({ _id: req.authUserId }).select(
                      'email user_type name'
                    );
                    let profile = {
                      email: user.email,
                      userType: user.user_type,
                      firstName: user.name
                    };

                    await addEditKlaviyoUser(profile);

                    return Response.successResponseWithoutData(
                      res,
                      res.__('tokenVerifiedSuccessfully'),
                      SUCCESS
                    );
                  } else {
                    return Response.errorResponseWithoutData(
                      res,
                      res.__('tokenVerificationUnsuccessfull'),
                      FAIL
                    );
                  }
                })
                .catch(() => {
                  return Response.errorResponseWithoutData(
                    res,
                    res.__('tokenVerificationUnsuccessfull'),
                    FAIL
                  );
                });
              break;
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
   * @description This function is used to get server notification from apple
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  applePubSubNotification: (req, res) => {
    try {
      console.log('Apple notification received');
      const reqParam = req.body;
      applePubSubNotificationValidation(reqParam, res, async (validate) => {
        if (validate) {
          const decodedPayload = JWS.decode(reqParam.signedPayload);
          if (!decodedPayload) {
            return Response.errorResponseWithoutData(
              res,
              res.__('tokenVerificationUnsuccessfull'),
              FAIL
            );
          }
          const notificationPayload = JSON.parse(decodedPayload.payload);
          const signedTransactionInfo = JWS.decode(notificationPayload.data.signedTransactionInfo);
          if (!signedTransactionInfo) {
            return Response.errorResponseWithoutData(
              res,
              res.__('tokenVerificationUnsuccessfull'),
              FAIL
            );
          }
          const signedRenewalInfo = JWS.decode(notificationPayload.data.signedRenewalInfo);
          if (!signedRenewalInfo) {
            return Response.errorResponseWithoutData(
              res,
              res.__('tokenVerificationUnsuccessfull'),
              FAIL
            );
          }
          const transactionPayload = JSON.parse(signedTransactionInfo.payload);
          console.log('notificationType >>>>>', notificationPayload.notificationType);
          // eslint-disable-next-line spellcheck/spell-checker
          console.log('subNotificationtype >>>>>', notificationPayload.subtype);
          let filterCondition;
          let updateCondition;
          let subscriptionData;
          let transactionObj;
          switch (notificationPayload.notificationType) {
            case APPLE_PUBSUB_NOTIFICATION_TYPE.SUBSCRIBED:
              // eslint-disable-next-line spellcheck/spell-checker
              if (notificationPayload.subtype === APPLE_PUBSUB_SUB_NOTIFICATION_TYPE.RESUBSCRIBE) {
                filterCondition = {
                  original_transaction_id: transactionPayload.originalTransactionId,
                  deletedAt: null
                };
                updateCondition = {
                  auto_renew: true,
                  expires_date: new Date(transactionPayload.expiresDate),
                  product_id: transactionPayload.productId
                };
                subscriptionData = await Subscriptions.findOneAndUpdate(
                  filterCondition,
                  updateCondition,
                  { new: true }
                ).select('-_id -createdAt -updatedAt -__v -auto_renew');
                if (subscriptionData) {
                  transactionObj = {
                    ...subscriptionData?._doc,
                    transaction_id: transactionPayload.transactionId,
                    purchase_date: transactionPayload.purchaseDate,
                    original_purchase_date: transactionPayload.originalPurchaseDate
                  };
                  await TransactionHistory.create(transactionObj);
                  await Users.findByIdAndUpdate(subscriptionData.user_id, {
                    account_type: ACCOUNT_TYPE.PAID
                  });
                } else {
                  console.log('no subscriptiondata found');
                }
              }
              break;
            case APPLE_PUBSUB_NOTIFICATION_TYPE.DID_CHANGE_RENEWAL_STATUS:
              filterCondition = {
                original_transaction_id: transactionPayload.originalTransactionId,
                deletedAt: null
              };
              updateCondition = {
                product_id: transactionPayload.productId,
                auto_renew:
                  // eslint-disable-next-line spellcheck/spell-checker
                  notificationPayload.subtype !==
                  APPLE_PUBSUB_SUB_NOTIFICATION_TYPE.AUTO_RENEW_DISABLED
              };
              await Subscriptions.findOneAndUpdate(filterCondition, updateCondition);
              break;
            case APPLE_PUBSUB_NOTIFICATION_TYPE.DID_RENEW:
              filterCondition = {
                original_transaction_id: transactionPayload.originalTransactionId,
                deletedAt: null
              };
              updateCondition = {
                product_id: transactionPayload.productId,
                expires_date: new Date(transactionPayload.expiresDate)
              };
              subscriptionData = await Subscriptions.findOneAndUpdate(
                filterCondition,
                updateCondition,
                { new: true }
              ).select('-_id -createdAt -updatedAt -__v -auto_renew');
              if (subscriptionData) {
                transactionObj = {
                  ...subscriptionData?._doc,
                  transaction_id: transactionPayload.transactionId,
                  purchase_date: transactionPayload.purchaseDate,
                  original_purchase_date: transactionPayload.originalPurchaseDate
                };
                await TransactionHistory.create(transactionObj);
                await Users.findByIdAndUpdate(subscriptionData.user_id, {
                  account_type: ACCOUNT_TYPE.PAID
                });
              } else {
                console.log('No subscription data found');
              }
              break;
            case APPLE_PUBSUB_NOTIFICATION_TYPE.DID_CHANGE_RENEWAL_PREF:
              // eslint-disable-next-line spellcheck/spell-checker
              switch (notificationPayload.subtype) {
                case APPLE_PUBSUB_SUB_NOTIFICATION_TYPE.UPGRADE:
                  filterCondition = {
                    original_transaction_id: transactionPayload.originalTransactionId,
                    deletedAt: null
                  };
                  updateCondition = {
                    expires_date: new Date(transactionPayload.expiresDate),
                    product_id: transactionPayload.productId
                  };
                  subscriptionData = await Subscriptions.findOneAndUpdate(
                    filterCondition,
                    updateCondition,
                    { new: true }
                  ).select('-_id -createdAt -updatedAt -__v -auto_renew');
                  if (subscriptionData) {
                    transactionObj = {
                      ...subscriptionData?._doc,
                      transaction_id: transactionPayload.transactionId,
                      purchase_date: transactionPayload.purchaseDate,
                      original_purchase_date: transactionPayload.originalPurchaseDate
                    };
                    await TransactionHistory.create(transactionObj);
                    await Users.findByIdAndUpdate(subscriptionData.user_id, {
                      account_type: ACCOUNT_TYPE.PAID
                    });
                  } else {
                    console.log('No subscription data found');
                  }
                  break;
              }
              break;
            case APPLE_PUBSUB_NOTIFICATION_TYPE.EXPIRED:
            case APPLE_PUBSUB_NOTIFICATION_TYPE.GRACE_PERIOD_EXPIRED:
              filterCondition = {
                original_transaction_id: transactionPayload.originalTransactionId,
                deletedAt: null
              };
              updateCondition = {
                product_id: transactionPayload.productId,
                auto_renew: false
              };
              subscriptionData = await Subscriptions.findOneAndUpdate(
                filterCondition,
                updateCondition,
                { new: true }
              ).select('user_id');
              if (subscriptionData) {
                await Users.findByIdAndUpdate(subscriptionData.user_id, {
                  is_under_trial: false,
                  account_type: ACCOUNT_TYPE.EXPIRED
                });
              } else {
                console.log('No subscription data found');
              }
              break;
            case APPLE_PUBSUB_NOTIFICATION_TYPE.OFFER_REDEEMED:
              filterCondition = {
                original_transaction_id: transactionPayload.originalTransactionId,
                deletedAt: null
              };
              updateCondition = {
                auto_renew: true,
                expires_date: new Date(transactionPayload.expiresDate),
                product_id: transactionPayload.productId
              };
              subscriptionData = await Subscriptions.findOneAndUpdate(
                filterCondition,
                updateCondition,
                { new: true }
              ).select('-_id -createdAt -updatedAt -__v -auto_renew');
              if (subscriptionData) {
                transactionObj = {
                  ...subscriptionData?._doc,
                  transaction_id: transactionPayload.transactionId,
                  purchase_date: transactionPayload.purchaseDate,
                  original_purchase_date: transactionPayload.originalPurchaseDate
                };
                await TransactionHistory.create(transactionObj);
                await Users.findByIdAndUpdate(subscriptionData.user_id, {
                  account_type: ACCOUNT_TYPE.PAID
                });
                const filterOffer = {
                  user_id: subscriptionData.user_id,
                  offer_type: transactionPayload.offerIdentifier,
                  deletedAt: null
                };
                const updateOffer = {
                  original_transaction_id: transactionPayload.originalTransactionId,
                  transaction_id: transactionPayload.transactionId
                };
                await OfferRedeemedHistory.findOneAndUpdate(filterOffer, updateOffer, {
                  upsert: true
                });
              } else {
                console.log('No subscription data found');
              }
              break;
          }
          return Response.successResponseWithoutData(res, res.__('applePubSubSuccess'), SUCCESS);
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to get server notification from android
   * @param req
   * @param res
   * @returns {*}
   */
  androidPubSubNotification: async (req, res) => {
    try {
      console.log('Android notification received');
      const reqParam = req.body;
      const message = reqParam.message || null;
      if (!message) {
        return Response.internalServerErrorResponse(res);
      }
      const buffer = Buffer.from(message.data, 'base64');
      const data = buffer ? JSON.parse(buffer.toString()) : null;
      if (!data || !data.subscriptionNotification) {
        return Response.internalServerErrorResponse(res);
      }
      const subscriptionPayload = data.subscriptionNotification;
      let filterCondition;
      let updateCondition;
      let subscriptionData;
      let transactionObj;
      switch (subscriptionPayload.notificationType) {
        case ANDROID_PUBSUB_NOTIFICATION_TYPE.SUBSCRIPTION_RENEWED:
          console.log('subscription renewal request receievd');
          filterCondition = {
            original_transaction_id: subscriptionPayload.purchaseToken,
            deletedAt: null
          };
          updateCondition = {
            auto_renew: true,
            product_id: subscriptionPayload.subscriptionId
          };
          await Subscriptions.findOneAndUpdate(filterCondition, updateCondition);
          subscriptionData = await TransactionHistory.findOne(filterCondition).select(
            '-_id -createdAt -updatedAt -product_id -purchase_date -expires_date'
          );
          if (subscriptionData) {
            transactionObj = {
              ...subscriptionData?._doc,
              product_id: subscriptionPayload.subscriptionId,
              purchase_date: new Date()
            };
            await TransactionHistory.create(transactionObj);
            await Users.findByIdAndUpdate(subscriptionData.user_id, {
              account_type: ACCOUNT_TYPE.PAID
            });
          } else {
            console.log('No subscription data found');
          }
          break;
        case ANDROID_PUBSUB_NOTIFICATION_TYPE.SUBSCRIPTION_CANCELED:
          console.log('subscription cancelled request receieved');
          filterCondition = {
            original_transaction_id: subscriptionPayload.purchaseToken,
            deletedAt: null
          };
          updateCondition = {
            product_id: subscriptionPayload.subscriptionId,
            auto_renew: false
          };
          await Subscriptions.findOneAndUpdate(filterCondition, updateCondition);
          break;
        case ANDROID_PUBSUB_NOTIFICATION_TYPE.SUBSCRIPTION_EXPIRED:
          console.log('subscirpiton expired.');
          filterCondition = {
            original_transaction_id: subscriptionPayload.purchaseToken
          };
          updateCondition = {
            product_id: subscriptionPayload.subscriptionId,
            auto_renew: false
          };
          subscriptionData = await Subscriptions.findOneAndUpdate(
            filterCondition,
            updateCondition,
            { new: true }
          ).select('user_id');
          if (subscriptionData) {
            await Users.findByIdAndUpdate(subscriptionData.user_id, {
              is_under_trial: false,
              account_type: ACCOUNT_TYPE.EXPIRED
            });
          } else {
            console.log('no subscription data found');
          }
          break;
      }
      return Response.successResponseWithoutData(res, res.__('androidPubSubSuccess'), SUCCESS);
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to check app consistency of user
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  checkAppConsistency: async (req, res) => {
    try {
      await Users.updateOne(
        { _id: req.authUserId },
        {
          $set: {
            last_login: new Date()
          }
        }
      );

      let user = await Users.findOne({ _id: req.authUserId }).select('email user_type name');
      let profile = {
        email: user.email,
        userType: user.user_type,
        firstName: user.name
      };

      await addEditKlaviyoUser(profile);

      if (req.accountType === ACCOUNT_TYPE.PAID) {
        const transactionData = await TransactionHistory.findOne(
          { user_id: req.authUserId },
          { original_purchase_date: 1 }
        ).sort({ createdAt: -1 });
        if (transactionData && transactionData.original_purchase_date) {
          const totalActiveMonths =
            currentDateOnly().getMonth() -
            transactionData.original_purchase_date.getMonth() +
            12 *
            (currentDateOnly().getFullYear() -
              transactionData.original_purchase_date.getFullYear());
          let badgeReceived = false;
          switch (totalActiveMonths) {
            case 1:
              badgeReceived = await updateBadges(
                req.authUserId,
                CATEGORY_TYPE.TIME_SUBSCRIBED_ON_APP,
                BADGE_TYPE.BRONZE
              );
              badgeReceived &&
                (await sendBadgeNotification(
                  req.authUserId,
                  CATEGORY_TYPE.TIME_SUBSCRIBED_ON_APP,
                  BADGE_TYPE.BRONZE
                ));
              break;
            case 3:
              badgeReceived = await updateBadges(
                req.authUserId,
                CATEGORY_TYPE.TIME_SUBSCRIBED_ON_APP,
                BADGE_TYPE.SILVER
              );
              badgeReceived &&
                (await sendBadgeNotification(
                  req.authUserId,
                  CATEGORY_TYPE.TIME_SUBSCRIBED_ON_APP,
                  BADGE_TYPE.SILVER
                ));
              break;
            case 6:
              badgeReceived = badgeReceived = await updateBadges(
                req.authUserId,
                CATEGORY_TYPE.TIME_SUBSCRIBED_ON_APP,
                BADGE_TYPE.GOLD
              );
              badgeReceived &&
                (await sendBadgeNotification(
                  req.authUserId,
                  CATEGORY_TYPE.TIME_SUBSCRIBED_ON_APP,
                  BADGE_TYPE.GOLD
                ));
              break;
            case 9:
              badgeReceived = await updateBadges(
                req.authUserId,
                CATEGORY_TYPE.TIME_SUBSCRIBED_ON_APP,
                BADGE_TYPE.PLATINUM
              );
              badgeReceived &&
                (await sendBadgeNotification(
                  req.authUserId,
                  CATEGORY_TYPE.TIME_SUBSCRIBED_ON_APP,
                  BADGE_TYPE.PLATINUM
                ));
              break;
            case 12:
              badgeReceived = await updateBadges(
                req.authUserId,
                CATEGORY_TYPE.TIME_SUBSCRIBED_ON_APP,
                BADGE_TYPE.DIAMOND
              );
              badgeReceived &&
                (await sendBadgeNotification(
                  req.authUserId,
                  CATEGORY_TYPE.TIME_SUBSCRIBED_ON_APP,
                  BADGE_TYPE.DIAMOND
                ));
              break;
          }
          let existingCount = await ContentCounts.findOne({ user_id: req.authUserId });
          if (existingCount) {
            await ContentCounts.updateOne(
              { user_id: req.authUserId },
              {
                $set: {
                  consistency: totalActiveMonths
                }
              }
            );
          } else {
            await ContentCounts.create({
              consistency: totalActiveMonths,
              user_id: req.authUserId
            });
          }
        }
      } else {
        let user = await Users.findOne({ _id: req.authUserId }).select('email user_type name');
        let profile = {
          email: user.email,
          userType: user.user_type,
          firstName: user.name
        };

        await addEditKlaviyoUser(profile);
      }
      return Response.successResponseWithoutData(res, res.__('checkedAppConsistent'), SUCCESS);
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to verify offer and generate promotioanl offer signature for apple
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  createAppleSignature: (req, res) => {
    try {
      const reqParam = req.query;
      createAppleSignatureValidation(reqParam, res, async (validate) => {
        if (validate) {
          const appBundleID = reqParam.appBundleID;
          const productIdentifier = reqParam.productIdentifier;
          const subscriptionOfferID = reqParam.offerID;
          const applicationUsername = reqParam.applicationUsername;

          const filterCondition = {
            user_id: req.authUserId,
            offer_type: subscriptionOfferID,
            deletedAt: null
          };

          const isOfferRedeemed = await OfferRedeemedHistory.findOne(filterCondition).select('_id');

          if (isOfferRedeemed) {
            return Response.successResponseWithoutData(res, res.__('offerAlreadyRedeemed'), FAIL);
          }

          // eslint-disable-next-line spellcheck/spell-checker
          const nonce = uuidv4();

          const currentDate = new Date();
          const timestamp = currentDate.getTime();

          const keyID = process.env.SUBSCRIPTION_OFFERS_KEY_ID;
          if (!keyID) {
            return Response.errorResponseWithoutData(res, res.__('signatudeUnverified'), FAIL);
          }

          const payload =
            appBundleID +
            '\u2063' +
            keyID +
            '\u2063' +
            productIdentifier +
            '\u2063' +
            subscriptionOfferID +
            '\u2063' +
            applicationUsername +
            '\u2063' +
            nonce +
            '\u2063' +
            timestamp;

          const keyString = process.env.SUBSCRIPTION_OFFERS_PRIVATE_KEY;
          const key = new ECKey(keyString, 'pem');
          const cryptoSign = key.createSign('SHA256');
          cryptoSign.update(payload);
          const signature = cryptoSign.sign('base64');
          const verificationResult = key
            .createVerify('SHA256')
            .update(payload)
            .verify(signature, 'base64');
          if (verificationResult) {
            const resObj = {
              keyID,
              nonce,
              timestamp,
              signature
            };
            return Response.successResponseData(
              res,
              resObj,
              SUCCESS,
              res.__('signatureCreatedSuccess')
            );
          } else {
            return Response.errorResponseWithoutData(res, res.__('signatudeUnverified'), FAIL);
          }
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  getStripPayment: async (req, res) => {
    try {
      const product = req.body;
      console.log(product);
      // Create a PaymentIntent with the order amount and currency
      if (product.text.includes('Free') == true) {
        const session = await stripe.checkout.sessions.create({
          mode: 'subscription',
          // success_url: 'https://example.com/success',
          // cancel_url: 'https://example.com/cancel',
          line_items: [
            {
              price: product.productId,
              quantity: 1
            }
          ],
          subscription_data: {
            trial_settings: {
              end_behavior: {
                missing_payment_method: 'cancel'
              }
            },
            trial_period_days: 7
          },
          payment_method_collection: 'if_required'
        });
        console.log({ session });
      } else {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: calculateOrderAmount(product.price),
          currency: 'usd'
        });
        res.send({
          clientSecret: paymentIntent.client_secret
        });
      }
    } catch (err) {
      console.log(err.message);
    }
  },

  /**
   * @description This function is used to get stripe payment link of plans
   ** @param {*} req
   * @param {*} res
   * @returns {*}
   */

  getStripePaymentIntend: async (req, res) => {
    try {
      const reqParam = req.body;
      let productId = null;
      let product='';
      if (reqParam.type < 5) {
        switch (parseInt(reqParam.type)) {
          case 1:
            productId = process.env.SHOORAH_ONE_MONTH;
            product='com.shoorah.monthly';
            break;
          case 2:
            productId = process.env.SHOORAH_SIX_MONTH;
            product='com.shoorah.sixmonths';

            break;
          case 3:
            productId = process.env.SHOORAH_ANNUAL;
            product='com.shoorah.annually';

            break;
          case 4:
            productId = process.env.SHOORAH_LIFETIME;
            product='com.shoorah.lifetime';

            break;

          default:
            productId = process.env.SHOORAH_ONE_MONTH;
            product='com.shoorah.monthly';

            break;
        }
      } else {
        return Response.errorResponseWithoutData(res, res.__('invalidProductType'), FAIL);
      }

      if (productId) {
        if (reqParam.type < 4) {
          const session = await stripe.checkout.sessions.create({
            line_items: [
              {
                price: productId,
                quantity: 1
              }
            ],
            mode: 'subscription',
            success_url: process.env.SUCCESS_URL,
            cancel_url: process.env.CANCEL_URL,
            allow_promotion_codes: true,
            client_reference_id: req.authUserId,
            metadata:{
              product,
              userId:req.authUserId,
            }
          });

          return Response.successResponseData(
            res,
            convertObjectKeysToCamelCase(session),
            SUCCESS,
            res.__('sessionCreatedSuccessfully')
          );
        }

        if (reqParam.type == 4) {
          const session = await stripe.checkout.sessions.create({
            line_items: [
              {
                price: productId,
                quantity: 1
              }
            ],
            mode: 'payment',
            success_url: process.env.SUCCESS_URL,
            cancel_url: process.env.CANCEL_URL,
            allow_promotion_codes: true,
            client_reference_id: req.authUserId,
            metadata:{
              product,
              userId:req.authUserId,
            }
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

  /**
   * @description This function is used to update stripe payment details
   ** @param {*} req
   * @param {*} res
   * @returns {*}
   */

  stripeWebhook: async (req, res) => {
    const event = req.body;
    // Handle the specific event type (e.g., checkout.session.completed)
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        const userId = session.client_reference_id; // Assuming you stored user ID as client_reference_id
        const paymentId = session.payment_method_configuration_details?.id;
        let company = null;

        if (userId) {
          company = await Company.findOne({ _id: toObjectId(userId) });
          // for company stripe
          if (company) {
            if (session?.metadata?.seatAdd == 'true') {

              let filterCondition = {
                deletedAt: null,
                company_id: toObjectId(userId),
              };
              let existingSubscription = await CompanySubscriptions.findOne(filterCondition);
              if (existingSubscription) {
                let payload = {
                  product_id: session?.metadata?.plan,
                  trial_ends_at: null,
                  is_under_trial: false,
                  first_purchase:true,
                  original_transaction_id: session?.id
                }

                await CompanySubscriptions.updateOne({ company_id: company._id }, {
                  $set: payload
                });

                await Company.updateOne({ _id: company._id }, {
                  $set: {
                    no_of_seat_bought: (company.no_of_seat_bought + parseInt(session?.metadata?.seats)) || 1,
                    seat_price: parseInt(session?.metadata?.seatPrice)
                  }
                });

                console.log('SUBSCRIBED RENEW SUCCESSFULLY');
                return;
              }
            }

            if (session?.metadata?.web) {

              let filterCondition = {
                deletedAt: null,
                company_id: toObjectId(userId),
              };
              let existingSubscription = await CompanySubscriptions.findOne(filterCondition);
              if (existingSubscription) {
                let payload = {
                  product_id: session?.metadata?.plan,
                  trial_ends_at: null,
                  is_under_trial: false,
                  original_transaction_id: session?.id,
                  price_id:session?.metadata?.priceId
                }

                let currDate = new Date();
                let endDate = new Date(currDate);
                endDate.setFullYear(endDate.getFullYear() + parseInt(session?.metadata?.contractLength));

                let company_payload = {
                  no_of_seat_bought: session?.metadata?.seats || 1,
                  seat_price: session?.metadata?.seatPrice,
                  contract_start_date: new Date(),
                  contract_end_date: endDate
                }

                if (existingSubscription?.product_id&& (existingSubscription?.expires_date>new Date())) {
                  let currentDate = new Date();
                  const expiryDifference = Math.ceil((existingSubscription?.expires_date - currentDate) / (1000 * 60 * 60 * 24));

                  const contractEndsDifference = (company.contract_end_date - company.contract_start_date) / (1000 * 60 * 60 * 24);
                  const totalExpiryDate = new Date(currentDate.getTime() + (expiryDifference + contractEndsDifference) * 24 * 60 * 60 * 1000);
                  payload = {
                    ...payload,
                    expires_date: totalExpiryDate
                  }
                } else {
                  let currentDate = new Date();
                  const contractEndsDifference = (company.contract_end_date - company.contract_start_date) / (1000 * 60 * 60 * 24);
                  const totalExpiryDate = new Date(currentDate.getTime() + (contractEndsDifference) * 24 * 60 * 60 * 1000);
                  payload = {
                    ...payload,
                    expires_date: totalExpiryDate
                  }
                }

                await CompanySubscriptions.updateOne({ company_id: company._id }, {
                  $set: payload
                });

                await Company.updateOne({ _id: company._id }, {
                  $set: company_payload
                });

                console.log('SUBSCRIBED RENEW SUCCESSFULLY');
                return;
              } else {
                let currDate = new Date();
                let endDate = new Date(currDate);
                endDate.setFullYear(currDate.getFullYear() + parseInt(session?.metadata?.contractLength));

                let payload = {
                  product_id: session?.metadata?.plan,
                  trial_ends_at: null,
                  is_under_trial: false,
                  original_transaction_id: session?.id,
                  price_id:session?.metadata?.priceId,
                  expires_date: endDate,
                  company_id: company._id
                }

                await CompanySubscriptions.create(payload);

                await Company.updateOne({ _id: company._id }, {
                  $set: {
                    no_of_seat_bought: session?.metadata?.seats || 1,
                    seat_price: session?.metadata?.seatPrice,
                    contract_start_date: new Date(),
                    contract_end_date: endDate
                  }
                });
                console.log('SUBSCRIBED SUCCESSFULLY');
                return;
              }
            }
            // else {
            //   const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
            //   const lineItemsData = lineItems?.data[0];
            //   let productId = '';
            //   let price = 7;
            //   switch (lineItemsData?.price?.id) {
            //     case process.env.B2B_TEAM_PLAN: productId = process.env.B2B_TEAM_PLAN;
            //       price = 7;
            //       break;
            //     case process.env.B2B_BUSINESS_PLAN: productId = process.env.B2B_BUSINESS_PLAN;
            //       price = 6;
            //       break;
            //     case process.env.B2B_CORPORATE_PLAN: productId = process.env.B2B_CORPORATE_PLAN;
            //       price = 5;
            //       break;
            //     default: productId = null;
            //       price = 0;
            //       break;
            //   }

            //   let filterCondition = {
            //     deletedAt: null,
            //     company_id: toObjectId(userId),
            //   };

            //   let existingSubscription = await CompanySubscriptions.findOne(filterCondition);
            //   if (existingSubscription) {
            //     let payload = {
            //       product_id: productId,
            //       trial_ends_at: null,
            //       is_under_trial: false,
            //       original_transaction_id: session?.id
            //     }

            //     if (existingSubscription?.product_id) {
            //       let currentDate = new Date();
            //       const expiryDifference = Math.ceil((existingSubscription?.expires_date - currentDate) / (1000 * 60 * 60 * 24));

            //       const contractEndsDifference = (company.contract_end_date - company.contract_start_date) / (1000 * 60 * 60 * 24);
            //       const totalExpiryDate = new Date(currentDate.getTime() + (expiryDifference + contractEndsDifference) * 24 * 60 * 60 * 1000);
            //       payload = {
            //         ...payload,
            //         expires_date: totalExpiryDate
            //       }
            //     } else {
            //       let currentDate = new Date();
            //       const contractEndsDifference = (company.contract_end_date - company.contract_start_date) / (1000 * 60 * 60 * 24);
            //       const totalExpiryDate = new Date(currentDate.getTime() + (contractEndsDifference) * 24 * 60 * 60 * 1000);
            //       payload = {
            //         ...payload,
            //         expires_date: totalExpiryDate
            //       }
            //     }

            //     await CompanySubscriptions.updateOne({ company_id: company._id }, {
            //       $set: payload
            //     });

            //     await Company.updateOne({ _id: company._id }, {
            //       $set: {
            //         no_of_seat_bought: lineItemsData?.quantity || 1,
            //         seat_price: price
            //       }
            //     });

            //     console.log('SUBSCRIBED RENEW SUCCESSFULLY');
            //     return;
            //   } else {
            //     let payload = {
            //       product_id: productId,
            //       trial_ends_at: null,
            //       is_under_trial: false,
            //       original_transaction_id: session?.id,
            //       expires_date: company.contract_end_date,
            //       company_id: company._id
            //     }

            //     await CompanySubscriptions.create(payload);

            //     await Company.updateOne({ _id: company._id }, {
            //       $set: {
            //         no_of_seat_bought: lineItemsData?.quantity || 1,
            //         seat_price: price
            //       }
            //     });
            //     console.log('SUBSCRIBED SUCCESSFULLY');
            //     return;
            //   }
            // }



          }
          //  for users stripe
          else {
            let subscriptionId = session.subscription;
            let autoRenew = true;

            let filterCondition = {
              deletedAt: null,
              user_id: toObjectId(userId),
              expires_date: { $gt: new Date() }
            };

            let product = '';
            let expiry = new Date();

            let subscription = await getSubscriptionDetail(subscriptionId);

            // switch (subscription?.plan?.amount) {
            //   case 16999:
            //     product = 'com.shoorah.lifetime';
            //     expiry.setFullYear(expiry.getFullYear() + 9999);
            //     subscriptionId = session.payment_method_configuration_details?.id;
            //     autoRenew = false;
            //     break;
            //   case 5999:
            //     product = 'com.shoorah.annually';
            //     expiry.setFullYear(expiry.getFullYear() + 1);
            //     break;
            //   case 4195:
            //     product = 'com.shoorah.sixmonths';
            //     expiry.setMonth(expiry.getMonth() + 6);
            //     break;
            //   case 999:
            //     product = 'com.shoorah.monthly';
            //     expiry.setMonth(expiry.getMonth() + 1);
            //     break;
            //   default:
            //     product = 'com.shoorah.monthly';
            //     expiry.setMonth(expiry.getMonth() + 1);
            //     break;
            // }

            if(session.metadata.product=='com.shoorah.monthly'){
              product = 'com.shoorah.monthly';
              expiry.setMonth(expiry.getMonth() + 1);
            }else if(session.metadata.product=='com.shoorah.sixmonths'){
              product = 'com.shoorah.sixmonths';
              expiry.setMonth(expiry.getMonth() + 6);
            }else if(session.metadata.product=='com.shoorah.annually'){
              product = 'com.shoorah.annually';
              expiry.setFullYear(expiry.getFullYear() + 1);
            }else if(session.metadata.product=='com.shoorah.lifetime'){
              product = 'com.shoorah.lifetime';
              expiry.setFullYear(expiry.getFullYear() + 9999);
              subscriptionId = session.payment_method_configuration_details?.id;
              autoRenew = false;
            }

            await cancelExistingSubscriptions(userId);

            let existingSubscription = await Subscriptions.findOne(filterCondition);
            if (existingSubscription) {
              await Subscriptions.updateMany(
                { user_id: toObjectId(userId) },
                { deletedAt: new Date() }
              );
              console.log('SUBSCRIBED SUCCESSFULLY');
            }

            await Subscriptions.create({
              user_id: userId,
              purchased_from_device: DEVICE_TYPE.WEB,
              product_id: product,
              original_transaction_id: subscriptionId,
              auto_renew: autoRenew,
              expires_date: expiry
            });

            await Users.updateOne(
              { _id: toObjectId(userId) },
              {
                $set: {
                  account_type: 2,
                  is_under_trial: false
                }
              }
            );

            let user = await Users.findOne({ _id: toObjectId(userId) }).select('email user_type name');
            if (user) {
              let profile = {
                email: user.email,
                userType: user.user_type,
                firstName: user.name
              };
              await addEditKlaviyoUser(profile);
            }

            console.log('SUBSCRIBED SUCCESSFULLY');
          }
        }
        if (!userId) {
          return;
        }
        break;

      case 'invoice.payment_succeeded':
        const invoice = event.data.object;
        const id = invoice.client_reference_id; // Customer ID in Stripe

        // Retrieve the subscription associated with the invoice
        const subId = invoice.subscription;
        let companyData = null;
        if (id) {
          companyData = await Company.findOne({ _id: toObjectId(id) });
          if (companyData) {
            //  logic not need right now for subscription as it is according to length
          } else {
            if (subId) {
              const updatedSubscription = await Subscriptions.findOneAndUpdate(
                { user_id: toObjectId(id), original_transaction_id: subId, deletedAt: null },
                { $set: { expires_date: new Date(invoice.lines.data[0].period.end) } },
                { new: true }
              );

              console.log('Subscription renewed successfully:', updatedSubscription);
            }
          }

        } else {
          return;
        }

        break;
      // Handle other event types as needed

      default:
        // Handle other event types or log unexpected events
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).end();
  },

  /**
   * @description This function is used to do free plan
   ** @param {*} req
   * @param {*} res
   * @returns {*}
   */

  freeSubscription: async (req, res) => {
    try {
      let filterCondition = {
        deletedAt: null,
        user_id: req.authUserId,
        expires_date: { $gt: new Date() }
      };

      let existingSubscription = await Subscriptions.findOne(filterCondition);
      if (existingSubscription) {
        await Subscriptions.updateMany(
          { user_id: req.authUserId },
          { deletedAt: new Date(), expiresDate: new Date() }
        );
        await stripe.subscriptions.update(existingSubscription.original_transaction_id, {
          cancel_at_period_end: true
        });

        await stripe.subscriptions.cancel(existingSubscription.original_transaction_id);
        await Subscriptions.findByIdAndUpdate(existingSubscription._id, {
          $set: { deletedAt: new Date() }
        });

        await Users.updateOne(
          { _id: req.authUserId },
          {
            $set: {
              account_type: 1
            }
          }
        );

        let user = await Users.findOne({ _id: req.authUserId }).select('email user_type name');
        if (user) {
          let profile = {
            email: user.email,
            userType: user.user_type,
            firstName: user.name
          };

          await addEditKlaviyoUser(profile);
        }
      }

      let message = 'Plan is downgraded';

      return Response.successResponseData(res, message, SUCCESS, res.__('freeSubscriptionAdded'));
    } catch (err) {
      console.error(err);
      return Response.internalServerErrorResponse(err);
    }
  },

  cancelSubscription: async (req, res) => {
    try {
      let reqParam = req.body;
      let user = await Users.findOne({ _id: req.authUserId }).select('email user_type name');
      const existingSubscriptions = await Subscriptions.find({
        user_id: req.authUserId,
        deletedAt: null
      });
      for (const subscription of existingSubscriptions) {
        if (subscription.original_transaction_id.includes('sub_')) {
          await stripe.subscriptions.update(subscription.original_transaction_id, {
            cancel_at_period_end: true
          });
        }
        await Subscriptions.updateOne({ _id: subscription._id }, { $set: { auto_renew: false } });
      }

      let profile = {
        email: user.email,
        userType: user.user_type,
        firstName: user.name
      };

      await addEditKlaviyoUser(profile);

      let message = 'Unsubscribed successfully';

      return Response.successResponseData(res, message, SUCCESS, res.__('unsubscribedSuccess'));
    } catch (err) {
      console.error(err);
      return Response.internalServerErrorResponse(err);
    }
  }
};
