'use strict';

const I18n = require('i18n');
const Path = require('path');

I18n.configure({
  locales: ['en'],
  directory: Path.join(__dirname, ''),
  defaultLocale: 'en',
  cookie: 'lang'
});

module.exports = (req, res, next) => {
  I18n.init(req, res);
  return next();
};
