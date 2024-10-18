'use strict';

const AWS = require('aws-sdk');

AWS.config.update({
  accessKeyId: process.env.AMZ_ACCESS_KEY,
  secretAccessKey: process.env.AMZ_SECRET_ACCESS_KEY,
  region: process.env.AMZ_REGION
});

module.exports = {
  s3: new AWS.S3(),
  transcribeService: new AWS.TranscribeService()
};
