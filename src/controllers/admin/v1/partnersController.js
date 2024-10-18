'use strict';

const { Company } = require('@models');
const { generatePassword } = require('@services/authServices');
const { sendPassword } = require('@services/Mailer');
const { COMPANY_MEDIA_PATH, INTRODUCED_COMPANY_PAYMENT_STATUS } = require('@services/Constant');
const { unixTimeStamp, makeRandomDigit, makeRandomString } = require('@services/Helper');
const { getUploadURL, removeOldImage, getUploadImage } = require('@services/s3Services');
const { PAGE, PER_PAGE, SORT_ORDER } = require('@services/Constant');
const {
  CLOUDFRONT_URL,
  SUCCESS,
  FAIL,
  RESPONSE_CODE,
  ACCOUNT_TYPE,
  USER_TYPE,
  STATUS,
  NOTIFICATION_TYPE,
  NOTIFICATION_ACTION,
  ACCOUNT_STATUS,
  SENT_TO_USER_TYPE,
  MAIL_SUBJECT,
  KLAVIYO_LIST,
  PARTNER_MEDIA_PATH,
  PASSWORD_LENGTH,
  SORT_BY
} = require('../../../services/Constant');
const Response = require('@services/Response');
const { Users, CompanyUsers, Mood } = require('@models');
const ProfessionalMood = require('../../../models/ProfessionalMood');
const Notification = require('../../../models/Notifications');
const { sendNotification } = require('@services/Notify');
const { newCompanyNotify } = require('../../../services/adminServices/companyStatusNotify');
const { sendB2BPassword, sendPartnerPassword } = require('../../../services/Mailer');
const {
  addPartnerValidation,
  partnerListValidation,
  deletePartnerValidation,
  updatePaymentInfoValidation
} = require('../../../services/adminValidations/partnerValidations');
const { DeviceTokens, IntroduceCompany } = require('../../../models');
const { toObjectId, addEditKlaviyoUser } = require('../../../services/Helper');

module.exports = {
  /**
   * @description This function is used to add edit partner
   * @param {*} req
   * @param {*} res
   * @return {*}
   */

  addEditPartner: (req, res) => {
    try {
      if (req.userType !== USER_TYPE.SUPER_ADMIN) {
        if (req.userType === USER_TYPE.SUB_ADMIN) {
          return Response.errorResponseData(
            res,
            res.__('permissionDenied'),
            RESPONSE_CODE.BAD_REQUEST
          );
        }
        return Response.errorResponseData(res, res.__('accessDenied'), RESPONSE_CODE.UNAUTHORIZED);
      }
      const reqParam = req.body;
      addPartnerValidation(reqParam, res, async (validate) => {
        if (validate) {
          const reqEmail = reqParam.email.toLowerCase().trim();
          await Users.updateOne(
            { email: reqEmail, user_type: { $ne: USER_TYPE.PARTNER } },
            {
              $set: {
                deletedAt: new Date(),
                status: ACCOUNT_STATUS.DELETED
              }
            }
          );

          let findCondition = {
            email: reqEmail,
            status: {
              $ne: ACCOUNT_STATUS.DELETED
            },
            user_type: {
              $eq: USER_TYPE.PARTNER
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
          if (user) {
            return Response.successResponseWithoutData(res, res.__('partnerAleadyExists'), FAIL);
          } else {
            let updateData = {
              name: reqParam.name?.trim(),
              email: reqEmail,
              mobile: reqParam.mobile,
              commission: reqParam.commission,
              account_type: ACCOUNT_TYPE.PAID,
              job_role: reqParam.jobRole,
              user_type: USER_TYPE.PARTNER,
              status: reqParam.accountStatus,
              is_email_verified: true
            };
            let userProfileUrl;
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
                    PARTNER_MEDIA_PATH.PARTNER_PROFILE,
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
                  PARTNER_MEDIA_PATH.PARTNER_PROFILE
                );
                updateData = {
                  ...updateData,
                  user_profile: profileImage
                };
              }
              const partnerData = await Users.findByIdAndUpdate(filterData, updateData, {
                new: true
              }).select('_id');
              if (partnerData) {
                return Response.successResponseWithoutData(
                  res,
                  res.__('partnerDataUpdated'),
                  SUCCESS,
                  userProfileUrl || null
                );
              } else {
                return Response.successResponseWithoutData(res, res.__('invalidPartnerId'), FAIL);
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
                  PARTNER_MEDIA_PATH.PARTNER_PROFILE
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

              await Users.create(updateData);

              const locals = {
                name: reqParam.name?.trim(),
                email: reqParam.email,
                password: randomPassword,
                subject: 'Welcome to Shoorah'
              };
              await sendPartnerPassword(reqEmail, MAIL_SUBJECT.B2B_WELCOME, locals);

              return Response.successResponseWithoutData(
                res,
                res.__('partnerAddedSuccessfull'),
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
      console.error(err);
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to get partners
   * @param {*} req
   * @param {*} res
   * @return {*}
   */

  partnersList: (req, res) => {
    try {
      const reqParam = req.query;
      partnerListValidation(reqParam, res, async (validate) => {
        if (validate) {
          const page = reqParam.page ? parseInt(reqParam.page) : PAGE;
          const perPage = reqParam.perPage ? parseInt(reqParam.perPage) : PER_PAGE;
          const skip = (page - 1) * perPage || 0;
          const sortBy = reqParam.sortBy || SORT_BY;
          const sortOrder = reqParam.sortOrder ? parseInt(reqParam.sortOrder) : SORT_ORDER;
          const filterData = {
            _id: { $ne: toObjectId(req.authAdminId) },
            status: {
              $ne: ACCOUNT_STATUS.DELETED
            },
            user_type: {
              $eq: USER_TYPE.PARTNER
            },
            ...(reqParam.id && { _id: toObjectId(reqParam.id) }),
            ...(reqParam.searchKey && {
              $or: [
                { name: { $regex: '.*' + reqParam.searchKey + '.*', $options: 'i' } },
                { email: { $regex: '.*' + reqParam.searchKey + '.*', $options: 'i' } }
              ]
            }),
            ...(reqParam.accountStatus && { status: parseInt(reqParam.accountStatus) })
          };
          const aggregationPipeline = [
            {
              $match: filterData
            },
            {
              $lookup: {
                from: 'introduce_companies',
                localField: '_id',
                foreignField: 'introduce_by',
                as: 'introducedCompanies'
              }
            },
            {
              $sort: {
                [sortBy]: sortOrder
              }
            },
            {
              $skip: skip
            },
            {
              $limit: perPage
            },
            {
              $project: {
                id: '$_id',
                name: '$name',
                profile: {
                  $concat: [
                    CLOUDFRONT_URL,
                    PARTNER_MEDIA_PATH.PARTNER_PROFILE,
                    '/',
                    '$user_profile'
                  ]
                },
                email: '$email',
                userType: '$user_type',
                accountStatus: '$status',
                commission: 1,
                mobile: 1,
                jobRole: '$job_role',
                createdAt: 1,
                status: 1,
                _id: 0,
                b2bIntroduced: { $size: '$introducedCompanies' },
                introducedCompanies: {
                  $cond: {
                    if: { $in: [reqParam.id, [null, undefined, '']] },
                    then: '$$REMOVE',
                    else: '$introducedCompanies'
                  }
                }
              }
            }
          ];
          const totalRecords = await Users.countDocuments(filterData);
          const partnersData = await Users.aggregate(aggregationPipeline);

          if (reqParam.id) {
            let tempArr = [];

            for (let company of partnersData[0]?.introducedCompanies) {
              if (company.deletedAt !== null) continue;

              let companyDetails = {
                id: company._id,
                name: company.company_name,
                createdAt: company.createdAt,
                paymentStatus: company.payment_status,
                paymentAmount: company.payment_amount,
                paymentDate: company.payment_date
              };

              if (company.payment_receipt) {
                companyDetails.paymentReceipt = `${CLOUDFRONT_URL}${PARTNER_MEDIA_PATH.PAYMENT_RECEIPT}/${company.payment_receipt}`;
              }

              tempArr.push(companyDetails);
            }

            partnersData[0].introducedCompanies = tempArr;
          }

          return Response.successResponseData(
            res,
            partnersData,
            SUCCESS,
            res.__('partnerListSuccess'),
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
   * @description This function is used to delete partner
   * @param {*} req
   * @param {*} res
   * @return {*}
   */

  deletePartner: (req, res) => {
    try {
      if (req.userType !== USER_TYPE.SUPER_ADMIN) {
        if (req.userType === USER_TYPE.SUB_ADMIN) {
          return Response.errorResponseData(
            res,
            res.__('permissionDenied'),
            RESPONSE_CODE.BAD_REQUEST
          );
        }
        return Response.errorResponseData(res, res.__('accessDenied'), RESPONSE_CODE.UNAUTHORIZED);
      }
      const reqParam = req.query;
      deletePartnerValidation(reqParam, res, async (validate) => {
        if (validate) {
          await Users.findByIdAndUpdate(reqParam.userId, {
            status: ACCOUNT_STATUS.DELETED,
            deletedAt: new Date()
          });
          await DeviceTokens.deleteMany({ user_id: reqParam.userId });
          return Response.successResponseWithoutData(res, res.__('partnerDeleteSuccess'), SUCCESS);
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  introduceCompaniesList: (req, res) => {
    try {
      const reqParam = req.query;
      partnerListValidation(reqParam, res, async (validate) => {
        if (validate) {
          const page = reqParam.page ? parseInt(reqParam.page) : PAGE;
          const perPage = reqParam.perPage ? parseInt(reqParam.perPage) : PER_PAGE;
          const skip = (page - 1) * perPage || 0;
          const sortBy = reqParam.sortBy || SORT_BY;
          const sortOrder = SORT_ORDER;
          const filterData = {
            ...(reqParam.id && { _id: toObjectId(reqParam.id) }),
            deletedAt: null,
            ...(reqParam.searchKey && {
              $or: [
                { name: { $regex: '.*' + reqParam.searchKey + '.*', $options: 'i' } },
                { email: { $regex: '.*' + reqParam.searchKey + '.*', $options: 'i' } }
              ]
            })
          };
          const aggregationPipeline = [
            {
              $match: filterData
            },
            {
              $lookup: {
                from: 'users',
                localField: 'introduce_by', // Assuming 'introduceBy' is the ObjectId of the partner in Users collection
                foreignField: '_id',
                as: 'partner'
              }
            },
            {
              $sort: {
                [sortBy]: sortOrder
              }
            },
            {
              $skip: skip
            },
            {
              $limit: perPage
            },
            {
              $project: {
                id: '$_id',
                name: '$company_name',
                profile: {
                  $concat: [
                    CLOUDFRONT_URL,
                    COMPANY_MEDIA_PATH.COMPANY_PROFILE,
                    '/',
                    '$company_logo'
                  ]
                },
                contactPerson: '$contact_person',
                companyType: '$company_type',
                companyAddress: '$company_address',
                email: '$company_email',
                mobile: '$contact_number',
                createdAt: 1,
                partner: 1,
                _id: 0
              }
            }
          ];
          const totalRecords = await IntroduceCompany.countDocuments(filterData);
          const introduceCompanies = await IntroduceCompany.aggregate(aggregationPipeline);

          introduceCompanies.map((i) => {
            i.partnerName = i.partner[0]?.name;
            i.partnerEmail = i.partner[0]?.email;
            i.partnerCommission = i.partner[0]?.commission;
            i.partnerId = i.partner[0]?._id;

            delete i.partner;
          });

          return Response.successResponseData(
            res,
            introduceCompanies,
            SUCCESS,
            res.__('introduceCompaniesListSuccess'),
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

  addIntroduceCompany: async (req, res) => {
    try {
      if (req.userType !== USER_TYPE.SUPER_ADMIN) {
        if (req.userType === USER_TYPE.SUB_ADMIN) {
          return Response.errorResponseData(
            res,
            res.__('permissionDenied'),
            RESPONSE_CODE.BAD_REQUEST
          );
        }
        return Response.errorResponseData(res, res.__('accessDenied'), RESPONSE_CODE.UNAUTHORIZED);
      }

      try {
        if (req.query.type === 'update-payment-info') {
          const reqParam = req.body;
          const imageFile = Array.isArray(req.files) && req.files.length ? req.files[0] : null;

          updatePaymentInfoValidation(reqParam, res, async (validate) => {
            try {
              if (validate) {
                const introduceCompany = await IntroduceCompany.findById(
                  reqParam.introducedCompanyId
                );

                if (!introduceCompany) {
                  return Response.errorResponseData(
                    res,
                    'introduceCompanyNotFound',
                    RESPONSE_CODE.BAD_REQUEST
                  );
                }
                if (introduceCompany.payment_status === INTRODUCED_COMPANY_PAYMENT_STATUS.PAID) {
                  return Response.errorResponseData(
                    res,
                    'paymentInfoAlreadyPresent',
                    RESPONSE_CODE.BAD_REQUEST
                  );
                }
                if (!imageFile) {
                  return Response.errorResponseData(
                    res,
                    'paymentReceiptMissing',
                    RESPONSE_CODE.BAD_REQUEST
                  );
                }

                introduceCompany.payment_status = INTRODUCED_COMPANY_PAYMENT_STATUS.PAID;
                introduceCompany.payment_amount = reqParam.paymentAmount;
                introduceCompany.payment_comment = reqParam.paymentComment || '';

                const image = `${unixTimeStamp(new Date())}-${makeRandomDigit(4)}.${imageFile.mimetype.split('/')[1]}`;
                const paymentReceipt = await getUploadImage(
                  imageFile.mimetype,
                  image,
                  PARTNER_MEDIA_PATH.PAYMENT_RECEIPT,
                  imageFile.buffer
                );
                introduceCompany.payment_receipt = image;
                introduceCompany.payment_date = new Date();

                await introduceCompany.save();
                return Response.successResponseWithoutData(
                  res,
                  'paymentInfoUpdated',
                  SUCCESS,
                  paymentReceipt
                );
              }
            } catch (error) {
              return Response.internalServerErrorResponse(res);
            }
          });
        } else {
          let {
            company_logo,
            company_name,
            company_address,
            company_email,
            contact_person,
            contact_number,
            no_of_seat_bought,
            seat_price,
            seat_active,
            contract_start_date,
            contract_end_date,
            contract_progress,
            b2b_interest_via,
            terms_agreed,
            contract_sent,
            contract_signed,
            invoice_raised,
            payment_complete,
            restrict_company,
            currency,
            company_type,
            other_admin_emails,
            shuru_usage,
            introduce_by
          } = req.body;

          company_name = company_name?.toLowerCase();
          company_address = company_address?.toLowerCase();
          company_email = company_email?.toLowerCase();
          contact_person = contact_person?.toLowerCase();

          let password = makeRandomDigit(2) + makeRandomString(5) + makeRandomDigit(4);

          const hashPassword = await generatePassword(password);

          let uploadURL = null;

          if (company_logo) {
            const imageExtension = company_logo.split('/')[1];
            const companyImage = `${unixTimeStamp(new Date())}-${makeRandomDigit(
              4
            )}.${imageExtension}`;

            let uploaded = await getUploadURL(
              company_logo,
              companyImage,
              COMPANY_MEDIA_PATH.COMPANY_PROFILE
            );

            uploadURL = uploaded?.uploadURL;
            company_logo = uploaded?.filename;
          }

          let existing = await Company.findOne({ company_email });
          if (existing) {
            return Response.errorResponseData(
              res,
              'Same email used by other company',
              RESPONSE_CODE.BAD_REQUEST
            );
          }

          let company_new = await Company.create({
            company_logo,
            company_name,
            company_address,
            company_email,
            contact_person,
            contact_number: contact_number == '' ? null : contact_number,
            no_of_seat_bought,
            seat_price,
            seat_active,
            contract_start_date,
            contract_end_date,
            contract_progress,
            b2b_interest_via,
            terms_agreed,
            contract_sent,
            contract_signed,
            invoice_raised,
            payment_complete,
            restrict_company,
            currency,
            company_type,
            introduce_by,
            shuru_usage,
            transaction_id: payment_complete ? Math.floor(Math.random() * 123456789) : null,
            plan: payment_complete ? 'Monthly' : null
          });

          let newComp = await Company.findOne({ company_email });
          if (!newComp) {
            return Response.errorResponseData(
              res,
              'Error in New Company Creation',
              RESPONSE_CODE.NOT_FOUND
            );
          }

          let user = await Users.create({
            email: newComp.company_email,
            dob: null,
            account_type: ACCOUNT_TYPE.PAID,
            name: newComp.contact_person,
            password: hashPassword,
            user_type: USER_TYPE.COMPANY_ADMIN,
            user_profile: newComp.company_logo,
            status: STATUS.ACTIVE,
            is_email_verified: true,
            login_platform: 0,
            company_id: newComp._id
          });

          if (other_admin_emails.length > 0) {
            for (const email of other_admin_emails) {
              let alreadyUser = await Users.findOne({ email: email });
              if (!alreadyUser) {
                let password = makeRandomDigit(2) + makeRandomString(5) + makeRandomDigit(4);
                const hashPassword = await generatePassword(password);
                const atIndex = email.indexOf('@');
                const name = email.slice(0, atIndex);

                await Users.create({
                  email: email,
                  dob: null,
                  account_type: ACCOUNT_TYPE.PAID,
                  password: hashPassword,
                  name: name,
                  user_type: USER_TYPE.COMPANY_ADMIN,
                  status: STATUS.ACTIVE,
                  is_email_verified: true,
                  login_platform: 0,
                  company_id: newComp._id
                });

                let profile = {
                  email: email,
                  userType: USER_TYPE.COMPANY_ADMIN,
                  firstName: name
                };

                await addEditKlaviyoUser(profile);

                const locals = {
                  name: newComp.company_name,
                  email: email,
                  password: password,
                  subject: 'Welcome to Shoorah'
                };
                await sendB2BPassword(email, MAIL_SUBJECT.B2B_WELCOME, locals);
              }

              let profile = {
                email: alreadyUser.email,
                userType: USER_TYPE.COMPANY_ADMIN,
                firstName: alreadyUser.name
              };

              await addEditKlaviyoUser(profile);
            }
          }

          let profile = {
            email: newComp.company_email,
            userType: USER_TYPE.COMPANY_ADMIN,
            firstName: newComp.contact_person
          };

          await addEditKlaviyoUser(profile);

          let filterCondition = {
            company_email: newComp?.company_email
          };

          await IntroduceCompany.updateOne(filterCondition, {
            $set: {
              deletedAt: new Date()
            }
          });

          const locals = {
            name: newComp.company_name,
            email: newComp.company_email,
            password: password,
            subject: 'Welcome to Shoorah'
          };
          await sendB2BPassword(newComp.company_email, MAIL_SUBJECT.B2B_WELCOME, locals);
          return Response.successResponseData(res, newComp, SUCCESS, res.__('addCompanySuccess'), {
            uploadURL
          });
        }
      } catch (error) {
        console.error(error);
        if (error.code == 11000) {
          if (error.message.includes('company_name_1')) {
            return Response.errorResponseWithoutData(
              res,
              'Company Name is already registered !',
              RESPONSE_CODE.BAD_REQUEST
            );
          } else if (error.message.includes('company_email_1')) {
            return Response.errorResponseWithoutData(
              res,
              'Company Email is already registered !',
              RESPONSE_CODE.BAD_REQUEST
            );
          } else {
            return Response.errorResponseWithoutData(res, error.message, RESPONSE_CODE.BAD_REQUEST);
          }
        }
        return Response.internalServerErrorResponse(res);
      }
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  }
};
