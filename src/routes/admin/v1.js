'use strict';

const router = require('express').Router();
const {
  adminLogin,
  resendOtp,
  adminOTPVerify,
  adminForgetPassword,
  adminChangePassword,
  adminResetPassword,
  removeAdminDeviceToken,
  addEditDeviceToken,
  refreshJwtToken
} = require('@controllers/admin/v1/authController');
const {
  addEditAdmin,
  adminsList,
  deleteAdmin,
  adminNameList,
  getUserAccess
} = require('@controllers/admin/v1/adminsController');
const { addEditCMS, cmsList, deleteCms } = require('@controllers/admin/v1/cmsController');
const { updateConfig, configList } = require('@controllers/admin/v1/configController');
const {
  usersList,
  editUser,
  getUserDetail,
  myDraftContent,
  bulkUserStatusUpdate,
  userMoodReport,
  userPerformanceData,
  userBadgeCount,
  userBadgeDetails,
  getContentUserLocation
} = require('@controllers/admin/v1/usersController');
const {
  addEditFocus,
  focusList,
  deleteFocus,
  focusNameList,
  getFocus
} = require('@controllers/admin/v1/focusController');
const {
  addEditMeditation,
  meditationList,
  deleteMeditation,
  getMeditation
} = require('@controllers/admin/v1/meditationController');
const {
  addEditSound,
  getDetailedSoundList,
  deleteSound,
  getSound
} = require('@controllers/admin/v1/soundController');
const {
  addEditGratitude,
  gratitudeDetailedList,
  deleteGratitude
} = require('@controllers/admin/v1/gratitudeController');
const {
  addEditRituals,
  ritualsDetailedList,
  deleteRituals,
  getRitual
} = require('@controllers/admin/v1/ritualsController');
const {
  addEditAffirmation,
  affirmationDetailedList,
  deleteAffirmation,
  addAffirmationCsv,
  getAffirmation
} = require('@controllers/admin/v1/affirmationController');
const {
  contentApprovalList,
  contentApproval,
  getContentDetails
} = require('@controllers/admin/v1/contentApprovalController');
const {
  addEditTopPicks,
  topPicksDetails,
  deleteTopPicks,
  getContentTypeList,
  bulkContentStatusUpdate
} = require('@controllers/admin/v1/topPicksController');
const {
  addNotification,
  notificationDetailedList,
  usersEmailList,
  deleteMyNotification
} = require('@controllers/admin/v1/notificationController');
const {
  addEditTutorialVideos,
  getTutorialVideo
} = require('@controllers/admin/v1/tutorialVidesController');
const {
  addEditShoorahPods,
  shoorahPodsList,
  deleteShoorahPods,
  getShoorahPod
} = require('@controllers/admin/v1/shoorahPodsController');
const { getEarningList } = require('@controllers/admin/v1/earningController');
const { countUsersAndContent } = require('@controllers/admin/v1/dashboardController');
const { getAllSosClicks } = require('@controllers/admin/v1/sosController');
const {
  getCompanyList,
  updateCompany,
  addCompany,
  getCompany
} = require('@controllers/admin/v1/companyController');
const {
  getContentCount,
  getEarningDetails,
  overallCompanyGrowth,
  b2bAdminsList,
  deleteCompanyAdmin
} = require('../../controllers/admin/v1/companyController');
const { getCategoriesByContentId } = require('../../controllers/api/v1/categoryController');
const {
  googleAnalyticsData,
  getUserPlansData,
  getB2BviaGraph,
  getB2BEarningGraph,
  getB2BAdminMoodCounts,
  downloadB2BReport
} = require('../../controllers/admin/v1/graphController');
const {
  addUser,
  importUsers,
  cancelSubscription,
  changeUserCreds,
  addUserTrial,
  userProfessionalMoodReport,
  userBeforeSleepReport,
  userAfterSleepReport,
  userWellbeingProfessionalData,
  userWellbeingPersonalData,
  userWellbeingShuruData,
  userWellbeingJournalData,
  overallWellbeingProfessionalData,
  overallWellbeingPersonalData,
  overallWellbeingShuruData,
  overallWellbeingJournalData,
  overallWellBeingReport
} = require('../../controllers/admin/v1/usersController');
const { downloadSosClickReport } = require('../../controllers/admin/v1/sosController');
const {
  getSrtReport,
  draftShoorahPodsList,
  addEditDraftShoorahPods
} = require('../../controllers/admin/v1/shoorahPodsController');
const { getShuruUsageTime } = require('../../controllers/admin/v1/shuruController');
const {
  addEditDraftMeditation,
  draftMeditationList
} = require('../../controllers/admin/v1/meditationController');
const { addEditDraftFocus, draftFocusList } = require('../../controllers/admin/v1/focusController');
const {
  addEditDraftSound,
  getDetailedDraftSoundList
} = require('../../controllers/admin/v1/soundController');
const {
  affirmationDraftDetailedList,
  addEditDraftAffirmation
} = require('../../controllers/admin/v1/affirmationController');
const {
  addEditDraftRituals,
  ritualsDraftDetailedList
} = require('../../controllers/admin/v1/ritualsController');
const {
  getAppIssues,
  updateAppIssue,
  downloadAppIssue
} = require('../../controllers/admin/v1/appIssuesController');
const {
  addEditPartner,
  partnersList,
  deletePartner,
  introduceCompaniesList,
  addIntroduceCompany
} = require('../../controllers/admin/v1/partnersController');
const {
  getJobRolesPercent,
  countUsersAndUsage
} = require('../../controllers/admin/v1/dashboardController');
const upload = require('../../middleware/multer');
const { unreadNotificationCount } = require('../../controllers/admin/v1/notificationController');

const {
  addEditIdea,
  deleteIdea,
  ideaDetailedList,
  getIdea,
  addEditDraftIdeas,
  ideasDraftDetailedList
} = require('@controllers/admin/v1/ideasController');

//Admin survey constant start here
const {
  testsurvey,
  uploadSurveyMedia,
  createsurvey,
  updatesurvey,
  getSurveyDetails,
  deleteSurveyDetails,
  getAllSurveyDetails,
  submitSurvey,
  getQuestionSummary,
  getInsights,
  getSurveyDetailsByuserId,
  getAllSurveyTemplate,
  getDashboardData,
  getSurveyReport,
  getCompanyDashboardData
} = require('../../controllers/admin/v1/surveyController');
const {
  createCategory,
  updateCategory,
  getCategoryDetails,
  getAllCategory,
  deleteCategoryDetails
} = require('../../controllers/admin/v1/categoryController');
const { addsurveyValidation } = require('../../services/adminValidations/surveyValidations');
const {
  getRippleUsageTime,
  downloadRippleReport
} = require('../../controllers/admin/v1/rippleController');
const { getBeforeSleep, getAfterSleep } = require('../../controllers/admin/v1/sleeplogsController');
const {
  addEditBreathwork,
  deleteBreathwork,
  breathworkList,
  getBreathwork,
  getBreathworkInsights,
  addSolutionBreathwork,
  addEditDraftBreathwork,
  draftBreathworkList,
  addReportBreathwork
} = require('../../controllers/admin/v1/breathworkContoller');
const { adminDirectLogin } = require('../../controllers/admin/v1/authController');
const {
  getDailyNudges,
  getPersonalMoodsReports,
  solutionCreation,
  getProfessionalMoodsReports,
  getOverallMoodsReports,
  getShuruTheraphyData
} = require('../../controllers/admin/v1/zapierController');
const { updateSrtData } = require('../../controllers/admin/v1/srtController');
const {
  addEditExpert,
  expertsList,
  deleteExpert,
  getExpertProfile,
  getExpertAttachments,
  getExpertApprovals,
  updateExpertApprovals,
  getApprovalDataById,
  approveOrRejectExpertProfile,
  approveOrRejectExpert,
  getExpertStausList,
  getExpertAccountInfo,
  expertProfileAction,
  googleAuthRedirect,
  generateAuthUrl
} = require('../../controllers/admin/v1/expertController');
const {
  addSurvey,
  editSurvey,
  addEditSurveyCategory,
  getAllSurveyCategory,
  getSurveyById,
  getAllSurveys,
  deleteSurvey
} = require('../../controllers/admin/v1/appSurveyController');
const {
  getAllUserEmotions,
  getUserEmotions
} = require('../../controllers/admin/v1/userEmotionController');
const { getUserFeedbacks } = require('../../controllers/admin/v1/helpUsController');
const {
  getPodExperts,
  addPodExpert,
  updatePodExpert,
  getPodExpertNameList
} = require('@root/src/controllers/admin/v1/podExpertsController');
const { adminTokenAuth, isSuperOrSubAdmin, isSuperAdmin } = require('@middleware/adminAuth');
const validate = require('@middleware/validator');
const {
  addSurveySchema,
  editSurveySchema,
  getSurveyByIdSchema,
  getAllSurveysSchema,
  deleteSurveySchema,
  surveyApprovalSchema
} = require('@root/src/routes/admin/schemas/v1');
const { surveyApproval } = require('@controllers/admin/v1/appSurveyController');
const { getSpecialisationList } = require('@controllers/admin/v1/specialisationController');
const {
  getSpecialisationListSchema,
  getExpertCategorySchema,
  addSpecialisationToListSchema
} = require('@root/src/routes/admin/schemas/v1');
const { meditationListSchema } = require('@root/src/routes/admin/schemas/podsSchema');
const { getExpertCategory } = require('@root/src/controllers/admin/v1/expertCategorycontroller');

router.post('/login', adminLogin);
router.post('/resend-otp', resendOtp);
router.post('/verify-otp', adminOTPVerify);
router.post('/forgot-password', adminForgetPassword);
router.post('/change-password', adminTokenAuth, adminChangePassword);
router.post('/reset-password', adminResetPassword);
router.delete('/device-token', adminTokenAuth, removeAdminDeviceToken);
router.post('/device-token', adminTokenAuth, addEditDeviceToken);

// Admins
router.post('/admins', adminTokenAuth, addEditAdmin);
router.get('/admins', adminTokenAuth, isSuperOrSubAdmin, adminsList);
router.delete('/admins', adminTokenAuth, deleteAdmin);
router.get('/admin-list', adminTokenAuth, isSuperOrSubAdmin, adminNameList);
router.get('/admin-access', adminTokenAuth, getUserAccess);

// CMS
router.post('/cms', adminTokenAuth, addEditCMS);
router.get('/cms', adminTokenAuth, cmsList);
router.delete('/cms', adminTokenAuth, deleteCms);

// App configs
router.post('/config', adminTokenAuth, updateConfig);
router.get('/config', adminTokenAuth, configList);

// Users
router.get('/users', adminTokenAuth, usersList);
router.put('/users', adminTokenAuth, editUser);
router.get('/users/:userId', adminTokenAuth, getUserDetail);
router.get('/my-drafts', adminTokenAuth, myDraftContent);
router.get('/users-mood', adminTokenAuth, userMoodReport);
router.get('/user-professonal-report', adminTokenAuth, userProfessionalMoodReport);
router.get('/user-before-sleep-report', adminTokenAuth, userBeforeSleepReport);
router.get('/user-after-sleep-report', adminTokenAuth, userAfterSleepReport);

router.get('/performance-data', adminTokenAuth, userPerformanceData);
router.get('/badge-count', adminTokenAuth, userBadgeCount);
router.get('/badge', adminTokenAuth, userBadgeDetails);

// Focus
router.post('/focus', adminTokenAuth, addEditFocus);
router.post('/draft-focus', adminTokenAuth, addEditDraftFocus);
router.get('/draft-focus', adminTokenAuth, draftFocusList);
router.get('/focus', adminTokenAuth, focusList);
router.delete('/focus', adminTokenAuth, deleteFocus);
router.get('/focus/:focusType', adminTokenAuth, focusNameList);
router.get('/focus/view/:id', adminTokenAuth, getFocus);

// Meditations
router.post('/meditation', adminTokenAuth, addEditMeditation);
router.post('/draft-meditation', adminTokenAuth, addEditDraftMeditation);
router.delete('/meditation', adminTokenAuth, deleteMeditation);
router.get('/draft-meditation', adminTokenAuth, draftMeditationList);
router.get(
  '/meditation',
  adminTokenAuth,
  isSuperOrSubAdmin,
  validate(meditationListSchema, 'meditation', true),
  meditationList
);
router.get('/meditation/:id', adminTokenAuth, getMeditation);

// Sounds
router.post('/sound', adminTokenAuth, addEditSound);
router.post('/draft-sound', adminTokenAuth, addEditDraftSound);
router.delete('/sound', adminTokenAuth, deleteSound);
router.get('/draft-sound', adminTokenAuth, getDetailedDraftSoundList);
router.get('/sound', adminTokenAuth, getDetailedSoundList);
router.get('/sound/:id', adminTokenAuth, getSound);

// Gratitudes
router.post('/gratitude', adminTokenAuth, addEditGratitude);
router.get('/gratitude', adminTokenAuth, gratitudeDetailedList);
router.delete('/gratitude', adminTokenAuth, deleteGratitude);

// Rituals
router.post('/ritual', adminTokenAuth, addEditRituals);
router.get('/ritual', adminTokenAuth, ritualsDetailedList);
router.post('/draft-ritual', adminTokenAuth, addEditDraftRituals);
router.get('/draft-ritual', adminTokenAuth, ritualsDraftDetailedList);
router.delete('/ritual', adminTokenAuth, deleteRituals);
router.get('/ritual/:id', adminTokenAuth, getRitual);

// Affirmation
router.post('/affirmation', adminTokenAuth, addEditAffirmation);
router.get('/affirmation', adminTokenAuth, affirmationDetailedList);
router.get('/draft-affirmation', adminTokenAuth, affirmationDraftDetailedList);
router.post('/draft-affirmation', adminTokenAuth, addEditDraftAffirmation);
router.delete('/affirmation', adminTokenAuth, deleteAffirmation);
router.post('/affirmation-csv', adminTokenAuth, addAffirmationCsv);
router.get('/affirmation/:id', adminTokenAuth, getAffirmation);

// Content Approval
router.get('/content-approval', adminTokenAuth, isSuperOrSubAdmin, contentApprovalList);
router.put('/content-approval', adminTokenAuth, contentApproval);
router.get('/content-approval/:contentType/:contentId', adminTokenAuth, getContentDetails);

// Top picks
router.post('/top-picks', adminTokenAuth, addEditTopPicks);
router.get('/top-picks', adminTokenAuth, topPicksDetails);
router.delete('/top-picks', adminTokenAuth, deleteTopPicks);

// get contents based on content type
router.get('/content-type', adminTokenAuth, getContentTypeList);

// Notification
router.post('/notification', adminTokenAuth, addNotification);
router.get('/notification', adminTokenAuth, notificationDetailedList);
router.get('/users-email-list', adminTokenAuth, usersEmailList);
router.delete('/notification', adminTokenAuth, deleteMyNotification);
router.get('/unread-notification', adminTokenAuth, unreadNotificationCount);

// bulk user/contnet status update
router.post('/content-status', adminTokenAuth, bulkContentStatusUpdate);
router.post('/user-status', adminTokenAuth, bulkUserStatusUpdate);

// Tutorial Videos
router.post('/tutorial-video', adminTokenAuth, addEditTutorialVideos);
router.get('/tutorial-video', adminTokenAuth, getTutorialVideo);

// User Refresh Toekn
router.post('/refresh-token', refreshJwtToken);

// Shoorah Pods
router.post('/shoorah-pods', adminTokenAuth, addEditShoorahPods);
router.post('/draft-shoorah-pods', adminTokenAuth, addEditDraftShoorahPods);
router.delete('/shoorah-pods', adminTokenAuth, deleteShoorahPods);
router.get('/draft-shoorah-pods', adminTokenAuth, draftShoorahPodsList);
router.get('/shoorah-pods', adminTokenAuth, shoorahPodsList);
router.get('/shoorah-pods/:id', adminTokenAuth, getShoorahPod);

// Earning
router.get('/earnings', adminTokenAuth, getEarningList);

// Dashboard
router.get('/content-count', adminTokenAuth, countUsersAndContent);

// Sos
router.post('/sos-count', adminTokenAuth, getAllSosClicks);

//Ideas API
router.post('/idea', adminTokenAuth, addEditIdea);
router.get('/idea', adminTokenAuth, ideaDetailedList);
router.post('/draft-idea', adminTokenAuth, addEditDraftIdeas);
router.get('/draft-idea', adminTokenAuth, ideasDraftDetailedList);
router.get('/idea/:id', getIdea);
router.delete('/idea-delete', deleteIdea);

//Survey API

// router.get('/tetsurvey', testsurvey);
// router.post('/survey', adminTokenAuth, createsurvey);
// router.post('/survey/upload', adminTokenAuth, upload.any(), uploadSurveyMedia);
// router.get('/survey/report', getSurveyReport);
// router.put('/survey/:id', adminTokenAuth, updatesurvey);
// router.get('/survey/:id', adminTokenAuth, getSurveyDetails);
// router.get('/survey/:id/:user_id', getSurveyDetailsByuserId);
// router.get('/survey', adminTokenAuth, getAllSurveyDetails);
// router.get('/survey?page=1&perPage=2&surveyName=est', adminTokenAuth, getAllSurveyDetails);
// router.delete('/survey-delete', adminTokenAuth, deleteSurveyDetails);
// router.get('/survey-template/:template_type', adminTokenAuth, getAllSurveyTemplate);
// router.get('/survey-template', adminTokenAuth, getAllSurveyTemplate);
//Submit Survey API
// router.post('/survey-submit', submitSurvey);
router.get('/dashboard', adminTokenAuth, getDashboardData);
// router.get('/dashboard/:survey_count_type', adminTokenAuth, getDashboardData);
router.get('/company-dashboard/', adminTokenAuth, getCompanyDashboardData);

// router.get('/summary/:surveyId', getQuestionSummary);

// router.get('/insights/:surveyId', getInsights);

//Category API
router.post('/category', createCategory);
router.put('/category/:id', updateCategory);
router.get('/category/:id', getCategoryDetails);
router.get('/category', getAllCategory);
router.delete('/category-delete', deleteCategoryDetails);
// Company
router.get('/company/company-list', adminTokenAuth, getCompanyList);
router.get('/company/:id', adminTokenAuth, getCompany);
router.put('/company/update/:id', adminTokenAuth, updateCompany);
router.post('/company/addCompany', adminTokenAuth, addCompany);

router.get('/company/contents/count', adminTokenAuth, getContentCount);

router.get('/earning/companyEarnings', adminTokenAuth, getEarningDetails);

router.get('/company/moods/analytics', adminTokenAuth, overallCompanyGrowth);
router.get('/getCategoriesByContentId/:id', adminTokenAuth, getCategoriesByContentId);

router.get('/googleAnalyticsData', adminTokenAuth, googleAnalyticsData);
router.get('/getUserPlansData', adminTokenAuth, getUserPlansData);
router.get('/getB2BviaGraph', adminTokenAuth, getB2BviaGraph);
router.get('/getB2BEarningsGraph', adminTokenAuth, getB2BEarningGraph);
router.post('/add-user', adminTokenAuth, addUser);

router.get('/downloadSosClickReport', adminTokenAuth, downloadSosClickReport);
router.post('/getSrtReport', getSrtReport);

router.get('/getShuruUsageTime', adminTokenAuth, getShuruUsageTime);
router.get('/getAppIssues', adminTokenAuth, getAppIssues);
router.post('/updateAppIssue', adminTokenAuth, updateAppIssue);
router.get('/app-issue/:id', adminTokenAuth, downloadAppIssue);

router.get('/getB2BAdminMoodCounts', adminTokenAuth, getB2BAdminMoodCounts);

router.post('/add-partner', adminTokenAuth, addEditPartner);

router.get('/partners', adminTokenAuth, isSuperOrSubAdmin, partnersList);
router.delete('/partners', adminTokenAuth, deletePartner);
router.get('/introduce-companies', adminTokenAuth, isSuperOrSubAdmin, introduceCompaniesList);

router.post('/edit-introduce', adminTokenAuth, upload.any(), addIntroduceCompany);

router.post('/get-jobs-percent', adminTokenAuth, getJobRolesPercent);
router.post('/import-users', [adminTokenAuth, upload.any()], importUsers);
router.get('/b2b-admin-list', adminTokenAuth, b2bAdminsList);
router.delete('/delete-admin', adminTokenAuth, deleteCompanyAdmin);

router.post('/b2b-overall-report', downloadB2BReport);
router.post('/cancel-subscription', cancelSubscription);
router.post('/resend-creds', changeUserCreds);
router.post('/add-user-trial', adminTokenAuth, addUserTrial);

router.get('/ripple-usage', getRippleUsageTime);
router.get('/ripple-report', downloadRippleReport);
router.get('/get-before-sleep', getBeforeSleep);
router.get('/get-after-sleep', getAfterSleep);

// Breathworks
router.post('/breathwork', adminTokenAuth, addEditBreathwork);
router.post('/draft-breathwork', adminTokenAuth, addEditDraftBreathwork);
router.delete('/breathwork', adminTokenAuth, deleteBreathwork);
router.get('/draft-breathwork', adminTokenAuth, draftBreathworkList);
router.get('/breathwork', adminTokenAuth, breathworkList);
router.get('/breathwork/:id', adminTokenAuth, getBreathwork);

// Zapier APIS
router.post('/admin-login', adminDirectLogin);
router.get('/get-random-nudge', getDailyNudges);
router.get('/mood-stats', adminTokenAuth, getPersonalMoodsReports);
router.get('/professional-mood-stats', adminTokenAuth, getProfessionalMoodsReports);
router.get('/overall-mood-stats', adminTokenAuth, getOverallMoodsReports);
router.get('/shuru-theraphy-stats', adminTokenAuth, getShuruTheraphyData);
router.get('/generate-solution', adminTokenAuth, solutionCreation);

router.get('/breathwork-insights', adminTokenAuth, getBreathworkInsights);
router.post('/breathwork-solution', adminTokenAuth, addSolutionBreathwork);
router.post('/breathwork-report', adminTokenAuth, addReportBreathwork);

router.post('/update-srt', updateSrtData);

router.get('/count-users-and-usage', countUsersAndUsage);
router.get('/user-wellbeing-professional-data', adminTokenAuth, userWellbeingProfessionalData);
router.get('/user-wellbeing-personal-data', adminTokenAuth, userWellbeingPersonalData);
router.get('/user-wellbeing-shuru-data', adminTokenAuth, userWellbeingShuruData);
router.get('/user-wellbeing-journal-data', adminTokenAuth, userWellbeingJournalData);

router.get(
  '/overall-wellbeing-professional-data',
  adminTokenAuth,
  overallWellbeingProfessionalData
);
router.get('/overall-wellbeing-personal-data', adminTokenAuth, overallWellbeingPersonalData);
router.get('/overall-wellbeing-shuru-data', adminTokenAuth, overallWellbeingShuruData);
router.get('/overall-wellbeing-journal-data', adminTokenAuth, overallWellbeingJournalData);
router.post('/overall-wellbeing-report', adminTokenAuth, overallWellBeingReport);

// Expert APIS
router.post('/add-expert', adminTokenAuth, addEditExpert);
router.get('/get-experts', adminTokenAuth, isSuperOrSubAdmin, expertsList);
router.get('/get-admin-expert-profile', adminTokenAuth, isSuperOrSubAdmin, getExpertProfile);
router.delete('/delete-expert', adminTokenAuth, deleteExpert);
router.get('/get-attachments', adminTokenAuth, isSuperOrSubAdmin, getExpertAttachments);
router.get('/get-approvals', adminTokenAuth, isSuperOrSubAdmin, getExpertApprovals);
router.post('/update-approvals', adminTokenAuth, updateExpertApprovals);
router.get('/get-approval-by-id', adminTokenAuth, isSuperOrSubAdmin, getApprovalDataById);
router.get('/get-expert-status-list', adminTokenAuth, isSuperOrSubAdmin, getExpertStausList);
router.get('/get-expert-account-info', adminTokenAuth, isSuperOrSubAdmin, getExpertAccountInfo);
router.post('/expert-profile-action', adminTokenAuth, isSuperOrSubAdmin, expertProfileAction);
router.get('/google/redirect', googleAuthRedirect);
router.get('/auth-url', generateAuthUrl);

// new survey apis
router.post(
  '/survey',
  adminTokenAuth,
  isSuperOrSubAdmin,
  upload.any(),
  validate(addSurveySchema, 'addSurvey'),
  addSurvey
);
router.put(
  '/survey',
  adminTokenAuth,
  isSuperOrSubAdmin,
  upload.any(),
  validate(editSurveySchema, 'editSurvey'),
  editSurvey
);
router.get(
  '/get-survey-by-id',
  adminTokenAuth,
  isSuperOrSubAdmin,
  validate(getSurveyByIdSchema, 'getSurvey', true),
  getSurveyById
);
router.get(
  '/get-surveys',
  adminTokenAuth,
  isSuperOrSubAdmin,
  validate(getAllSurveysSchema, 'getAllSurveys', true, { filterEmptyStrings: true }),
  getAllSurveys
);
// router.post('/send-survey-notification', adminTokenAuth, sendSurveyNotification);
router.delete(
  '/delete-survey',
  adminTokenAuth,
  isSuperOrSubAdmin,
  validate(deleteSurveySchema, 'deleteSurvey', true),
  deleteSurvey
);
router.post(
  '/survey-approval',
  adminTokenAuth,
  isSuperAdmin,
  validate(surveyApprovalSchema, 'approveSurveys'),
  surveyApproval
);

router.post('/add-edit-categories', adminTokenAuth, addEditSurveyCategory);
router.get('/get-categories', adminTokenAuth, isSuperOrSubAdmin, getAllSurveyCategory);
// router.get('/get-templates', adminTokenAuth, getAllTemplateSurveys);

router.get('/get-user-emotions', adminTokenAuth, isSuperOrSubAdmin, getAllUserEmotions);
router.get('/get-emotions', adminTokenAuth, isSuperOrSubAdmin, getUserEmotions);
router.get('/get-user-feeds', adminTokenAuth, getUserFeedbacks);

// ===================================== Pod Experts =====================================
router.get('/pod-expert-profile', adminTokenAuth, isSuperOrSubAdmin, getPodExperts);
router.post('/pod-expert-profile', adminTokenAuth, isSuperOrSubAdmin, upload.any(), addPodExpert);
router.put('/pod-expert-profile', adminTokenAuth, isSuperOrSubAdmin, upload.any(), updatePodExpert);
router.get('/pod-expert-name-list', adminTokenAuth, isSuperOrSubAdmin, getPodExpertNameList);

// ===================================== Pod Expert Category =====================================
router.get(
  '/expert-category',
  adminTokenAuth,
  isSuperOrSubAdmin,
  validate(getExpertCategorySchema, 'getEgetAllExpertDocumentsxpertCategory', true),
  getExpertCategory
);

// ===================================== Specialisation =====================================
router.get(
  '/specialisations',
  adminTokenAuth,
  isSuperOrSubAdmin,
  validate(getSpecialisationListSchema, 'getSpecialisationList', true),
  getSpecialisationList
);

module.exports = router;
