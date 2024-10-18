const { NODE_ENVIRONMENT } = require('@services/Constant');

const stringifyId = (item) => (item?._id || item)?.valueOf?.();
//convert object keys to camelCase

module.exports = {
  sanitizeNullPayloads: (payload, filterEmptyStrings) => {
    for (const key in payload) {
      if (
        [null, undefined, 'null', 'undefined', ...(filterEmptyStrings ? [''] : [])].includes(
          payload[key]
        )
      ) {
        delete payload[key];
      }
    }
    return payload;
  },
  getAdminPlatformURL: (isB2B) => {
    const env = process.env.NODE_ENV;
    let url = '';
    switch (env) {
      case NODE_ENVIRONMENT.DEVELOPMENT:
        url = 'https://dev-admin.shoorah.io';
        break;
      case NODE_ENVIRONMENT.STAGING:
        url = 'https://staging-admin.shoorah.io';
        break;
      case NODE_ENVIRONMENT.PRODUCTION:
        url = 'https://admin.shoorah.io';
        break;
    }
    if (isB2B) url += '/b2b';

    return url;
  },
  stringifyId,

  hasValue: (value) => value !== null && value !== undefined,
  compareObjectId: (id1, id2) => stringifyId(id1) === stringifyId(id2)
};
