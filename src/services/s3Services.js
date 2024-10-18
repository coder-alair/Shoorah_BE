'use strict';

const { s3, transcribeService } = require('@config/aws');
const { internalServerErrorResponse } = require('@services/Response');

module.exports = {
  /**
   * @description This function is used to create pre signed URL
   * @param {*} mimeType
   * @param {*} fileName
   * @param {*} storagePath
   * @returns {*}
   */
  getUploadURL: (mimeType, fileName, storagePath) => {
    return new Promise((resolve, reject) => {
      const s3Params = {
        Bucket: process.env.AMZ_BUCKET,
        Key: `${storagePath}/${fileName}`,
        ContentType: mimeType,
        Expires: 600 // 10 min
      };

      const uploadURL = s3.getSignedUrl('putObject', s3Params);
      resolve({
        uploadURL,
        filename: fileName
      });
    });
  },
  getUploadImage: (mimeType, fileName, storagePath, fileBuffer) => {
    return new Promise(async (resolve, reject) => {
      const s3Params = {
        Bucket: process.env.AMZ_BUCKET,
        Key: `${storagePath}/${fileName}`,
        ContentType: mimeType,
        Body: fileBuffer,
        Expires: 600 // 10 min
      };
      const uploadURL = await s3.upload(s3Params).promise();
      const parts = uploadURL.Location.split('/');
      parts.splice(2, 1);
      const modifiedUrl = parts.join('/');
      resolve({
        uploadURL: modifiedUrl,
        filename: fileName
      });
    });
  },
  /**
   * @description This function is used to upload file to s3
   * @param {*} storagePath
   * @param {*} file
   * @returns {*}
   */
  uploadFile: (storagePath, file, mimeType) => {
    return new Promise((resolve, reject) => {
      const params = {
        Bucket: process.env.AMZ_BUCKET,
        Key: storagePath,
        ContentType: mimeType,
        Body: file
      };

      s3.upload(params, (err, data) => {
        if (err) {
          reject(err);
        }

        resolve(data);
      });
    });
  },
  /**
   * @description This function is used remove object from s3
   * @param {*} file
   * @param {*} storagePath
   * @param {*} res
   * @returns {*}
   */
  removeOldImage: (file, storagePath, res) => {
    return new Promise((resolve, reject) => {
      const params = {
        Bucket: `${process.env.AMZ_BUCKET}`,
        Key: `${storagePath}/${file}`
      };
      try {
        return s3.deleteObject(params, (err, data) => {
          if (data) {
            resolve({
              code: 200,
              body: data
            });
          }

          reject(err);
        });
      } catch {
        return internalServerErrorResponse(res);
      }
    });
  },
  checkFileExists: async (storagePath, fileName) => {
    try {
      await s3
        .headObject({ Bucket: process.env.AMZ_BUCKET, Key: `${storagePath}/${fileName}` })
        .promise();
      return true;
    } catch (error) {
      console.log(error);
      return false;
    }
  },
  startTranscription: async (inputPath, fileName, outputPath) => {
    try {
      const params = {
        TranscriptionJobName: fileName.split('.')[0],
        Media: { MediaFileUri: `s3://${process.env.AMZ_BUCKET}/${inputPath}/${fileName}` },
        MediaFormat: fileName.split('.')[1],
        IdentifyLanguage: true,
        OutputBucketName: process.env.AMZ_BUCKET,
        OutputKey: outputPath + '/',
        Subtitles: { Formats: ['srt'], OutputStartIndex: 1 }
      };

      await transcribeService.startTranscriptionJob(params).promise();
    } catch (error) {
      console.log(error);
    }
  },
  checkTranscriptionStatus: async (jobName) => {
    try {
      const data = await transcribeService
        .getTranscriptionJob({ TranscriptionJobName: jobName })
        .promise();
      return data.TranscriptionJob.TranscriptionJobStatus;
    } catch (error) {
      console.log(error);
      return null;
    }
  },
  deleteFile: async (storagePath, fileName) => {
    try {
      await s3
        .deleteObject({ Bucket: process.env.AMZ_BUCKET, Key: `${storagePath}/${fileName}` })
        .promise();
    } catch (error) {
      console.log('Error in deleteFile: ', error);
    }
  },
  copyFile: async (sourcePath, sourceFileName, destinationPath, destinationFileName) => {
    try {
      await s3
        .copyObject({
          Bucket: process.env.AMZ_BUCKET,
          CopySource: `${process.env.AMZ_BUCKET}/${sourcePath}/${sourceFileName}`,
          Key: `${destinationPath}/${destinationFileName}`
        })
        .promise();
      return true;
    } catch (error) {
      console.log('Error in copyFile: ', error);
      return false;
    }
  }
};
