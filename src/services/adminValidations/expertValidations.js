'use strict';

const Joi = require('joi');
const { validationMessageKey } = require('@services/Helper');
const { validationErrorResponseData } = require('@services/Response');

const {
  USER_TYPE,
  ACCOUNT_STATUS,
  IMAGE_MIMETYPE,
  DISPOSABLE_EMAIL_DOMAINS,
  NODE_ENVIRONMENT,
  INTERVIEW_STATUS,
  EXPERT_PROFILE_STATUS
} = require('@services/Constant');
const {
  GENDER,
  ATTACHMENT_TYPES,
  ONFIDO_DOCUMENT_TYPE,
  DBS_VERIFICATION_STATUS
} = require('../Constant');
const { requiredIdSchema, idSchema } = require('@root/src/helpers/validationUtils');
const email = Joi.string()
  .max(50)
  .required()
  .email()
  .trim()
  .pattern(/^[^+]+$/)
  .custom((value, helper) => {
    if (
      DISPOSABLE_EMAIL_DOMAINS.includes(value.split('@')[1]) &&
      process.env.NODE_ENV === NODE_ENVIRONMENT.PRODUCTION
    ) {
      return validationErrorResponseData(
        helper,
        helper.__(validationMessageKey('addEditExpertValidation', helper))
      );
    } else {
      return true;
    }
  });
const focusIds = Joi.array()
  .items(Joi.string().regex(/^[0-9a-fA-F]{24}$/))
  .optional();

const id = Joi.string()
  .required()
  .regex(/^[0-9a-fA-F]{24}$/);

module.exports = {
  email,
  id,
  addEditExpertValidation: (req, res, callback) => {
    const schema = Joi.object({
      userId: Joi.allow(null, '', ''),
      name: Joi.string().max(50).optional().trim(),
      address: Joi.string().max(100).optional().allow('', null),
      firstName: Joi.string().max(30).required().allow('', null),
      lastName: Joi.string().max(30).required().allow('', null),
      jobRole: Joi.string().max(100).optional().allow('', null),
      country: Joi.string().optional().allow('', null),
      dob: Joi.string().required().allow('', null),
      title: Joi.string().required().allow('', null),
      phone: Joi.number().optional().allow('', null),
      medicalNo: Joi.number().optional().allow('', null),
      education: Joi.string().optional().allow('', null),
      placeOfPractice: Joi.string().optional().allow('', null),
      yearOfPractice: Joi.string().optional().allow('', null),
      isOther: Joi.boolean().optional(),
      // specialisationId: Joi.when('isOther', {
      //   is: true,
      //   then: Joi.forbidden(),
      //   otherwise: requiredIdSchema
      // }),
      // specialisationData: Joi.object({
      //   categoryId: idSchema.required(),
      //   name: Joi.string().trim().required()
      // }).when('isOther', {
      //   is: true,
      //   then: Joi.required(),
      //   otherwise: Joi.forbidden()
      // }),
      linkedlnUrl: Joi.string().optional().allow('', null),
      bio: Joi.string().optional().allow('', null),
      expertFocusIds: focusIds,
      spokenLanguages: Joi.array().min(1).items(Joi.string()).optional(),
      profit: Joi.string().optional().allow('', null),
      email: Joi.string().optional().allow('', null),
      price: Joi.number().optional(),
      shoorahRate: Joi.number().optional(), 
      dbsCheck: Joi.boolean().optional(),
      identity: Joi.boolean().optional(),
      rating: Joi.number().optional(),
      ethnicity: Joi.string().required(),
      location: Joi.string().required(),
      userType: Joi.number().optional().valid(USER_TYPE.EXPERT),
      accountStatus: Joi.number().optional().valid(ACCOUNT_STATUS.ACTIVE, ACCOUNT_STATUS.INACTIVE),
      gender: Joi.array()
        .items(
          Joi.number().valid(
            GENDER.NOT_PREFERRED,
            GENDER.MALE,
            GENDER.FEMALE,
            GENDER.NON_BINARY,
            GENDER.INTERSEX,
            GENDER.TRANSGENDER
          )
        )
        .allow(null, ''),
      profile: Joi.string()
        .optional()
        .allow(null, ''),
        file: Joi.string().optional().allow(null, ''),
      status: Joi.number().integer().valid(0, 1, 2).optional(),
      reject_reason: Joi.string().when('status', {
        is: 2,
        then: Joi.required(),
        otherwise: Joi.forbidden()
      })
    });
    const { error } = schema.validate(req);
    console.log(error, '<<error');
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('addEditExpertValidation', error))
      );
    }
    return callback(true);
  },
  editExpertValidation: (req, res, callback) => {
    const schema = Joi.object({
      industryExperience: Joi.array().items(Joi.string()).allow('', null),
      highestCertification: Joi.array().items(Joi.string()).allow('', null),
      qualification: Joi.string().required().allow('', null),
      language: Joi.string().required().allow('', null),
      currentJobTitle: Joi.string().required().allow('', null),
      placeOfEducation: Joi.string().required().allow('', null),
      yearOfExperience: Joi.string().required().allow('', null),
      specialities: Joi.string().required().allow('', null),
      availability: Joi.string().required().allow('', null),
      pricePerHour: Joi.string().optional().allow('', null),
      medicalNo: Joi.string().required().allow('', null),
      locationOfPractice: Joi.string().required().allow('', null),
      professionalSector: Joi.array().items(Joi.string()).allow('', null)
    });

    const { error } = schema.validate(req);
    console.log(error, '<<error');
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('addEditExpertValidation', error))
      );
    }
    return callback(true);
  },
  expertsListValidation: (req, res, callback) => {
    const schema = Joi.object({
      searchKey: Joi.string()
        .optional()
        .allow(null, '')
        .regex(/^[^*$\\]+$/),
      page: Joi.number().optional().allow('', null),
      perPage: Joi.number().optional().allow(null, ''),
      sortBy: Joi.string().optional().allow(null, ''),
      sortOrder: Joi.number().valid(1, -1).optional().allow(null, ''),
      id: id.optional().allow(null, ''),
      forApprove: Joi.boolean().optional()
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('expertsListValidation', error))
      );
    }
    return callback(true);
  },
  getAdminExpertAttachments: (req, res, callback) => {
    const schema = Joi.object({
      userId: id.allow(null, '', ''),
      docType: Joi.string()
        .optional()
        .valid(ATTACHMENT_TYPES.CV, ATTACHMENT_TYPES.INSURANCE, ATTACHMENT_TYPES.CERTIFICATION)
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('getExpertAttachmentValidation', error))
      );
    }
    return callback(true);
  },
  deleteExpertValidation: (req, res, callback) => {
    const schema = Joi.object({
      userId: id
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('deleteExpertValidation', error))
      );
    }
    return callback(true);
  },
  expertNameListValidation: (req, res, callback) => {
    const schema = Joi.object({
      searchKey: Joi.string()
        .optional()
        .allow(null, '')
        .regex(/^[^*$\\]+$/)
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('expertNameListValidation', error))
      );
    }
    return callback(true);
  },
  addEditAttachments: (req, res, callback) => {
    const schema = Joi.object({
      docId: Joi.string().allow(null, ''),
      bio: Joi.string().allow(null, ''),
      reasonToJoin: Joi.string().allow(null, ''),
      isDocDeleted: Joi.boolean().optional(),
      docType: Joi.string()
        .required()
        .valid(
          ATTACHMENT_TYPES.CV,
          ATTACHMENT_TYPES.INSURANCE,
          ATTACHMENT_TYPES.CERTIFICATION,
          ATTACHMENT_TYPES.DBS
        ),
      fileTitle: Joi.string().optional(),
      file: Joi.string().when('docId', {
        is: Joi.equal(null, ''),
        then: Joi.optional(),
        otherwise: Joi.optional().allow(null, '')
      }),
      onfidoDocumentType: Joi.string()
        .optional() // By default, optional
        .valid(
          ONFIDO_DOCUMENT_TYPE.PASSPORT,
          ONFIDO_DOCUMENT_TYPE.DRIVING_LICENCE,
          ONFIDO_DOCUMENT_TYPE.ASYLUM_REGISTRATION_CARD,
          ONFIDO_DOCUMENT_TYPE.HEALTH_INSURANCE_CARD,
          ONFIDO_DOCUMENT_TYPE.PROOF_OF_CITIZENSHIP,
          ONFIDO_DOCUMENT_TYPE.RESIDENCE_PERMIT,
          ONFIDO_DOCUMENT_TYPE.VISA
        )
        .when('docType', {
          // Conditional validation
          is: ATTACHMENT_TYPES.ID, // When docType is ID
          then: Joi.required(), // onfidoDocumentType is required
          otherwise: Joi.optional() // Otherwise, it remains optional
        })
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('addEditAttachmentValidation', error))
      );
    }
    return callback(true);
  },
  getExpertAttachments: (req, res, callback) => {
    const schema = Joi.object({
      docType: Joi.string()
        .optional()
        .valid(ATTACHMENT_TYPES.CV, ATTACHMENT_TYPES.INSURANCE, ATTACHMENT_TYPES.CERTIFICATION)
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('getExpertAttachmentValidation', error))
      );
    }
    return callback(true);
  },
  deleteAttachmentValidation: (req, res, callback) => {
    const schema = Joi.object({
      docId: id.allow(null, '')
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('deleteAttachmentValidation', error))
      );
    }
    return callback(true);
  },
  addDocVerifyValidation: (req, res, callback) => {
    const schema = Joi.object({
      docType: Joi.string().required().valid(ATTACHMENT_TYPES.DBS, ATTACHMENT_TYPES.ID),
      fileTitle: Joi.string().optional(),
      file: Joi.string().required()
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('addDocVerifyValidation', error))
      );
    }
    return callback(true);
  },
  getExpertApprovalStats: (req, res, callback) => {
    const schema = Joi.object({
      docType: Joi.string().required().valid(ATTACHMENT_TYPES.DBS, ATTACHMENT_TYPES.ID)
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('getExpertApprovalValidation', error))
      );
    }
    return callback(true);
  },
  expertsApprovalsValidation: (req, res, callback) => {
    const schema = Joi.object({
      searchKey: Joi.string()
        .optional()
        .allow(null, '')
        .regex(/^[^*$\\]+$/),
      page: Joi.number().optional().allow('', null),
      perPage: Joi.number().optional().allow(null, ''),
      sortBy: Joi.string().optional().allow(null, ''),
      docType: Joi.string().optional().valid(ATTACHMENT_TYPES.DBS, ATTACHMENT_TYPES.ID),
      dbsVerified: Joi.boolean().optional(),
      verificationStatus: Joi.string()
        .optional()
        .valid(
          DBS_VERIFICATION_STATUS.PENDING,
          DBS_VERIFICATION_STATUS.APPROVE,
          DBS_VERIFICATION_STATUS.REJECT
        ),
      sortOrder: Joi.number().valid(1, -1).optional().allow(null, '')
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('expertsApprovalsValidation', error))
      );
    }
    return callback(true);
  },
  getApprovalValidation: (req, res, callback) => {
    const schema = Joi.object({
      approvalId: id
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('getApprovalValidation', error))
      );
    }
    return callback(true);
  },
  approvalUpdateValidation: (req, res, callback) => {
    const schema = Joi.object({
      approvalId: id,
      dbsVerified: Joi.boolean().optional(),
      verificationStatus: Joi.string()
        .required()
        .valid(
          DBS_VERIFICATION_STATUS.PENDING,
          DBS_VERIFICATION_STATUS.APPROVE,
          DBS_VERIFICATION_STATUS.REJECT
        )
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('expertsApprovalsValidation', error))
      );
    }
    return callback(true);
  },
  expertAvailabilityValidation: (req, res, callback) => {
    const schema = Joi.object({
      availabilityId: id.allow(null, ''),
      date: Joi.string().required(),
      slots: Joi.array().required()
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('expertAvailabilityValidation', error))
      );
    }
    return callback(true);
  },
  getExpertAvailabilityValidation: (req, res, callback) => {
    const schema = Joi.object({});
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('getExpertAvailabilityValidation', error))
      );
    }
    return callback(true);
  },
  approveOrRejectExpertValidation: (req, res, callback) => {
    const schema = Joi.object({
      expertId: Joi.string()
        .required()
        .regex(/^[a-fA-F0-9]{24}$/), // MongoDB ObjectId validation
      status: Joi.number().valid(1, 2).required(), // 1 for approved, 2 for rejected
      rejectReason: Joi.string().optional().allow('') // Optional reject reason
    });

    const { error } = schema.validate(req.body);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('approveOrRejectExpertValidation', error))
      );
    }
    return callback(true);
  },
  createInterviewSchedualValidation: (req, res, callback) => {
    const schema = Joi.object({
      userId: Joi.string()
        .required()
        .regex(/^[a-fA-F0-9]{24}$/), // MongoDB ObjectId validation
      schedualDate: Joi.date().required(),
      meetLink: Joi.string().optional().allow(''),
      timeSlot: Joi.string().required().allow('')
    });

    const { error } = schema.validate(req.body);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('interviewSchedualValidation', error))
      );
    }
    return callback(true);
  },
  getInterviewSchedualValidation: (req, res, callback) => {
    const schema = Joi.object({
      // schedule time filter
      search: Joi.string()
        .pattern(/^\d{4}-\d{2}-\d{2}$/)
        .optional()
        .allow(null, ''), // Regex for DD-MM-YYYY
      userId: Joi.string().optional().allow(null, '')
    });

    const { error } = schema.validate(req.query);
    console.log('🚀 ~ error:', error);

    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('getInterviewSchedualValidation', error))
      );
    }
    return callback(true);
  },
  getExpertStausListValidation: (req, res, callback) => {
    const schema = Joi.object({
      page: Joi.number().optional().allow('', null),
      perPage: Joi.number().optional().allow(null, ''),
      sortBy: Joi.string().optional().allow(null, ''),
      sortOrder: Joi.number().valid(1, -1).optional().allow(null, '')
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('getExpertStausListValidation', error))
      );
    }
    return callback(true);
  },
  expertProfileActionValidation: (req, res, callback) => {
    const schema = Joi.object({
      profileAction: Joi.string()
        .required()
        .valid(
          EXPERT_PROFILE_STATUS.APPROVED,
          EXPERT_PROFILE_STATUS.PENDING,
          EXPERT_PROFILE_STATUS.REJECTED,
          EXPERT_PROFILE_STATUS.INVITED
        ),
      expertId: Joi.string()
        .required()
        .regex(/^[a-fA-F0-9]{24}$/),
      // rejectReason: Joi.string().optional().allow(''),
      // rejectReason: Joi.string()
      // .optional()
      // .allow('')
      // .when(Joi.ref('profileAction'), {
      //   is: EXPERT_PROFILE_STATUS.REJECTED,
      //   then: Joi.string().required(),
      //   otherwise: Joi.string().optional().allow('')
      // })

    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('getExpertStausListValidation', error))
      );
    }
    return callback(true);
  },
  getExpertAccountInfotValidation: (req, res, callback) => {
    const schema = Joi.object({
      page: Joi.number().optional().allow('', null),
      perPage: Joi.number().optional().allow(null, ''),
      sortBy: Joi.string().optional().allow(null, ''),
      sortOrder: Joi.number().valid(1, -1).optional().allow(null, ''),
      expertId: Joi.string().optional().allow(null, '')
    });
    const { error } = schema.validate(req);
    if (error) {
      return validationErrorResponseData(
        res,
        res.__(validationMessageKey('getExpertStausListValidation', error))
      );
    }
    return callback(true);
  },
};
