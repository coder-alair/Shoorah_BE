'use strict';

const Response = require('@services/Response');
const { Users, DeviceTokens, Notification, InterviewSchedual } = require('@models');
const {
  USER_TYPE,
  ACCOUNT_STATUS,
  FAIL,
  SUCCESS,
  PAGE,
  PER_PAGE,
  RESPONSE_CODE,
  PASSWORD_LENGTH,
  CLOUDFRONT_URL,
  SORT_BY,
  SORT_ORDER,
  SPECIALISATION_TYPE,
  FORM_STATUS,
  NOTIFICATION_TYPE,
  SENT_TO_USER_TYPE,
  NOTIFICATION_ACTION,
  EXPERT_PROFILE_STATUS,
  ATTACHMENT_TYPES
} = require('@services/Constant');
const {
  toObjectId,
  makeRandomString,
  unixTimeStamp,
  makeRandomDigit
} = require('@services/Helper');
const { generatePassword } = require('@services/authServices');
const {
  sendPassword,
  sendReusableTemplate,
  sendInterviewConfirmation,
  sendInviteForInterview,
  sendExpertAccountApprove
} = require('@services/Mailer');
const { getUploadURL, removeOldImage } = require('@services/s3Services');
const {
  addEditExpertValidation,
  expertsListValidation,
  approveOrRejectExpertValidation,
  deleteExpertValidation,
  getAdminExpertAttachments,
  expertsApprovalsValidation,
  approvalUpdateValidation,
  getApprovalValidation,
  getExpertStausListValidation,
  expertProfileActionValidation,
  getExpertAccountInfotValidation
} = require('../../../services/adminValidations/expertValidations');
const {
  EXPERT_MEDIA_PATH,
  MAIL_SUBJECT,
  DBS_VERIFICATION_STATUS
} = require('../../../services/Constant');
const Expert = require('../../../models/Expert');
const { sendB2BPassword } = require('../../../services/Mailer');
const { convertObjectKeysToCamelCase } = require('../../../services/Helper');
const ExpertAttachment = require('../../../models/ExpertAttachments');
const ExpertApproval = require('../../../models/ExpertApprovals');
const Specialisation = require('@root/src/models/Specialisation');
const {
  sendApprovalReject,
  sendApprovalAccept
} = require('../../../services/adminServices/expertsApprovalNotify');
const { createApplicant } = require('@root/src/services/onfidoServices');
const { snakeCase } = require('lodash');
const ExpertCategory = require('@root/src/models/expertCategory');
const { sendNotification } = require('@root/src/services/Notify');
const { google } = require('googleapis');

const CLIENT_ID = '1071033499318-6jn326lrp7njj2qiesjstr4nrlhj7g0k.apps.googleusercontent.com';
// const CLIENT_ID = '607043867419-pprf79ppfn6qpesrc3qgi2cd8r0fhgq0.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
// const CLIENT_SECRET = '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';
const REDIRECT_URI = 'http://localhost:3003/admin/v1/google/redirect';

// const REDIRECT_URI = "https://025a-2405-201-2014-10ce-1ec-72b8-ad89-f06c.ngrok-free.app/google/redirect"

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

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
   * @description This function is used to add edit expert
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  addEditExpert: (req, res) => {
    try {
      if (req.userType !== USER_TYPE.SUPER_ADMIN && req.userType !== USER_TYPE.SUB_ADMIN) {
        return Response.errorResponseData(res, res.__('accessDenied'), RESPONSE_CODE.UNAUTHORIZED);
      }
      const reqParam = req.body;
      // const approvedFLag = req.userType == USER_TYPE.SUPER_ADMIN ? req.status : FORM_STATUS.UNAPPROVED;
      addEditExpertValidation(reqParam, res, async (validate) => {
        if (validate) {
          const reqEmail = reqParam.email.toLowerCase().trim();
          let findCondition = {
            email: reqEmail,
            status: {
              $ne: ACCOUNT_STATUS.DELETED
            },
            user_type: {
              $eq: USER_TYPE.EXPERT
            }
          };
          if (reqParam.userId) {
            findCondition = {
              ...findCondition,
              _id: {
                $ne: reqParam.userId
              }
            };
          }
          const user = await Users.findOne(findCondition).select('_id');
          console.log(user, '<user');
          if (user) {
            return Response.successResponseWithoutData(res, res.__('expertAleadyExists'), FAIL);
          } else {
            let updateData = {
              name: reqParam.name?.trim(),
              email: reqEmail,
              user_type: reqParam.userType,
              first_name: reqParam.firstName,
              last_name: reqParam.lastName,
              country: reqParam.country,
              address: reqParam.address,
              mobile: reqParam.phone,
              dob: reqParam.dob,
              status: reqParam.accountStatus,
              job_role: reqParam.jobRole,
              is_email_verified: true
            };
            let userProfileUrl;

            const createSpecialisation = async () => {
              const { categoryId, name } = reqParam.specialisationData;
              const hasCategory = await ExpertCategory.findOne({
                _id: toObjectId(categoryId)
              }).select('_id');
              if (!hasCategory)
                return Response.successResponseWithoutData(
                  res,
                  res.__('noCategoryDataFound'),
                  SUCCESS
                );

              const payload = {
                spec_label: name,
                spec_value: snakeCase(name),
                category_id: toObjectId(categoryId),
                type: SPECIALISATION_TYPE.CUSTOM
              };
              let newSpecialisation = await Specialisation.findOne({
                spec_value: snakeCase(name),
                category_id: toObjectId(categoryId)
              });
              if (!newSpecialisation) {
                newSpecialisation = await Specialisation.create(payload);
              }
              return toObjectId(newSpecialisation._id);
            };
            if (reqParam.userId) {
              const filterData = {
                _id: reqParam.userId,
                status: {
                  $ne: ACCOUNT_STATUS.DELETED
                }
              };
              if (reqParam.profile) {
                const existingProfile = await Users.findOne(filterData).select('user_profile');
                if (existingProfile && existingProfile.user_profile) {
                  await removeOldImage(
                    existingProfile.user_profile,
                    EXPERT_MEDIA_PATH.EXPERT_PROFILE,
                    res
                  );
                }
                const imageExtension = reqParam.profile.split('/')[1];
                const profileImage = `${unixTimeStamp(new Date())}-${makeRandomDigit(
                  4
                )}.${imageExtension}`;
                userProfileUrl = await getUploadURL(
                  reqParam.imageUrl,
                  profileImage,
                  EXPERT_MEDIA_PATH.EXPERT_PROFILE
                );
                updateData = {
                  ...updateData,
                  user_profile: profileImage
                };
              }
              const expertData = await Users.findByIdAndUpdate(filterData, updateData, {
                new: true
              }).select('_id');

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
                linkedln_url: reqParam.linkedlnUrl,
                bio: reqParam.bio,
                expert_focus_ids: reqParam.expertFocusIds,
                profit: reqParam.profit,
                created_by: reqParam.created_by
              };
              if (Array.isArray(reqParam.spokenLanguages) && reqParam.spokenLanguages.length > 0) {
                expertDetails.spoken_languages = reqParam.spokenLanguages;
              }
              if (req.userType == USER_TYPE.SUPER_ADMIN) {
                expertDetails.is_approved = reqParam.status;
                if (expertDetails.is_approved == FORM_STATUS.APPROVED) {
                  expertDetails.approved_by =
                    reqParam.status == FORM_STATUS.APPROVED ? req.authAdminId : null;
                  expertDetails.approved_on =
                    reqParam.status == FORM_STATUS.APPROVED ? new Date() : null;
                  const randomPassword = await makeRandomString(PASSWORD_LENGTH);
                  const hasPassword = await generatePassword(randomPassword);
                  const newUser = await Users.findById(expertDetails.user_id);
                  newUser.password = hasPassword;
                  newUser.save();
                  const locals = {
                    name: reqParam.name?.trim(),
                    email: reqParam.email,
                    password: randomPassword
                  };

                  await sendB2BPassword(reqEmail, MAIL_SUBJECT.B2B_WELCOME, locals);
                }
                expertDetails.reject_reason =
                  reqParam.status == FORM_STATUS.REJECTED ? reqParam.reject_reason : null;
                if (expertDetails.reject_reason) {
                  const expert = await Expert.findOne({ user_id: expertDetails.user_id });
                  let newData = {
                    title: 'Profile Approval Request Rejected',
                    message: 'Request of profile approval for Expert is rejected by admin',
                    sent_to_user_type: SENT_TO_USER_TYPE.CUSTOM_LIST,
                    from_user_id: req.authAdminId,
                    type: NOTIFICATION_TYPE.SUPER_ADMIN_EXPERT_REJECT_REQUEST,
                    expert_id: expertDetails.user_id,
                    to_user_ids: [expert.created_by]
                  };
                  await Notification.create(newData);
                }
              } else if (req.userType == USER_TYPE.SUB_ADMIN) {
                if (
                  reqParam.status == FORM_STATUS.APPROVED ||
                  reqParam.status == FORM_STATUS.REJECTED
                ) {
                  return Response.errorResponseData(
                    res,
                    res.__('accessDenied'),
                    RESPONSE_CODE.BAD_REQUEST
                  );
                }
              }

              const specialisation_id = reqParam.isOther
                ? await createSpecialisation()
                : reqParam.specialisationId;
              expertDetails.specialisation_id = specialisation_id;

              await Expert.updateOne({ user_id: reqParam.userId }, expertDetails, {
                new: true,
                upsert: true
              });

              if (expertData) {
                return Response.successResponseWithoutData(
                  res,
                  res.__('expertDataUpdated'),
                  SUCCESS,
                  userProfileUrl || null
                );
              } else {
                return Response.successResponseWithoutData(res, res.__('invalidExpertId'), FAIL);
              }
            } else {
              if (reqParam.profile) {
                const imageExtension = reqParam.profile.split('/')[1];
                const profileImage = `${unixTimeStamp(new Date())}-${makeRandomDigit(
                  4
                )}.${imageExtension}`;
                userProfileUrl = await getUploadURL(
                  reqParam.imageUrl,
                  profileImage,
                  EXPERT_MEDIA_PATH.EXPERT_PROFILE
                );
                updateData = {
                  ...updateData,
                  user_profile: profileImage
                };
              }
              const randomPassword = await makeRandomString(PASSWORD_LENGTH);
              const hasPassword = await generatePassword(randomPassword);
              updateData = {
                ...updateData,
                password: hasPassword
              };
              const newUser = await Users.create(updateData);

              let expertDetails = {
                user_id: newUser._id,
                price: reqParam.price,
                dbs_check: reqParam.dbsCheck,
                identity: reqParam.identity,
                rating: reqParam.rating,
                title: reqParam.title,
                shoorah_rate: reqParam.shoorahRate,
                medical_no: reqParam.medicalNo,
                education: reqParam.education,
                place_of_practice: reqParam.placeOfPractice,
                year_of_practice: reqParam.yearOfPractice,
                linkedln_url: reqParam.linkedlnUrl,
                bio: reqParam.bio,
                expert_focus_ids: reqParam.expertFocusIds,
                profit: reqParam.profit,
                created_by: req.authAdminId
              };
              if (Array.isArray(reqParam.spokenLanguages) && reqParam.spokenLanguages.length > 0) {
                expertDetails.spoken_languages = reqParam.spokenLanguages;
              }

              expertDetails.is_approved =
                req.userType == USER_TYPE.SUPER_ADMIN
                  ? FORM_STATUS.APPROVED
                  : FORM_STATUS.UNAPPROVED;
              expertDetails.approved_by =
                req.userType == USER_TYPE.SUPER_ADMIN ? req.authAdminId : null;
              expertDetails.approved_on = req.userType == USER_TYPE.SUPER_ADMIN ? new Date() : null;

              const specialisation_id = reqParam.isOther
                ? await createSpecialisation()
                : reqParam.specialisationId;
              const applicant = await createApplicant(newUser);

              expertDetails.applicant_id = applicant.id;
              expertDetails.specialisation_id = specialisation_id;
              const expert = await Expert.create(expertDetails);

              const locals = {
                name: reqParam.name?.trim(),
                email: reqParam.email,
                password: randomPassword
              };
              if (req.userType == USER_TYPE.SUPER_ADMIN)
                await sendB2BPassword(reqEmail, MAIL_SUBJECT.B2B_WELCOME, locals);
              if (req.userType == USER_TYPE.SUB_ADMIN) {
                let superAdmins = (
                  await Users.find({ user_type: USER_TYPE.SUPER_ADMIN, deletedAt: null }).select(
                    '_id'
                  )
                ).map((x) => toObjectId(x));

                let newData = {
                  title: 'Profile Approval Request',
                  message: 'Request for Profile Approval of Expert Data From Sub Admin',
                  sent_to_user_type: SENT_TO_USER_TYPE.CUSTOM_LIST,
                  from_user_id: req.authAdminId,
                  type: NOTIFICATION_TYPE.SUB_ADMIN_EXPERT_APPROVAL_REQUEST,
                  expert_id: expert._id,
                  to_user_ids: superAdmins
                };

                const notificationData = await Notification.create(newData);
                let filterCondition = {
                  user_type: USER_TYPE.USER,
                  status: ACCOUNT_STATUS.ACTIVE,
                  _id: {
                    $in: superAdmins
                  }
                };
                const users = await Users.aggregate([
                  {
                    $match: filterCondition
                  },
                  {
                    $lookup: {
                      from: 'device_tokens',
                      localField: '_id',
                      foreignField: 'user_id',
                      as: 'result'
                    }
                  },
                  {
                    $unwind: {
                      path: '$result',
                      preserveNullAndEmptyArrays: false
                    }
                  },
                  {
                    $group: {
                      _id: null,
                      device_tokens: {
                        $addToSet: '$result.device_token'
                      }
                    }
                  }
                ]);
                if (users.length > 0 && users[0].device_tokens.length > 0) {
                  const reqData = {
                    title: process.env.APP_NAME,
                    message: notificationData.message,
                    notificationType: NOTIFICATION_TYPE.SUB_ADMIN_EXPERT_APPROVAL_REQUEST
                  };
                  sendNotification(
                    users[0].device_tokens,
                    notificationData.message,
                    reqData,
                    NOTIFICATION_ACTION.SUB_ADMIN_EXPERT_APPROVAL_REQUEST
                  );
                }

                //code for send email template to super admins Below In progress
                // const partner = await Users.findOne({ _id: req.authAdminId });
                // console.log(users,"<<<<<<users")
                // if (users.length > 0) {
                //   for (const user of users) {
                //     let locals = {
                //       title: 'Profile Approval Request',
                //       titleButton: 'Go to dashboard',
                //       titleButtonUrl: 'https://admin.shoorah.io',
                //       titleImage: 'https://staging-media.shoorah.io/email_assets/Shoorah_brain.png',
                //       name: user.name,
                //       firstLine: `Request for Profile Approval of Expert Data From Sub Admin`,
                //       secondLine:'',
                //       thirdLine: '',
                //       regards: `${partner?.name}`
                //     };
                //     await sendReusableTemplate(user.email, locals, 'Profile Approval Request');
                //   }
                // }
              }

              return Response.successResponseWithoutData(
                res,
                res.__('expertAddedSuccessfull'),
                SUCCESS,
                userProfileUrl || null
              );
            }
          }
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      console.log(err, '<><<err');
      return Response.internalServerErrorResponse(res);
    }
  },
  /**
   * @description This function is used to get an expert
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  getExpertProfile: (req, res) => {
    try {
      const reqParam = req.query;
      expertsListValidation(reqParam, res, async (validate) => {
        if (validate) {
          const filterData = {
            _id: { $eq: toObjectId(reqParam.id) },
            status: {
              $ne: ACCOUNT_STATUS.DELETED
            },
            user_type: {
              $eq: USER_TYPE.EXPERT
            }
          };

          const aggregationPipeline = [
            {
              $match: filterData
            },
            {
              $lookup: {
                from: 'experts',
                localField: '_id',
                foreignField: 'user_id',
                as: 'expert'
              }
            },
            {
              $addFields: {
                expertDetails: {
                  $arrayElemAt: ['$expert', 0]
                }
              }
            },
            {
              $lookup: {
                from: 'specialisations',
                localField: 'expertDetails.specialisation_id',
                foreignField: '_id',
                as: 'specialisationDetails'
              }
            },
            {
              $addFields: {
                specialisation: {
                  $arrayElemAt: ['$specialisationDetails', 0]
                }
              }
            },
            {
              $lookup: {
                from: 'expert_categories',
                localField: 'specialisation.category_id',
                foreignField: '_id',
                as: 'categoryDetails'
              }
            },
            {
              $addFields: {
                category: {
                  $arrayElemAt: ['$categoryDetails', 0]
                }
              }
            },
            {
              $project: {
                id: '$_id',
                name: '$name',
                profile: {
                  $concat: [CLOUDFRONT_URL, EXPERT_MEDIA_PATH.EXPERT_PROFILE, '/', '$user_profile']
                },
                email: '$email',
                address: '$address',
                mobile: '$mobile',
                userType: '$user_type',
                accountStatus: '$status',
                lastLogin: '$last_login',
                last_login: 1,
                createdAt: 1,
                medicalNo: '$expertDetails.medical_no',
                price: '$expertDetails.price',
                shoorahRate: '$expertDetails.shoorah_rate',
                title: '$expertDetails.title',
                education: '$expertDetails.education',
                placeOfPractice: '$expertDetails.place_of_practice',
                yearOfPractice: '$expertDetails.year_of_practice',
                linkedlnUrl: '$expertDetails.linkedln_url',
                bio: '$expertDetails.bio',
                expertFocusIds: '$expertDetails.expert_focus_ids',
                profit: '$expertDetails.profit',
                dbsCheck: '$expertDetails.dbs_check',
                identity: '$expertDetails.identity',
                rating: '$expertDetails.rating',
                spokenLanguages: '$expertDetails.spoken_languages',
                specialisation: {
                  _id: '$specialisation._id', // Accessed directly, not as an array
                  spec_label: '$specialisation.spec_label',
                  spec_value: '$specialisation.spec_value',
                  is_visible: '$specialisation.is_visible',
                  category: {
                    _id: '$category._id',
                    label: '$category.label',
                    value: '$category.value'
                  }
                },
                _id: 0
              }
            }
          ];

          const expertData = await Users.aggregate(aggregationPipeline);
          if (expertData.length) {
            return Response.successResponseData(
              res,
              expertData[0],
              SUCCESS,
              res.__('getExpertSuccess')
            );
          } else {
            console.log('🚀 ~ reqParam:', reqParam);
            return Response.successResponseWithoutData(res, res.__('userNotFound'), FAIL);
          }
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to list all experts
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  // expertsList: async (req, res) => {
  //   try {
  //     const reqParam = req.query;

  //     // Validate the request parameters
  //     expertsListValidation(reqParam, res, async (validate) => {
  //       if (validate) {
  //         // Pagination and Sorting Parameters
  //         const page = reqParam.page ? parseInt(reqParam.page) : PAGE;
  //         const perPage = reqParam.perPage ? parseInt(reqParam.perPage) : PER_PAGE;
  //         const skip = (page - 1) * perPage || 0;
  //         const sortBy = reqParam.sortBy || SORT_BY;
  //         const sortOrder = reqParam.sortOrder ? parseInt(reqParam.sortOrder) : SORT_ORDER;

  //         // Filter Data
  //         const filterData = {
  //           _id: { $ne: toObjectId(req.authAdminId) },
  //           status: { $ne: ACCOUNT_STATUS.DELETED },
  //           user_type: { $eq: USER_TYPE.EXPERT },
  //           ...(reqParam.id && { _id: toObjectId(reqParam.id) }),
  //           ...(reqParam.searchKey && {
  //             $or: [
  //               { name: { $regex: '.*' + reqParam.searchKey + '.*', $options: 'i' } },
  //               { email: { $regex: '.*' + reqParam.searchKey + '.*', $options: 'i' } }
  //             ]
  //           })
  //         };

  //         // Construct the $lookup stage conditionally
  //         const lookupStage = {
  //           from: 'experts',
  //           localField: '_id',
  //           foreignField: 'user_id',
  //           as: 'expert'
  //         };

  //         // Build the Aggregation Pipeline
  //         const aggregationPipeline = [
  //           { $match: filterData },
  //           { $sort: { [sortBy]: sortOrder } },
  //           { $skip: skip },
  //           { $limit: perPage },
  //           { $lookup: lookupStage },
  //           {
  //             $addFields: {
  //               expertDetails: { $arrayElemAt: ['$expert', 0] }
  //             }
  //           },
  //           // Add a conditional $match to filter only unapproved experts if forApprove is true
  //           ...(reqParam.forApprove === 'true'
  //             ? [
  //                 {
  //                   $match: {
  //                     'expertDetails.is_approved': FORM_STATUS.UNAPPROVED // is_approved: 0
  //                   }
  //                 }
  //               ]
  //             : [])
  //         ];

  //         // Projection stage to format the output
  //         aggregationPipeline.push({
  //           $project: {
  //             id: '$_id',
  //             name: '$name',
  //             profile: {
  //               $concat: [CLOUDFRONT_URL, EXPERT_MEDIA_PATH.EXPERT_PROFILE, '/', '$user_profile']
  //             },
  //             email: '$email',
  //             address: '$address',
  //             mobile: '$mobile',
  //             userType: '$user_type',
  //             accountStatus: '$status',
  //             lastLogin: '$last_login',
  //             last_login: 1,
  //             createdAt: 1,
  //             medicalNo: '$expertDetails.medical_no',
  //             price: '$expertDetails.price',
  //             shoorahRate: '$expertDetails.shoorah_rate',
  //             title: '$expertDetails.title',
  //             education: '$expertDetails.education',
  //             placeOfPractice: '$expertDetails.place_of_practice',
  //             yearOfPractice: '$expertDetails.year_of_practice',
  //             category: '$expertDetails.category',
  //             specialsationCategory: '$expertDetails.specialsation_category',
  //             linkedlnUrl: '$expertDetails.linkedln_url',
  //             bio: '$expertDetails.bio',
  //             expertFocusIds: '$expertDetails.expert_focus_ids',
  //             profit: '$expertDetails.profit',
  //             dbsCheck: '$expertDetails.dbs_check',
  //             identity: '$expertDetails.identity',
  //             rating: '$expertDetails.rating',
  //             spokenLanguages: '$expertDetails.spoken_languages',
  //             _id: 0,
  //             is_approved: '$expertDetails.is_approved'
  //           }
  //         });

  //         // Count total records based on the initial filter
  //         const totalRecords = await Users.countDocuments(filterData);

  //         // Execute the aggregation pipeline
  //         const expertsData = await Users.aggregate(aggregationPipeline);

  //         // Send the response
  //         return Response.successResponseData(
  //           res,
  //           expertsData,
  //           SUCCESS,
  //           res.__('expertsListSuccess'),
  //           {
  //             page,
  //             perPage,
  //             totalRecords: totalRecords
  //           }
  //         );
  //       } else {
  //         return Response.internalServerErrorResponse(res);
  //       }
  //     });
  //   } catch (err) {
  //     console.error('Error in expertsList:', err);
  //     return Response.internalServerErrorResponse(res);
  //   }
  // },

  expertsList: async (req, res) => {
    try {
      const reqParam = req.query;
  
      // Validate the request parameters
      expertsListValidation(reqParam, res, async (validate) => {
        if (validate) {
          // Pagination and Sorting Parameters
          const page = reqParam.page ? parseInt(reqParam.page) : PAGE;
          const perPage = reqParam.perPage ? parseInt(reqParam.perPage) : PER_PAGE;
          const skip = (page - 1) * perPage || 0;
          const sortBy = reqParam.sortBy || SORT_BY;
          const sortOrder = reqParam.sortOrder ? parseInt(reqParam.sortOrder) : SORT_ORDER;
  
          // Filter Data
          const filterData = {
            _id: { $ne: toObjectId(req.authAdminId) },
            status: { $ne: ACCOUNT_STATUS.DELETED },
            user_type: { $eq: USER_TYPE.EXPERT },
            ...(reqParam.id && { _id: toObjectId(reqParam.id) }),
            ...(reqParam.searchKey && {
              $or: [
                { name: { $regex: '.*' + reqParam.searchKey + '.*', $options: 'i' } },
                { email: { $regex: '.*' + reqParam.searchKey + '.*', $options: 'i' } }
              ]
            })
          };
  
          // Construct the $lookup stage
          const lookupStage = {
            from: 'experts',
            localField: '_id',
            foreignField: 'user_id',
            as: 'expert'
          };
  
          // Build the Aggregation Pipeline
          const aggregationPipeline = [
            { $match: filterData },
            { $lookup: lookupStage },
            {
              $unwind: {
                path: '$expert',
                preserveNullAndEmptyArrays: true // Include users without an expert record
              }
            },
            // Filter for approved experts
            {
              $match: {
                'expert.profile_status': EXPERT_PROFILE_STATUS.APPROVED
              }
            },
            { $sort: { ['expert.updatedAt']: sortOrder } },
            { $skip: skip },
            { $limit: perPage },
            {
              $project: {
                id: '$_id',
                name: '$name',
                profile: {
                  $concat: [CLOUDFRONT_URL, EXPERT_MEDIA_PATH.EXPERT_PROFILE, '/', '$user_profile']
                },
                email: '$email',
                address: '$address',
                mobile: '$mobile',
                userType: '$user_type',
                accountStatus: '$status',
                lastLogin: '$last_login',
                createdAt: 1,
                medicalNo: '$expert.medical_no',
                price: '$expert.price',
                shoorahRate: '$expert.shoorah_rate',
                title: '$expert.title',
                education: '$expert.education',
                placeOfPractice: '$expert.place_of_practice',
                yearOfPractice: '$expert.year_of_practice',
                category: '$expert.category',
                specialsationCategory: '$expert.specialsation_category',
                linkedlnUrl: '$expert.linkedln_url',
                bio: '$expert.bio',
                expertFocusIds: '$expert.expert_focus_ids',
                profit: '$expert.profit',
                dbsCheck: '$expert.dbs_check',
                identity: '$expert.identity',
                rating: '$expert.rating',
                spokenLanguages: '$expert.spoken_languages',
                is_approved: '$expert.is_approved',
                _id: 0,
                expert:1
              }
            }
          ];
  
          // Count total records based on the initial filter
          const totalRecords = await Expert.countDocuments({
            user_id: { $ne: toObjectId(req.authAdminId) },
            profile_status: EXPERT_PROFILE_STATUS.APPROVED,
          });
            
          // Execute the aggregation pipeline
          const expertsData = await Users.aggregate(aggregationPipeline);
  
          // Send the response
          return Response.successResponseData(
            res,
            expertsData,
            SUCCESS,
            res.__('expertsListSuccess'),
            {
              page,
              perPage,
              totalRecords: totalRecords
            }
          );
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      console.error('Error in expertsList:', err);
      return Response.internalServerErrorResponse(res);
    }
  },
  /**
   * @description This function is used to list single experts
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  expertById: async (req, res) => {
    try {
      const userId = req.query.userId;

      // Validate userId
      if (!userId) {
        return Response.badRequestErrorResponse(res, res.__('Invalid userId'));
      }

      // Fetch the user data from Users collection
      const user = await Users.findOne({
        _id: toObjectId(userId),
        status: { $ne: ACCOUNT_STATUS.DELETED },
        user_type: USER_TYPE.EXPERT
      });

      // If user not found
      if (!user) {
        return Response.notFoundResponse(res, res.__('User not found'));
      }

      // Fetch the expert data from Experts collection based on user_id
      const expert = await Expert.findOne({ user_id: toObjectId(userId) }).populate(
        'specialisation_id'
      );

      // Combine user and expert data
      const expertDetails = {
        id: user._id,
        name: user.name,
        profile: `${CLOUDFRONT_URL}${EXPERT_MEDIA_PATH.EXPERT_PROFILE}/${user.user_profile}`,
        email: user.email,
        address: user.address,
        mobile: user.mobile,
        userType: user.user_type,
        accountStatus: user.status,
        lastLogin: user.last_login,
        createdAt: user.createdAt,
        expert: expert
      };

      // Send the response with both user and expert information
      return Response.successResponseData(
        res,
        expertDetails,
        SUCCESS,
        res.__('expertDetailsSuccess')
      );
    } catch (err) {
      console.error('Error in expertById:', err);
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to Approve or reject document verification for experts
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  approveOrRejectExpertProfile: async (req, res) => {
    try {
      console.log(req.authAdminId, '<<<<Admin ID');

      // Check if the user is an admin
      if (req.userType !== USER_TYPE.SUPER_ADMIN) {
        return Response.errorResponseData(res, res.__('accessDenied'), RESPONSE_CODE.UNAUTHORIZED);
      }

      // Validate request parameters
      approveOrRejectExpertValidation(req, res, async (validate) => {
        if (validate) {
          const { expertId, status, rejectReason } = req.body;

          if (status === 2 && !rejectReason) {
            return Response.errorResponseData(
              res,
              res.__('rejectReasonRequired'),
              RESPONSE_CODE.BAD_REQUEST
            );
          }

          // Find the expert profile
          const expertProfile = await Expert.findOne({ user_id: expertId });

          if (!expertProfile) {
            return Response.errorResponseData(
              res,
              res.__('expertNotFound'),
              RESPONSE_CODE.NOT_FOUND
            );
          }

          // Find or create the ExpertApproval document
          let expertApproval = await ExpertApproval.findOne({ expert_id: expertProfile._id });

          if (!expertApproval) {
            // Create a new ExpertApproval document if it doesn't exist
            expertApproval = await ExpertApproval.create({
              user_id: expertProfile.user_id,
              expert_id: expertProfile._id,
              doc_type: null, // or appropriate document type if applicable
              verification_status: DBS_VERIFICATION_STATUS.PENDING,
              approved_by: null,
              approved_on: null,
              sent_for_verification: true,
              dbs_verified: false
            });
          }

          // Update ExpertApproval document based on approval/rejection
          //  await ExpertApproval.findByIdAndUpdate(
          //   expertApproval._id,
          //   {
          //     verification_status:
          //       status === 1 ? DBS_VERIFICATION_STATUS.APPROVE : DBS_VERIFICATION_STATUS.REJECT,
          //     approved_by: req.authAdminId,
          //     approved_on: new Date(),
          //     reject_reason: status === 2 ? rejectReason : undefined
          //   },
          //   { new: true }
          // );

          // Update the expert profile
          const updatedExpertProfile = await Expert.findByIdAndUpdate(
            expertProfile._id,
            {
              is_docuement_approved: status,
              docuement_approved_by: req.authAdminId,
              docuement_approved_on: new Date(),
              reject_reason: status === 2 ? rejectReason : undefined,
              send_approval_request: false
            },
            { new: true }
          );
          console.log(updatedExpertProfile, '<<<<<<updatedExpertProfile');

          // Send notification if the profile is rejected
          if (status === 2) {
            let newData = {
              title: 'Profile Rejection Notification',
              message: `Your profile has been rejected. Reason: ${rejectReason}`,
              sent_to_user_type: SENT_TO_USER_TYPE.CUSTOM_LIST,
              from_user_id: req.authAdminId,
              type: NOTIFICATION_TYPE.EXPERT_PROFILE_REJECTED,
              expert_id: expertProfile._id,
              to_user_ids: [expertId] // Send notification to the expert
            };

            await Notification.create(newData);
          }

          // Check if the profile was updated successfully
          if (status === 1) {
            await Expert.findByIdAndUpdate(
              expertProfile._id,
              {
                reject_reason: null,
                send_approval_request: true
              },
              { new: true }
            );
            return Response.successResponseWithoutData(res, res.__('expertApproved'), SUCCESS);
          } else {
            return Response.successResponseWithoutData(res, res.__('expertRejected'), SUCCESS);
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
   * @description This function is used to Verify or Reject documents of expert
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  // approveDocuments : async (req, res) => {
  //   try {
  //     const { expertId } = req.query;
  //     const { status, rejectReason } = req.body; // status: 1 (approved), 2 (rejected), rejectReason for rejections

  //     // Check if the user is a Super Admin
  //     if (req.userType !== USER_TYPE.SUPER_ADMIN) {
  //       return Response.errorResponseData(res, 'Access denied', RESPONSE_CODE.UNAUTHORIZED);
  //     }

  //     // Validate the expertId
  //     const expert = await Expert.findById(expertId);
  //     if (!expert) {
  //       return Response.errorResponseData(res, 'Invalid expert ID', RESPONSE_CODE.NOT_FOUND);
  //     }

  //     // Fetch all ExpertAttachment documents linked with the expert
  //     const attachments = await ExpertAttachment.find({ expert_id: expertId, deletedAt: null });

  //     if (!attachments || attachments.length === 0) {
  //       return Response.errorResponseData(res, 'No documents found for this expert', RESPONSE_CODE.NOT_FOUND);
  //     }

  //     // Loop through all attachments and update their approval status
  //     for (const attachment of attachments) {
  //       if (status === 1) {
  //         // Approve document
  //         attachment.is_document_approved = 1;
  //         attachment.verification_status = 'approved'; // Custom status for tracking
  //       } else if (status === 2) {
  //         // Reject document and save rejection reason
  //         attachment.is_document_approved = 2;
  //         attachment.verification_status = 'rejected'; // Custom status for tracking
  //         attachment.reject_reason = rejectReason || 'No reason provided';
  //       }

  //       // Save the updated attachment
  //       await attachment.save();
  //     }

  //     // Notify the expert about the approval/rejection
  //     const notificationData = {
  //       title: status === 1 ? 'Documents Approved' : 'Documents Rejected',
  //       message:
  //         status === 1
  //           ? 'Your documents have been approved by the Super Admin.'
  //           : `Your documents have been rejected. Reason: ${rejectReason || 'No reason provided'}.`,
  //       sent_to_user_type: SENT_TO_USER_TYPE.SPECIFIC_USER,
  //       from_user_id: req.authAdminId,
  //       type: status === 1 ? NOTIFICATION_TYPE.DOCUMENT_APPROVED : NOTIFICATION_TYPE.DOCUMENT_REJECTED,
  //       expert_id: expertId,
  //       to_user_ids: [expertId] // Notify the expert
  //     };

  //     await Notification.create(notificationData);

  //     return Response.successResponseWithoutData(
  //       res,
  //       status === 1 ? 'Documents approved successfully' : 'Documents rejected successfully',
  //       RESPONSE_CODE.SUCCESS
  //     );
  //   } catch (err) {
  //     console.error('Error approving/rejecting documents:', err);
  //     return Response.internalServerErrorResponse(res, 'Error approving/rejecting documents');
  //   }
  // },

  /**
   * @description This function is used to Verify or Reject documents of expert
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */

  /**
   * @description This function is used to list single experts
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  expertById: async (req, res) => {
    try {
      const userId = req.query.userId;

      // Validate userId
      if (!userId) {
        return Response.badRequestErrorResponse(res, res.__('Invalid userId'));
      }

      // Fetch the user data from Users collection
      const user = await Users.findOne({
        _id: toObjectId(userId),
        status: { $ne: ACCOUNT_STATUS.DELETED },
        user_type: USER_TYPE.EXPERT
      });

      // If user not found
      if (!user) {
        return Response.notFoundResponse(res, res.__('User not found'));
      }

      // Fetch the expert data from Experts collection based on user_id
      const expert = await Expert.findOne({ user_id: toObjectId(userId) }).populate(
        'specialisation_id'
      );

      // Combine user and expert data
      const expertDetails = {
        id: user._id,
        name: user.name,
        profile: `${CLOUDFRONT_URL}${EXPERT_MEDIA_PATH.EXPERT_PROFILE}/${user.user_profile}`,
        email: user.email,
        address: user.address,
        mobile: user.mobile,
        userType: user.user_type,
        accountStatus: user.status,
        lastLogin: user.last_login,
        createdAt: user.createdAt,
        expert: expert
      };

      // Send the response with both user and expert information
      return Response.successResponseData(
        res,
        expertDetails,
        SUCCESS,
        res.__('expertDetailsSuccess')
      );
    } catch (err) {
      console.error('Error in expertById:', err);
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to Approve or reject document verification for experts
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  approveOrRejectExpertProfile: async (req, res) => {
    try {
      console.log(req.authAdminId, '<<<<Admin ID');

      // Check if the user is an admin
      if (req.userType !== USER_TYPE.SUPER_ADMIN) {
        return Response.errorResponseData(res, res.__('accessDenied'), RESPONSE_CODE.UNAUTHORIZED);
      }

      // Validate request parameters
      approveOrRejectExpertValidation(req, res, async (validate) => {
        if (validate) {
          const { expertId, status, rejectReason } = req.body;

          if (status === 2 && !rejectReason) {
            return Response.errorResponseData(
              res,
              res.__('rejectReasonRequired'),
              RESPONSE_CODE.BAD_REQUEST
            );
          }

          // Find the expert profile
          const expertProfile = await Expert.findOne({ user_id: expertId });

          if (!expertProfile) {
            return Response.errorResponseData(
              res,
              res.__('expertNotFound'),
              RESPONSE_CODE.NOT_FOUND
            );
          }

          // Find or create the ExpertApproval document
          let expertApproval = await ExpertApproval.findOne({ expert_id: expertProfile._id });

          if (!expertApproval) {
            // Create a new ExpertApproval document if it doesn't exist
            expertApproval = await ExpertApproval.create({
              user_id: expertProfile.user_id,
              expert_id: expertProfile._id,
              doc_type: null, // or appropriate document type if applicable
              verification_status: DBS_VERIFICATION_STATUS.PENDING,
              approved_by: null,
              approved_on: null,
              sent_for_verification: true,
              dbs_verified: false
            });
          }

          // Update ExpertApproval document based on approval/rejection
          //  await ExpertApproval.findByIdAndUpdate(
          //   expertApproval._id,
          //   {
          //     verification_status:
          //       status === 1 ? DBS_VERIFICATION_STATUS.APPROVE : DBS_VERIFICATION_STATUS.REJECT,
          //     approved_by: req.authAdminId,
          //     approved_on: new Date(),
          //     reject_reason: status === 2 ? rejectReason : undefined
          //   },
          //   { new: true }
          // );

          // Update the expert profile
          const updatedExpertProfile = await Expert.findByIdAndUpdate(
            expertProfile._id,
            {
              is_docuement_approved: status,
              docuement_approved_by: req.authAdminId,
              docuement_approved_on: new Date(),
              reject_reason: status === 2 ? rejectReason : undefined,
              send_approval_request: false
            },
            { new: true }
          );
          console.log(updatedExpertProfile, '<<<<<<updatedExpertProfile');

          // Send notification if the profile is rejected
          if (status === 2) {
            let newData = {
              title: 'Profile Rejection Notification',
              message: `Your profile has been rejected. Reason: ${rejectReason}`,
              sent_to_user_type: SENT_TO_USER_TYPE.CUSTOM_LIST,
              from_user_id: req.authAdminId,
              type: NOTIFICATION_TYPE.EXPERT_PROFILE_REJECTED,
              expert_id: expertProfile._id,
              to_user_ids: [expertId] // Send notification to the expert
            };

            await Notification.create(newData);
          }

          // Check if the profile was updated successfully
          if (status === 1) {
            await Expert.findByIdAndUpdate(
              expertProfile._id,
              {
                reject_reason: null,
                send_approval_request: true
              },
              { new: true }
            );
            return Response.successResponseWithoutData(res, res.__('expertApproved'), SUCCESS);
          } else {
            return Response.successResponseWithoutData(res, res.__('expertRejected'), SUCCESS);
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
   * @description This function is used to Verify or Reject documents of expert
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  // approveDocuments : async (req, res) => {
  //   try {
  //     const { expertId } = req.query;
  //     const { status, rejectReason } = req.body; // status: 1 (approved), 2 (rejected), rejectReason for rejections

  //     // Check if the user is a Super Admin
  //     if (req.userType !== USER_TYPE.SUPER_ADMIN) {
  //       return Response.errorResponseData(res, 'Access denied', RESPONSE_CODE.UNAUTHORIZED);
  //     }

  //     // Validate the expertId
  //     const expert = await Expert.findById(expertId);
  //     if (!expert) {
  //       return Response.errorResponseData(res, 'Invalid expert ID', RESPONSE_CODE.NOT_FOUND);
  //     }

  //     // Fetch all ExpertAttachment documents linked with the expert
  //     const attachments = await ExpertAttachment.find({ expert_id: expertId, deletedAt: null });

  //     if (!attachments || attachments.length === 0) {
  //       return Response.errorResponseData(res, 'No documents found for this expert', RESPONSE_CODE.NOT_FOUND);
  //     }

  //     // Loop through all attachments and update their approval status
  //     for (const attachment of attachments) {
  //       if (status === 1) {
  //         // Approve document
  //         attachment.is_document_approved = 1;
  //         attachment.verification_status = 'approved'; // Custom status for tracking
  //       } else if (status === 2) {
  //         // Reject document and save rejection reason
  //         attachment.is_document_approved = 2;
  //         attachment.verification_status = 'rejected'; // Custom status for tracking
  //         attachment.reject_reason = rejectReason || 'No reason provided';
  //       }

  //       // Save the updated attachment
  //       await attachment.save();
  //     }

  //     // Notify the expert about the approval/rejection
  //     const notificationData = {
  //       title: status === 1 ? 'Documents Approved' : 'Documents Rejected',
  //       message:
  //         status === 1
  //           ? 'Your documents have been approved by the Super Admin.'
  //           : `Your documents have been rejected. Reason: ${rejectReason || 'No reason provided'}.`,
  //       sent_to_user_type: SENT_TO_USER_TYPE.SPECIFIC_USER,
  //       from_user_id: req.authAdminId,
  //       type: status === 1 ? NOTIFICATION_TYPE.DOCUMENT_APPROVED : NOTIFICATION_TYPE.DOCUMENT_REJECTED,
  //       expert_id: expertId,
  //       to_user_ids: [expertId] // Notify the expert
  //     };

  //     await Notification.create(notificationData);

  //     return Response.successResponseWithoutData(
  //       res,
  //       status === 1 ? 'Documents approved successfully' : 'Documents rejected successfully',
  //       RESPONSE_CODE.SUCCESS
  //     );
  //   } catch (err) {
  //     console.error('Error approving/rejecting documents:', err);
  //     return Response.internalServerErrorResponse(res, 'Error approving/rejecting documents');
  //   }
  // },

  /**
   * @description This function is used to Verify or Reject documents of expert
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */

  /**
   * @description This function is used to list single experts
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  expertById: async (req, res) => {
    try {
      const userId = req.query.userId;

      // Validate userId
      if (!userId) {
        return Response.badRequestErrorResponse(res, res.__('Invalid userId'));
      }

      // Fetch the user data from Users collection
      const user = await Users.findOne({
        _id: toObjectId(userId),
        status: { $ne: ACCOUNT_STATUS.DELETED },
        user_type: USER_TYPE.EXPERT
      });

      // If user not found
      if (!user) {
        return Response.notFoundResponse(res, res.__('User not found'));
      }

      // Fetch the expert data from Experts collection based on user_id
      const expert = await Expert.findOne({ user_id: toObjectId(userId) }).populate(
        'specialisation_id'
      );

      // Combine user and expert data
      const expertDetails = {
        id: user._id,
        name: user.name,
        profile: `${CLOUDFRONT_URL}${EXPERT_MEDIA_PATH.EXPERT_PROFILE}/${user.user_profile}`,
        email: user.email,
        address: user.address,
        mobile: user.mobile,
        userType: user.user_type,
        accountStatus: user.status,
        lastLogin: user.last_login,
        createdAt: user.createdAt,
        expert: expert
      };

      // Send the response with both user and expert information
      return Response.successResponseData(
        res,
        expertDetails,
        SUCCESS,
        res.__('expertDetailsSuccess')
      );
    } catch (err) {
      console.error('Error in expertById:', err);
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to Approve or reject document verification for experts
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  approveOrRejectExpertProfile: async (req, res) => {
    try {
      console.log(req.authAdminId, '<<<<Admin ID');

      // Check if the user is an admin
      if (req.userType !== USER_TYPE.SUPER_ADMIN) {
        return Response.errorResponseData(res, res.__('accessDenied'), RESPONSE_CODE.UNAUTHORIZED);
      }

      // Validate request parameters
      approveOrRejectExpertValidation(req, res, async (validate) => {
        if (validate) {
          const { expertId, status, rejectReason } = req.body;

          if (status === 2 && !rejectReason) {
            return Response.errorResponseData(
              res,
              res.__('rejectReasonRequired'),
              RESPONSE_CODE.BAD_REQUEST
            );
          }

          // Find the expert profile
          const expertProfile = await Expert.findOne({ user_id: expertId });

          if (!expertProfile) {
            return Response.errorResponseData(
              res,
              res.__('expertNotFound'),
              RESPONSE_CODE.NOT_FOUND
            );
          }

          // Find or create the ExpertApproval document
          let expertApproval = await ExpertApproval.findOne({ expert_id: expertProfile._id });

          if (!expertApproval) {
            // Create a new ExpertApproval document if it doesn't exist
            expertApproval = await ExpertApproval.create({
              user_id: expertProfile.user_id,
              expert_id: expertProfile._id,
              doc_type: null, // or appropriate document type if applicable
              verification_status: DBS_VERIFICATION_STATUS.PENDING,
              approved_by: null,
              approved_on: null,
              sent_for_verification: true,
              dbs_verified: false
            });
          }

          // Update ExpertApproval document based on approval/rejection
          //  await ExpertApproval.findByIdAndUpdate(
          //   expertApproval._id,
          //   {
          //     verification_status:
          //       status === 1 ? DBS_VERIFICATION_STATUS.APPROVE : DBS_VERIFICATION_STATUS.REJECT,
          //     approved_by: req.authAdminId,
          //     approved_on: new Date(),
          //     reject_reason: status === 2 ? rejectReason : undefined
          //   },
          //   { new: true }
          // );

          // Update the expert profile
          const updatedExpertProfile = await Expert.findByIdAndUpdate(
            expertProfile._id,
            {
              is_docuement_approved: status,
              docuement_approved_by: req.authAdminId,
              docuement_approved_on: new Date(),
              reject_reason: status === 2 ? rejectReason : undefined,
              send_approval_request: false
            },
            { new: true }
          );
          console.log(updatedExpertProfile, '<<<<<<updatedExpertProfile');

          // Send notification if the profile is rejected
          if (status === 2) {
            let newData = {
              title: 'Profile Rejection Notification',
              message: `Your profile has been rejected. Reason: ${rejectReason}`,
              sent_to_user_type: SENT_TO_USER_TYPE.CUSTOM_LIST,
              from_user_id: req.authAdminId,
              type: NOTIFICATION_TYPE.EXPERT_PROFILE_REJECTED,
              expert_id: expertProfile._id,
              to_user_ids: [expertId] // Send notification to the expert
            };

            await Notification.create(newData);
          }

          // Check if the profile was updated successfully
          if (status === 1) {
            await Expert.findByIdAndUpdate(
              expertProfile._id,
              {
                reject_reason: null,
                send_approval_request: true
              },
              { new: true }
            );
            return Response.successResponseWithoutData(res, res.__('expertApproved'), SUCCESS);
          } else {
            return Response.successResponseWithoutData(res, res.__('expertRejected'), SUCCESS);
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
   * @description This function is used to Verify or Reject documents of expert
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  // approveDocuments : async (req, res) => {
  //   try {
  //     const { expertId } = req.query;
  //     const { status, rejectReason } = req.body; // status: 1 (approved), 2 (rejected), rejectReason for rejections

  //     // Check if the user is a Super Admin
  //     if (req.userType !== USER_TYPE.SUPER_ADMIN) {
  //       return Response.errorResponseData(res, 'Access denied', RESPONSE_CODE.UNAUTHORIZED);
  //     }

  //     // Validate the expertId
  //     const expert = await Expert.findById(expertId);
  //     if (!expert) {
  //       return Response.errorResponseData(res, 'Invalid expert ID', RESPONSE_CODE.NOT_FOUND);
  //     }

  //     // Fetch all ExpertAttachment documents linked with the expert
  //     const attachments = await ExpertAttachment.find({ expert_id: expertId, deletedAt: null });

  //     if (!attachments || attachments.length === 0) {
  //       return Response.errorResponseData(res, 'No documents found for this expert', RESPONSE_CODE.NOT_FOUND);
  //     }

  //     // Loop through all attachments and update their approval status
  //     for (const attachment of attachments) {
  //       if (status === 1) {
  //         // Approve document
  //         attachment.is_document_approved = 1;
  //         attachment.verification_status = 'approved'; // Custom status for tracking
  //       } else if (status === 2) {
  //         // Reject document and save rejection reason
  //         attachment.is_document_approved = 2;
  //         attachment.verification_status = 'rejected'; // Custom status for tracking
  //         attachment.reject_reason = rejectReason || 'No reason provided';
  //       }

  //       // Save the updated attachment
  //       await attachment.save();
  //     }

  //     // Notify the expert about the approval/rejection
  //     const notificationData = {
  //       title: status === 1 ? 'Documents Approved' : 'Documents Rejected',
  //       message:
  //         status === 1
  //           ? 'Your documents have been approved by the Super Admin.'
  //           : `Your documents have been rejected. Reason: ${rejectReason || 'No reason provided'}.`,
  //       sent_to_user_type: SENT_TO_USER_TYPE.SPECIFIC_USER,
  //       from_user_id: req.authAdminId,
  //       type: status === 1 ? NOTIFICATION_TYPE.DOCUMENT_APPROVED : NOTIFICATION_TYPE.DOCUMENT_REJECTED,
  //       expert_id: expertId,
  //       to_user_ids: [expertId] // Notify the expert
  //     };

  //     await Notification.create(notificationData);

  //     return Response.successResponseWithoutData(
  //       res,
  //       status === 1 ? 'Documents approved successfully' : 'Documents rejected successfully',
  //       RESPONSE_CODE.SUCCESS
  //     );
  //   } catch (err) {
  //     console.error('Error approving/rejecting documents:', err);
  //     return Response.internalServerErrorResponse(res, 'Error approving/rejecting documents');
  //   }
  // },

  /**
   * @description This function is used to Verify or Reject documents of expert
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */

  /**
   * @description This function is used to delete expert account
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  deleteExpert: (req, res) => {
    try {
      if (req.userType !== USER_TYPE.SUPER_ADMIN && req.userType !== USER_TYPE.SUB_ADMIN) {
        return Response.errorResponseData(res, res.__('accessDenied'), RESPONSE_CODE.UNAUTHORIZED);
      }
      const reqParam = req.query;
      deleteExpertValidation(reqParam, res, async (validate) => {
        if (validate) {
          await Users.findByIdAndUpdate(reqParam.userId, {
            status: ACCOUNT_STATUS.DELETED,
            deletedAt: new Date()
          });
          await DeviceTokens.deleteMany({ user_id: reqParam.userId });
          return Response.successResponseWithoutData(res, res.__('expertDeleteSuccess'), SUCCESS);
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
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
      getAdminExpertAttachments(reqParam, res, async (validate) => {
        if (validate) {
          let filterCondition = {
            doc_type: reqParam.docType,
            user_id: toObjectId(reqParam.userId),
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
   * @description This function is used to get an approval by id
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  getApprovalDataById: (req, res) => {
    try {
      const reqParam = req.query;
      getApprovalValidation(reqParam, res, async (validate) => {
        if (validate) {
          let filterCondition = {
            _id: toObjectId(reqParam.approvalId)
          };
          let approval = await ExpertApproval.findOne(filterCondition)
            .populate({
              path: 'approved_by',
              select: 'name'
            })
            .select({
              approvalId: '$_id',
              approvalFileTitle: '$file_title',
              approvalFileName: '$file_name',
              approvalType: '$doc_type',
              status: '$verification_status',
              sentForVerification: '$sent_for_verification',
              dbsVerified: '$dbs_verified',
              approvedBy: '$approved_by,',
              approvedOn: '$approved_on,',
              createdAt: 1,
              _id: 0
            })
            .lean();
          if (approval) {
            approval.approvalFileUrl =
              CLOUDFRONT_URL + EXPERT_MEDIA_PATH.DOCUMENTS + '/' + approval.approvalFileName;
          }

          return Response.successResponseData(
            res,
            convertObjectKeysToCamelCase(approval),
            SUCCESS,
            res.__('getApprovalSuccess')
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
   * @description This function is used to get all approvals
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  getExpertApprovals: (req, res) => {
    try {
      const reqParam = req.query;
      expertsApprovalsValidation(reqParam, res, async (validate) => {
        if (validate) {
          const page = reqParam.page ? parseInt(reqParam.page) : PAGE;
          const perPage = reqParam.perPage ? parseInt(reqParam.perPage) : PER_PAGE;
          const skip = (page - 1) * perPage || 0;
          const sortBy = reqParam.sortBy || SORT_BY;
          const sortOrder = reqParam.sortOrder ? parseInt(reqParam.sortOrder) : SORT_ORDER;
          const filterCondition = {
            ...(reqParam.searchKey && {
              $or: [
                { name: { $regex: '.*' + reqParam.searchKey + '.*', $options: 'i' } },
                { email: { $regex: '.*' + reqParam.searchKey + '.*', $options: 'i' } }
              ]
            }),
            ...(reqParam.docType && { doc_type: reqParam.docType }),
            ...(reqParam.verificationStatus && {
              verification_status: reqParam.verificationStatus
            }),
            ...(reqParam.dbsVerified && { dbs_verified: reqParam.dbsVerified })
          };

          let approvalList = await ExpertApproval.find(filterCondition)
            .populate({
              path: 'approved_by',
              select: 'name'
            })
            .sort({ [sortBy]: sortOrder })
            .skip(skip)
            .limit(perPage)
            .select({
              approvalId: '$_id',
              approvalFileTitle: '$file_title',
              approvalFileName: '$file_name',
              approvalType: '$doc_type',
              status: '$verification_status',
              sentForVerification: '$sent_for_verification',
              dbsVerified: '$dbs_verified',
              approvedBy: '$approved_by,',
              approvedOn: '$approved_on,',
              createdAt: 1,
              _id: 0
            })
            .lean();
          const totalRecords = await ExpertApproval.countDocuments(filterCondition);
          if (approvalList.length) {
            approvalList.map((approval) => {
              approval.approvalFileUrl =
                CLOUDFRONT_URL + EXPERT_MEDIA_PATH.DOCUMENTS + '/' + approval.approvalFileName;
            });
          }

          return Response.successResponseData(
            res,
            convertObjectKeysToCamelCase(approvalList),
            SUCCESS,
            res.__('expertApprovalListSuccess'),
            {
              page,
              perPage,
              totalRecords
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
   * @description This function is used to update approval stats
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  updateExpertApprovals: (req, res) => {
    try {
      if (req.userType !== USER_TYPE.SUPER_ADMIN && req.userType !== USER_TYPE.SUB_ADMIN) {
        return Response.errorResponseData(res, res.__('accessDenied'), RESPONSE_CODE.UNAUTHORIZED);
      }
      const reqParam = req.body;
      approvalUpdateValidation(reqParam, res, async (validate) => {
        if (validate) {
          const filterCondition = {
            _id: toObjectId(reqParam.approvalId),
            verification_status: DBS_VERIFICATION_STATUS.PENDING
          };

          let approval = await ExpertApproval.findOne(filterCondition);
          if (approval) {
            let updateData = {
              verification_status: reqParam.verificationStatus,
              approved_by: req.authAdminId,
              dbs_verified: reqParam.dbsVerified,
              approved_on: new Date()
            };

            if (reqParam.verificationStatus === DBS_VERIFICATION_STATUS.REJECT) {
              updateData = {
                ...updateData,
                deletedAt: new Date()
              };
            }

            await ExpertApproval.findByIdAndUpdate(reqParam.approvalId, updateData, {
              new: true,
              upsert: true
            });

            if (reqParam.verificationStatus === DBS_VERIFICATION_STATUS.REJECT) {
              await sendApprovalReject(req.authAdminName, req.authAdminId, approval.user_id);
            } else if (reqParam.verificationStatus === DBS_VERIFICATION_STATUS.APPROVE) {
              await sendApprovalAccept(req.authAdminName, req.authAdminId, approval.user_id);
            }

            return Response.successResponseWithoutData(
              res,
              res.__('expertApprovalUpdated'),
              SUCCESS
            );
          } else {
            return Response.successResponseWithoutData(res, res.__('approvalAlreadyUpdated'), FAIL);
          }
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to get expert status list
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */

  getExpertStausList: async (req, res) => {
    try {
      if (req.userType !== USER_TYPE.SUPER_ADMIN && req.userType !== USER_TYPE.SUB_ADMIN) {
        return Response.errorResponseData(res, res.__('accessDenied'), RESPONSE_CODE.UNAUTHORIZED);
      }
      const reqParam = req.query;
      getExpertStausListValidation(reqParam, res, async (validate) => {
        if (validate) {
          let page = reqParam.page ? parseInt(reqParam.page) : PAGE;
          page = reqParam.page == 0 ? 1 : reqParam.page;
          const perPage = reqParam.perPage ? parseInt(reqParam.perPage) : PER_PAGE;
          const skip = (page - 1) * perPage || 0;
          const sortBy = reqParam.sortBy || SORT_BY;
          const sortOrder = reqParam.sortOrder ? parseInt(reqParam.sortOrder) : SORT_ORDER;
          console.log('🚀 ~ getExpertStausListValidation ~ sortOrder:', sortOrder);

          const aggregationPipeline = [
            {
              $match: {
                $or: [
                  { profile_status: EXPERT_PROFILE_STATUS.PENDING },
                  { profile_status: EXPERT_PROFILE_STATUS.INVITED },
                  { profile_status: EXPERT_PROFILE_STATUS.REJECTED }
                ]
              }
            },
            {
              $lookup: {
                from: 'users',
                localField: 'user_id',
                foreignField: '_id',
                as: 'userDetails'
              }
            },
            {
              $unwind: '$userDetails' // Flatten the user details
            },
            {
              $lookup: {
                from: 'interviewscheduals',
                localField: 'user_id',
                foreignField: 'user_id',
                as: 'scheduleDetails'
              }
            },
            {
              $unwind: {
                path: '$scheduleDetails',
                preserveNullAndEmptyArrays: true // Include experts with no schedule
              }
            },
            {
              $group: {
                _id: '$_id',
                createdAt: { $first: '$createdAt' },
                profile_status: { $first: '$profile_status' },
                userDetails: { $first: '$userDetails' },
                scheduleDetails: { $first: '$scheduleDetails' }
              }
            },
            {
              $project: {
                profile_status: 1,
                _id: 1,
                'userDetails.name': 1,
                'userDetails.email': 1,
                'userDetails.createdAt': 1,
                'scheduleDetails.schedual_date': 1,
                'scheduleDetails.time_slot': 1
              }
            },
            {
              $sort: {
                'userDetails.createdAt': sortOrder
              }
            },
            {
              $skip: skip
            },
            {
              $limit: perPage
            }
          ];
          const expertStatusList = await Expert.aggregate(aggregationPipeline);
          const totalCount = await Expert.countDocuments({
            $or: [
              { profile_status: EXPERT_PROFILE_STATUS.PENDING },
              { profile_status: EXPERT_PROFILE_STATUS.INVITED },
              { profile_status: EXPERT_PROFILE_STATUS.REJECTED }
            ]
          });
          return Response.successResponseData(
            res,
            expertStatusList,
            SUCCESS,
            res.__('fetchExpertStatusList'),
            { page, perPage, totalRecords: totalCount }
          );
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },
  // getExpertAccountInfo: async (req, res) => {
  //   try {
  //     if (req.userType !== USER_TYPE.SUPER_ADMIN && req.userType !== USER_TYPE.SUB_ADMIN) {
  //       return Response.errorResponseData(res, res.__('accessDenied'), RESPONSE_CODE.UNAUTHORIZED);
  //     }
  //     const reqParam = req.query;
  //     getExpertAccountInfotValidation(reqParam, res, async (validate) => {
  //       if (validate) {
  //         const expertAccountInfo = await Expert.findById(reqParam.expertId)
  //           .populate({
  //             path: 'user_id',
  //             select: '-password -otp -last_otp_sent -otp_sent_count -is_email_verified' // Exclude password field
  //           })
  //           .select('-createdAt -updatedAt'); // Exclude createdAt and updatedAt from Expert

  //         // console.log(expertAccountInfo);

  //         if (!expertAccountInfo) {
  //           return Response.errorResponseWithoutData(res, res.__('expertNotFound'));
  //         }

  //         // =========================================================

  //         // Fetch expert's attachments from the ExpertAttachment model
  //         const attachments = await ExpertAttachment.find({
  //           user_id: expert.user_id._id
  //         }).lean();

  //         // Define the mapping between docType and storage paths
  //         const docTypeToPathMap = {
  //           [ATTACHMENT_TYPES.CV]: EXPERT_MEDIA_PATH.CV_DOCS,
  //           [ATTACHMENT_TYPES.INSURANCE]: EXPERT_MEDIA_PATH.INSURANCE_DOCS,
  //           [ATTACHMENT_TYPES.CERTIFICATION]: EXPERT_MEDIA_PATH.CERTIFICATION_DOCS,
  //           [ATTACHMENT_TYPES.DBS]: EXPERT_MEDIA_PATH.DOCUMENTS,
  //           [ATTACHMENT_TYPES.ID]: EXPERT_MEDIA_PATH.DOCUMENTS
  //         };

  //         // Generate the list of document URLs using the storage paths
  //         const documents = attachments.map((attachment) => {
  //           // Get the correct storage path based on docType
  //           const storagePath = docTypeToPathMap[attachment.doc_type];

  //           // If docType doesn't match, return an error
  //           if (!storagePath) {
  //             return Response.errorResponseData(
  //               res,
  //               res.__('invalidDocType'),
  //               RESPONSE_CODE.BAD_REQUEST
  //             );
  //           }

  //           // Construct the file URL using the storage path and file name
  //           const fileUrl = `${CLOUDFRONT_URL}${storagePath}/${attachment.file_name}`;

  //           // Return the constructed file URL (or any other relevant data)
  //           return {
  //             docType: attachment.doc_type,
  //             url: fileUrl
  //           };
  //         });

  //         // =========================================================

  //         return Response.successResponseData(
  //           res,
  //           expertAccountInfo,
  //           res.__('fetchExpertAccountInfo'),
  //           SUCCESS
  //         );
  //       } else {
  //         return Response.internalServerErrorResponse(res);
  //       }
  //     });
  //   } catch (err) {
  //     console.log('🚀 ~ getExpertAccountInfo: ~ err:', err);

  //     return Response.internalServerErrorResponse(res);
  //   }
  // },

  getExpertAccountInfo: async (req, res) => {
    try {
      // Check for user permissions
      if (req.userType !== USER_TYPE.SUPER_ADMIN && req.userType !== USER_TYPE.SUB_ADMIN) {
        return Response.errorResponseData(res, res.__('accessDenied'), RESPONSE_CODE.UNAUTHORIZED);
      }
  
      const reqParam = req.query;
      getExpertAccountInfotValidation(reqParam, res, async (validate) => {
        if (validate) {
          // Fetch the expert's account info
          const expertAccountInfo = await Expert.findById(reqParam.expertId)
            .populate({
              path: 'user_id',
              select: '-password -otp -last_otp_sent -otp_sent_count -is_email_verified' // Exclude sensitive fields
            })
            .select('-createdAt -updatedAt').lean(); // Exclude timestamps
  
          if (!expertAccountInfo) {
            return Response.errorResponseWithoutData(res, res.__('expertNotFound'));
          }
          const user = await Users.findOne({ _id: expertAccountInfo.user_id._id });
          // Fetch expert's attachments
          const attachments = await ExpertAttachment.find({
            user_id: expertAccountInfo.user_id._id
          }).lean();
  
          // Define the mapping between docType and storage paths
          const docTypeToPathMap = {
            [ATTACHMENT_TYPES.CV]: EXPERT_MEDIA_PATH.CV_DOCS,
            [ATTACHMENT_TYPES.INSURANCE]: EXPERT_MEDIA_PATH.INSURANCE_DOCS,
            [ATTACHMENT_TYPES.CERTIFICATION]: EXPERT_MEDIA_PATH.CERTIFICATION_DOCS,
            [ATTACHMENT_TYPES.DBS]: EXPERT_MEDIA_PATH.DOCUMENTS,
            [ATTACHMENT_TYPES.ID]: EXPERT_MEDIA_PATH.DOCUMENTS
          };
  
          // Generate the list of document URLs
          const documents = attachments.map((attachment) => {
            const storagePath = docTypeToPathMap[attachment.doc_type];
            console.log("🚀 ~ documents ~ storagePath:", storagePath)
  
            // If docType doesn't match, return an error
            if (!storagePath) {
              return Response.errorResponseData(
                res,
                res.__('invalidDocType'),
                RESPONSE_CODE.BAD_REQUEST
              );
            }
  
            // Construct the file URL
            const fileUrl = `${CLOUDFRONT_URL}${storagePath}/${attachment.file_name}`;
  
            // Return the constructed file URL
            return {
              docType: attachment.doc_type,
              url: fileUrl
            };
          });

          if (expertAccountInfo.video_url) {
            // console.log('🚀 ~ getExpertProfile: ~ expert.video_url:', expertAccountInfo.video_url);
            expertAccountInfo.video_url = getFileUrl('video', expertAccountInfo.video_url);
            console.log("🚀 ~ getexpertAccountInfotValidation ~ expertAccountInfo.video_url:", expertAccountInfo.video_url)
          }
          
          // console.log("🚀 ~ getExpertAccountInfotValidation ~ expertAccountInfo:", expertAccountInfo) 
          if (user.user_profile) {
            const userProfileUrl = getFileUrl('profile', user.user_profile);
            console.log('🚀 ~ addEditExpertValidation ~ userProfileUrl:', userProfileUrl);

            // Set data.user_profile
            user.user_profile = userProfileUrl;
            // console.log('🚀 ~ addEditExpertValidation ~ data.user_profile:', data.user_profile);
          }
          console.log("🚀 ~ documents ~ documents:", documents)
    
          // Combine expert account info with documents if needed
          expertAccountInfo.documents = documents;
          const result = {
            ...expertAccountInfo,
            user_profile:user.user_profile,
            documents: documents
          };

          const userData= {...expertAccountInfo, user_profile:user.user_profile}
  
          return Response.successResponseData(
            res,
            userData,
            res.__('fetchExpertAccountInfo'),
            SUCCESS
          );
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      console.log('🚀 ~ getExpertAccountInfo: ~ err:', err);
      return Response.internalServerErrorResponse(res);
    }
  },
  
  expertProfileAction: async (req, res) => {
    try {
      if (req.userType !== USER_TYPE.SUPER_ADMIN && req.userType !== USER_TYPE.SUB_ADMIN) {
        return Response.errorResponseData(res, res.__('accessDenied'), RESPONSE_CODE.UNAUTHORIZED);
      }
      const reqParam = req.body;
      expertProfileActionValidation(reqParam, res, async (validate) => {
        if (validate) {
          const expertDetails = await Expert.findOne({ _id: reqParam.expertId }).populate({
            path: 'user_id',
            select: 'first_name email' // Specify the fields you want
          });
          if (!expertDetails) {
            return Response.errorResponseWithoutData(res, res.__('expertNotFound'));
          }

          // When the profile is rejected
          if (expertDetails && reqParam.profileAction === EXPERT_PROFILE_STATUS.APPROVED) {
            const interviewSchedule = await InterviewSchedual.findOne({
              user_id: expertDetails.user_id
            });
            if (!interviewSchedule) {
              return Response.errorResponseWithoutData(
                res,
                res.__('PleaseFirstInviteForInterview')
              );
            }
            // Check if the profile is already approved
            if (expertDetails.profile_status === EXPERT_PROFILE_STATUS.APPROVED) {
              return Response.successResponseWithoutData(
                res,
                res.__('ExpertProfileAlreadyApproved'), // Add a message for already approved status
                SUCCESS
              );
            }
            await Expert.updateOne(
              { _id: reqParam.expertId },
              { profile_status: EXPERT_PROFILE_STATUS.APPROVED }
            );
            // =======================================
            const loginUrl = `${process.env.FRONTEND_URL}`;
            const locals = {
              firstName: expertDetails.user_id.first_name,
              loginUrl: loginUrl
            };

            // send the email template to the expert
            await sendExpertAccountApprove(expertDetails.user_id.email, locals);
            // =======================================
            return Response.successResponseWithoutData(
              res,
              res.__('ExpertProfileApproved'),
              SUCCESS
            );
          }
          // When the profile is approved
          else if (expertDetails && reqParam.profileAction === EXPERT_PROFILE_STATUS.INVITED) {
            // Check if the profile is already Invited
            if (expertDetails.profile_status === EXPERT_PROFILE_STATUS.INVITED) {
              return Response.successResponseWithoutData(
                res,
                res.__('ExpertProfileAlreadyInvited'), // Add a message for already approved status
                SUCCESS
              );
            }
            await Expert.updateOne(
              { _id: reqParam.expertId },
              { profile_status: EXPERT_PROFILE_STATUS.INVITED }
            );
            const interviewSchedule = new InterviewSchedual({
              user_id: expertDetails.user_id,
              invited_by: req.authAdminId
            });
            interviewSchedule.save();
            const bookInterViewUrl = `${process.env.FRONTEND_URL}scheduleInterview`;
            const locals = {
              firstName: expertDetails.user_id.first_name,
              bookInterViewUrl: bookInterViewUrl
            };

            // send the email template to the expert
            await sendInviteForInterview(expertDetails.user_id.email, locals);

            return Response.successResponseWithoutData(
              res,
              res.__('ExpertProfileInvited'),
              SUCCESS
            );
          }
          //When the profile Invited
          else if (expertDetails && reqParam.profileAction === EXPERT_PROFILE_STATUS.REJECTED) {
            // Check if the profile is already Invited
            if (expertDetails.profile_status === EXPERT_PROFILE_STATUS.REJECTED) {
              return Response.successResponseWithoutData(
                res,
                res.__('ExpertProfileAlreadyRejected'), // Add a message for already approved status
                SUCCESS
              );
            }
            await Expert.updateOne(
              { _id: reqParam.expertId },
              {
                profile_status: EXPERT_PROFILE_STATUS.REJECTED
                // reject_reason: reqParam.rejectReason
              }
            );

            return Response.successResponseWithoutData(
              res,
              res.__('ExpertProfileRejected'),
              SUCCESS
            );
          }
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },
  // googleAuthRedirect: async (req, res) => {
  //   console.log(req.authAdminId, '<<<<Admin ID');
  //   const { code,experID } = req.query;
  //   console.log("🚀 ~ googleAuthRedirect: ~ req.query:", req.query)
  //   // Function to create Google Meet link
  //   async function createGoogleMeetLink(auth) {
  //     console.log("🚀 ~ createGoogleMeetLink ~ auth:", auth)
  //     const calendar = google.calendar({ version: 'v3', auth });

  //     const event = {
  //       summary: 'Google Meet Event',
  //       start: {
  //         dateTime: new Date().toISOString() // Start time
  //       },
  //       end: {
  //         dateTime: new Date(new Date().getTime() + 60 * 60 * 1000).toISOString() // End time (1 hour later)
  //       },
  //       conferenceData: {
  //         createRequest: {
  //           requestId: 'some-random-string', // Unique request ID
  //           conferenceSolutionKey: {
  //             type: 'hangoutsMeet'
  //           }
  //         }
  //       },
  //       attendees: [
  //         { email: "soft.devvv@gmail.com" },

  //       ],
  //       reminders: {
  //         useDefault: true
  //       }
  //     };

  //     try {
  //       const response = await calendar.events.insert({
  //         calendarId: 'primary',
  //         resource: event,
  //         conferenceDataVersion: 1
  //       });
  //       return response.data.hangoutLink; // Returns the Google Meet link
  //     } catch (error) {
  //       console.error('Error creating event:', error);
  //       throw error;
  //     }
  //   }

  //   if (!code) {
  //     return res.status(400).send('No code received');
  //   }

  //   try {
  //     const { tokens } = await oauth2Client.getToken(code);
  //     oauth2Client.setCredentials(tokens);

  //     // Call function to create Google Meet link
  //     const meetLink = await createGoogleMeetLink(oauth2Client);
  //     res.json({ meetLink });
  //   } catch (error) {
  //     console.error('Error during token exchange:', error);
  //     return Response.internalServerErrorResponse(res);
  //   }
  // },

  googleAuthRedirect: async (req, res) => {
    const { code } = req.query;
    const { state } = req.query;
    console.log('🚀 ~ googleAuthRedirect: ~ state:', state);

    // Parse the state to get scheduledDate, scheduledTime, and userId
    let scheduledDate, scheduledTime, userId;
    if (state) {
      const parsedState = JSON.parse(state);
      scheduledDate = new Date(parsedState.scheduledDate);
      scheduledTime = parsedState.scheduledTime;
      userId = parsedState.userId; // Fetch userId from the state
    }

    if (!code || !userId) {
      return res.status(400).send('No code or userId received');
    }
    const findInterview = await InterviewSchedual.findOne({ user_id: userId });
    console.log('🚀 ~ googleAuthRedirect: ~ findInterview:', findInterview);
    if (!findInterview) {
      return Response.errorResponseWithoutData(res, res.__('YouareNotInvitedForInterview'));
    }
    const findAdmin = await Users.findOne({ _id: findInterview.invited_by });
    try {
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

      async function createGoogleMeetLink(auth, scheduledDate, scheduledTime, userId) {
        const calendar = google.calendar({ version: 'v3', auth });

        // Create a new Date object for the scheduled time
        const [hours, minutes] = scheduledTime.split(':');
        scheduledDate.setHours(hours);
        scheduledDate.setMinutes(minutes);

        const event = {
          summary: 'Google Meet Event',
          start: {
            dateTime: scheduledDate.toISOString() // Start time
          },
          end: {
            dateTime: new Date(scheduledDate.getTime() + 30 * 60 * 1000).toISOString() // End time (30 minutes later)
          },
          conferenceData: {
            createRequest: {
              requestId: 'some-random-string',
              conferenceSolutionKey: {
                type: 'hangoutsMeet'
              }
            }
          },
          attendees: [
            { email: findAdmin?.email } // Add your attendees here
          ],
          reminders: {
            useDefault: true
          }
        };

        try {
          const response = await calendar.events.insert({
            calendarId: 'primary',
            resource: event,
            conferenceDataVersion: 1
          });
          await calendar.events.delete({
            calendarId: 'primary',
            eventId: response.data.id
          });
          return response.data.hangoutLink;
        } catch (error) {
          console.error('Error creating event:', error);
          throw error;
        }
      }

      // Call function to create Google Meet link with the scheduled date and time
      const meetLink = await createGoogleMeetLink(
        oauth2Client,
        scheduledDate,
        scheduledTime,
        userId
      );

      // Find the InterviewSchedule and set the invite_by field
      const interviewSchedule = await InterviewSchedual.findOne({ user_id: userId });
      if (interviewSchedule) {
        interviewSchedule.invited_by = userId; // Set invite_by to userId
        interviewSchedule.meetLink = meetLink; // Optionally set the meet link
        await interviewSchedule.save();
      }

      res.json({ meetLink });
    } catch (error) {
      console.error('Error during token exchange:', error);
      return Response.internalServerErrorResponse(res);
    }
  },

  generateAuthUrl: (req, res) => {
    try {
      const { scheduledDate, scheduledTime, userId } = req.query; // Extract parameters from the request
      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/calendar'],
        state: JSON.stringify({ scheduledDate, scheduledTime, userId }) // Include parameters in the state
      });
      res.json({ authUrl });
    } catch (error) {
      console.error('Error generating auth URL:', error);
      return Response.internalServerErrorResponse(res);
    }
  }
};
