'use strict';

const Bcrypt = require('bcrypt');
const { DeviceTokens, Users } = require('@models');

module.exports = {
  /**
   * @description This function is used to add or update device token
   * @param {*} userId
   * @param {*} deviceToken
   * @param {*} deviceType
   */
  storeDeviceToken: async (userId, deviceToken, deviceType) => {
    const filterData = {
      user_id: userId,
      device_type: deviceType
    };
    const deviceData = {
      device_token: deviceToken
    };

    await DeviceTokens.findOneAndUpdate(filterData, deviceData, { upsert: true });
    await updateLastLogin(userId);
  },

  /**
   * @description This function is used to hash password
   * @param {*} password
   * @returns {*}
   */
  generatePassword: (password) => {
    return new Promise((resolve, reject) =>
      Bcrypt.hash(password, 10, (err, hash) => {
        // eslint-disable-next-line prefer-promise-reject-errors
        if (err) reject();
        resolve(hash);
      })
    );
  }
};

/**
 * @description This function is used to update user last lohin time
 * @param {*} userId
 */
async function updateLastLogin(userId) {
  await Users.findByIdAndUpdate(userId, { last_login: new Date() });
}
