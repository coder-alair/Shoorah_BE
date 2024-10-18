'use strict';

const Response = require('@services/Response');
const {
  notificationDetailedListValidation
} = require('@services/adminValidations/notificationValidations');
const { Users, DeviceTokens, Notification } = require('@models');
const {
  USER_TYPE,
  ACCOUNT_STATUS,
  FAIL,
  SUCCESS,
  RESPONSE_CODE,
  PAGE,
  NOTIFICATION_TYPE,
  NOTIFICATION_LIST_TYPE,
  SENT_TO_USER_TYPE,
  EXPERT_MEDIA_PATH,
  PER_PAGE,
  CLOUDFRONT_URL,
  ATTACHMENT_TYPES,
  ONFIDO_DOCUMENT_TYPE,
  ADMIN_MEDIA_PATH,
  SORT_BY,
  SORT_ORDER,
  SPECIALISATION_TYPE,
  FORM_STATUS,
  NOTIFICATION_ACTION,
  EXPERT_PROFILE_STATUS
} = require('@services/Constant');
const { toObjectId, unixTimeStamp, makeRandomDigit } = require('@services/Helper');
const { getUploadURL, removeOldImage, uploadFile } = require('@services/s3Services');
const {
  editExpertValidation,
  addEditExpertValidation,
  addEditAttachments
} = require('../../../services/adminValidations/expertValidations');
const { expertApproval } = require('../../../services/userServices/notifyAdminServices');
const { sendReusableTemplate, sendB2BPassword } = require('../../../services/Mailer');
const { convertObjectKeysToCamelCase } = require('../../../services/Helper');
const Expert = require('@root/src/models/Expert');
const ExpertAttachment = require('@root/src/models/ExpertAttachments');
const {
  uploadApplicantDocs,
  createApplicant,
  workFlow,
  fetchDocumentStatus,
  applicantStatusFetch,
  runWorkFlow
} = require('@root/src/services/onfidoServices');

const getFileUrl = (type, value) => {
  let url = CLOUDFRONT_URL;

  switch (type) {
    case 'profile':
      url += EXPERT_MEDIA_PATH.EXPERT_PROFILE;
      break;
    case 'video':
      url += EXPERT_MEDIA_PATH.EXPERT_VIDEO;
      break;
    case 'cv':
      url += EXPERT_MEDIA_PATH.CV_DOCS;
      break;
    case 'insurance':
      url += EXPERT_MEDIA_PATH.INSURANCE_DOCS;
      break;
    case 'certification':
      url += EXPERT_MEDIA_PATH.CERTIFICATION_DOCS;
      break;
    default:
      return null;
  }

  url += '/' + value;
  return url;
};

module.exports = {
  /**
   * @description This function is used to update an expert's profile
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  // updateExpertProfile: async (req, res) => {
  //   try {
  //     if (req.userType !== USER_TYPE.EXPERT) {
  //       return Response.errorResponseData(res, res.__('accessDenied'), RESPONSE_CODE.UNAUTHORIZED);
  //     }
  //     const existingProfile = await Users.findById(req.authAdminId).select('_id is_email_verified');
  //     console.log(existingProfile, '<<<<<existingProfile');
  //     if (existingProfile && existingProfile.is_email_verified !== true) {
  //       return Response.errorResponseWithoutData(
  //         res,
  //         res.__('emailIsNotVerified'),
  //         RESPONSE_CODE.BAD_REQUEST
  //       );
  //     }
  //     const reqParam = req.body;
  //     addEditExpertValidation(reqParam, res, async (validate) => {
  //       if (validate) {
  //         let updateData = {
  //           title: reqParam.title,
  //           first_name: reqParam.firstName,
  //           last_name: reqParam.lastName,
  //           country: reqParam.country,
  //           address: reqParam.address,
  //           dob: reqParam.dob,
  //           job_role: reqParam.jobRole,
  //           ethnicity: reqParam.ethnicity,
  //           gender: reqParam.gender
  //         };
  //         let userProfileUrl;
  //         const filterData = {
  //           _id: req.authAdminId,
  //           status: {
  //             $ne: ACCOUNT_STATUS.DELETED
  //           }
  //         };
  //         if (reqParam.profile) {
  //           const existingProfile = await Users.findOne(filterData).select('user_profile name');
  //           if (existingProfile && existingProfile.user_profile) {
  //             await removeOldImage(
  //               existingProfile.user_profile,
  //               EXPERT_MEDIA_PATH.EXPERT_PROFILE,
  //               res
  //             );
  //           }
  //           const imageExtension = reqParam.profile.split('/')[1];
  //           const profileImage = `${unixTimeStamp(new Date())}-${makeRandomDigit(
  //             4
  //           )}.${imageExtension}`;
  //           userProfileUrl = await getUploadURL(
  //             reqParam.imageUrl,
  //             profileImage,
  //             EXPERT_MEDIA_PATH.EXPERT_PROFILE
  //           );
  //           updateData = {
  //             ...updateData,
  //             user_profile: profileImage
  //           };
  //         }
  //         const expertData = await Users.findByIdAndUpdate(filterData, updateData, {
  //           new: true
  //         }).select('_id first_name last_name email');
  //         //  console.log(">>>>>", expertData)
  //         let expertDetails = {
  //           user_id: expertData._id,
  //           price: reqParam.price,
  //           shoorah_rate: reqParam.shoorahRate,
  //           dbs_check: reqParam.dbsCheck,
  //           identity: reqParam.identity,
  //           rating: reqParam.rating,
  //           title: reqParam.title,
  //           medical_no: reqParam.medicalNo,
  //           education: reqParam.education,
  //           place_of_practice: reqParam.placeOfPractice,
  //           year_of_practice: reqParam.yearOfPractice,
  //           category: reqParam.category,
  //           specialsation_category: reqParam.specialsationCategory,
  //           linkedln_url: reqParam.linkedlnUrl,
  //           bio: reqParam.bio,
  //           expert_focus_ids: reqParam.expertFocusIds,
  //           profit: reqParam.profit,
  //           location: reqParam.location
  //         };
  //         if (Array.isArray(reqParam.spokenLanguages) && reqParam.spokenLanguages.length > 0) {
  //           expertDetails.spoken_languages = reqParam.spokenLanguages;
  //         }
  //         console.log(req.authAdminId, '<<<<<<<req.authAdminId');
  //         const data = await Expert.findOneAndUpdate({ user_id: req.authAdminId }, expertDetails, {
  //           new: true
  //         });
  //         // console.log(data,"<<<<<<<data")
  //         if (!data) {
  //           console.log(expertData, '<<<<<<<<expertData');
  //           const expert = await Expert.create(expertDetails);
  //           const applicant = await createApplicant(expertData);
  //           console.log(applicant, '<<<<<<applicant');
  //           expert.applicant_id = applicant?.id;
  //           expert.save();
  //         }
  //         // const applicant = await createApplicant(expertData);
  //         if (expertData) {
  //           return Response.successResponseWithoutData(
  //             res,
  //             res.__('expertDataUpdated'),
  //             SUCCESS,
  //             userProfileUrl || null
  //           );
  //         } else {
  //           return Response.successResponseWithoutData(res, res.__('invalidExpertId'), FAIL);
  //         }
  //       } else {
  //         return Response.internalServerErrorResponse(res);
  //       }
  //     });
  //   } catch (err) {
  //     console.log(err.message);
  //     return Response.internalServerErrorResponse(res);
  //   }
  // },

  // updateExpertProfile: async (req, res) => {
  //   try {
  //     if (req.userType !== USER_TYPE.EXPERT) {
  //       return Response.errorResponseData(res, res.__('accessDenied'), RESPONSE_CODE.UNAUTHORIZED);
  //     }

  //     const reqParam = req.body;

  //     // Ensure both file and profile are present, either in req.files or req.body
  //     if ((!req.files.file || !req.files.file[0]) && !reqParam.file) {
  //       return Response.errorResponseData(
  //         res,
  //         res.__('videoFileIsRequired'),
  //         RESPONSE_CODE.BAD_REQUEST
  //       );
  //     }

  //     if ((!req.files.profile || !req.files.profile[0]) && !reqParam.profile) {
  //       return Response.errorResponseData(
  //         res,
  //         res.__('profileFileIsRequired'),
  //         RESPONSE_CODE.BAD_REQUEST
  //       );
  //     }

  //     const existingProfile = await Users.findById(req.authAdminId).select(
  //       '_id is_email_verified user_profile'
  //     );

  //     if (existingProfile && existingProfile.is_email_verified !== true) {
  //       return Response.errorResponseWithoutData(
  //         res,
  //         res.__('emailIsNotVerified'),
  //         RESPONSE_CODE.BAD_REQUEST
  //       );
  //     }

  //     reqParam.gender = JSON.parse(reqParam.gender);

  //     // Validate request parameters
  //     addEditExpertValidation(reqParam, res, async (validate) => {
  //       if (validate) {
  //         let updateData = {
  //           title: reqParam.title,
  //           first_name: reqParam.firstName,
  //           last_name: reqParam.lastName,
  //           country: reqParam.country,
  //           address: reqParam.address,
  //           dob: reqParam.dob,
  //           job_role: reqParam.jobRole,
  //           ethnicity: reqParam.ethnicity,
  //           gender: reqParam.gender
  //         };

  //         const filterData = {
  //           _id: req.authAdminId,
  //           status: {
  //             $ne: ACCOUNT_STATUS.DELETED
  //           }
  //         };

  //         // Check if there is a profile image uploaded in req.files or provided in req.body
  //         if (req.files && req.files.profile) {
  //           const profileFile = req.files.profile[0];
  //           const imageExtension = profileFile.mimetype.split('/')[1]; // Get the file extension from mimetype
  //           const profileImage = `${unixTimeStamp(new Date())}-${makeRandomDigit(4)}.${imageExtension}`; 

  //           updateData = {
  //             ...updateData,
  //             user_profile: profileImage
  //           };

  //           // Define the storage path for the uploaded image
  //           const profileStoragePath = `${EXPERT_MEDIA_PATH.EXPERT_PROFILE}/${profileImage}`;

  //           // Upload the profile image file to the specified path
  //           await uploadFile(profileStoragePath, profileFile.buffer, profileFile.mimetype);
  //         } else if (reqParam.profile) {
  //           console.log(reqParam.profile, '<<<<<<reqParam.profile');
  //           const parts = reqParam.profile.split('/');
  //           const fileName = parts[parts.length - 1];
  //           updateData.user_profile = fileName; // Use profile from req.body if present
  //         }

  //         // Handle video upload
  //         let videoUrl;
  //         if (req.files && req.files.file && req.files.file[0]) {
  //           const videoFile = req.files.file[0]; // Get the uploaded video file from req.file
  //           const videoFileName = `${unixTimeStamp(new Date())}-${makeRandomDigit(4)}.${videoFile.mimetype.split('/')[1]}`;
  //           const videoStoragePath = `${EXPERT_MEDIA_PATH.EXPERT_VIDEO}/${videoFileName}`;

  //           // console.log('🚀 ~ addEditExpertValidation ~ videoStoragePath:', videoStoragePath);
  //           // Upload video to S3
  //           await uploadFile(videoStoragePath, videoFile.buffer, videoFile.mimetype);
  //           videoUrl = videoFileName; 
            
  //         } else if (reqParam.file) {
  //           const parts = reqParam.file.split('/');
  //           const fileName = parts[parts.length - 1];
  //           videoUrl = fileName;
  //         }
  //         // Update expert's profile data
  //         const expertData = await Users.findByIdAndUpdate(filterData, updateData, {
  //           new: true
  //         }).select('_id first_name last_name email');

  //         // Handle expert details update
  //         let expertDetails = {
  //           user_id: expertData._id,
  //           price: reqParam.price,
  //           shoorah_rate: reqParam.shoorahRate,
  //           dbs_check: reqParam.dbsCheck,
  //           identity: reqParam.identity,
  //           rating: reqParam.rating,
  //           title: reqParam.title,
  //           medical_no: reqParam.medicalNo,
  //           education: reqParam.education,
  //           place_of_practice: reqParam.placeOfPractice,
  //           year_of_practice: reqParam.yearOfPractice,
  //           category: reqParam.category,
  //           specialsation_category: reqParam.specialsationCategory,
  //           linkedln_url: reqParam.linkedlnUrl,
  //           bio: reqParam.bio,
  //           expert_focus_ids: reqParam.expertFocusIds,
  //           profit: reqParam.profit,
  //           location: reqParam.location
  //         };

  //         if (Array.isArray(reqParam.spokenLanguages) && reqParam.spokenLanguages.length > 0) {
  //           expertDetails.spoken_languages = reqParam.spokenLanguages;
  //         }

  //         let data = await Expert.findOneAndUpdate({ user_id: req.authAdminId }, expertDetails, {
  //           new: true
  //         }).lean();

  //         if (!data) {
  //           const expert = await Expert.create(expertDetails);
  //           const applicant = await createApplicant(expertData);
  //           expert.applicant_id = applicant?.id;
  //           await expert.save();
  //           data = expert.toObject();
  //         }

  //         const updatedUser = await Users.findById(req.authAdminId).select('user_profile');

  //         if (updatedUser?.user_profile || reqParam.profile) {
  //           data.user_profile = getFileUrl('profile', updatedUser.user_profile);
  //         }

  //         if (data?.video_url || videoUrl) {
  //           console.log(data.video_url,"<<<<<<data.video_url")
  //           data.video_url = getFileUrl('video',videoUrl || data?.video_url);
  //         }

  //         return Response.successResponseData(res, data, SUCCESS, res.__('expertDataUpdated'));
  //       } else {
  //         return Response.internalServerErrorResponse(res);
  //       }
  //     });
  //   } catch (err) {
  //     console.log(err.message);
  //     return Response.internalServerErrorResponse(res);
  //   }
  // },


  updateExpertProfile: async (req, res) => {
    try {
      if (req.userType !== USER_TYPE.EXPERT) {
        return Response.errorResponseData(res, res.__('accessDenied'), RESPONSE_CODE.UNAUTHORIZED);
      }
  
      const reqParam = req.body;
  
      const existingProfile = await Users.findById(req.authAdminId).select(
        '_id is_email_verified user_profile'
      );
  
      if (existingProfile && existingProfile.is_email_verified !== true) {
        return Response.errorResponseWithoutData(
          res,
          res.__('emailIsNotVerified'),
          RESPONSE_CODE.BAD_REQUEST
        );
      }
  
      reqParam.gender = JSON.parse(reqParam.gender);
  
      // Validate request parameters
      addEditExpertValidation(reqParam, res, async (validate) => {
        if (validate) {
          let updateData = {
            title: reqParam.title,
            first_name: reqParam.firstName,
            last_name: reqParam.lastName,
            country: reqParam.country,
            address: reqParam.address,
            dob: reqParam.dob,
            job_role: reqParam.jobRole,
            ethnicity: reqParam.ethnicity,
            gender: reqParam.gender,
            user_profile: null, // Initialize user_profile
          };
  
          const filterData = {
            _id: req.authAdminId,
            status: {
              $ne: ACCOUNT_STATUS.DELETED
            }
          };
  
          // Check for profile image upload
          if (req.files && req.files.profile) {
            const profileFile = req.files.profile[0];
            const imageExtension = profileFile.mimetype.split('/')[1];
            const profileImage = `${unixTimeStamp(new Date())}-${makeRandomDigit(4)}.${imageExtension}`; 
  
            updateData.user_profile = profileImage;
            const profileStoragePath = `${EXPERT_MEDIA_PATH.EXPERT_PROFILE}/${profileImage}`;
            await uploadFile(profileStoragePath, profileFile.buffer, profileFile.mimetype);
          } else if (reqParam.profile) {
            const parts = reqParam.profile.split('/');
            updateData.user_profile = parts[parts.length - 1];
          }
  
          // Handle video upload
          let videoUrl;
          if (req.files && req.files.file) {
            const videoFile = req.files.file[0];
            const videoFileName = `${unixTimeStamp(new Date())}-${makeRandomDigit(4)}.${videoFile.mimetype.split('/')[1]}`;
            const videoStoragePath = `${EXPERT_MEDIA_PATH.EXPERT_VIDEO}/${videoFileName}`;
            await uploadFile(videoStoragePath, videoFile.buffer, videoFile.mimetype);
            videoUrl = videoFileName; 
          } else if (reqParam.file) {
            const parts = reqParam.file.split('/');
            videoUrl = parts[parts.length - 1];
          }
  
          // Update expert's profile data
          const expertData = await Users.findByIdAndUpdate(filterData, updateData, {
            new: true
          }).select('_id first_name last_name email');
  
          // Handle expert details update
          let expertDetails = {
            user_id: expertData._id,
            price: reqParam.price,
            shoorah_rate: reqParam.shoorahRate,
            dbs_check: reqParam.dbsCheck,
            identity: reqParam.identity,
            rating: reqParam.rating,
            title: reqParam.title,
            medical_no: reqParam.medicalNo,
            education: reqParam.education,
            place_of_practice: reqParam.placeOfPractice,
            year_of_practice: reqParam.yearOfPractice,
            category: reqParam.category,
            specialsation_category: reqParam.specialsationCategory,
            linkedln_url: reqParam.linkedlnUrl,
            bio: reqParam.bio,
            expert_focus_ids: reqParam.expertFocusIds,
            profit: reqParam.profit,
            location: reqParam.location,
          };
  
          if (Array.isArray(reqParam.spokenLanguages) && reqParam.spokenLanguages.length > 0) {
            expertDetails.spoken_languages = reqParam.spokenLanguages;
          }
  
          let data = await Expert.findOneAndUpdate({ user_id: req.authAdminId }, expertDetails, {
            new: true
          }).lean();
  
          if (!data) {
            const expert = await Expert.create(expertDetails);
            const applicant = await createApplicant(expertData);
            expert.applicant_id = applicant?.id;
            await expert.save();
            data = expert.toObject();
          }
  
          const updatedUser = await Users.findById(req.authAdminId).select('user_profile');
  
          if (updatedUser?.user_profile || reqParam.profile) {
            data.user_profile = getFileUrl('profile', updatedUser.user_profile);
          }
  
          if (data?.video_url || videoUrl) {
            data.video_url = getFileUrl('video', videoUrl || data?.video_url);
          }
  
          return Response.successResponseData(res, data, SUCCESS, res.__('expertDataUpdated'));
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      console.log(err.message);
      return Response.internalServerErrorResponse(res);
    }
  },  
  /**
   * @description This function is used to update an expert's profile
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  updateExpertProfessionalBackground: (req, res) => {
    try {
      if (req.userType !== USER_TYPE.EXPERT) {
        return Response.errorResponseData(res, res.__('accessDenied'), RESPONSE_CODE.UNAUTHORIZED);
      }
      const reqParam = req.body;
      editExpertValidation(reqParam, res, async (validate) => {
        if (validate) {
          let expertDetails = {
            industry_experience: reqParam.industryExperience,
            highest_certification: reqParam.highestCertification,
            qualification: reqParam.qualification,
            language: reqParam.language,
            current_job_titile: reqParam.currentJobTitle,
            place_of_education: reqParam.placeOfEducation,
            year_of_experience: reqParam.yearOfExperience,
            specialities: reqParam.specialities,
            price_per_hour: reqParam.pricePerHour,
            availibility: reqParam.availability,
            medical_no: reqParam.medicalNo,
            location_of_practice: reqParam.locationOfPractice
          };
          if (Array.isArray(reqParam.spokenLanguages) && reqParam.spokenLanguages.length > 0) {
            expertDetails.spoken_languages = reqParam.spokenLanguages;
          }
          const expertData = await Expert.findOneAndUpdate(
            { user_id: req.authAdminId },
            expertDetails,
            {
              new: true
            }
          );

          if (expertData) {
            return Response.successResponseWithoutData(res, res.__('expertDataUpdated'), SUCCESS);
          } else {
            return Response.successResponseWithoutData(res, res.__('invalidExpertId'), FAIL);
          }
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      console.log(err.message);
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to update an expert's profile
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  expertComplinceAndVerification: async (req, res) => {
    try {
      if (!req.file) {
        return Response.errorResponseData(res, res.__('noFileUploaded'), RESPONSE_CODE.FORBIDDEN);
      }
      let user = await Users.findById(req.authAdminId).select('_id user_type');
      console.log(user, '<<<<<<user');
      if (user && user.user_type !== USER_TYPE.EXPERT) {
        return Response.errorResponseData(res, res.__('accessDenied'), RESPONSE_CODE.UNAUTHORIZED);
      }
      const alreadyUploaded = await ExpertAttachment.findOne({
        user_id: req.authAdminId,
        doc_type: req.body.docType
      });
      if (alreadyUploaded) {
        return Response.errorResponseData(
          res,
          res.__('alreadyUploadedData'),
          RESPONSE_CODE.BAD_REQUEST
        );
      }
      const reqParam = req.body;
      addEditAttachments(reqParam, res, async (validate) => {
        if (validate) {
          // If no file is uploaded
          // if (!req.files) {
          //   return Response.errorResponseWithoutData(res, res.__('noFileUploaded'), FAIL);
          // }

          // Preparing the updateData object
          let updateData = {
            user_id: req.authAdminId,
            file_title: reqParam.fileTitle,
            doc_type: reqParam.docType
          };

          // Find the expert profile
          let expert = await Expert.findOne({ user_id: req.authAdminId, deletedAt: null }).select(
            '_id applicant_id workflow_run_id'
          );
          if (!expert || !expert.workflow_run_id) {
            return Response.successResponseWithoutData(res, res.__('IdentityVerificationRequired'), FAIL);
          }
          expert.bio = reqParam.bio;
          expert.reason_to_join = reqParam.reasonToJoin;
          const expertVerificationStatus = await applicantStatusFetch(expert.workflow_run_id);

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
            return Response.errorResponseData(
              res,
              res.__('invalidDocType'),
              RESPONSE_CODE.BAD_REQUEST
            );
          }

          // Processing the uploaded file using multer
          const file = req.file;
          const fileName = `${unixTimeStamp(new Date())}-${makeRandomDigit(4)}.${file.mimetype.split('/')[1]}`;
          const fullStoragePath = `${storagePath}/${fileName}`;

          // Upload file to S3 or any cloud storage service
          await uploadFile(fullStoragePath, file.buffer, file.mimetype);

          // Add file details to updateData
          updateData.file_name = fileName;
          // Update the document if `docId` exists

          // Create a new document if `docId` is not provided
          const newData = await ExpertAttachment.create(updateData);
          if (newData && expertVerificationStatus?.data?.status === 'approved') {
            expert.profile_status = EXPERT_PROFILE_STATUS.PENDING;
            user.isVerified = true;
            user.save();
            expert.save();
            // const superAdmin = await Users.find({
            //   user_type: USER_TYPE.SUPER_ADMIN
            // }).select('_id');
            // const superAdmin = await Users.aggregate([
            //   {
            //     $match: {
            //       user_type: USER_TYPE.SUPER_ADMIN
            //     }
            //   },
            //   {
            //     $group: {
            //       _id: null, // Grouping all documents together
            //       ids: { $push: "$_id" } // Push all _id values into an array
            //     }
            //   },
            //   {
            //     $project: {
            //       _id: 0, // Exclude the _id field from the output
            //       ids: 1 // Include only the ids array
            //     }
            //   }
            // ]);

            // If you want the result as an array of strings, you can group them
            const superAdminIds = await Users.aggregate([
              {
                $match: {
                  user_type: USER_TYPE.SUPER_ADMIN
                }
              },
              {
                $project: {
                  _id: 1 // Convert ObjectId to string
                }
              }
            ]);

            let newData = {
              title: 'Expert Profile Approval Request',
              message: 'Request for expert profile approval for verification',
              sent_to_user_type: SENT_TO_USER_TYPE.CUSTOM_LIST,
              from_user_id: req.authAdminId,
              type: NOTIFICATION_TYPE.EXPERT_SEND_PROFILE_APPROVAL_REQUEST,
              expert_id: req.authAdminId,
              to_user_ids: superAdminIds
            };
            await Notification.create(newData);
            return Response.successResponseWithoutData(res, res.__('fileUploadSuccess'), SUCCESS);
          }
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      console.log(err.message);
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to get the onfido verification URL
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  identityVerifyOnfido: async (req, res) => {
    try {
      // Step 1: Find the user with req.authAdminId
      const user = await Users.findById(req.authAdminId);
      if (!user) {
        return Response.successResponseWithoutData(res, res.__('userNotFound'), FAIL);
      }

      // Step 2: Find the expert using user_id
      const expert = await Expert.findOne({ user_id: user._id });
      if (!expert) {
        return Response.errorResponseWithoutData(res, res.__('expertNotFound'), FAIL);
      }
      // Step 3: Get applicant_id from expert and run the workflow
      const applicantId = expert.applicant_id;
      const workflowResult = await runWorkFlow(applicantId);
      if (!workflowResult) {
        return Response.errorResponseWithoutData(res, workflowResult, FAIL);
      }
      return Response.successResponseData(res, workflowResult, SUCCESS);

      // Optionally handle the workflow result
    } catch (err) {
      console.log(err.message);
      return Response.internalServerErrorResponse(res);
    }
  },
  findStatus: async (req, res) => {
    try {
      const data = req.body;
      console.log(data, '<<<<<<<<status');
      // const locals = {
      //   name: 'test  test',
      //   email: 'gfhfg@yopmail.com',
      //   password: 'fxfghfthdthf'
      // };

      // await sendB2BPassword("gfhfg@yopmail.com", 'welcome on boarding', locals);

      // find the user from user table
      const user = await Users.findById(req.authAdminId);
      console.log(user, '<<<<user');
      const findExpert = await Expert.findOne({ user_id: user?._id });
      if (!findExpert) {
        return Response.successResponseWithoutData(res, res.__('expertNotFound'), FAIL);
      } else if (!findExpert.workflow_run_id) {
        return Response.successResponseWithoutData(
          res,
          res.__('IndentityProcessIsNotInitiated'),
          FAIL
        );
      }
      console.log(findExpert, '<<>>>>findExpertfindExpert');
      const status = await applicantStatusFetch(findExpert?.workflow_run_id);

      Response.successResponseData(res, status.data, SUCCESS, res.__('fetchStatus'));
      // res.json(status)
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to get detailed list of all notification or Logged in user notifications
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  notificationDetailedList: (req, res) => {
    try {
      const reqParam = req.query;
      notificationDetailedListValidation(reqParam, res, async (validate) => {
        if (validate) {
          const page = reqParam.page ? parseInt(reqParam.page) : PAGE;
          const perPage = reqParam.perPage ? parseInt(reqParam.perPage) : PER_PAGE;
          const skip = (page - 1) * perPage || 0;
          let filterCondition = {
            deletedAt: null,
            type: { $ne: NOTIFICATION_TYPE.SHURU_WARM_NOTIFICATION },
            company_id: { $eq: null }
          };
          if (parseInt(reqParam.notificationListType) === NOTIFICATION_LIST_TYPE.ALL_NOTIFICATION) {
            filterCondition = {
              ...filterCondition,
              type: NOTIFICATION_TYPE.SHOORAH_NOTIFICATION
            };
            if (reqParam.searchKey) {
              filterCondition = {
                ...filterCondition,
                $or: [{ title: { $regex: '.*' + reqParam.searchKey + '.*', $options: 'i' } }]
              };
            }
          } else if (
            parseInt(reqParam.notificationListType) === NOTIFICATION_LIST_TYPE.MY_NOTIFICATION
          ) {
            if (req.userType === USER_TYPE.SUPER_ADMIN) {
              filterCondition = {
                ...filterCondition,
                deleted_by: {
                  $ne: toObjectId(req.authAdminId)
                },
                sent_to_user_type: SENT_TO_USER_TYPE.CUSTOM_LIST,
                to_user_ids: toObjectId(req.authAdminId)
              };
            } else {
              filterCondition = {
                ...filterCondition,
                deleted_by: {
                  $ne: toObjectId(req.authAdminId)
                },
                type: {
                  $nin: [
                    NOTIFICATION_TYPE.SHURU_WARM_NOTIFICATION,
                    NOTIFICATION_TYPE.INTRODUCED_COMPANY_NOTIFICATION,
                    NOTIFICATION_TYPE.TRAIL,
                    NOTIFICATION_TYPE.SHURU_REMINDER,
                    NOTIFICATION_TYPE.MOODS_REMINDER,
                    NOTIFICATION_TYPE.NEW_SURVEY,
                    NOTIFICATION_TYPE.COMPANY_STATS_REMINDER,
                    NOTIFICATION_TYPE.EXPERT_VERIFICATON
                  ]
                },
                sent_to_user_type: SENT_TO_USER_TYPE.CUSTOM_LIST,
                to_user_ids: toObjectId(req.authAdminId)
              };
            }
          }

          const aggregateQuery = [
            {
              $match: filterCondition
            },
            {
              $sort: {
                createdAt: -1,
                isRead: 1
              }
            },
            {
              $skip: skip
            },
            {
              $limit: perPage
            },
            {
              $lookup: {
                from: 'users',
                let: {
                  from_user_id: '$from_user_id'
                },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $eq: ['$_id', '$$from_user_id']
                      }
                    }
                  },
                  {
                    $project: {
                      name: 1,
                      userProfile: {
                        $concat: [
                          CLOUDFRONT_URL,
                          EXPERT_MEDIA_PATH.EXPERT_PROFILE,
                          '/',
                          '$user_profile'
                        ]
                      }
                    }
                  }
                ],
                as: 'fromUser'
              }
            },
            {
              $unwind: {
                path: '$fromUser',
                preserveNullAndEmptyArrays: true
              }
            },
            {
              $project: {
                id: '$_id',
                _id: 0,
                title: 1,
                from_user_id: 1,
                message: 1,
                createdAt: 1,
                fromUser: 1,
                reminder: 1,
                type: 1,
                image: 1,
                imageUrl: {
                  $concat: [CLOUDFRONT_URL, EXPERT_MEDIA_PATH.NOTIFICATION, '/', '$image']
                },
                audioUrl: {
                  $concat: [CLOUDFRONT_URL, EXPERT_MEDIA_PATH.NOTIFICATION_AUDIO, '/', '$audio_url']
                },
                isRead: {
                  $cond: {
                    if: {
                      $in: [toObjectId(req.authAdminId), '$is_read_by']
                    },
                    then: true,
                    else: false
                  }
                },
                readCounts: {
                  $cond: {
                    if: { $gte: [{ $size: '$is_read_by' }, 1] },
                    then: { $subtract: [{ $size: '$is_read_by' }, 1] },
                    else: 0
                  }
                },
                sentToUserType: '$sent_to_user_type',
                toUserIds: '$to_user_ids'
              }
            }
          ];
          const totalNotifications = await Notification.countDocuments(filterCondition);
          const notificationDetailedData = await Notification.aggregate(aggregateQuery);
          const notificationIds = notificationDetailedData.map((x) => x?.id);
          await Notification.updateMany(
            { _id: { $in: notificationIds } },
            { $addToSet: { is_read_by: req.authAdminId } }
          );
          Response.successResponseData(
            res,
            notificationDetailedData,
            SUCCESS,
            res.__('notificationListSuccess'),
            {
              page,
              perPage,
              totalNotifications
            }
          );
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to get an expert's profile
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  // getExpertProfile: async (req, res) => {
  //   try {
  //     let user = await Users.findOne(
  //       {
  //         _id: req.authAdminId,
  //         status: {
  //           $ne: ACCOUNT_STATUS.DELETED
  //         }
  //       },
  //       'name first_name last_name user_profile dob country'
  //     ).lean();
  //     if (!user) {
  //       return Response.errorResponseWithoutData(
  //         res,
  //         res.__('userNotFound'),
  //         RESPONSE_CODE.NOT_FOUND
  //       );
  //     }

  //     const expert = await Expert.findOne({
  //       user_id: req.authAdminId
  //     })
  //       .populate({
  //         path: 'user_id',
  //         select: '-password' // Exclude the password field
  //       })
  //       .lean();

  //     user.id = user._id;
  //     delete user._id;

  //     if (user.user_profile) {
  //       user.user_profile = getFileUrl('profile', user.user_profile);
  //     }
  //     if (expert) {
  //       delete expert._id;

  //       if (expert.cv) {
  //         expert.cv = getFileUrl('cv', expert.cv);
  //       }
  //       if (Array.isArray(expert.insurance) && expert.insurance.length) {
  //         expert.insurance = expert.insurance.map((file) => getFileUrl('insurance', file));
  //       }
  //       if (Array.isArray(expert.certification) && expert.certification.length) {
  //         expert.certification = expert.certification.map((file) =>
  //           getFileUrl('certification', file)
  //         );
  //       }

  //       user = { ...user, ...expert };
  //     }

  //     return Response.successResponseData(
  //       res,
  //       convertObjectKeysToCamelCase(user),
  //       SUCCESS,
  //       res.__('profileFetched')
  //     );
  //   } catch (err) {
  //     console.log(err);
  //     return Response.internalServerErrorResponse(res);
  //   }
  // }
  getExpertProfile: async (req, res) => {
    try {
      // Fetch the user
      let user = await Users.findOne(
        {
          _id: req.authAdminId,
          status: { $ne: ACCOUNT_STATUS.DELETED }
        },
        'name first_name last_name email user_profile dob country'
      ).lean();

      if (!user) {
        return Response.errorResponseWithoutData(
          res,
          res.__('userNotFound'),
          RESPONSE_CODE.NOT_FOUND
        );
      }
      // Fetch the expert profile
      const expert = await Expert.findOne({
        user_id: req.authAdminId
      })
        .populate({
          path: 'user_id',
          select: '-password' // Exclude the password field
        })
        .lean();

      // Map the user ID to 'id' and remove '_id'
      user.id = user._id;
      delete user._id;

      // Handle user profile image URL
      if (user.user_profile) {
        user.user_profile = getFileUrl('profile', user.user_profile);
        // console.log('🚀 ~ getExpertProfile: ~ user:', user);
      }

      if (expert) {
        delete expert._id;

        if (expert.video_url) {
          console.log('🚀 ~ getExpertProfile: ~ expert.video_url:', expert.video_url);
          expert.video_url = getFileUrl('video', expert.video_url);
          console.log('🚀 ~ getExpertProfile: ~ expert.video_url:', expert.video_url);
        }
        // Handle expert's CV, insurance, and certification URLs
        if (expert.cv) {
          expert.cv = getFileUrl('cv', expert.cv);
        }
        if (Array.isArray(expert.insurance) && expert.insurance.length) {
          expert.insurance = expert.insurance.map((file) => getFileUrl('insurance', file));
        }
        if (Array.isArray(expert.certification) && expert.certification.length) {
          expert.certification = expert.certification.map((file) =>
            getFileUrl('certification', file)
          );
        }

        // Merge user and expert details
        user = { ...user, ...expert };
      }
      // Fetch expert's attachments from the ExpertAttachment model
      const attachments = await ExpertAttachment.find({
        user_id: expert?.user_id?._id
      }).lean();
      // Define the mapping between docType and storage paths
      const docTypeToPathMap = {
        [ATTACHMENT_TYPES.CV]: EXPERT_MEDIA_PATH.CV_DOCS,
        [ATTACHMENT_TYPES.INSURANCE]: EXPERT_MEDIA_PATH.INSURANCE_DOCS,
        [ATTACHMENT_TYPES.CERTIFICATION]: EXPERT_MEDIA_PATH.CERTIFICATION_DOCS,
        [ATTACHMENT_TYPES.DBS]: EXPERT_MEDIA_PATH.DOCUMENTS,
        [ATTACHMENT_TYPES.ID]: EXPERT_MEDIA_PATH.DOCUMENTS
      };

      // Generate the list of document URLs using the storage paths
      const documents = attachments.map((attachment) => {
        // Get the correct storage path based on docType
        const storagePath = docTypeToPathMap[attachment.doc_type];

        // If docType doesn't match, return an error
        if (!storagePath) {
          return Response.errorResponseData(
            res,
            res.__('invalidDocType'),
            RESPONSE_CODE.BAD_REQUEST
          );
        }

        // Construct the file URL using the storage path and file name
        const fileUrl = `${CLOUDFRONT_URL}${storagePath}/${attachment.file_name}`;

        return {
          docType: attachment.doc_type,
          fileUrl,
          _id: attachment._id
        };
      });

      // Attach the documents to the user object
      user.documents = documents;

      // Send success response
      return Response.successResponseData(
        res,
        convertObjectKeysToCamelCase(user),
        SUCCESS,
        res.__('profileFetched')
      );
    } catch (err) {
      console.log(err);
      return Response.internalServerErrorResponse(res);
    }
  }
};
