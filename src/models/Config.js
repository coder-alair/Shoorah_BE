'use strict';

const Mongoose = require('mongoose');
const { CONFIG_TYPE } = require('@services/Constant');

const configSchema = new Mongoose.Schema(
  {
    config_key: {
      type: Number,
      enum: Object.values(CONFIG_TYPE),
      required: true
    },
    config_value: {
      type: String,
      set: (v) => JSON.stringify(v),
      get: (v) => JSON.parse(v),
      required: true,
      default: null
    }
  },
  {
    timestamps: true
  }
);

const Config = Mongoose.model('Config', configSchema);
module.exports = Config;
