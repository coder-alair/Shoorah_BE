module.exports = {
  env: {
    node: true,
    browser: true,
    commonjs: true,
    es2021: true
  },
  extends: ["eslint:recommended", "prettier"],
  overrides: [],
  parserOptions: {
    ecmaVersion: 'latest'
  },
  plugins: ['spellcheck'],
  rules: {
    semi: [2, 'always'],
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'space-before-function-paren': [0, 'never'],
    'n/no-callback-literal': 'off',
    indent: ['off', 0],
    'no-case-declarations': ['off', 0],
    'array-callback-return': ['off', 0],
    'spellcheck/spell-checker': [1,{
      'comments': false,
      'strings': false,
      'templates': true,
      "skipWords": [
               'Shoorah',
               'gratitudes',
               'upsert',
               'reqParam',
               'req',
               'sendOtp',
               'otp',
               'auth_uri',
               'token_uri',
               'cms',
               '$gte',
               '$lte',
               'devicetype',
               'devicetoken',
               'appversion',
               'cond',
               '$lt',
               'Joi',
               'cors',
               'urlencoded',
               'fs',
               'ip',
               'webpush',
               'fcm_options',
               'axios',
               'Verifier',
               'verifier',
               'cron',
               'energised',
               'pdf',
               'pathname'
           ],
           "skipWordIfMatch": [
               "^unix.*$",
               "^csv.*$",
               "^Csv.*$",
               "^Cron"
           ],
    }]
  }
};
