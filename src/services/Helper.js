'use strict';

const Mongoose = require('mongoose');
const { default: axios } = require('axios');
const { STATUS, USER_TYPE, THOUGHTS_OF_DAY } = require('./Constant');
const { updateKlaviyoUser } = require('../controllers/api/v1/klaviyoController');
const { Users, Subscriptions } = require('../models');
const { convertObjectKeysToCamelCase } = require('./utils');

let KLAVIYO_ENDPOINT = 'https://a.klaviyo.com/api/v2/';

let ListId = process.env.KLAVIYO_LIST_ID; // stage list

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
  convertObjectKeysToCamelCase,
  /**
   * @description To convert string to upper case
   * @param {*} str
   * @returns {*}
   */
  toUpperCase: (string) => {
    if (string.length > 0) {
      const newString = string
        .toLowerCase()
        .replace(/_([a-z])/, (m) => m.toUpperCase())
        .replace(/_/, '');
      return string.charAt(0).toUpperCase() + newString.slice(1);
    }

    return '';
  },

  /**
   * @description This function use for create validation unique key
   * @param apiTag
   * @param error
   * @returns {*}
   */
  validationMessageKey: (apiTag, error) => {
    let key = error.details[0].context.key
      ? module.exports.toUpperCase(error.details[0].context.key)
      : '';
    let type = error.details[0].type.split('.');
    type = module.exports.toUpperCase(type[1]);

    let entries = error.details[0].context.peers;
    if (Array.isArray(entries)) {
      switch (entries.length) {
        case 0:
          entries = '';
          break;
        case 1:
          entries = entries[0];
          break;
        default:
          entries = entries.join('|');
      }
    } else {
      entries = entries ? entries : '';
    }
    key = apiTag + '_' + (key ? key + '_' : entries ? entries + '_' : '') + type;
    return key;
  },

  /**
   * @description This function use for create random digits
   * @param length
   * @returns {*}
   */
  makeRandomDigit: (length) => {
    let result = '';
    const characters = '0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  },

  /**
   * @description This function is used to generate random string
   * @param {*} length
   * @returns {*}
   */
  makeRandomString: (length) => {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  },

  /**
   * @description This function is used to convert string of id to mongodb ObjectId
   * @param {*} string
   * @returns {*}
   */
  toObjectId: (string) => {
    return new Mongoose.Types.ObjectId(string);
  },

  /**
   * @description This function is used to generate today's date only.
   * @returns {*}
   */
  currentDateOnly: () => {
    const currentDate = new Date();
    const month = ('0' + (currentDate.getMonth() + 1)).slice(-2);
    const date = ('0' + currentDate.getDate()).slice(-2);
    return new Date(`${currentDate.getFullYear()}-${month}-${date}`);
  },

  /**
   * @description This function is used to get dynamic model name based on content type
   * @param {*} contentType
   * @returns {*}
   */
  dynamicModelName: (contentType) => {
    switch (contentType) {
      case 1:
        return 'focus';
      case 2:
        return 'affirmations';
      case 3:
        return 'meditations';
      case 4:
        return 'sounds';
      case 5:
        return 'shoorah_pods';
      case 6:
        return 'gratitudes';
      case 7:
        return 'rituals';
      case 8:
        return 'app_surveys';
      case 9:
        return 'ideas';
      case 10:
        return 'breathworks';
      case 11:
        return 'breathworks';
      case 12:
        return 'breathworks';
      default:
        return 3;
    }
  },

  /**
   * @description This function is used to perform javascript pagination
   * @param {*} array
   * @param {*} perPage
   * @param {*} offset
   * @returns {*}
   */
  pagination: (array, perPage, offset) => {
    if (array.length > 0) {
      return array.slice(offset).slice(0, perPage);
    } else {
      return [];
    }
  },

  /**
   * @description This function is used to get the date of first day of the week
   * @param {*} date
   * @returns {*}
   */
  getFirstDayOfWeek: (date) => {
    date = new Date(date);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 0); // adjust when day is sunday
    return new Date(date.setDate(diff));
  },

  /**
   * @description This function is used to get first day of month
   * @param {*} date
   * @returns {*}
   */
  getFirstDayOfMonth: (date) => {
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    return new Date(`${date.getFullYear()}-${month}-01`);
  },

  /**
   * @description This function is used to calculate average value
   * @param {*} sumValue
   * @param {*} numberValue
   * @param {*} decimal
   * @returns {*}
   */
  averageValue: (sumValue, numberValue, decimal) => {
    const average = parseFloat((sumValue / numberValue).toFixed(decimal));
    return average;
  },

  /**
   * @description this function is used to get unix timestamp
   * @param {*} date
   * @returns {*}
   */
  unixTimeStamp: (date) => {
    return Math.floor(date.getTime() / 1000);
  },

  /**
   * @description This function is used to generate random email.
   * @returns {*}
   */
  randomEmailGenerator: () => {
    return process.env.APP_NAME + '.' + Math.floor(new Date().getTime() / 1000) + '@shoorah.com';
  },

  /**
   * @description This function is used to select random item from an array
   * @param {*} arr
   * @returns {*}
   */
  getRandomItem: (arr) => {
    const randomIndex = Math.floor(Math.random() * arr.length);
    const item = arr[randomIndex];
    return item;
  },

  /**
   * @description This function is used to get shuffled array
   * @param {*} array
   * @returns {*}
   */
  shuffleArray: (array) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  },

  /**
   * @description This function is used to calculate percentage
   * @param {*} value
   * @param {*} total
   * @returns {*}
   */
  calculatePercentage: (value, total) => {
    if (total === 0) {
      return 0;
    }
    const percentage = ((value / total) * 100).toFixed(2);
    return parseFloat(percentage);
  },

  /**
   * @description This function is used to get user dynamic model name based on content type
   * @param {*} contentType
   * @returns {*}
   */
  dynamicUserModelName: async (contentType) => {
    let modelName;
    switch (contentType) {
      case 1:
        modelName = 'Focus';
        break;
      case 2:
        modelName = 'Affirmation';
        break;
      case 3:
        modelName = 'Meditation';
        break;
      case 4:
        modelName = 'Sound';
        break;
      case 5:
        modelName = 'Shoorah_pods';
        break;
      case 6:
        modelName = 'UserGratitude';
        break;
      case 7:
        modelName = 'Rituals';
        break;
      case 8:
        modelName = 'Cleanse';
        break;
      case 9:
        modelName = 'Goals';
        break;
      case 10:
        modelName = 'UserNotes';
        break;
      case 11:
        modelName = 'Breathwork';
        break;
      default:
        return null;
    }
    const model = (modelName && Mongoose.model(modelName)) || null;
    return model;
  },

  getDaysDifference: (startDate, endDate = new Date().toISOString().split('T')[0]) => {
    const oneDay = 24 * 60 * 60 * 1000; // Number of milliseconds in a day
    const start = new Date(startDate);
    start.setDate(start.getDate() - 1);
    const end = new Date(endDate); // Current date
    const daysDifference = Math.round((end - start) / oneDay);
    return daysDifference;
  },
  getDatesArray: (startDate, endDate = new Date()) => {
    const datesArray = [];
    const current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
      const dateToPush = new Date(current);
      datesArray.push(dateToPush.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1); // Increment the date by 1 day
    }

    return datesArray;
  },
  getPositiveMood: (mood) => {
    let moods = {};
    // '$calm', '$motivated', '$happy', '$i_can_manage', '$i_am_in_control', '$relaxed', '$energised'
    moods['happy'] = 'happy';
    moods['motivation'] = 'motivated';
    moods['positiveness'] = 'content';
    moods['strong'] = 'i_can_manage';
    moods['control'] = 'i_am_in_control';
    moods['energy'] = 'energised';
    moods['balance'] = 'balance';
    moods['relax'] = 'relaxed';
    moods['calmness'] = 'calm';
    return moods[mood];
  },
  getNegativeMood: (mood) => {
    let moods = {};
    moods['motivation'] = 'demotivated';
    moods['happy'] = 'sad';
    moods['positiveness'] = 'low';
    moods['strong'] = 'i_need_support';
    moods['control'] = 'helpless';
    moods['energy'] = 'tired';
    moods['balance'] = 'stressed';
    moods['relax'] = 'anxious';
    moods['calmness'] = 'angry';
    return moods[mood];
  },

  replaceUnderscoreWithSpace: (str) => {
    const wordList = str.split('_');
    const updatedStr = wordList.reduce((prev, curr) => {
      return prev + ' ' + curr;
    });
    console.log(updatedStr);
    return updatedStr;
  },

  noDataFoundInProfessionalMoods: () => {
    const data = {
      moodData: [
        {
          job_satisfaction_positive: 0,
          job_satisfaction_negative: 0,
          working_enviroment_positive: 0,
          working_enviroment_negative: 0,
          work_load_positive: 0,
          work_load_negative: 0,
          line_manager_relationship_positive: 0,
          line_manager_relationship_negative: 0,
          working_hours_positive: 0,
          working_hours_negative: 0,
          mental_health_support_positive: 0,
          mental_health_support_negative: 0,
          company_culture_positive: 0,
          company_culture_negative: 0,
          feeling_supported_positive: 0,
          feeling_supported_negative: 0,
          having_tools_for_job_positive: 0,
          having_tools_for_job_negative: 0,
          ongoing_training_positive: 0,
          ongoing_training_negative: 0
        }
      ],
      averageMoodPercentage: {
        job_satisfaction_positive: 0,
        job_satisfaction_negative: 0,
        working_enviroment_positive: 0,
        working_enviroment_negative: 0,
        work_load_negative: 0,
        work_load_positive: 0,
        line_manager_relationship_negative: 0,
        line_manager_relationship_positive: 0,
        working_hours_negative: 0,
        working_hours_positive: 0,
        mental_health_support_negative: 0,
        mental_health_support_positive: 0,
        company_culture_negative: 0,
        company_culture_positive: 0,
        feeling_supported_negative: 0,
        feeling_supported_positive: 0,
        having_tools_for_job_negative: 0,
        having_tools_for_job_positive: 0,
        ongoing_training_negative: 0,
        ongoing_training_positive: 0
      },
      moodCount: {
        job_satisfaction_positive_count: 0,
        job_satisfaction_negative_count: 0,
        working_enviroment_positive_count: 0,
        working_enviroment_negative_count: 0,
        work_load_positive_count: 0,
        work_load_negative_count: 0,
        line_manager_relationship_positive_count: 0,
        line_manager_relationship_negative_count: 0,
        working_hours_positive_count: 0,
        working_hours_negative_count: 0,
        mental_health_support_positive_count: 0,
        mental_health_support_negative_count: 0,
        company_culture_positive_count: 0,
        company_culture_negative_count: 0,
        feeling_supported_positive_count: 0,
        feeling_supported_negative_count: 0,
        having_tools_for_job_positive_count: 0,
        having_tools_for_job_negative_count: 0,
        ongoing_training_positive_count: 0,
        ongoing_training_negative_count: 0
      }
    };
    return data;
  },

  appendLineToFile: (text, filePath) => {
    // fs.appendFile(filePath, text + '\n', (err) => {
    //   if (err) {
    //     console.error('Error appending to file:', err);
    //   } else {
    //     console.log('Line appended to file.');
    //   }
    // });
    console.log('file append');
  },

  addEditKlaviyoUser: async (reqParam) => {
    try {
      const klaviyoEndpoint = `${KLAVIYO_ENDPOINT}list/${ListId}/members`;
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
              reqParam.usage = daysDifference;
              break;
            case daysDifference <= 13:
              reqParam.timeline = KLAVIYO_TIMELINE.NORMALUSER;
              reqParam.usage = daysDifference;
              break;
            case daysDifference <= 29:
              reqParam.timeline = KLAVIYO_TIMELINE.MIDUSER;
              reqParam.usage = daysDifference;
              break;
            case daysDifference <= 59:
              reqParam.timeline = KLAVIYO_TIMELINE.AVERAGEUSER;
              reqParam.usage = daysDifference;
              break;
            case daysDifference <= 90:
              reqParam.timeline = KLAVIYO_TIMELINE.DEDICATEUSER;
              reqParam.usage = daysDifference;
              break;
            case daysDifference > 90:
              reqParam.timeline = KLAVIYO_TIMELINE.PROUSER;
              reqParam.usage = daysDifference;
              break;
            default:
              reqParam.timeline = KLAVIYO_TIMELINE.NEWUSER;
              reqParam.usage = daysDifference;
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
            email: reqParam.email
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
        console.log('Updated');
        // return Response.successResponseData(res, resp.data, SUCCESS);
      } else {
        console.error('Error adding email to Klaviyo');
        // return Response.internalServerErrorResponse(res);
      }
    } catch (err) {
      console.error(err);
      // return Response.internalServerErrorResponse(res);
    }
  },

  getRandomThought: () => {
    return THOUGHTS_OF_DAY[Math.floor(Math.random() * THOUGHTS_OF_DAY.length)];
  }
};
