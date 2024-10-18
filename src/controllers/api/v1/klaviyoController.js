'use strict';

const Response = require('@services/Response');

const { Users, AppIssues } = require('@models');
const {
  SUCCESS,
  FAIL,
  STATUS,
  DISPOSABLE_EMAIL_DOMAINS,
  USER_TYPE
} = require('../../../services/Constant');
const { convertObjectKeysToCamelCase } = require('@services/utils');
const { default: axios } = require('axios');
const { Subscriptions } = require('../../../models');

let KLAVIYO_ENDPOINT = 'https://a.klaviyo.com/api/';
let ListId = 'WQMuHG';

if (process.env.NODE_ENV !== 'production') {
  ListId = 'WQMuHG';
} else {
  ListId = 'V7KQHC';
}

let KLAVIYO_STATUS = {
  MONTHLY: 'Monthly',
  SIXMONTHS: 'Six Months',
  ANNUAL: 'Annual',
  LIFETIME: 'Lifetime',
  FREE: 'Free',
  DELETED: 'Deleted',
  COMPANY: 'Company Plan',
  SHOORAH: 'Shoorah Admins',
  PARTNER: 'Shoorah Partners'
};

let KLAVIYO_GENDER = {
  NOTPREFER: 'Not Prefer',
  MALE: 'Male',
  FEMALE: 'Female',
  NONBINARY: 'Non Binary',
  TRANSGENDER: 'Transgender',
  INTERSEX: 'Intersex'
};

let KLAVIYO_B2B = {
  USER: 'User',
  ADMIN: 'Admin',
  SHOORAH_ADMINS: 'Shoorah Admins',
  PARTNERS: 'Partners',
  NORMAL: 'Normal'
};

let KLAVIYO_TIMELINE = {
  NEWUSER: 'under 7 days',
  NORMALUSER: '7 - 13 days',
  MIDUSER: '14 - 29 days',
  AVERAGEUSER: '30 - 59 days',
  DEDICATEUSER: '60 - 90 days',
  PROUSER: 'above 90 days'
};

module.exports = {
  /**
   * @description This function is used for adding app issue by users
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */

  getKlaviyoList: async (req, res) => {
    try {
      const klaviyoEndpoint = `${KLAVIYO_ENDPOINT}lists`;

      // Make a GET request to Klaviyo API
      const response = await axios.get(klaviyoEndpoint, {
        headers: {
          accept: 'application/json',
          revision: '2024-07-15',
          Authorization: `Klaviyo-API-Key ${process.env.KLAVIYO_PRIVATE_KEY}` // Use your private API key from the environment variable
        }
      });

      const klaviyoList = response.data; // Assuming the response contains the Klaviyo list data
      console.log('Klaviyo List:', klaviyoList);
      const convertData = convertObjectKeysToCamelCase(klaviyoList);

      return Response.successResponseData(
        res,
        convertData,
        SUCCESS,
        res.__('getKlaviyoListSuccess')
      );
    } catch (err) {
      console.error(err);
      return Response.internalServerErrorResponse(res);
    }
  },

  addKlaviyoList: async (req, res) => {
    try {
      const reqParam = req.query;
      const klaviyoEndpoint = `${KLAVIYO_ENDPOINT}lists`; // Replace with the actual Klaviyo API endpoint

      const newListData = {
        api_key: process.env.KLAVIYO_PRIVATE_KEY,
        list_name: reqParam.listName
      };

      const response = await axios.post(klaviyoEndpoint, newListData);

      const newList = response.data; // Assuming the response contains
      return Response.successResponseData(
        res,
        convertObjectKeysToCamelCase(newList),
        SUCCESS,
        res.__('getKlaviyoListSuccess')
      );
    } catch (err) {
      console.error(err);
      return Response.internalServerErrorResponse(res);
    }
  },

  deleteKlaviyoList: async (req, res) => {
    try {
      const reqParam = req.params;
      const klaviyoEndpoint = `${KLAVIYO_ENDPOINT}list/${reqParam.listId}`; // Replace with the actual Klaviyo API endpoint

      const deleteListData = {
        api_key: process.env.KLAVIYO_PRIVATE_KEY
        // Add any additional parameters required for deleting a list
      };

      // Make a DELETE request to Klaviyo API
      const response = await axios.delete(klaviyoEndpoint, { data: deleteListData });

      if (response.status === 200) {
        // Handle successful deletion
        return Response.successResponseWithoutData(res, 'List deleted successfully', 'success');
      } else {
        // Handle unsuccessful deletion
        console.error('Error deleting Klaviyo list:', response.data);
        return Response.internalServerErrorResponse(res);
      }
    } catch (err) {
      console.error(err);
      return Response.internalServerErrorResponse(res);
    }
  },

  addMemberToKlaviyoList: async (req, res) => {
    try {
      const reqParam = req.query;
      const klaviyoEndpoint = `${KLAVIYO_ENDPOINT}list/${ListId}/members`;

      if (DISPOSABLE_EMAIL_DOMAINS.includes(reqParam?.email.split('@')[1])) {
        return Response.successResponseWithoutData(res, 'disposable domain not allowed', SUCCESS);
      }

      let filterCondition = {
        email: reqParam.email,
        deletedAt: null,
        status: { $ne: STATUS.DELETED }
      };

      if (reqParam.userType) {
        filterCondition = {
          ...filterCondition,
          user_type: reqParam.userType
        };
      }

      let user = await Users.findOne(filterCondition).select('-password');

      if (user) {
        switch (user.gender) {
          case 0:
            reqParam.gender = KLAVIYO_GENDER.NOTPREFER;
            break;
          case 1:
            reqParam.gender = KLAVIYO_GENDER.MALE;
            break;
          case 2:
            reqParam.gender = KLAVIYO_GENDER.FEMALE;
            break;
          case 3:
            reqParam.gender = KLAVIYO_GENDER.NONBINARY;
            break;
          case 4:
            reqParam.gender = KLAVIYO_GENDER.INTERSEX;
            break;
          case 5:
            reqParam.gender = KLAVIYO_GENDER.TRANSGENDER;
            break;
          default:
            reqParam.gender = KLAVIYO_GENDER.NOTPREFER;
        }

        let createDate = new Date(user.createdAt);
        let timeDifference = new Date() - createDate;
        let daysDifference = parseInt(Math.floor(timeDifference / (1000 * 60 * 60 * 24)));
        if (daysDifference >= 0) {
          switch (true) {
            case daysDifference < 7:
              reqParam.timeline = KLAVIYO_TIMELINE.NEWUSER;
              break;
            case daysDifference <= 13:
              reqParam.timeline = KLAVIYO_TIMELINE.NORMALUSER;
              break;
            case daysDifference <= 29:
              reqParam.timeline = KLAVIYO_TIMELINE.MIDUSER;
              break;
            case daysDifference <= 59:
              reqParam.timeline = KLAVIYO_TIMELINE.AVERAGEUSER;
              break;
            case daysDifference <= 90:
              reqParam.timeline = KLAVIYO_TIMELINE.DEDICATEUSER;
              break;
            case daysDifference > 90:
              reqParam.timeline = KLAVIYO_TIMELINE.PROUSER;
              break;
            default:
              reqParam.timeline = KLAVIYO_TIMELINE.NEWUSER;
          }
        }

        if (user.user_type == USER_TYPE.USER) {
          if (user.company_id) {
            reqParam.b2b = KLAVIYO_B2B.USER;
            reqParam.status = KLAVIYO_STATUS.COMPANY;
          } else {
            reqParam.b2b = KLAVIYO_B2B.NORMAL;
            if (user.status == STATUS.DELETED) {
              reqParam.status = KLAVIYO_STATUS.DELETED;
            } else {
              const subscription = await Subscriptions.findOne({
                user_id: user._id,
                deletedAt: null,
                expires_date: { $gt: new Date() }
              }).select('product_id');
              if (!subscription || user.account_type == 1) {
                reqParam.status = KLAVIYO_STATUS.FREE;
              } else {
                switch (subscription.product_id) {
                  case 'com.shoorah.monthly':
                    reqParam.status = KLAVIYO_STATUS.MONTHLY;
                    break;
                  case 'com.shoorah.sixmonths':
                    reqParam.status = KLAVIYO_STATUS.SIXMONTHS;
                    break;
                  case 'com.shoorah.annually':
                    reqParam.status = KLAVIYO_STATUS.ANNUAL;
                    break;
                  case 'com.shoorah.lifetime':
                    reqParam.status = KLAVIYO_STATUS.LIFETIME;
                    break;
                  default:
                    reqParam.status = KLAVIYO_STATUS.MONTHLY;
                    break;
                }
              }
            }
          }
        } else if (
          user.user_type == USER_TYPE.COMPANY_ADMIN ||
          user.user_type == USER_TYPE.COMPANY_SUB_ADMIN
        ) {
          reqParam.b2b = KLAVIYO_B2B.ADMIN;
          if (user.status == STATUS.DELETED) {
            reqParam.status = KLAVIYO_STATUS.DELETED;
          } else {
            reqParam.status = KLAVIYO_STATUS.COMPANY;
          }
        } else if (
          user.user_type == USER_TYPE.SUPER_ADMIN ||
          user.user_type == USER_TYPE.SUB_ADMIN
        ) {
          reqParam.b2b = KLAVIYO_B2B.SHOORAH_ADMINS;
          if (user.status == STATUS.DELETED) {
            reqParam.status = KLAVIYO_STATUS.DELETED;
          } else {
            reqParam.status = KLAVIYO_STATUS.SHOORAH;
          }
        } else if (user.user_type == USER_TYPE.PARTNER) {
          reqParam.b2b = KLAVIYO_B2B.PARTNERS;
          if (user.status == STATUS.DELETED) {
            reqParam.status = KLAVIYO_STATUS.DELETED;
          } else {
            reqParam.status = KLAVIYO_STATUS.PARTNER;
          }
        }
      }

      const addEmailData = {
        api_key: process.env.KLAVIYO_PRIVATE_KEY,
        profiles: [
          {
            email: reqParam.email,
            phone_number: reqParam.phone
          }
        ]
      };

      const response = await axios.post(klaviyoEndpoint, addEmailData);
      if (response.status === 200) {
        await Users.updateOne(
          { email: reqParam.email },
          {
            $set: {
              klaviyo_id: response.data[0].id
            }
          }
        );
        reqParam.id = response.data[0].id;
        let resp = await updateKlaviyoUser(reqParam);
        return Response.successResponseData(res, resp.data, SUCCESS);
      } else {
        console.error('Error adding email to Klaviyo list:', response.data);
        return Response.internalServerErrorResponse(res);
      }
    } catch (err) {
      console.error(err);
      return Response.internalServerErrorResponse(res);
    }
  },

  updateMember: async (req, res) => {
    try {
      const reqParam = req.query;
      // const klaviyoEndpoint = `${KLAVIYO_ENDPOINT}list/${reqParam.listId}/members`;
      const klaviyoEndpoint = `https://a.klaviyo.com/api/profiles/${reqParam.id}/`;

      if (DISPOSABLE_EMAIL_DOMAINS.includes(reqParam?.email.split('@')[1])) {
        return Response.successResponseWithoutData(res, 'disposable domain not allowed', SUCCESS);
      }

      const headers = {
        accept: 'application/json',
        revision: '2024-02-09',
        'content-type': 'application/json',
        Authorization: `Klaviyo-API-Key pk_84c00fa3e013b851f065c55a2b0f100348`
      };

      let properties = {
        status: 'Paying',
        gender: 'Female',
        timeline: 7,
        usage: 4,
        b2b: 'admin'
      };

      const addEmailData = {
        data: {
          type: 'profile',
          id: reqParam.id,
          attributes: {
            email: reqParam.email,
            first_name: reqParam.firstName,
            last_name: reqParam.lastName,
            properties
          }
          // meta: {
          //     patch_properties: {
          //         append: { newKey: 'New Value' },
          //         unappend: { newKey: 'New Value' },
          //         unset: 'skus'
          //     }
          // }
        }
      };

      const response = await axios.patch(klaviyoEndpoint, addEmailData, { headers });

      if (response.status === 200) {
        console.log('Klaviyo Response:', response.data); // Log the response for inspection
        return Response.successResponseData(res, response.data, SUCCESS);
      } else {
        console.error('Error adding email to Klaviyo list:', response.data.errors);
        // return Response.internalServerErrorResponse(res);
        return Response.successResponseData(res, response.data.errors, SUCCESS);
      }
    } catch (err) {
      console.error(err.response.data);

      return Response.internalServerErrorResponse(res);
    }
  },

  addMembersToKlaviyoList: async (req, res) => {
    try {
      const reqParam = req.query || req.body;
      const klaviyoEndpoint = `${KLAVIYO_ENDPOINT}list/${reqParam.listId}/members`;

      // let users = await Users.find().select('email mobile country_code');
      let users = reqParam.users;

      for (let user of users) {
        let profiles = {
          email: user.email
        };
        if (user.mobile && user.country_code) {
          profiles.phone_number = user.country_code + '' + user.mobile;
        }
        if (!user.email) {
          continue;
        }
        const addEmailData = {
          api_key: process.env.KLAVIYO_PRIVATE_KEY,
          profiles: [profiles]
        };
        try {
          const response = await axios.post(klaviyoEndpoint, addEmailData);

          if (response.status === 200) {
            console.log('Email added successfully');
            // return Response.successResponseWithoutData(res, 'Email added to the list successfully', 'success');
          } else {
            console.error('Error adding email to Klaviyo list:', response.data);
            continue;
            // return Response.internalServerErrorResponse(res);
          }
        } catch (err) {
          continue;
        }
      }

      return Response.successResponseWithoutData(
        res,
        'Email added to the list successfully',
        'success'
      );
    } catch (err) {
      console.error(err);
      return Response.internalServerErrorResponse(res);
    }
  },

  updateKlaviyoUser: async (reqParam) => {
    try {
      // const klaviyoEndpoint = `${KLAVIYO_ENDPOINT}list/${reqParam.listId}/members`;
      const klaviyoEndpoint = `https://a.klaviyo.com/api/profiles/${reqParam.id}/`;

      if (DISPOSABLE_EMAIL_DOMAINS.includes(reqParam?.email.split('@')[1])) {
        return Response.successResponseWithoutData(res, 'disposable domain not allowed', SUCCESS);
      }

      const headers = {
        accept: 'application/json',
        revision: '2024-02-09',
        'content-type': 'application/json',
        Authorization: `Klaviyo-API-Key ${process.env.KLAVIYO_PRIVATE_KEY}`
      };

      let properties = {
        klaviyo_status: reqParam.status,
        klaviyo_gender: reqParam.gender,
        klaviyo_timeline: reqParam.timeline,
        klaviyo_usage: reqParam.usage,
        klaviyo_b2b: reqParam.b2b
      };

      const addEmailData = {
        data: {
          type: 'profile',
          id: reqParam.id,
          attributes: {
            email: reqParam.email,
            first_name: reqParam.firstName,
            last_name: reqParam.lastName,
            properties
          }
        }
      };

      const response = await axios.patch(klaviyoEndpoint, addEmailData, { headers });

      if (response.status === 200) {
        return response.data;
        // return Response.successResponseData(res, response.data, SUCCESS);
      } else {
        console.error('Error adding email to Klaviyo list:', response.data.errors);
        // return Response.internalServerErrorResponse(res);
        return Response.successResponseData(res, response.data.errors, SUCCESS);
      }
    } catch (err) {
      console.error(err.response.data);

      return Response.internalServerErrorResponse(res);
    }
  }
};
