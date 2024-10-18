'use strict';

const {
  internalServerErrorResponse,
  successResponseData,
  successResponseWithoutData
} = require('@services/Response');
const {
  STATUS,
  PAGE,
  PER_PAGE,
  CLOUDFRONT_URL,
  ADMIN_MEDIA_PATH,
  RESPONSE_CODE,
  SURVEY_SCOPE,
  SURVEY_TARGET,
  USER_SURVEY_TYPE
} = require('../../../services/Constant');
const { toObjectId } = require('../../../services/Helper');
const AppSurveys = require('../../../models/AppSurveys');
const SurveysQuestion = require('../../../models/SurveyQuestion');
const { hasValue } = require('@helpers/utils');
const SurveysAnswers = require('@root/src/models/SurveyAnswers');

module.exports = {
  getSurveys: async (req, res) => {
    try {
      const reqParam = req.query;

      const surveyType = parseInt(reqParam.type);
      const page = parseInt(reqParam.page) || PAGE;
      const limit = parseInt(reqParam.limit) || PER_PAGE;
      const skip = (page - 1) * limit;

      const filterCondition = {
        company_id: null,
        scope: { $ne: SURVEY_SCOPE.B2B },
        target: SURVEY_TARGET.APP,
        approved_by: { $ne: null },
        approved_on: { $ne: null },
        status: STATUS.ACTIVE,
        questions: { $ne: [] },
        is_draft: false,
        is_template: false,
        deletedAt: null
      };

      if (hasValue(req.userCompanyId)) {
        filterCondition.company_id = toObjectId(req.userCompanyId);
        filterCondition.scope = { $ne: SURVEY_SCOPE.B2C };
      }

      const totalAppSurveys = await AppSurveys.countDocuments(filterCondition);
      if (totalAppSurveys === 0) {
        return successResponseWithoutData(res, 'No survey found', RESPONSE_CODE.SUCCESS);
      }
      const appSurveys = await AppSurveys.find(filterCondition)
        .select({
          id: { $toString: '$_id' },
          _id: 0,
          title: 1,
          duration: 1,
          image: {
            $cond: {
              if: { $and: [{ $ne: ['$image', null] }, { $ne: ['$image', ''] }] },
              then: {
                $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.SURVEY_IMAGE, '/', '$image']
              },
              else: ''
            }
          },
          logo: {
            $cond: {
              if: { $and: [{ $ne: ['$logo', null] }, { $ne: ['$logo', ''] }] },
              then: {
                $concat: [CLOUDFRONT_URL, ADMIN_MEDIA_PATH.SURVEY_LOGO, '/', '$logo']
              },
              else: ''
            }
          },
          questions: 1
        })
        .populate('questions')
        .lean();

      console.log('appSurveys', appSurveys);

      let surveyList = [];
      for (const survey of appSurveys) {
        const surveyData = { ...survey };

        const answers = await SurveysAnswers.find({
          user_id: req.authUserId,
          survey_id: survey.id
        }).lean();

        const totalQuestions = surveyData.questions.length;
        let answeredQuestions = 0;

        surveyData.questions = surveyData.questions.map((question) => {
          const questionData = {
            id: question._id.toString(),
            title: question.title,
            options: question.options,
            skipable: question.skipable,
            answered: false,
            skipped: false,
            selectedOption: null
          };

          const answer = answers.find((a) => a.question_id.toString() === questionData.id);
          if (answer) {
            questionData.skipped = answer.skipped;
            if (!answer.skipped && answer.option) {
              questionData.answered = true;
              questionData.selectedOption = answer.option;
              answeredQuestions++;
            }
          }

          return questionData;
        });

        const percentage = (answeredQuestions / totalQuestions) * 100;

        surveyList.push({
          survey: surveyData,
          percentage: parseFloat(percentage.toFixed(2))
        });
      }

      if (surveyType === USER_SURVEY_TYPE.COMPLETED) {
        surveyList = surveyList.filter((survey) => survey.percentage === 100);
      } else if (surveyType === USER_SURVEY_TYPE.IN_PROGRESS) {
        surveyList = surveyList.filter(
          (survey) => survey.percentage > 0 && survey.percentage < 100
        );
      } else if (surveyType === USER_SURVEY_TYPE.PENDING) {
        surveyList = surveyList.filter((survey) => survey.percentage === 0);
      } else if (surveyType === USER_SURVEY_TYPE.ALL) {
        surveyList = surveyList.sort((a, b) => {
          if (a.percentage > 0 && a.percentage < 100) return -1;
          if (b.percentage > 0 && b.percentage < 100) return 1;
          if (a.percentage === 0) return -1;
          if (b.percentage === 0) return 1;
          return 1;
        });
      }

      surveyList = surveyList.slice(skip, skip + limit);

      return successResponseData(
        res,
        surveyList,
        RESPONSE_CODE.SUCCESS,
        'Get surveys list successful',
        {
          total: totalAppSurveys,
          page,
          limit
        }
      );
    } catch (err) {
      console.log('err', err);
      return internalServerErrorResponse(res);
    }
  },
  surveySubmission: async (req, res) => {
    try {
      const reqBody = req.body;

      const surveyId = reqBody.surveyId;
      const questionId = reqBody.questionId;
      const option = reqBody.option;
      const skipped = reqBody.skipped;

      if ((option && skipped) || (!option && !skipped)) {
        return successResponseWithoutData(res, 'Invalid request', RESPONSE_CODE.BAD_REQUEST);
      }

      const survey = await AppSurveys.findById(surveyId);
      if (!survey) {
        return successResponseWithoutData(res, 'Invalid survey', RESPONSE_CODE.BAD_REQUEST);
      }

      const question = await SurveysQuestion.findOne({
        _id: questionId,
        survey_id: surveyId
      });
      if (!question) {
        return successResponseWithoutData(
          res,
          'Invalid survey question',
          RESPONSE_CODE.BAD_REQUEST
        );
      }

      if (option && question.options.indexOf(option) === -1) {
        return successResponseWithoutData(res, 'Invalid option', RESPONSE_CODE.BAD_REQUEST);
      }
      if (!question.skipable && skipped) {
        return successResponseWithoutData(
          res,
          'Question skipping not allowed',
          RESPONSE_CODE.BAD_REQUEST
        );
      }

      const answer = await SurveysAnswers.findOne({
        user_id: req.authUserId,
        survey_id: surveyId,
        question_id: questionId
      });
      if (answer) {
        answer.option = option;
        answer.skipped = skipped;
        await answer.save();
      } else {
        await SurveysAnswers.create({
          user_id: req.authUserId,
          survey_id: surveyId,
          question_id: questionId,
          option,
          skipped
        });
      }

      return successResponseWithoutData(
        res,
        'Survey submitted successfully',
        RESPONSE_CODE.SUCCESS
      );
    } catch (err) {
      console.log('err', err);
      return internalServerErrorResponse(res);
    }
  }
};
