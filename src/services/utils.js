'use strict';

const { forEach, isPlainObject, isArray, camelCase } = require('lodash');

function convertObjectKeysToCamelCase(object) {
  if (!isPlainObject(object) && !isArray(object)) {
    return object;
  }

  const isArrayData = isArray(object);
  const camelCaseObject = isArrayData ? [] : {};

  if (isPlainObject(object) || isArrayData) {
    forEach(object, function (value, key) {
      if (!isPlainObject(value) && !isArray(value)) {
        camelCaseObject[isArrayData ? +key : camelCase(key)] = value;
        return;
      }

      if (isPlainObject(value)) {
        value = convertObjectKeysToCamelCase(value);
      } else if (isArray(value)) {
        value = value.map(function (item) {
          if (isPlainObject(item)) {
            return convertObjectKeysToCamelCase(item);
          }
          return item;
        });
      }

      camelCaseObject[isArrayData ? +key : camelCase(key)] = value;
    });
  }

  return camelCaseObject;
}

module.exports = {
  convertObjectKeysToCamelCase
};
