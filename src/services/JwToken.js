'use strict';

const Jwt = require('jsonwebtoken');

module.exports = {
  /**
   * @description This Function is use to Decode token on a request and get without bearer
   * @param {*} token
   * @returns {*}
   */
  decode: (token) => {
    const parts = token.split(' ');
    if (parts.length === 2) {
      const scheme = parts[0];
      const credentials = parts[1];
      if (/^Bearer$/i.test(scheme)) {
        return credentials;
      }
      return false;
    }
    return false;
  },
  /**
   * @description This Function is use to verify admin token.
   * @param {*} token
   * @param {*} callback
   * @returns {*}
   */
  verifyAdmin: (token, callback) => {
    try {
      return Jwt.verify(token, process.env.JWT_ADMIN_SECRETKEY, {}, callback);
    } catch (err) {
      return 'error';
    }
  },

  /**
   * @description This Function is use to verify company token.
   * @param {*} token
   * @param {*} callback
   * @returns {*}
   */
  verifyCompany: (token, callback) => {
    try {
      return Jwt.verify(token, process.env.JWT_COMPANY_SECRETKEY, {}, callback);
    } catch (err) {
      return 'error';
    }
  },

  /**
   * @description This function is used to verify user token
   * @param {*} token
   * @param {*} callback
   * @returns {}
   */
  verifyUser: (token, callback) => {
    try {
      return Jwt.verify(token, process.env.JWT_USER_SECRETKEY, {}, callback);
    } catch (err) {
      return 'error';
    }
  },
  /**
   * @description to issue admin token
   * @param {*} payload
   * @returns {*}
   */
  issueUserTokenPaticular: (payload, email) => {
    if (email == 'jay.thakkar@mindinventory.com') {
      return Jwt.sign(
        {
          id: payload.id
        },
        process.env.JWT_USER_SECRETKEY,
        { algorithm: 'HS512', expiresIn: '30s' }
      );
    } else {
      return Jwt.sign(
        {
          id: payload.id
        },
        process.env.JWT_USER_SECRETKEY,
        { algorithm: 'HS512', expiresIn: process.env.JWT_USER_EXPIRES }
      );
    }
  },

  issueUserRefreshTokenParticular: (payload, email) => {
    if (email == 'jay.thakkar@mindinventory.com') {
      return Jwt.sign(
        {
          id: payload.id
        },
        process.env.JWT_USER_REFRESH_SECRETKEY,
        { algorithm: 'HS512', expiresIn: '30s' }
      );
    } else {
      return Jwt.sign(
        {
          id: payload.id
        },
        process.env.JWT_USER_REFRESH_SECRETKEY,
        { algorithm: 'HS512', expiresIn: '120s' }
      );
    }
  },

  issueAdminToken: (payload) => {
    return Jwt.sign(
      {
        id: payload.id,
        companyId: payload.companyId
      },
      process.env.JWT_ADMIN_SECRETKEY,
      { algorithm: 'HS512', expiresIn: process.env.JWT_ADMIN_EXPIRES }
    );
  },

  /**
   * @description to issue company token
   * @param {*} payload
   * @returns {*}
   */
  issueCompanyToken: (payload) => {
    return Jwt.sign(
      {
        id: payload.id
      },
      process.env.JWT_COMPANY_SECRETKEY,
      { algorithm: 'HS512', expiresIn: process.env.JWT_COMPANY_EXPIRES }
    );
  },

  /**
   * @description This function is used to issue user token
   * @param {*} payload
   * @returns {*}
   */
  issueUserToken: (payload) => {
    return Jwt.sign(
      {
        id: payload.id
      },
      process.env.JWT_USER_SECRETKEY,
      { algorithm: 'HS512', expiresIn: process.env.JWT_USER_EXPIRES }
    );
  },

  /**
   * @description THis function is used to issue user refresh token
   * @param {*} payload
   * @returns
   */

  issueUserRefreshToken: (payload) => {
    return Jwt.sign(
      {
        id: payload.id
      },
      process.env.JWT_USER_REFRESH_SECRETKEY,
      { algorithm: 'HS512', expiresIn: process.env.JWT_USER_REFRESH_EXPIRES }
    );
  },

  /**
   * @description This function is used to issue admin refresh token
   * @param {*} payload
   * @returns
   */

  issueAdminRefreshToken: (payload) => {
    return Jwt.sign(
      {
        id: payload.id
      },
      process.env.JWT_ADMIN_REFRESH_SECRETKEY,
      { algorithm: 'HS512', expiresIn: process.env.JWT_ADMIN_REFRESH_EXPIRES }
    );
  },

  /**
   * @description This function is used to issue company refresh token
   * @param {*} payload
   * @returns
   */

  issueCompanyRefreshToken: (payload) => {
    return Jwt.sign(
      {
        id: payload.id
      },
      process.env.JWT_COMPANY_REFRESH_SECRETKEY,
      { algorithm: 'HS512', expiresIn: process.env.JWT_COMPANY_REFRESH_EXPIRES }
    );
  },

  /**
   * @description This function is used to verify user refresh token
   * @param {*} token
   * @param {*} callback
   */

  verifyUserRefreshToken: (token, callback) => {
    try {
      return Jwt.verify(token, process.env.JWT_USER_REFRESH_SECRETKEY, {}, callback);
    } catch (err) {
      return 'error';
    }
  },

  /**
   *@description This function is used for verify admin refresh token
   * @param {*} token
   * @param {*} callback
   * @returns
   */

  verifyAdminRefreshToken: (token, callback) => {
    try {
      return Jwt.verify(token, process.env.JWT_ADMIN_REFRESH_SECRETKEY, {}, callback);
    } catch (err) {
      return 'error';
    }
  },

  /**
   *@description This function is used for verify company refresh token
   * @param {*} token
   * @param {*} callback
   * @returns
   */

  verifyCompanyRefreshToken: (token, callback) => {
    try {
      return Jwt.verify(token, process.env.JWT_COMPANY_REFRESH_SECRETKEY, {}, callback);
    } catch (err) {
      return 'error';
    }
  }
};
