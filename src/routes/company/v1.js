'use strict';

const router = require('express').Router();
// const { getAllDraftsSurveys } = require('../../controllers/admin/v1/appSurveyController');
const {
  addEditB2BSurvey,
  addEditB2BSurveyCategory,
  getAllB2BSurveyCategory,
  // getSurveyB2BById,
  getAllB2BSurveys,
  // sendB2BSurveyNotification,
  deleteB2BSurvey
  // getAllDraftsB2BSurveys,
  // getAllB2BTemplateSurveys
} = require('../../controllers/company/v1/appSurveyController');
const {
  updateCompany,
  refreshJwtToken,
  getCompanyStatus
} = require('../../controllers/company/v1/authController');
const {
  addUser,
  getUser,
  updateUser,
  companyUsersList,
  importUsers,
  mentalHealth,
  personalMoods,
  getContentUserLocation,
  professionalMoods,
  mentalHealthByProfessionalMoods,
  getOverallMoodScore,
  addSolution,
  getSolutionByFilter,
  addReport,
  getAllReport,
  getReport,
  getSolutionById,
  getShuruTheraphyData,
  deleteUser,
  getBeforeSleepData,
  getAfterSleepData,
  addSleepReport,
  updateCompanyData,
  getBreathworkInsights,
  addReportBreathworkB2B
} = require('../../controllers/company/v1/companyController');
const {
  b2BContentApprovalList,
  b2bContentApproval,
  b2bGetContentDetails
} = require('../../controllers/company/v1/contentApprovalController');
const {
  getActiveUsersAndTime,
  getRecentJoinedEmployees,
  getEmployeeActivity,
  getTrendingContent,
  getJournalContentUsage,
  getB2BAdminList,
  addB2BMood,
  getB2BAdminMood,
  getB2BUsers,
  sendPraiseToUsers,
  addEditAdmin,
  adminsList,
  deleteAdmin,
  countUsersAndUsageB2B
} = require('../../controllers/company/v1/dashboardController');
const {
  getBadgesStats,
  getB2BbadgesStatsByGender,
  getTotalBadges
} = require('../../controllers/company/v1/graphController');
const {
  notificationDetailedList,
  addNotification,
  usersEmailList,
  deleteMyNotification,
  unreadNotificationCount
} = require('../../controllers/company/v1/notificationController');
const { sendBotMessage, getClientToken } = require('../../controllers/company/v1/slackController');
const {
  getAllSosClicks,
  downloadSosClickReport
} = require('../../controllers/company/v1/sosController');
const {
  getStripePaymentIntend,
  getStripeSeatsIntend,
  cancelAutoRenew
} = require('../../controllers/company/v1/subscriptionController');
const {
  getAllB2BUserEmotions,
  getB2BUserEmotions
} = require('../../controllers/company/v1/userEmotionController');
const { adminTokenAuth } = require('../../middleware/adminAuth');
const upload = require('../../middleware/multer');
const {
  isCompanySuperOrSubAdmin,
  isSuperAdmin,
  isCompanySuperAdmin
} = require('@middleware/adminAuth');
const validate = require('@middleware/validator');
const { addEditSurveySchema, surveyApprovalSchema } = require('@root/src/routes/admin/schemas/v1');
const {
  addEditB2BSurveySchema,
  getB2BSurveyByIdSchema,
  getAllB2BSurveysSchema,
  deleteB2BSurveySchema,
  b2bSurveyApprovalSchema
} = require('@root/src/routes/company/schemas/v1');
const {
  getB2BSurveyById,
  b2bSurveyApproval
} = require('@controllers/company/v1/appSurveyController');
const { surveyApproval } = require('@controllers/admin/v1/appSurveyController');

// Company Admin
router.post('/refresh-token', adminTokenAuth, refreshJwtToken);
router.post('/updateCompany', adminTokenAuth, updateCompany);
router.post('/addUser', adminTokenAuth, addUser);
router.delete('/delete-user', adminTokenAuth, deleteUser);
router.get('/company-user/:id', adminTokenAuth, getUser);
router.put('/user-update/:id', adminTokenAuth, updateUser);
router.get('/users', adminTokenAuth, companyUsersList);
router.post('/addmultyUser', [adminTokenAuth, upload.any()], importUsers);
router.get('/filter-user-data', getContentUserLocation);

router.get('/dashboard/personal-moods', adminTokenAuth, personalMoods);
router.get('/dashboard/professional-moods', adminTokenAuth, professionalMoods);
router.get('/dashboard/mood/overall-score', adminTokenAuth, getOverallMoodScore);
router.post('/add-solution', adminTokenAuth, addSolution);
router.get('/get-solution-by-id', adminTokenAuth, getSolutionById);
router.get('/get-allsolution', adminTokenAuth, getSolutionByFilter);
router.get('/getBadgesStats', adminTokenAuth, getBadgesStats);
router.get('/getB2BbadgesStatsByGender', adminTokenAuth, getB2BbadgesStatsByGender);
router.get('/getTotalBadges', adminTokenAuth, getTotalBadges);
router.get('/getActiveUsersAndTime', adminTokenAuth, getActiveUsersAndTime);
router.get('/getRecentJoinedEmployees', adminTokenAuth, getRecentJoinedEmployees);
router.get('/getEmployeeActivity', adminTokenAuth, getEmployeeActivity);
router.get('/getTrendingContent', adminTokenAuth, getTrendingContent);
router.get('/getJournalContentUsage', adminTokenAuth, getJournalContentUsage);
router.get('/getB2BAdminList', adminTokenAuth, getB2BAdminList);
router.post('/addB2BMood', adminTokenAuth, addB2BMood);
router.get('/getB2BAdminMood', adminTokenAuth, getB2BAdminMood);
router.get('/getB2BUsers', adminTokenAuth, getB2BUsers);
router.post('/sendPraiseToUsers', adminTokenAuth, sendPraiseToUsers);
router.post('/add-report', adminTokenAuth, addReport);
router.get('/get-allreports', adminTokenAuth, getAllReport);
router.get('/get-report', adminTokenAuth, getReport);
router.post('/sos-clicks', adminTokenAuth, getAllSosClicks);
router.post('/sos-report', adminTokenAuth, downloadSosClickReport);

router.post('/admins', adminTokenAuth, addEditAdmin);
router.get('/admins', adminTokenAuth, adminsList);
router.delete('/admins', adminTokenAuth, deleteAdmin);

router.post('/notification', adminTokenAuth, addNotification);
router.get('/notification', adminTokenAuth, notificationDetailedList);
router.get('/users-email-list', adminTokenAuth, usersEmailList);
router.delete('/notification', adminTokenAuth, deleteMyNotification);
router.get('/unread-notification', adminTokenAuth, unreadNotificationCount);

router.get('/dashboard/mental-health/:mood', adminTokenAuth, mentalHealth);
router.get('/dashboard/professional-mood/mental-health/:mood', mentalHealthByProfessionalMoods);
// router.put('/update-solution', adminTokenAuth, updateSolution);
router.get('/shuru-theraphy-graph', getShuruTheraphyData);

router.get('/get-before-sleep-data', adminTokenAuth, getBeforeSleepData);
router.get('/get-after-sleep-data', adminTokenAuth, getAfterSleepData);

router.post('/add-sleep-report', adminTokenAuth, addSleepReport);
router.get('/get-company-status', getCompanyStatus);

router.post('/update-seats', adminTokenAuth, updateCompanyData);

router.post('/create-session', adminTokenAuth, getStripePaymentIntend);
router.post('/create-seat-session', adminTokenAuth, getStripeSeatsIntend);

router.get('/breathwork-company-insights', adminTokenAuth, getBreathworkInsights);

// new dashboard apis
router.get('/post-message', sendBotMessage);
router.post('/get-client-token', getClientToken);
router.get('/B2B-users-and-usage', adminTokenAuth, countUsersAndUsageB2B);

router.post('/add-breathwork-report', adminTokenAuth, addReportBreathworkB2B);
router.post('/reset-auto-renew', adminTokenAuth, cancelAutoRenew);

// new survey apis
router.post(
  '/add-edit-b2b-survey',
  adminTokenAuth,
  isCompanySuperOrSubAdmin,
  validate(addEditB2BSurveySchema, 'addEditB2BSurvey'),
  addEditB2BSurvey
);
router.get(
  '/get-b2b-survey-by-id',
  adminTokenAuth,
  isCompanySuperOrSubAdmin,
  validate(getB2BSurveyByIdSchema, 'getSurveyB2BById', true),
  getB2BSurveyById
);
router.get(
  '/get-b2b-surveys',
  adminTokenAuth,
  isCompanySuperOrSubAdmin,
  validate(getAllB2BSurveysSchema, 'getAllB2BSurveys', true, { filterEmptyStrings: true }),
  getAllB2BSurveys
);
router.delete(
  '/delete-b2b-survey',
  adminTokenAuth,
  isCompanySuperOrSubAdmin,
  validate(deleteB2BSurveySchema, 'deleteB2BSurvey', true),
  deleteB2BSurvey
);
router.post(
  '/b2b-survey-approval',
  adminTokenAuth,
  isCompanySuperAdmin,
  validate(b2bSurveyApprovalSchema, 'approveB2BSurveys'),
  b2bSurveyApproval
);

router.post('/add-edit-b2b-categories', adminTokenAuth, addEditB2BSurveyCategory);
router.get('/get-b2b-categories', adminTokenAuth, getAllB2BSurveyCategory);
// router.post('/send-b2b-survey-notification', adminTokenAuth, sendB2BSurveyNotification);
router.get('/b2b-content-approval', adminTokenAuth, b2BContentApprovalList);
router.put('/b2b-content-approval', adminTokenAuth, b2bContentApproval);
router.get('/b2b-content-approval/:contentType/:contentId', adminTokenAuth, b2bGetContentDetails);
// router.get('/b2b-templates-survey', adminTokenAuth, getAllB2BTemplateSurveys);
// router.get('/b2b-draft-surveys', adminTokenAuth, getAllDraftsB2BSurveys);

router.get('/get-user-emotions', adminTokenAuth, getAllB2BUserEmotions);
router.get('/get-b2b-user-emotions', adminTokenAuth, getB2BUserEmotions);

module.exports = router;
