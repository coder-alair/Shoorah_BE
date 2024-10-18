'use strict';

const { Survey, SubmitSurvey, ContentApproval, Users } = require('../../../models');

const {
  CLOUDFRONT_URL,
  SUCCESS,
  FAIL,
  RESPONSE_CODE,
  PAGE,
  PER_PAGE,
  ACCOUNT_TYPE,
  CONTENT_TYPE,
  CONTENT_STATUS,
  USER_TYPE,
  STATUS,
  NOTIFICATION_TYPE,
  NOTIFICATION_ACTION,
  ACCOUNT_STATUS,
  SENT_TO_USER_TYPE
} = require('../../../services/Constant');
const Response = require('@services/Response');
const Joi = require('joi');
const { validationMessageKey } = require('@services/Helper');
const {
  newContentUploadedNotification
} = require('@services/adminServices/contentApprovalServices');

const mongoose = require('mongoose');
const { uploadFile } = require('@services/s3Services');
const puppeteer = require('puppeteer');
const pug = require('pug');
const { NODE_ENVIRONMENT, MOOD_PDF_SIZE } = require('../../../services/Constant');
const { toObjectId } = require('../../../services/Helper');

module.exports = {
  testsurvey: async (req, res) => {
    try {
      // const usersAgree = await Users.aggregate([
      //      {
      //        $match: {
      //          status: 1
      //        }
      //      },
      //      {
      //        $lookup: {
      //          from: 'device_tokens',
      //          localField: '_id',
      //          foreignField: 'user_id',
      //          as: 'result'
      //        }
      //      },
      //      {
      //        $unwind: {
      //          path: '$result',
      //          preserveNullAndEmptyArrays: false
      //        }
      //      },
      //      {
      //        $group: {
      //          _id: null,
      //          device_tokens: {
      //            $addToSet: '$result.device_token'
      //          }
      //        }
      //      }
      //    ]);
      const usersAgree = await Users.aggregate([
        {
          $match: {
            //email: 'meghavi037@gmail.com',
            //status: 1,
            user_type: 0
          }
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
        },
        { allowDiskUse: true }
      ]);
      console.log('usersAgree response token --------------', usersAgree[0]);

      return Response.successResponseData(res, SUCCESS, res.__('addSurveySuccess'));
    } catch (error) {
      console.log(error);
      return Response.errorResponseWithoutData(
        res,
        'Survey has not been created !',
        RESPONSE_CODE.BAD_REQUEST
      );
    }
  },
  uploadSurveyMedia: async (req, res) => {
    // console.log(req.files);
    // return
    const s3Response = [];
    try {
      for (const file of req.files) {
        if (['logo', 'image'].includes(file.fieldname)) {
          const path = `surveys/${file.fieldname}/${Date.now()}_${
            file.fieldname
          }_${file.originalname}`;
          const uploadRes = await uploadFile(path, file.buffer, file.mimetype);
          uploadRes.url = CLOUDFRONT_URL + uploadRes.Key;

          s3Response.push(uploadRes);
        }
      }

      return Response.successResponseData(res, s3Response, SUCCESS, 'File uploaded successfully');
    } catch (err) {
      console.error(err, 'err');
      return Response.errorResponseWithoutData(
        res,
        'Error uploading file',
        RESPONSE_CODE.BAD_REQUEST
      );
    }
  },
  createsurvey: async (req, res) => {
    const surveyValidationschema = Joi.object({
      survey_title: Joi.string().required(),
      user_id: Joi.string().required(),
      created_by: Joi.string(),
      approved_by: Joi.string(),
      approved_status: Joi.string(),
      approved_on: Joi.string(),
      survey_time: Joi.string(),
      survey_time_type: Joi.string(),
      survey_category: Joi.string().optional().allow(null, ''),
      logo: Joi.string().allow(''),
      image: Joi.string().allow(''),
      question_details: Joi.array().items(
        Joi.object().keys({
          question: Joi.string().required(),
          question_type: Joi.string(),
          que_options: Joi.array().items(
            Joi.object({
              options: Joi.string(),
              options_status: Joi.number()
            })
          ),
          other_as_option: Joi.number(),
          nonOfTheAbove_as_option: Joi.number(),
          skip: Joi.number()
        })
      ),
      draft: Joi.number(),
      template: Joi.number(),
      template_category: Joi.string(),
      bulk_answer: Joi.number(),
      all_staff: Joi.number(),
      departments: Joi.array().items(
        Joi.object().keys({
          name: Joi.string()
        })
      ),
      area: Joi.array().items(
        Joi.object().keys({
          name: Joi.string()
        })
      ),
      time: Joi.string(),
      status: Joi.number(),
      deleted_at: Joi.number(),
      userType: Joi.number()
    });
    const { result, error } = surveyValidationschema.validate(req.body);
    if (error) {
      return Response.validationErrorResponseData(
        res,
        res.__(validationMessageKey('addsurveyValidation', error))
      );
    }
    try {
      let {
        survey_title,
        user_id,
        survey_category,
        logo,
        image,
        // created_by,
        approved_by,
        approved_status,
        approved_on,
        survey_time,
        survey_time_type,
        question_details,
        all_staff,
        departments,
        time,
        area,
        draft,
        template,
        bulk_answer,
        status,
        deleted_at
      } = req.body;
      var created_by;

      if (USER_TYPE.SUPER_ADMIN == req.userType) {
        created_by = 'Super Admin';
      } else if (USER_TYPE.COMPANY_ADMIN == req.userType) {
        created_by = 'Company Admin';
      } else if (USER_TYPE.SUB_ADMIN == req.userType) {
        created_by = 'Sub Admin';
      } else {
        created_by = 'Company Admin';
      }
      var template_category;
      if (template == 1 || template == '1') {
        template_category = req.body.template_category;
      } else {
        template_category = '';
      }
      let userId = req.authUserId;
      let companyId = req.authCompanyId;
      let adminId = req.authAdminId;
      const userType = req.userType;
      console.log('req.userId-------------create-------------', userId);
      console.log('req.companyId--------------create------------', companyId);
      console.log('req.adminId---------------------create-----', adminId);
      console.log('req.userType-----------------------create---', req.userType);
      console.log('created_by---------create----', created_by, 'userid', req.userType);

      let created_survey = await Survey.create({
        survey_title,
        user_id,
        survey_category,
        logo,
        image,
        question_details,
        all_staff,
        departments,
        time,
        area,
        template,
        template_category,
        draft,
        bulk_answer,
        status,
        deleted_at,
        created_by,
        approved_by,
        approved_status,
        approved_on,
        survey_time,
        survey_time_type
      });
      var cmt_by, creat_by, updat_by;
      if (USER_TYPE.SUPER_ADMIN == 0) {
        cmt_by = req.authAdminId;
        creat_by = req.authAdminId;
        updat_by = req.authAdminId;
      } else if (USER_TYPE.COMPANY_ADMIN == 3) {
        cmt_by = req.authCompanyId;
        creat_by = req.authCompanyId;
        updat_by = req.authCompanyId;
      } else {
        creat_by = req.authAdminId;
        updat_by = req.authAdminId;
        cmt_by = req.authAdminId;
      }
      const addComment = {
        comment: null,
        commented_by: cmt_by,
        commented_on: new Date(),
        content_status: CONTENT_STATUS.DRAFT
      };
      const newContentData = {
        content_type_id: created_survey._id,
        content_type: CONTENT_TYPE.SURVEY,
        display_name: survey_title.trim(),
        content_status: addComment.content_status,
        created_by: creat_by,
        comments: addComment,
        updated_by: updat_by,
        updated_on: new Date()
      };
      await ContentApproval.create(newContentData);
      return Response.successResponseData(res, created_survey, SUCCESS, res.__('addSurveySuccess'));
    } catch (error) {
      console.log(error);
      return Response.errorResponseWithoutData(
        res,
        'Survey has not been created !',
        RESPONSE_CODE.BAD_REQUEST
      );
    }
  },

  getSurveyDetails: async (req, res) => {
    try {
      const { id } = req.params;
      let Survey_details = await Survey.findOne({
        _id: id,
        status: 1,
        deleted_at: 0
      });
      if (!Survey_details) {
        return res.status(500).json({
          message: 'No Survey Details Found with this ID'
        });
      }

      // let companyAdmin = await Users.findOne({ company_id: company._id, user_type: USER_TYPE.COMPANY_ADMIN }).select('-password').lean();

      // company.status = companyAdmin.status;
      // company.adminId = companyAdmin._id;

      // company.company_logo = CLOUDFRONT_URL + COMPANY_MEDIA_PATH.COMPANY_PROFILE + '/' + company.company_logo;
      return Response.successResponseData(res, Survey_details, SUCCESS, res.__('getSurveySuccess'));
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  getSurveyDetailsByuserId: async (req, res) => {
    try {
      // var user_id=req.authUserId;
      const { id, user_id } = req.params;
      let Survey_details = await Survey.findOne({
        _id: id,
        status: 1,
        deleted_at: 0
      });
      if (!Survey_details) {
        return res.status(500).json({
          message: 'No Survey Details Found with this ID'
        });
      }
      let SubmitSurveyDetails = await SubmitSurvey.findOne(
        {
          survey_id: id,
          user_id: user_id
        },
        'submitted_details'
      ).sort({
        createdAt: -1
      });
      console.log(SubmitSurveyDetails, 'SubmitSurveyDetails');
      var final_data = [];

      var SubmitSurveyDetails_data = [];
      var SubmitSurveyDetails_id = [];
      if (!SubmitSurveyDetails) {
        final_data.push({
          Survey_details: Survey_details,
          SubmitSurveyDetails: [],
          submitId: []
        });

        return Response.successResponseData(res, final_data, SUCCESS, res.__('getSurveySuccess'));
      } else {
        //please do not remove this comments here
        // async function SubmitSurveyDetailsWait() {
        SubmitSurveyDetails.submitted_details.forEach((element) => {
          SubmitSurveyDetails_data.push(element);
          // console.log(element);
        });
        SubmitSurveyDetails_id.push(SubmitSurveyDetails._id);
        // }
        // SubmitSurveyDetailsWait();
        final_data.push({
          Survey_details: Survey_details,
          SubmitSurveyDetails: SubmitSurveyDetails_data,
          submitId: SubmitSurveyDetails_id
        });
        return Response.successResponseData(res, final_data, SUCCESS, res.__('getSurveySuccess'));
      }
      // console.log(SubmitSurveyDetails);
      // return
      // let companyAdmin = await Users.findOne({ company_id: company._id, user_type: USER_TYPE.COMPANY_ADMIN }).select('-password').lean();

      // company.status = companyAdmin.status;
      // company.adminId = companyAdmin._id;

      // company.company_logo = CLOUDFRONT_URL + COMPANY_MEDIA_PATH.COMPANY_PROFILE + '/' + company.company_logo;
    } catch (err) {
      // console.log(err)
      return Response.internalServerErrorResponse(res);
    }
  },
  updatesurvey: async (req, res) => {
    //validation start here
    const surveyValidationschema = Joi.object({
      survey_title: Joi.string().required(),
      user_id: Joi.string().required(),
      created_by: Joi.string(),
      approved_by: Joi.string(),
      approved_status: Joi.string(),
      approved_on: Joi.string(),
      survey_time: Joi.string(),
      survey_time_type: Joi.string(),
      survey_category: Joi.string(),
      logo: Joi.string().allow(''),
      image: Joi.string().allow(''),
      question_details: Joi.array().items(
        Joi.object().keys({
          question: Joi.string().required(),
          question_type: Joi.string(),
          que_options: Joi.array().items(
            Joi.object({
              options: Joi.string(),
              options_status: Joi.number()
            })
          ),
          other_as_option: Joi.number(),
          nonOfTheAbove_as_option: Joi.number(),
          skip: Joi.number()
        })
      ),
      draft: Joi.number(),
      bulk_answer: Joi.number(),
      template_category: Joi.string(),
      template: Joi.number(),
      all_staff: Joi.number(),
      departments: Joi.array().items(
        Joi.object().keys({
          name: Joi.string()
        })
      ),
      area: Joi.array().items(
        Joi.object().keys({
          name: Joi.string()
        })
      ),
      time: Joi.string(),
      status: Joi.number(),
      deleted_at: Joi.number()
    });

    const { result, error } = surveyValidationschema.validate(req.body);
    if (error) {
      return Response.validationErrorResponseData(
        res,
        res.__(validationMessageKey('addsurveyValidation', error))
      );
    }
    //validation end here

    try {
      let {
        survey_title,
        user_id,
        survey_category,
        logo,
        image,
        question_details,
        all_staff,
        departments,
        time,
        template,
        area,
        draft,
        created_by,
        approved_by,
        approved_status,
        approved_on,
        survey_time,
        survey_time_type,
        bulk_answer
      } = req.body;
      var template_category;
      if (template == 1 || template == '1') {
        template_category = req.body.template_category;
      } else {
        template_category = '';
      }
      const { id } = req.params;
      let Survey_details = await Survey.findOne({
        _id: id
      });
      if (!Survey_details) {
        return res.status(500).json({
          message: 'No Survey Details Found with this ID'
        });
      }

      let updated = await Survey.findByIdAndUpdate(id, {
        survey_title,
        user_id,
        survey_category,
        logo,
        image,
        question_details,
        all_staff,
        departments,
        time,
        template,
        template_category,
        area,
        draft,
        created_by,
        approved_by,
        approved_status,
        approved_on,
        survey_time,
        survey_time_type,
        bulk_answer
      });
      console.log('He----------------------');
      return Response.successResponseData(res, updated, SUCCESS, res.__('updateSurveySuccess'));
    } catch (error) {
      return Response.errorResponseWithoutData(
        res,
        'Survey has not been created !',
        RESPONSE_CODE.BAD_REQUEST
      );
    }
  },

  deleteSurveyDetails: async (req, res) => {
    try {
      const { id } = req.query;
      let dltSurvey = await Survey.findOne({
        _id: id
      });
      if (!dltSurvey) {
        return res.status(500).json({
          message: 'No Survey Details Found with this ID'
        });
      }
      const deleted_at = 1;
      let deleted_survey = await Survey.findByIdAndUpdate(id, {
        deleted_at
      });
      return Response.successResponseData(
        res,
        deleted_survey,
        SUCCESS,
        res.__('deleteSurveySuccess')
      );
    } catch (error) {
      return Response.internalServerErrorResponse(res);
    }
  },
  getAllSurveyTemplate: async (req, res) => {
    // AllSurvey = await Survey.find(filterData)
    //                     .limit(perPage)
    //                     .lean();
    const reqParam = req.params;
    const reqQuery = req.query;

    let created_by = '';
    let userId = req.authUserId;
    let companyId = req.authCompanyId;
    let adminId = req.authAdminId;
    const userType = req.userType;
    var template_type = reqQuery.template_type;
    var orCondition, insightsOrCondition;
    if (template_type == '' || template_type == 'All') {
      var template_type_all = 'B2B';
      template_type = 'B2C';
      orCondition = [
        { template_category: template_type },
        { template_category: template_type_all }
      ];
      insightsOrCondition = [
        { created_by: 'SUPER ADMIN' },
        { created_by: 'Super Admin' },
        { created_by: 'SUB ADMIN' },
        { created_by: 'Sub Admin' },
        { created_by: 'COMPANY ADMIN' },
        { created_by: 'Company Admin' }
      ];
    } else if (template_type == 'B2B') {
      orCondition = [{ template_category: template_type }, { template_category: template_type }];
      insightsOrCondition = [{ created_by: 'Company Admin' }, { created_by: 'COMPANY ADMIN' }];
    } else {
      orCondition = [{ template_category: template_type }, { template_category: template_type }];
      insightsOrCondition = [
        { created_by: 'SUPER ADMIN' },
        { created_by: 'Super Admin' },
        { created_by: 'SUB ADMIN' },
        { created_by: 'Sub Admin' }
      ];
    }
    const result_type = reqQuery.result_type;
    // console.log("req.userId-------------templete-------------", userId);
    // console.log("req.companyId------------templete--------------", companyId);
    // console.log("req.adminId----------------templete----------", adminId);
    // console.log("req.userType--------------------templete------", req.userType);
    // console.log("req.template_type--------------------templete------", req.query);
    if (USER_TYPE.SUPER_ADMIN == req.userType) {
      created_by = 'Super Admin';
    } else if (USER_TYPE.COMPANY_ADMIN == req.userType) {
      created_by = 'Company Admin';
    } else if (USER_TYPE.SUB_ADMIN == req.userType) {
      created_by = 'Sub Admin';
    }

    if (req.userType == '0' || req.userType == '1') {
      // console.log("else if--------------------if");
      var temp;
      var filterData = await {
        $or: [{ created_by: 'Super Admin' }, { created_by: 'Sub Admin' }],
        $or: orCondition,
        //template_category : template_type,
        status: 1,
        draft: 0,
        deleted_at: 0,
        template: 1
      };
    } else if (adminId != '') {
      // console.log("else if--------------------else");
      var filterData = await {
        $or: [
          { created_by: 'Super Admin' },
          { created_by: 'Sub Admin' },
          { created_by: 'Company Admin' },
          { user_id: adminId }
        ],
        status: 1,
        draft: 0,
        deleted_at: 0,
        template: 1,
        template_category: 'B2B'
      };
    }
    var SurveyTemplateList = await Survey.find(filterData).lean();
    // console.log(filterData,'filterData...........................')
    // console.log(SurveyTemplateList)
    // return
    ////////////////////////////////////// Count start////////////////////
    if (req.userType == '0' || req.userType == '1') {
      //insightsOrCondition = [];
      // console.log("else if--------------------if");
      var filterDataSurvey = await {
        $or: insightsOrCondition,
        // $or: [{ template_category: "B2B" }, { template_category: "B2C" }],
        // template_category : template_type,
        status: 1,
        draft: 0,
        deleted_at: 0,
        template: 0
      };
    } else if (adminId != '') {
      // console.log("else if--------------------else");
      var filterDataSurvey = await {
        $or: insightsOrCondition,
        status: 1,
        draft: 0,
        deleted_at: 0,
        template: 0
        //template_category: "B2B",
      };
    }
    const final_array = [];
    var completeDataCount = 0;
    var incompleteDataCount = 0;
    var openDataCount = 0;
    var SurveyList = await Survey.find(filterDataSurvey).lean();
    // console.log('SurveyList.length---------------------',SurveyList.length)
    if (SurveyList.length > 0) {
      for (const item of SurveyList) {
        let completeData = await SubmitSurvey.findOne({
          final_submission: 1,
          survey_id: item._id
        }).exec();
        if (completeData) {
          completeDataCount++;
        }

        let incompleteData = await SubmitSurvey.findOne({
          question_skip: {
            $ne: 0
          },
          survey_id: item._id
        }).exec();
        if (incompleteData) {
          incompleteDataCount++;
        }

        let openData = await SubmitSurvey.findOne({
          question_skip: 0,
          survey_id: item._id
        }).exec();
        if (openData) {
          openDataCount++;
        }
      }
      var complete = completeDataCount;
      var incomplete = incompleteDataCount;
      var open = openDataCount;
    } else {
      var complete = completeDataCount;
      var incomplete = incompleteDataCount;
      var open = openDataCount;
    }
    if (SurveyTemplateList.length > 0) {
      // Count submitted surveys with final_submission = 1
      SurveyTemplateList = result_type == 'insight' ? [] : SurveyTemplateList;
      // console.log('SurveyTemplateList---------------',result_type)
      final_array.push({
        complete: complete,
        incomplete: incomplete,
        open: open,
        SurveyTemplateList: SurveyTemplateList
      });
      return Response.successResponseData(
        res,
        final_array,
        SUCCESS,
        res.__('getAllSurveyTemplateSuccess')
      );
    } else {
      SurveyTemplateList = [];

      final_array.push({
        complete: complete,
        incomplete: incomplete,
        open: open,
        SurveyTemplateList: SurveyTemplateList
      });
      return Response.successResponseData(
        res,
        final_array,
        SUCCESS,
        res.__('getAllSurveyTemplateSuccess')
      );
    }
  },
  getAllSurveyDetails: async (req, res) => {
    try {
      let created_by = '';
      let userId = req.authUserId;
      let companyId = req.authCompanyId;
      let adminId = req.authAdminId;
      const userType = req.userType;
      console.log('req.userId--------------------------', userId);
      console.log('req.companyId--------------------------', companyId);
      console.log('req.adminId--------------------------', adminId);
      console.log('req.userType--------------------------', req.userType);

      if (USER_TYPE.SUPER_ADMIN == req.userType) {
        created_by = 'Super Admin';
      } else if (USER_TYPE.COMPANY_ADMIN == req.userType) {
        created_by = 'Company Admin';
      } else if (USER_TYPE.SUB_ADMIN == req.userType) {
        created_by = 'Sub Admin';
      }

      let user_company = await Users.findOne({
        _id: userId,
        userType: 2
      }).select('company_id');
      console.log();
      console.log('user_details_creater', user_company);

      console.log('created_by------------', created_by);
      console.log('userId------------', userId);
      console.log('userType------------', req.userType);

      if (Object.keys(req.query).length == 0) {
        // console.log(req.body)
        // return;
        console.log('get_survey----------------11111111111111');
        if (user_company?.company_id == null) {
          console.log('get_survey--------111--------11111111111111');
          var SurveyList = await Survey.find({
            $or: [{ created_by: 'Super Admin' }, { created_by: 'Sub Admin' }],
            //created_by:'Super Admin',
            status: 1,
            deleted_at: 0,
            template: 0,
            draft: 0
          });
        } else if (user_company.company_id != null) {
          let companyAdmin = await Users.findOne({
            company_id: user_company.company_id
          })
            .select('-password')
            .lean();

          console.log('get_survey--------2222--------2222');
          var SurveyList = await Survey.find({
            //created_by:'Company Admin',
            user_id: companyAdmin._id,
            status: 1,
            deleted_at: 0,
            template: 0,
            draft: 0
          });
        }

        // const userId=req.body.user_id;

        // console.log('No survey found', SurveyList);
        if (!SurveyList) {
          return res.status(500).json({
            message: 'No Survey Details Found with this ID'
          });
        }
        var lastArray = [];
        for (const survey of SurveyList) {
          // console.log(survey,'survey')
          // Perform aggregate query to submit survey
          const result = await SubmitSurvey.findOne({
            user_id: userId,
            survey_id: survey._id
          }).sort({
            createdAt: -1
          });
          var count = 0;
          console.log('userI-------d', userId);
          console.log('result-------', result);
          if (result) {
            result.submitted_details.forEach((element) => {
              if (element.attempted == 1 || element.attempted == '1') {
                count++;
              }
            });
            var total = result.total_questions;
            var percentage = (count / total) * 100;
            lastArray.push({
              survey: survey,
              percentage: parseFloat(percentage.toFixed(2))
            });
          } else {
            percentage = 0;
            lastArray.push({
              survey: survey,
              percentage: percentage
            });
          }
        }

        var surv_array = [];
        if (lastArray.length > 0) {
          if (req.params.survey_type == 'All') {
            return Response.successResponseData(
              res,
              lastArray,
              SUCCESS,
              res.__('getAllSurveySuccess')
            );
          } else if (req.params.survey_type == 'Pending') {
            for (const item of lastArray) {
              if (item.percentage == 0) {
                surv_array.push(item);
              }
            }
            return Response.successResponseData(
              res,
              surv_array,
              SUCCESS,
              res.__('getAllSurveySuccess')
            );
          } else if (req.params.survey_type == 'In Progress') {
            for (const item of lastArray) {
              if (item.percentage > 0 && item.percentage < 100) {
                surv_array.push(item);
              }
            }
            return Response.successResponseData(
              res,
              surv_array,
              SUCCESS,
              res.__('getAllSurveySuccess')
            );
          } else {
            for (const item of lastArray) {
              if (item.percentage > 100 || item.percentage == 100) {
                surv_array.push(item);
              }
            }
            return Response.successResponseData(
              res,
              surv_array,
              SUCCESS,
              res.__('getAllSurveySuccess')
            );
          }
        } else {
          return Response.successResponseData(
            res,
            lastArray,
            SUCCESS,
            res.__('getAllSurveySuccess')
          );
        }
      } else {
        console.log('get_survey----------------11111111111111');
        var totalRecords;
        var { page, perPage, surveyName, draft, createdBy, createdOn } = req.query;

        page = page ? parseInt(page) : PAGE;
        perPage = perPage ? parseInt(perPage) : PER_PAGE;

        const skip = (page - 1) * perPage || 0;
        var AllSurvey;
        if (perPage != '') {
          if (perPage != '' && surveyName != '') {
            if (draft == 1 || draft == '1') {
              if (createdBy != '' && createdOn != '') {
                console.log('get_survey----------------222222');
                const createdByRegex = new RegExp(createdBy, 'i');
                const regex = new RegExp(surveyName, 'i');
                AllSurvey = await Survey.find({
                  survey_title: {
                    $regex: regex
                  },
                  created_by: {
                    $regex: createdByRegex
                  },
                  createdAt: createdOn,
                  status: 1,
                  draft: 1,
                  deleted_at: 0
                }).limit(perPage);
              } else {
                console.log('get_survey----------------33333');
                if (createdBy != '') {
                  const createdByRegex = new RegExp(createdBy, 'i');
                  const regex = new RegExp(surveyName, 'i');
                  AllSurvey = await Survey.find({
                    survey_title: {
                      $regex: regex
                    },
                    created_by: {
                      $regex: createdByRegex
                    },
                    status: 1,
                    draft: 1,
                    deleted_at: 0
                  }).limit(perPage);
                } else {
                  if (createdOn != '') {
                    const regex = new RegExp(surveyName, 'i');
                    AllSurvey = await Survey.find({
                      survey_title: {
                        $regex: regex
                      },
                      createdAt: createdOn,
                      status: 1,
                      draft: 1,
                      deleted_at: 0
                    }).limit(perPage);
                  } else {
                    const regex = new RegExp(surveyName, 'i');
                    AllSurvey = await Survey.find({
                      survey_title: {
                        $regex: regex
                      },
                      status: 1,
                      draft: 1,
                      deleted_at: 0
                    }).limit(perPage);
                  }
                }
              }
            } else {
              console.log('get_survey----------------444444444444');
              if (createdBy != '' && createdOn != '') {
                console.log('get_survey----------------55555555555');
                const createdByRegex = new RegExp(createdBy, 'i');
                const regex = new RegExp(surveyName, 'i');
                AllSurvey = await Survey.find({
                  survey_title: {
                    $regex: regex
                  },
                  created_by: {
                    $regex: createdByRegex
                  },
                  createdAt: createdOn,
                  status: 1,
                  draft: 0,
                  deleted_at: 0
                }).limit(perPage);
              } else {
                console.log('get_survey----------------6666666666666');
                if (createdBy != '') {
                  const createdByRegex = new RegExp(createdBy, 'i');
                  const regex = new RegExp(surveyName, 'i');
                  AllSurvey = await Survey.find({
                    survey_title: {
                      $regex: regex
                    },
                    created_by: {
                      $regex: createdByRegex
                    },
                    status: 1,
                    draft: 0,
                    deleted_at: 0
                  }).limit(perPage);
                } else {
                  if (createdOn != '') {
                    const regex = new RegExp(surveyName, 'i');
                    AllSurvey = await Survey.find({
                      survey_title: {
                        $regex: regex
                      },
                      createdAt: createdOn,
                      status: 1,
                      draft: 0,
                      deleted_at: 0
                    }).limit(perPage);
                  } else {
                    const regex = new RegExp(surveyName, 'i');
                    AllSurvey = await Survey.find({
                      survey_title: {
                        $regex: regex
                      },
                      status: 1,
                      draft: 0,
                      deleted_at: 0
                    }).limit(perPage);
                  }
                }
              }
            }
          } else {
            console.log('get_survey----------------777777777777777');
            if (draft == 1 || draft == '1') {
              if (createdBy != '' && createdOn != '') {
                console.log('get_survey----------------888888888888888');
                const createdByRegex = new RegExp(createdBy, 'i');
                AllSurvey = await Survey.find({
                  created_by: {
                    $regex: createdByRegex
                  },
                  createdAt: createdOn,
                  status: 1,
                  draft: 1,
                  deleted_at: 0
                }).limit(perPage);
              } else {
                console.log('get_survey----------------9999999999999');
                if (createdBy != '') {
                  const createdByRegex = new RegExp(createdBy, 'i');
                  AllSurvey = await Survey.find({
                    created_by: {
                      $regex: createdByRegex
                    },
                    status: 1,
                    draft: 1,
                    deleted_at: 0
                  }).limit(perPage);
                } else {
                  if (createdOn != '') {
                    AllSurvey = await Survey.find({
                      createdAt: createdOn,
                      status: 1,
                      draft: 1,
                      deleted_at: 0
                    }).limit(perPage);
                  } else {
                    AllSurvey = await Survey.find({
                      status: 1,
                      draft: 1,
                      deleted_at: 0
                    }).limit(perPage);
                  }
                }
              }
            } else {
              let user_company = await Users.findOne({
                email: 'misha.g403@gmail.com'
              });
              console.log('get_survey----------------111-11-11-11-11-1-', user_company);
              if (typeof companyId != 'undefined')
                var filterData = await {
                  status: 1,
                  draft: 0,
                  deleted_at: 0,
                  user_id: adminId
                };
              else {
                var filterData = await {
                  $or: [{ created_by: 'Super Admin' }, { created_by: 'Sub Admin' }],
                  status: 1,
                  draft: 0,
                  deleted_at: 0
                };
              }

              if (createdBy != '' && createdOn != '') {
                const createdByRegex = new RegExp(createdBy, 'i');

                console.log(
                  'get_survey------user_company----------111-11-11-11-11-1-',
                  user_company
                );
                //var company = {key1: value1, key2: value2};

                //filterData.push({created_by:{$regex: createdByRegex},createdAt: createdOn});

                filterData.created_by = { $regex: createdByRegex };
                filterData.createdAt = createdOn;
                AllSurvey = await Survey.find({
                  filterData
                  // created_by: {
                  //   $regex: createdByRegex
                  // },
                  // createdAt: createdOn,
                  // status: 1,
                  // draft: 0,
                  // deleted_at: 0
                })
                  .limit(perPage)
                  .lean();
              } else {
                var survey_find = { user_id: adminId };
                if (createdBy != '') {
                  console.log('elsessssssss-111-11-11-11-11-1-------------');
                  const createdByRegex = new RegExp(createdBy, 'i');

                  filterData.created_by = { $regex: createdByRegex };

                  AllSurvey = await Survey.find({
                    filterData
                  })
                    .limit(perPage)
                    .lean();
                } else {
                  console.log('elsessssssss-222222222222-------------');
                  if (createdOn != '') {
                    console.log('elsessssssss-222222222222-------------111');

                    filterData.createdOn = createdOn;

                    AllSurvey = await Survey.find({
                      filterData
                    })
                      .limit(perPage)
                      .lean();
                  } else {
                    //filterData.push({user_id:adminId});
                    //filterData.user_id = adminId;
                    console.log('elsessssssss-222222222222-------------222', adminId);

                    if (Object.keys(filterData).length > 0) {
                      AllSurvey = await Survey.find(filterData).limit(perPage).skip(skip).lean();
                      console.log('AllSurvey.length-------------222', AllSurvey.length);
                    }
                  }
                }
              }
            }
          }
        }
        if (AllSurvey.length < 0 || AllSurvey.length == 0) {
          AllSurvey = [];
          totalRecords = 0;
          return Response.successResponseData(
            res,
            AllSurvey,
            SUCCESS,
            res.__('getAllSurveySuccess'),
            {
              page,
              perPage,
              totalRecords
            }
          );
        }
        if (surveyName == '' && createdBy == '' && createdOn == '' && draft == '0') {
          totalRecords = await Survey.countDocuments({
            status: 1,
            deleted_at: 0
          });
        } else {
          totalRecords = AllSurvey.length;
        }

        console.log('page-------------------------', page);
        console.log('perPage-------------------------', perPage);
        console.log('totalRecords-------------------------', totalRecords);
        var final_data = [];
        const SurveyList = AllSurvey;
        console.log(SurveyList);
        for (const survey of SurveyList) {
          const surveyId = survey._id;
          const result = await SubmitSurvey.aggregate([
            {
              $match: {
                survey_id: toObjectId(surveyId)
              }
            },
            {
              $group: {
                _id: '$survey_id',
                skipCount: {
                  $sum: {
                    $cond: [
                      {
                        $eq: ['$question_skip', 1]
                      },
                      1,
                      0
                    ]
                  }
                },
                finalSubmissionCount: {
                  $sum: {
                    $cond: [
                      {
                        $eq: ['$final_submission', 1]
                      },
                      1,
                      0
                    ]
                  }
                }
              }
            }
          ]).exec();
          if (result.length > 0) {
            if (result[0].finalSubmissionCount == 0) {
              final_data.push({
                element: survey,
                count: {
                  complete: 0,
                  incomplete: result[0].finalSubmissionCount,
                  open: result[0].skipCount
                }
              });
            } else {
              final_data.push({
                element: survey,
                count: {
                  incomplete: 0,
                  complete: result[0].finalSubmissionCount,
                  open: result[0].skipCount
                }
              });
            }
          } else {
            final_data.push({
              element: survey,
              count: {
                incomplete: 0,
                complete: 0,
                open: 0
              }
            });
          }
        }
        return Response.successResponseData(
          res,
          final_data,
          SUCCESS,
          res.__('getAllSurveySuccess'),
          {
            page,
            perPage,
            totalRecords
          }
        );
      }
    } catch (err) {
      console.log(err);
    }
  },
  // Submit Survey Code start here
  submitSurvey: async (req, res) => {
    var user_id = req.authUserId;
    console.log('user_id-----------', user_id);
    var {
      //user_id,
      name,
      email,
      survey_id,
      submitted_id,
      submitted_details,
      question_attempt,
      question_skip,
      total_questions,
      final_submission,
      status,
      deleted_at
    } = req.body;

    let user_details_creater = await Users.findOne({ _id: user_id });
    console.log('user_details_creater', user_details_creater);

    let user_details = await Users.findOne({
      _id: user_id,
      userType: 2
    }).select('company_id');

    if (user_details) {
      console.log('user_details', user_details);
      console.log('111111111111111-----------');

      //let surveyData = await Survey.findOne({_id:survey_id});
      let checkSurveyCreatedByCompanyOrNot = await Survey.findOne({
        company_id: user_details.company_id
      });
      let getSurveyDetails = await Survey.findOne({ _id: survey_id });

      console.log('checkSurveyCreatedByCompanyOrNot------------', checkSurveyCreatedByCompanyOrNot);
      console.log('getSurveyDetails.created_by------------', getSurveyDetails.created_by);
      if (
        (checkSurveyCreatedByCompanyOrNot && getSurveyDetails.created_by == 'Company Admin') ||
        getSurveyDetails.created_by == 'Super Admin' ||
        getSurveyDetails.created_by == 'Sub Admin'
      ) {
        console.log('222222222222');
        let checkSurvey = await Survey.findOne({
          _id: survey_id,
          status: 1,
          deleted_at: 0
        });
        if (!checkSurvey) {
          return res.status(500).json({
            message: 'No Survey Details Found with this ID'
          });
        }
        console.log('333333333333333');
        if (submitted_id != '') {
          console.log('44444444444');
          let checkSubmitSurvey = await SubmitSurvey.findOne({
            _id: submitted_id,
            user_id: user_id,
            survey_id: survey_id,
            status: 1,
            deleted_at: 0
          }).sort({
            createdAt: -1
          });
          if (!checkSubmitSurvey) {
            let submittedSurvey = await SubmitSurvey.create({
              user_id,
              name,
              email,
              survey_id,
              submitted_details,
              question_attempt,
              question_skip,
              total_questions,
              final_submission,
              status,
              deleted_at
            });
            submittedSurvey.submitted_details.forEach((element) => {
              delete element.options_status;
            });
            return Response.successResponseData(
              res,
              submittedSurvey,
              SUCCESS,
              res.__('SubmitSurveySuccess')
            );
          } else {
            const existingSubmitData = checkSubmitSurvey;
            const newSubmitDetails = submitted_details;
            const question = existingSubmitData.submitted_details.find(
              (q) => q.question_id == newSubmitDetails[0].question_id
            );
            if (question) {
              existingSubmitData.submitted_details.forEach((element) => {
                if (element._id == question._id) {
                  element.question = newSubmitDetails[0].question;
                  element.question_id = newSubmitDetails[0].question_id;
                  element.options = newSubmitDetails[0].options;
                  (element.options_id = newSubmitDetails[0].options_id),
                    (element.options_status = newSubmitDetails[0].options_status);
                }
              });
              existingSubmitData.user_id = user_id;
              existingSubmitData.name = name;
              existingSubmitData.email = email;
              existingSubmitData.survey_id = survey_id;
              existingSubmitData.question_attempt = question_attempt;
              existingSubmitData.question_skip = question_skip;
              existingSubmitData.total_questions = total_questions;
              existingSubmitData.final_submission = final_submission;

              // console.log(existingSubmitData,'existingSubmitData')
              await SubmitSurvey.findOneAndUpdate(
                {
                  _id: existingSubmitData._id
                },
                existingSubmitData,
                {
                  new: true
                }
              ).exec();
              let updated_array = await SubmitSurvey.findOne({
                _id: submitted_id,
                user_id: user_id,
                survey_id: survey_id,
                status: 1,
                deleted_at: 0
              }).sort({
                createdAt: -1
              });
              updated_array.submitted_details.forEach((element) => {
                delete element.options_status;
              });
              return Response.successResponseData(
                res,
                updated_array,
                SUCCESS,
                res.__('SubmitSurveySuccess')
              );
            } else {
              existingSubmitData.submitted_details.push(newSubmitDetails[0]);
              existingSubmitData.user_id = user_id;
              existingSubmitData.name = name;
              existingSubmitData.email = email;
              existingSubmitData.survey_id = survey_id;
              existingSubmitData.question_attempt = question_attempt;
              existingSubmitData.question_skip = question_skip;
              existingSubmitData.total_questions = total_questions;
              existingSubmitData.final_submission = final_submission;
              await SubmitSurvey.findOneAndUpdate(
                {
                  _id: existingSubmitData._id
                },
                existingSubmitData,
                {
                  new: true
                }
              ).exec();
              let updated_array = await SubmitSurvey.findOne({
                _id: submitted_id,
                user_id: user_id,
                survey_id: survey_id,
                status: 1,
                deleted_at: 0
              }).sort({
                createdAt: -1
              });
              updated_array.submitted_details.forEach((element) => {
                delete element.options_status;
              });
              return Response.successResponseData(
                res,
                updated_array,
                SUCCESS,
                res.__('SubmitSurveySuccess')
              );
            }
          }
        } else {
          console.log('5555555');
          let submittedSurvey = await SubmitSurvey.create({
            user_id,
            name,
            email,
            survey_id,
            submitted_details,
            question_attempt,
            question_skip,
            total_questions,
            final_submission,
            status,
            deleted_at
          });
          submittedSurvey.submitted_details.forEach((element) => {
            delete element.options_status;
          });
          return Response.successResponseData(
            res,
            submittedSurvey,
            SUCCESS,
            res.__('SubmitSurveySuccess')
          );
        }
      }
      // else if(getSurveyDetails.created_by == 'Super Admin' || getSurveyDetails.created_by == 'Sub Admin')
      // {

      // }
      else {
        return res.status(500).json({
          message: 'You can not submit this survey please contact us'
        });
      }
    } else {
      console.log('else-2222222222222222');
      let checkSurvey = await Survey.findOne({
        _id: survey_id,
        status: 1,
        deleted_at: 0
      });
      if (!checkSurvey) {
        return res.status(500).json({
          message: 'No Survey Details Found with this ID'
        });
      }
      if (submitted_id != '') {
        let checkSubmitSurvey = await SubmitSurvey.findOne({
          _id: submitted_id,
          user_id: user_id,
          survey_id: survey_id,
          status: 1,
          deleted_at: 0
        }).sort({
          createdAt: -1
        });
        if (!checkSubmitSurvey) {
          let submittedSurvey = await SubmitSurvey.create({
            user_id,
            name,
            email,
            survey_id,
            submitted_details,
            question_attempt,
            question_skip,
            total_questions,
            final_submission,
            status,
            deleted_at
          });
          submittedSurvey.submitted_details.forEach((element) => {
            delete element.options_status;
          });
          return Response.successResponseData(
            res,
            submittedSurvey,
            SUCCESS,
            res.__('SubmitSurveySuccess')
          );
        } else {
          const existingSubmitData = checkSubmitSurvey;
          const newSubmitDetails = submitted_details;
          const question = existingSubmitData.submitted_details.find(
            (q) => q.question_id == newSubmitDetails[0].question_id
          );
          if (question) {
            existingSubmitData.submitted_details.forEach((element) => {
              if (element._id == question._id) {
                element.question = newSubmitDetails[0].question;
                element.question_id = newSubmitDetails[0].question_id;
                element.options = newSubmitDetails[0].options;
                (element.options_id = newSubmitDetails[0].options_id),
                  (element.options_status = newSubmitDetails[0].options_status);
              }
            });
            existingSubmitData.user_id = user_id;
            existingSubmitData.name = name;
            existingSubmitData.email = email;
            existingSubmitData.survey_id = survey_id;
            existingSubmitData.question_attempt = question_attempt;
            existingSubmitData.question_skip = question_skip;
            existingSubmitData.total_questions = total_questions;
            existingSubmitData.final_submission = final_submission;

            // console.log(existingSubmitData,'existingSubmitData')
            await SubmitSurvey.findOneAndUpdate(
              {
                _id: existingSubmitData._id
              },
              existingSubmitData,
              {
                new: true
              }
            ).exec();
            let updated_array = await SubmitSurvey.findOne({
              _id: submitted_id,
              user_id: user_id,
              survey_id: survey_id,
              status: 1,
              deleted_at: 0
            }).sort({
              createdAt: -1
            });
            updated_array.submitted_details.forEach((element) => {
              delete element.options_status;
            });
            return Response.successResponseData(
              res,
              updated_array,
              SUCCESS,
              res.__('SubmitSurveySuccess')
            );
          } else {
            existingSubmitData.submitted_details.push(newSubmitDetails[0]);
            existingSubmitData.user_id = user_id;
            existingSubmitData.name = name;
            existingSubmitData.email = email;
            existingSubmitData.survey_id = survey_id;
            existingSubmitData.question_attempt = question_attempt;
            existingSubmitData.question_skip = question_skip;
            existingSubmitData.total_questions = total_questions;
            existingSubmitData.final_submission = final_submission;
            await SubmitSurvey.findOneAndUpdate(
              {
                _id: existingSubmitData._id
              },
              existingSubmitData,
              {
                new: true
              }
            ).exec();
            let updated_array = await SubmitSurvey.findOne({
              _id: submitted_id,
              user_id: user_id,
              survey_id: survey_id,
              status: 1,
              deleted_at: 0
            }).sort({
              createdAt: -1
            });
            updated_array.submitted_details.forEach((element) => {
              delete element.options_status;
            });
            return Response.successResponseData(
              res,
              updated_array,
              SUCCESS,
              res.__('SubmitSurveySuccess')
            );
          }
        }
      } else {
        let submittedSurvey = await SubmitSurvey.create({
          user_id,
          name,
          email,
          survey_id,
          submitted_details,
          question_attempt,
          question_skip,
          total_questions,
          final_submission,
          status,
          deleted_at
        });
        submittedSurvey.submitted_details.forEach((element) => {
          delete element.options_status;
        });
        return Response.successResponseData(
          res,
          submittedSurvey,
          SUCCESS,
          res.__('SubmitSurveySuccess')
        );
      }
    }
  },
  getCompanyDashboardData: async (req, res) => {
    const final_array = [];
    let userId = req.authUserId;
    let companyId = req.authCompanyId;
    let adminId = req.authAdminId;
    try {
      var filterData = await {
        created_by: 'Company Admin',
        user_id: adminId,
        status: 1,
        draft: 0,
        deleted_at: 0,
        template: 0
      };
      var SurveyList = await Survey.find(filterData).lean();
      var completeDataCount = 0;
      var incompleteDataCount = 0;
      var openDataCount = 0;
      // console.log(SurveyList,'SurveyList');
      // return;
      if (SurveyList.length > 0) {
        for (const item of SurveyList) {
          let completeData = await SubmitSurvey.findOne({
            final_submission: 1,
            survey_id: item._id
          }).exec();
          if (completeData) {
            completeDataCount++;
          }

          let incompleteData = await SubmitSurvey.findOne({
            question_skip: {
              $ne: 0
            },
            survey_id: item._id
          }).exec();
          if (incompleteData) {
            incompleteDataCount++;
          }

          let openData = await SubmitSurvey.findOne({
            question_skip: 0,
            survey_id: item._id
          }).exec();
          if (openData) {
            openDataCount++;
          }
        }
        var complete = completeDataCount;
        var incomplete = incompleteDataCount;
        var open = openDataCount;
      } else {
        var complete = completeDataCount;
        var incomplete = incompleteDataCount;
        var open = openDataCount;
      }

      let lstsubmitearray = await SubmitSurvey.findOne({
        final_submission: 1,
        status: 1,
        deleted_at: 0,
        template: 0
      }).sort({ createdAt: -1 });
      // console.log(lstsubmitearray)
      // console.log(req.authCompanyId)
      if (lstsubmitearray) {
        let surveyresult = await Survey.findOne({
          _id: lstsubmitearray.survey_id,
          user_id: req.authCompanyId
        });
        // console.log(surveyresult)
        // return;
        // lstsubmitearray.survey_id

        const result = await SubmitSurvey.aggregate([
          {
            $match: {
              survey_id: mongoose.Types.ObjectId(surveyresult._id),
              final_submission: 1 // Assuming only final submissions are considered
            }
          },
          {
            $unwind: '$submitted_details'
          },
          {
            $group: {
              _id: {
                question_id: '$submitted_details.question_id',
                question: '$submitted_details.question',
                options_status: '$submitted_details.options_status'
              },
              positiveCount: {
                $sum: {
                  $cond: {
                    if: {
                      $eq: ['$submitted_details.options_status', 1]
                    },
                    then: 1,
                    else: 0
                  }
                }
              },
              negativeCount: {
                $sum: {
                  $cond: {
                    if: {
                      $eq: ['$submitted_details.options_status', 0]
                    },
                    then: 1,
                    else: 0
                  }
                }
              }
            }
          },
          {
            $project: {
              _id: 0,
              question_id: '$_id.question_id',
              question: '$_id.question',
              counts: {
                positive: '$positiveCount',
                negative: '$negativeCount'
              }
            }
          }
        ]);
        console.log(result, 'result');
        if (result.length > 0) {
          const aggregatedCountsMap = new Map();
          result.forEach((survey) => {
            const { question_id, question, counts } = survey;
            // Check if the question_id already exists in the map
            if (aggregatedCountsMap.has(question_id)) {
              // If exists, update the counts
              const existingCounts = aggregatedCountsMap.get(question_id);
              existingCounts.totalpositive += counts.positive;
              existingCounts.totalnegative += counts.negative;
            } else {
              // If doesn't exist, add a new entry to the map
              aggregatedCountsMap.set(question_id, {
                question_id,
                question,
                totalpositive: counts.positive,
                totalnegative: counts.negative
              });
            }
          });

          // Convert the map values to an array
          const final_data = Array.from(aggregatedCountsMap.values());
          final_array.push({
            complete: complete,
            incomplete: incomplete,
            open: open,
            graphData: final_data
          });
          return Response.successResponseData(
            res,
            final_array,
            SUCCESS,
            res.__('getDashboardInsightsCounts')
          );
        } else {
          final_array.push({
            complete: complete,
            incomplete: incomplete,
            open: open,
            graphData: []
          });
          return Response.successResponseData(
            res,
            final_array,
            SUCCESS,
            res.__('getDashboardInsightsCounts')
          );
        }
      } else {
        final_array.push({
          complete: complete,
          incomplete: incomplete,
          open: open,
          graphData: []
        });
        return Response.successResponseData(
          res,
          final_array,
          SUCCESS,
          res.__('getDashboardInsightsCounts')
        );
      }
    } catch (error) {
      return Response.successResponseData(
        res,
        final_array,
        SUCCESS,
        res.__('getDashboardInsightsCounts')
      );
    }
  },

  getQuestionSummary: async (req, res) => {
    const { surveyId } = req.params;

    let submitList = await SubmitSurvey.find({
      survey_id: surveyId,
      status: 1,
      deleted_at: 0
    });
    const surveyResults = await SubmitSurvey.aggregate([
      {
        $match: {
          survey_id: toObjectId(surveyId)
        }
      },
      {
        $unwind: '$submitted_details'
      },
      {
        $group: {
          _id: {
            question_id: '$submitted_details.question_id',
            question: '$submitted_details.question',
            options: '$submitted_details.options',
            options_id: '$submitted_details.options_id',
            skip: {
              $sum: {
                $cond: {
                  if: {
                    $eq: ['$submitted_details.skip', 1]
                  },
                  then: 1,
                  else: 0
                }
              }
            }
          },
          attempts: {
            $sum: 1
          }
        }
      }
    ]);
    const submitlist_length = submitList.length;

    function calculatePercentage(attempts, total) {
      return (attempts / total) * 100;
    }
    var lastarray = [];
    const resultsWithPercentage = surveyResults.map((result) => {
      result._id.percentage = calculatePercentage(result.attempts, submitlist_length);
      lastarray.push({
        question_id: result._id.question_id,
        question: result._id.question,
        questionSkipCount: result._id.skip,
        questionAttemptCount: result.attempts,
        options_details: {
          options_id: result._id.options_id,
          options: result._id.options,
          optionsWithPercentage: Number(result._id.percentage).toFixed(2),
          user_count: result.attempts
        }
      });
    });
    const groupedData = lastarray.reduce((acc, item) => {
      const existingItem = acc.find((groupedItem) => groupedItem.question_id === item.question_id);

      if (existingItem) {
        existingItem.options_details.push(item.options_details);
      } else {
        acc.push({
          question_id: item.question_id,
          question: item.question,
          skip: item.questionSkipCount,
          AnswredCount: item.questionAttemptCount,
          options_details: [item.options_details]
          // user_count: item.user_count
        });
      }

      return acc;
    }, []);
    return Response.successResponseData(
      res,
      groupedData,
      SUCCESS,
      res.__('QuestionSummarySuccess')
    );
  },

  getInsights: async (req, res) => {
    const { surveyId } = req.params;
    let surveyTitle = await Survey.findOne({ _id: surveyId });
    const now = new Date();
    const twelveHoursAgo = new Date(now - 12 * 60 * 60 * 1000);
    const currentTimestamp = Date.now();

    const pipeline = [
      {
        $match: {
          createdAt: { $gte: twelveHoursAgo, $lte: now }
        }
      },
      {
        $group: {
          _id: {
            survey_id: toObjectId(surveyId),
            hour: {
              $hour: '$updatedAt'
            }
          },
          count: {
            $sum: 1
          },

          total_submissions: {
            $sum: 1
          },
          first_entry: {
            $first: '$createdAt'
          },
          last_entry: {
            $last: '$updatedAt'
          },
          total_attempted_questions: {
            $sum: '$question_attempt'
          },
          total_questions: {
            $first: '$total_questions'
          }
        }
      },
      {
        $project: {
          _id: 0,
          survey_id: '$_id.survey_id',
          hour: '$_id.hour',
          count: '$count',
          total_submissions: 1,
          first_entry: 1,
          last_entry: 1,
          total_attempted_questions: 1,
          total_questions: 1,
          submissions: 1
        }
      }
    ];
    const surveyResults = await SubmitSurvey.aggregate(pipeline);

    var finalTotalSubmittions = 0;
    var totalSubmittionRate = 0;
    if (surveyResults.length > 0) {
      surveyResults.forEach((element) => {
        finalTotalSubmittions = finalTotalSubmittions + element.total_submissions;
        totalSubmittionRate = totalSubmittionRate + element.total_attempted_questions;
      });
      var firstSurveyDate = surveyResults[0].first_entry;
      var recentSurveyDate = surveyResults[surveyResults.length - 1].last_entry;
      var timeDifferenceInSeconds = Math.abs((recentSurveyDate - firstSurveyDate) / 1000);
      var overallCompletionRate = (totalSubmittionRate / (2 * totalSubmittionRate)) * 100;
      var startSurverDate = new Date();
      var endSurveyDate = twelveHoursAgo;

      var startDate = new Date(startSurverDate);
      var endDate = new Date(endSurveyDate);

      var options = {
        hour: 'numeric',
        minute: 'numeric',
        month: 'numeric',
        day: 'numeric',
        year: 'numeric'
      };

      const startDateString = startDate.toLocaleString('en-US', options);
      const endDateString = endDate.toLocaleString('en-US', options);
      const fromDateAndtoDate = endDateString + ' to ' + startDateString;
      var final_data = {
        finalTotalSubmittions: finalTotalSubmittions,
        surveyResults: surveyResults,
        firstSurveyDate: firstSurveyDate,
        recentSurveyDate: recentSurveyDate,
        overallCompletionRate: overallCompletionRate,
        timeDifferenceInSeconds: timeDifferenceInSeconds,
        fromDateAndtoDate: fromDateAndtoDate,
        surveyTitle: surveyTitle.survey_title
      };
    } else {
      final_data = {
        finalTotalSubmittions: 0,
        surveyResults: [],
        firstSurveyDate: '',
        recentSurveyDate: '',
        overallCompletionRate: '',
        timeDifferenceInSeconds: 0,
        fromDateAndtoDate: '',
        surveyTitle: ''
      };
    }
    return Response.successResponseData(res, final_data, SUCCESS, res.__('InsightsSuccess'));
  },

  getDashboardData: async (req, res) => {
    let userId = req.authUserId;
    let companyId = req.authCompanyId;
    let adminId = req.authAdminId;
    var final_array = [];
    try {
      const reqQuery = req.query;

      const reqParams = req.params;
      var survey_count_type = reqQuery.survey_count_type;
      console.log(survey_count_type, 'survey_count_type..................');
      var insightsOrCondition;
      if (survey_count_type == '' || survey_count_type == 'All') {
        insightsOrCondition = [
          { created_by: 'SUPER ADMIN' },
          { created_by: 'Super Admin' },
          { created_by: 'SUB ADMIN' },
          { created_by: 'Sub Admin' },
          { created_by: 'COMPANY ADMIN' },
          { created_by: 'Company Admin' }
        ];
      } else if (survey_count_type == 'B2B') {
        insightsOrCondition = [{ created_by: 'COMPANY ADMIN' }, { created_by: 'Company Admin' }];
      } else {
        insightsOrCondition = [{ created_by: 'Super Admin' }, { created_by: 'Sub Admin' }];
      }
      var filterDataSurvey;
      if (req.userType == '0' || req.userType == '1') {
        filterDataSurvey = await {
          $or: insightsOrCondition,
          // $or: [{ template_category: "B2B" }, { template_category: "B2C" }],
          // template_category : template_type,
          status: 1,
          draft: 0,
          deleted_at: 0,
          template: 0
        };
      } else if (adminId != '') {
        // console.log("else if--------------------else");
        filterDataSurvey = await {
          $or: insightsOrCondition,
          status: 1,
          draft: 0,
          deleted_at: 0,
          template: 0
          //template_category: "B2B",
        };
      }
      var SurveyList = await Survey.find(filterDataSurvey).lean();
      var completeDataCount = 0;
      var incompleteDataCount = 0;
      var openDataCount = 0;
      // console.log(SurveyList,'SurveyList');
      // return;
      if (SurveyList.length > 0) {
        for (const item of SurveyList) {
          let completeData = await SubmitSurvey.findOne({
            final_submission: 1,
            survey_id: item._id
          }).exec();
          if (completeData) {
            completeDataCount++;
          }

          let incompleteData = await SubmitSurvey.findOne({
            question_skip: {
              $ne: 0
            },
            survey_id: item._id
          }).exec();
          if (incompleteData) {
            incompleteDataCount++;
          }

          let openData = await SubmitSurvey.findOne({
            question_skip: 0,
            survey_id: item._id
          }).exec();
          if (openData) {
            openDataCount++;
          }
        }
        var complete = completeDataCount;
        var incomplete = incompleteDataCount;
        var open = openDataCount;
      } else {
        var complete = completeDataCount;
        var incomplete = incompleteDataCount;
        var open = openDataCount;
      }
      let lstsubmitearray = await SubmitSurvey.findOne({
        final_submission: 1,
        status: 1,
        deleted_at: 0,
        template: 0
      }).sort({ createdAt: -1 });
      if (lstsubmitearray) {
        const result = await SubmitSurvey.aggregate([
          {
            $match: {
              //survey_id: mongoose.Types.ObjectId(lstsubmitearray.survey_id),
              final_submission: 1 // Assuming only final submissions are considered
            }
          },
          {
            $unwind: '$submitted_details'
          },
          {
            $group: {
              _id: {
                question_id: '$submitted_details.question_id',
                question: '$submitted_details.question',
                options_status: '$submitted_details.options_status'
              },
              positiveCount: {
                $sum: {
                  $cond: {
                    if: {
                      $eq: ['$submitted_details.options_status', 1]
                    },
                    then: 1,
                    else: 0
                  }
                }
              },
              negativeCount: {
                $sum: {
                  $cond: {
                    if: {
                      $eq: ['$submitted_details.options_status', 0]
                    },
                    then: 1,
                    else: 0
                  }
                }
              }
            }
          },
          {
            $project: {
              _id: 0,
              question_id: '$_id.question_id',
              question: '$_id.question',
              counts: {
                positive: '$positiveCount',
                negative: '$negativeCount'
              }
            }
          }
        ]);
        if (result.length > 0) {
          const aggregatedCountsMap = new Map();
          result.forEach((survey) => {
            const { question_id, question, counts } = survey;
            // Check if the question_id already exists in the map
            if (aggregatedCountsMap.has(question_id)) {
              // If exists, update the counts
              const existingCounts = aggregatedCountsMap.get(question_id);
              existingCounts.totalpositive += counts.positive;
              existingCounts.totalnegative += counts.negative;
            } else {
              // If doesn't exist, add a new entry to the map
              aggregatedCountsMap.set(question_id, {
                question_id,
                question,
                totalpositive: counts.positive,
                totalnegative: counts.negative
              });
            }
          });

          // Convert the map values to an array
          const final_data = Array.from(aggregatedCountsMap.values());

          final_array.push({
            complete: complete,
            incomplete: incomplete,
            open: open,
            graphData: final_data
          });
          return Response.successResponseData(
            res,
            final_array,
            SUCCESS,
            res.__('getDashboardInsightsCounts')
          );
        } else {
          final_array.push({
            complete: complete,
            incomplete: incomplete,
            open: open,
            graphData: []
          });
          return Response.successResponseData(
            res,
            final_array,
            SUCCESS,
            res.__('getDashboardInsightsCounts')
          );
        }
      } else {
        final_array.push({
          complete: complete,
          incomplete: incomplete,
          open: open,
          graphData: []
        });
        return Response.successResponseData(
          res,
          final_array,
          SUCCESS,
          res.__('getDashboardInsightsCounts')
        );
      }
    } catch (error) {
      console.log(error);
      return Response.successResponseData(
        res,
        final_array,
        SUCCESS,
        res.__('getDashboardInsightsCounts')
      );
    }
  },
  getSurveyReport: async (req, res) => {
    try {
      const { fromDate, toDate } = req.query;

      const locals = {
        name: 'John Doe',
        postivePercentage: 60,
        negativePercentage: 40,
        averageMoods: 4,
        moodCount: 4,
        moodPercentage: 65,
        fromDate: new Date(fromDate).toLocaleDateString('en-gb', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }),
        toDate: new Date(toDate).toLocaleDateString('en-gb', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }),
        happySmallIcon: process.env.PDF_HAPPY_SMALL_ICON,
        sadSmallIcon: process.env.PDF_SAD_SMALL_ICON
      };

      const compiledFunction = pug.compileFile('src/views/surveyReport.pug');
      const html = compiledFunction(locals);
      const browser = await puppeteer.launch({
        executablePath:
          process.env.NODE_ENV === NODE_ENVIRONMENT.DEVELOPMENT ? null : '/usr/bin/google-chrome',
        ignoreDefaultArgs: ['--disable-extensions'],
        headless: true,
        args: ['--no-sandbox', '--disabled-setupid-sandbox']
      });
      const page = await browser.newPage();
      await page.setContent(html);
      const pdf = await page.pdf({
        format: MOOD_PDF_SIZE,
        printBackground: true
      });
      await browser.close();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=file.pdf');
      res.setHeader('Content-Length', pdf.length);
      res.send(pdf);
    } catch (err) {
      console.log(err);
      return Response.internalServerErrorResponse(res);
    }
  }
};
