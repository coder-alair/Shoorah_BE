'use strict';

const Response = require('@services/Response');
const {
  SUCCESS,
  FAIL,
  EXPERT_MEDIA_PATH,
  ATTACHMENT_TYPES,
  USER_TYPE,
  RESPONSE_CODE,
  CLOUDFRONT_URL,
  VALID_DOCUMENT_TYPES
} = require('../../../services/Constant');
const {
  makeRandomDigit,
  unixTimeStamp,
  toObjectId,
  convertObjectKeysToCamelCase
} = require('../../../services/Helper');
const { getUploadURL, removeOldImage } = require('@services/s3Services');
const { uploadApplicantDocs } = require('@services/onfidoServices');
const ExpertAttachment = require('../../../models/ExpertAttachments');
const Expert = require('../../../models/Expert');
const {uploadFile} = require('../../../services/s3Services')
const {
  addEditAttachments,
  getExpertAttachments,
  deleteAttachmentValidation
} = require('../../../services/adminValidations/expertValidations');

module.exports = {
  /**
   * @description This function is used to upload attachments to aws
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */

  addEditExpertAttachments: async (req, res) => {
    try {
      const reqParam = req.body;

      // Check if the user is of type EXPERT
      if (req.userType !== USER_TYPE.EXPERT) {
        return Response.errorResponseData(res, res.__('accessDenied'), RESPONSE_CODE.UNAUTHORIZED);
      }

      // If no file is uploaded
      if (!req.file) {
        return Response.errorResponseWithoutData(res, res.__('noFileUploaded'), FAIL);
      }

      // Preparing the updateData object
      let updateData = {
        user_id: req.authAdminId,
        file_title: reqParam.fileTitle,
        doc_type: reqParam.docType
      };

      // Find the expert profile
      let expert = await Expert.findOne({ user_id: req.authAdminId, deletedAt: null }).select(
        '_id'
      );
      if (!expert) {
        return Response.successResponseWithoutData(res, res.__('expertNotFound'), FAIL);
      }

      updateData.expert_id = expert._id;

      // Define the mapping between docType and storage paths
      const docTypeToPathMap = {
        [ATTACHMENT_TYPES.CV]: EXPERT_MEDIA_PATH.CV_DOCS,
        [ATTACHMENT_TYPES.INSURANCE]: EXPERT_MEDIA_PATH.INSURANCE_DOCS,
        [ATTACHMENT_TYPES.CERTIFICATION]: EXPERT_MEDIA_PATH.CERTIFICATION_DOCS,
        [ATTACHMENT_TYPES.DBS]: EXPERT_MEDIA_PATH.DOCUMENTS,
        [ATTACHMENT_TYPES.ID]: EXPERT_MEDIA_PATH.DOCUMENTS // Assuming the ID will also be stored in DOCUMENTS
      };

      // Get the correct storage path based on docType
      const storagePath = docTypeToPathMap[reqParam.docType];
      if (!storagePath) {
        return Response.errorResponseData(res, res.__('invalidDocType'), RESPONSE_CODE.BAD_REQUEST);
      }

      // Processing the uploaded file using multer
      const file = req.file;
      const fileName = `${unixTimeStamp(new Date())}-${makeRandomDigit(4)}.${file.mimetype.split('/')[1]}`;
      const fullStoragePath = `${storagePath}/${fileName}`;

      // Upload file to S3 or any cloud storage service
      const s3Result = await uploadFile(fullStoragePath, file.buffer, file.mimetype);

      // Add file details to updateData
      updateData.file_name = fileName;
      // Update the document if `docId` exists
      if (reqParam.docId != null && reqParam.docId != "null") {
        const existingMedia = await ExpertAttachment.findOne({ _id: reqParam.docId }).select(
          'file_name'
        );
        if (existingMedia) {
          // If an existing file is found, delete it from S3
          const oldFileName = existingMedia.file_name;
          if (oldFileName) {
          await removeOldImage(oldFileName, storagePath, res);
          }
        }
        if (existingMedia && !req.file) {
          updateData.file_name = existingMedia.file_name; // Use existing file name if file not uploaded
        }
        const updatedDoc = await ExpertAttachment.findOneAndUpdate(
          { _id: reqParam.docId },
          updateData,
          { upsert: true, new: true }
        );
        return Response.successResponseWithoutData(
          res,
          res.__('docUpdateSuccess'),
          SUCCESS,
        );
      } else {
        // Create a new document if `docId` is not provided
        const newData = await ExpertAttachment.create(updateData);
        if (newData) {
          return Response.successResponseWithoutData(
            res,
            res.__('fileUploadSuccess'),
            SUCCESS,
          );
        } else {
          return Response.errorResponseWithoutData(res, res.__('somethingWentWrong'), FAIL);
        }
      }
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

    /**
   * @description This function is used to Get attachments of Experts
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  getAllExpertDocuments : async (req, res) => {
    try {
      const { expert_id } = req.query;
  
      // Define the mapping between docType and storage paths
      const docTypeToPathMap = {
        [ATTACHMENT_TYPES.CV]: EXPERT_MEDIA_PATH.CV_DOCS,
        [ATTACHMENT_TYPES.INSURANCE]: EXPERT_MEDIA_PATH.INSURANCE_DOCS,
        [ATTACHMENT_TYPES.CERTIFICATION]: EXPERT_MEDIA_PATH.CERTIFICATION_DOCS,
        [ATTACHMENT_TYPES.DBS]: EXPERT_MEDIA_PATH.DOCUMENTS,
        [ATTACHMENT_TYPES.ID]: EXPERT_MEDIA_PATH.DOCUMENTS // Assuming the ID will also be stored in DOCUMENTS
      };
  
      // Find all attachments for the expert
      const attachments = await ExpertAttachment.find({ expert_id }).select('doc_type _id file_name');
      if (!attachments.length) {
        return Response.errorResponseWithoutData(res, res.__('noDocumentsFound'), FAIL);
      }
  
      // Generate the list of document URLs
      const documents = attachments.map(attachment => {
        const storagePath = docTypeToPathMap[attachment.doc_type];
        const fileUrl = `${CLOUDFRONT_URL}${storagePath}/${attachment.file_name}`;
        return {
          docType: attachment.doc_type,
          fileUrl,
          _id:attachment._id
        };
      });
  
      // Return the list of document URLs
      return Response.successResponseData(
        res,
        documents,
        res.__('documentsFound'),
        SUCCESS
      );
  
    } catch (err) {
      console.error(err, "<<<<<<<error");
      return Response.internalServerErrorResponse(res);
    }
  },
  
 /**
   * @description This function is used to upload doucument to onfido to verify dbs check
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
 uploadApplicantDocsHandler : async (req, res) => {
  const { documentType } = req.body; // Document type from the frontend
  
  try {
    if (!VALID_DOCUMENT_TYPES.includes(documentType)) {
      return res.status(400).json({ message: 'Invalid document type' });
    }

    // Check if both files (front and back) are uploaded
    if (!req.files || !req.files.front || !req.files.back) {
      return res.status(400).json({ message: 'Both front and back files are required' });
    }

    // Extract front and back files
    const frontFile = req.files.front[0];
    const backFile = req.files.back[0];

    // Convert files to base64
    const frontFileData = frontFile.buffer.toString('base64');
    const backFileData = backFile.buffer.toString('base64');

    // Find the expert to get the applicantId
    const expert = await Expert.findOne({ user_id: req.authAdminId, deletedAt: null }).select('applicantId');
    
    if (!expert) {
      return res.status(404).json({ message: 'Expert not found' });
    }

    const applicantId = expert.applicant_id;

    // Upload documents to Onfido
    const frontDocument = await uploadApplicantDocs(applicantId, documentType, frontFileData, 'front');
    const backDocument = await uploadApplicantDocs(applicantId, documentType, backFileData, 'back');

    // Create or update ExpertAttachment entry with initial pending status
    const attachment = await ExpertAttachment.findOneAndUpdate(
      { user_id: req.authAdminId, documentType, deletedAt: null },
      {
        user_id: req.authAdminId,
        expert_id: expert._id, // Expert ID from the Expert model
        file_name: frontFile.originalname, // Example, you can adjust based on how you store files
        file_title: req.body.fileTitle,
        doc_type: documentType,
        verification_status: 'pending', // Initial status
      },
      { upsert: true, new: true }
    );

    // Handle the Onfido verification result
    const result = await onfidoCheckVerificationStatus(attachment._id); // Assuming you have a function to check Onfido status

    if (result === 'approved') {
      await ExpertAttachment.findByIdAndUpdate(attachment._id, { verification_status: 'approved' });
      return Response.successResponseWithoutData(res, 'Document approved successfully', 'SUCCESS');
    } else if (result === 'rejected') {
      await ExpertAttachment.findByIdAndUpdate(attachment._id, { verification_status: 'rejected' });
      return Response.successResponseWithoutData(res, 'Document rejected', 'FAIL');
    } else {
      await ExpertAttachment.findByIdAndUpdate(attachment._id, { verification_status: 'unapproved' });
      return Response.successResponseWithoutData(res, 'Document status is unapproved', 'FAIL');
    }

  } catch (err) {
    console.error('Error uploading document:', err);
    return res.status(500).json({ message: 'Error uploading document', error: err.message });
  }
},

  
  /**
   * @description This function is used to get all attachments
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  getExpertAttachments: (req, res) => {
    try {
      const reqParam = req.query;
      if (req.userType !== USER_TYPE.EXPERT) {
        return Response.errorResponseData(res, res.__('accessDenied'), RESPONSE_CODE.UNAUTHORIZED);
      }
      getExpertAttachments(reqParam, res, async (validate) => {
        if (validate) {
          let filterCondition = {
            user_id: toObjectId(req.authAdminId),
            deletedAt: null
          };

          if (reqParam.docType) {
            filterCondition = {
              ...filterCondition,
              doc_type: reqParam.docType
            };
          }

          const aggregationPipeline = [
            {
              $match: filterCondition
            },
            {
              $project: {
                attachmentId: '$_id',
                attachmentTitle: '$file_title',
                attachmentName: '$file_name',
                attachmentUrl: {
                  $concat: [CLOUDFRONT_URL, EXPERT_MEDIA_PATH.DOCUMENTS, '/', '$file_name']
                },
                attachmentType: '$doc_type',
                createdAt: 1,
                _id: 0
              }
            }
          ];

          const expertAttachments = await ExpertAttachment.aggregate(aggregationPipeline);
          if (expertAttachments.length > 0) {
            return Response.successResponseData(
              res,
              convertObjectKeysToCamelCase(expertAttachments),
              SUCCESS,
              res.__('expertAttachmentGetSuccess')
            );
          } else {
            return Response.successResponseWithoutData(res, res.__('noAttachmentFound'), FAIL);
          }
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      console.log(err);
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to delete attachments
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  deleteAttachments: (req, res) => {
    try {
      const reqParam = req.query;
      if (req.userType !== USER_TYPE.EXPERT) {
        return Response.errorResponseData(res, res.__('accessDenied'), RESPONSE_CODE.UNAUTHORIZED);
      }
      deleteAttachmentValidation(reqParam, res, async (validate) => {
        if (validate) {
          const deleteCondition = {
            deletedAt: new Date()
          };
          const deletedData = await ExpertAttachment.findByIdAndUpdate(
            reqParam.docId,
            deleteCondition,
            { new: true }
          ).select('_id');
          if (deletedData) {
            return Response.successResponseWithoutData(
              res,
              res.__('attachmentDeletedSuccess'),
              SUCCESS
            );
          } else {
            return Response.successResponseWithoutData(res, res.__('noAttachmentFound'), FAIL);
          }
        }
      });
    } catch (err) {
      cons;
      return Response.internalServerErrorResponse(res);
    }
  }
};
