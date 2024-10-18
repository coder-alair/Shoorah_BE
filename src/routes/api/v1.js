'use strict';

const router = require('express').Router();
const { userTokenAuth, extractHeaders } = require('@root/src/middleware/userAuth');
const {
  userSignUp,
  resendConfirmationMail,
  verifyEmailToken,
  userLogIn,
  userOTPVerify,
  userForgotPassword,
  userResetPassword,
  userChangePassword,
  removeUserDeviceToken,
  versionCompatibility,
  updateOnBoardStep,
  getOnBoardStep,
  refreshJwtToken,
  getUserSubscriptionStatus,
  deleteUserAccount,
  subscriptionConfigList
} = require('@controllers/api/v1/authController');
const {
  addUserInterest,
  focusList,
  getUserInterestdetails
} = require('@controllers/api/v1/userInterestController');
const {
  getUserProfile,
  editUserProfile,
  editUserProfileWeb
} = require('@controllers/api/v1/userProfileController');
const {
  addEditMood,
  getMoodDetails,
  getLatestMoodDetails,
  downloadMoodReport
} = require('@controllers/api/v1/moodController');
const {
  getVisionBoardSetting,
  visionBoardSetting,
  addEditVision,
  getUserVisonBoard,
  deleteMyVision,
  reorderVision
} = require('../../controllers/api/v1/visionBoardController');

const {
  addEditVisionItemsController,
  getVisionsDetailedItemList,
  deleteVisionItemList,
  reorderVisionItemsList
} = require('../../controllers/api/v1/visionItemController');
const { getIdea, ideaDetailedList } = require('../../controllers/admin/v1/ideasController');

const {
  getAllSurveyDetails,
  submitSurvey,
  getSurveyDetailsByuserId
} = require('../../controllers/admin/v1/surveyController');

const {
  addEditGoals,
  myGoalsList,
  myDraftGoals,
  deleteGoal
} = require('@controllers/api/v1/goalsController');
const {
  addEditCleanse,
  cleanseDetailedList,
  deleteCleanse,
  getCleanseTodayRecord
} = require('@controllers/api/v1/cleanseController');
const {
  listUserNotification,
  deleteNotification,
  unreadUserNotificationCount
} = require('@controllers/api/v1/notificationController');
const {
  addToBookmarks,
  bookmarksList,
  removeBookmark,
  allBookMarksList
} = require('@controllers/api/v1/bookmarkController');
const { socialLogin } = require('@controllers/api/v1/socialLoginController');
const {
  addUserGratitude,
  userGratitudeDetailedList,
  exploreGratitudes,
  deleteGratitude,
  getGratitudeTodayRecord
} = require('@controllers/api/v1/userGratitudeController');
const {
  shoorahRituals,
  addMyRituals,
  myRitualList,
  deleteMyRitual,
  myRitualsCompletedStatus,
  myRitualsCompletedStatusList
} = require('@controllers/api/v1/userRitualsController');
const { addUpdateReminder, reminderList } = require('@controllers/api/v1/userReminderController');
const {
  restoreMeditationList,
  restoreSoundList,
  shoorahPodsList
} = require('@controllers/api/v1/restoreController');
const { getTutorialVideo } = require('@controllers/api/v1/tutorialVideoController');
const {
  addEditUserNotes,
  userNotesDetailedList,
  deleteNote
} = require('@controllers/api/v1/userNotesController');
const { todayAffirmation } = require('@controllers/api/v1/affirmationController');
const {
  addToRecentlyPlayed,
  recentlyPlayedList
} = require('@controllers/api/v1/recentlyPlayedController');
const { addToTrending, getTrending } = require('@controllers/api/v1/trendingsController');
const { createAppleSignature } = require('@controllers/api/v1/subscriptionController');
const { userSubscriptionStatus } = require('@root/src/middleware/userSubscriptionStatus');
const {
  verifyInAppPurchase,
  checkAppConsistency
} = require('@controllers/api/v1/subscriptionController');
const { updateUserActivityCount } = require('@controllers/api/v1/userActivityCountsController');
const { totalBadgesCount, badgeDetailsList } = require('@controllers/api/v1/userBadgesController');
const { cmsDetailedList } = require('@controllers/api/v1/cmsController');
const {
  exploreList,
  getContentDetails,
  getRecommendedList
} = require('@controllers/api/v1/exploreController');
const { sosClick } = require('@controllers/api/v1/sosController');
const { socialLoginWeb } = require('../../controllers/api/v1/socialLoginController');
const {
  userEmailPhoneLogIn,
  userForgottedPassword,
  addContentToAws
} = require('../../controllers/api/v1/authController');
const {
  addProfessionalMood,
  getProfessionalMoodDetails,
  getLatestProfessionalMoodDetails,
  downloadProfessionalMoodReport,
  getMood,
  setMood,
  getMoodRecord,
  getUserMood
} = require('../../controllers/api/v1/moodController');
const { getUserIntrest, myFocuses } = require('../../controllers/api/v1/userInterestController');
const {
  addEditAffirmation,
  affirmationDetailedList,
  deleteAffirmation,
  shoorahAffirmations
} = require('../../controllers/api/v1/affirmationController');
const { sosCallClick } = require('../../controllers/api/v1/sosController');
const {
  timeSpent,
  askMe,
  getHistory,
  chatSession,
  getSession,
  downloadShuruReport,
  getShuruFeedback,
  openai,
  getHistoryDates,
  getHistories,
  addEditTimeSpent,
  getInsights
} = require('../../controllers/api/v1/historyController');
const { getSoundById } = require('../../controllers/api/v1/soundController');
const {
  getStripPayment,
  getStripePaymentIntend,
  stripeWebhook,
  freeSubscription,
  cancelSubscription
} = require('../../controllers/api/v1/subscriptionController');
const {
  getAllFocus,
  getCategoriesByContentId,
  getAffirmationFocuses
} = require('../../controllers/api/v1/categoryController');
const upload = require('../../middleware/multer');
const {
  addEditCustomRitual,
  myRitualDraftList
} = require('../../controllers/api/v1/userRitualsController');
const { getTrendingByContentType } = require('../../controllers/api/v1/trendingsController');
const { addAppIssue } = require('../../controllers/api/v1/appIssuesController');
const {
  getKlaviyoList,
  addKlaviyoList,
  deleteKlaviyoList,
  addMemberToKlaviyoList,
  addMembersToKlaviyoList,
  updateMember
} = require('../../controllers/api/v1/klaviyoController');
const { getUsersList } = require('../../controllers/api/v1/userProfileController');
const { getThoughtOfDay, getNudges } = require('../../controllers/api/v1/thoughtController');
const { getRandomPictures } = require('../../controllers/api/v1/getRandomPicturesController');
const {
  addRatings,
  getRatings,
  addFeatureRatings,
  getFeatureRatings,
  addContentDuration
} = require('../../controllers/api/v1/ratingController');
const {
  addEditBeforeSleep,
  addEditAfterSleep,
  getLatestBeforeSleepDetails,
  getLatestAfterSleepDetails,
  getBeforeSleepDetails,
  getAfterSleepDetails,
  downloadBeforeSleepReport,
  downloadAfterSleepReport
} = require('../../controllers/api/v1/sleepLogController');

const {
  RipplegetMood,
  RipplesetMood,
  RipplegetMoodRecord,
  RipplegetHistory,
  RippleaskMe,
  RippletimeSpent,
  RipplegetUserMood,
  RipplegetShuruFeedback,
  RipplechatSession,
  RipplegetSession,
  Rippleopenai,
  RippleUser,
  RippleAddUser
} = require('../../controllers/api/v1/rippleController');
const {
  addEditUserFolders,
  userFoldersDetailedList,
  deleteFolder
} = require('../../controllers/api/v1/usersFolderController');
const {
  addUpdateBreathworkInterests,
  getBreathworkInterests,
  breathworkList,
} = require('../../controllers/api/v1/breathworkController');
const { cleanAllCleanse } = require('../../controllers/api/v1/cleanseController');

//user emotion
const {
  addUserEmotion,
  getUserEmotions
} = require('../../controllers/api/v1/userEmotionController');
//child mode
const {
  addBeloveChild,
  getBelovedChild,
  deleteBelovedChild,
  getChildAffirmation
} = require('../../controllers/api/v1/belovedChildController');
const { addFeedback, getUserFeedback } = require('../../controllers/api/v1/helpUsController');

// Playlist
const {
  createPlaylist,
  deletePlaylist,
  getPlaylist,
  updatePlaylist,
  getSuggestedContent,
  addAudioToPlaylist,
  removeAudioFromPlaylist
} = require('../../controllers/api/v1/playlistController');

// Pod Experts
const { getPodExperts } = require('@controllers/api/v1/podExpertsController');

const {
  loginSchema,
  getRecentlyPlayedSchema,
  addRecentlyPlayedSchema,
  forgotPasswordSchema,
  createPlaylistSchema,
  deletePlaylistSchema,
  getPlaylistSchema,
  updatePlaylistSchema,
  getSuggestedContentSchema,
  playlistAddRemoveAudioSchema,
  getPodExpertsSchema,
  getSurveysSchema,
  surveySubmissionSchema
} = require('@root/src/routes/api/schemas/v1');
const validate = require('@middleware/validator');
const { isUser } = require('@root/src/middleware/adminAuth');
const { getSurveys, surveySubmission } = require('@controllers/api/v1/appSurveyController');
const { updateUserLegals, getUserLegals } = require('@root/src/controllers/api/v1/userlegalsController');

// User LRF
router.post('/signup', userSignUp);
router.post('/resend-confirmation-mail', resendConfirmationMail);
router.post('/verify-link', verifyEmailToken);
router.post('/login', extractHeaders, validate(loginSchema, 'userLogIn', false, true), userLogIn);
router.post('/userEmailPhoneLogIn', userEmailPhoneLogIn);
router.post('/verify-otp', userOTPVerify);
router.post('/forgot-password-user', userForgottedPassword);
router.post(
  '/forgot-password',
  validate(forgotPasswordSchema, 'forgotPassword', false, true),
  userForgotPassword
);
router.post('/reset-password', userResetPassword);
router.post('/change-password', userTokenAuth, userChangePassword);
router.delete('/device-token', userTokenAuth, removeUserDeviceToken);
router.delete('/delete-account', userTokenAuth, deleteUserAccount);

// User Interest
router.post('/user-interest', userTokenAuth, addUserInterest);
router.get('/focus/:focusType', userTokenAuth, focusList);
router.get('/userintrest/:focusType', getUserInterestdetails);

// User Profile
router.get('/user/:userId', userTokenAuth, getUserProfile);
router.put('/user', userTokenAuth, editUserProfile);
router.put('/user-update', userTokenAuth, editUserProfileWeb);

// Daily Personal Mood
router.post('/mood', userTokenAuth, userSubscriptionStatus, addEditMood);
router.get('/mood', userTokenAuth, userSubscriptionStatus, getMoodDetails);
router.get('/today-mood', userTokenAuth, userSubscriptionStatus, getLatestMoodDetails);
router.get('/mood-report', userTokenAuth, userSubscriptionStatus, downloadMoodReport);

//Unslase thirdparty api
router.get('/pictures', getRandomPictures);

// Survey
router.get('/survey/:id/:user_id', getSurveyDetailsByuserId);
router.get('/survey/:survey_type', userTokenAuth, getAllSurveyDetails);
router.post('/survey-submit', userTokenAuth, submitSurvey);
router.get(
  '/survey',
  userTokenAuth,
  isUser,
  validate(getSurveysSchema, 'getSurveys', true, false),
  getSurveys
);
router.post(
  '/survey/submit',
  userTokenAuth,
  isUser,
  validate(surveySubmissionSchema, 'surveySubmission', false, true),
  surveySubmission
);

// Ideas
router.get('/idea', ideaDetailedList);
router.get('/idea/:id', getIdea);

// Vision board
router.get('/my-vision-setting', userTokenAuth, getVisionBoardSetting);
router.post('/my-vision-setting-update', userTokenAuth, visionBoardSetting);
router.post('/add-edit-vision', userTokenAuth, userSubscriptionStatus, addEditVision);
router.put('/add-edit-vision', userTokenAuth, addEditVision);
router.get('/my-vision-list', userTokenAuth, getUserVisonBoard);
router.delete('/delete-vision', userTokenAuth, deleteMyVision);
router.post('/reorder-vision', userTokenAuth, reorderVision);

// Vision board item
router.post('/add-edit-vision-item', userTokenAuth, addEditVisionItemsController);
router.put('/add-edit-vision-item', userTokenAuth, addEditVisionItemsController);
router.get('/my-vision-item-list', userTokenAuth, getVisionsDetailedItemList);
router.delete('/delete-vision-item', userTokenAuth, deleteVisionItemList);
router.put('/reorder-vision-item', userTokenAuth, reorderVisionItemsList);

// Daily Professional Mood
router.post('/professional-mood', userTokenAuth, userSubscriptionStatus, addProfessionalMood);
router.get('/professional-mood', userTokenAuth, userSubscriptionStatus, getProfessionalMoodDetails);
router.get(
  '/today-professional-mood',
  userTokenAuth,
  userSubscriptionStatus,
  getLatestProfessionalMoodDetails
);
router.get(
  '/professional-mood-report',
  userTokenAuth,
  userSubscriptionStatus,
  downloadProfessionalMoodReport
);

// Goals
router.post('/goals', userTokenAuth, userSubscriptionStatus, addEditGoals);
router.get('/goals', userTokenAuth, userSubscriptionStatus, myGoalsList);
router.get('/draft-goals', userTokenAuth, userSubscriptionStatus, myDraftGoals);
router.delete('/goals', userTokenAuth, userSubscriptionStatus, deleteGoal);

// Cleanse
router.post('/cleanse', userTokenAuth, userSubscriptionStatus, addEditCleanse);
router.get('/cleanse', userTokenAuth, userSubscriptionStatus, cleanseDetailedList);
router.delete('/cleanse', userTokenAuth, userSubscriptionStatus, deleteCleanse);
router.get('/today-cleanse', userTokenAuth, userSubscriptionStatus, getCleanseTodayRecord);

// Notifications
router.get('/notification', userTokenAuth, listUserNotification);
router.delete('/notification', userTokenAuth, deleteNotification);
router.get('/unread-notification-count', userTokenAuth, unreadUserNotificationCount);

// Bookmarks
router.post('/bookmarks', userTokenAuth, userSubscriptionStatus, addToBookmarks);
router.get('/bookmarks', userTokenAuth, userSubscriptionStatus, bookmarksList);
router.delete('/bookmarks', userTokenAuth, userSubscriptionStatus, removeBookmark);
router.get('/all-bookmarks', userTokenAuth, userSubscriptionStatus, allBookMarksList);

// Social Login
router.post('/social-login', socialLogin);
router.post('/social-login-web', socialLoginWeb);

// User Gratitude
router.post('/my-gratitude', userTokenAuth, userSubscriptionStatus, addUserGratitude);
router.get('/my-gratitude', userTokenAuth, userSubscriptionStatus, userGratitudeDetailedList);
router.delete('/my-gratitude', userTokenAuth, userSubscriptionStatus, deleteGratitude);
router.get('/today-gratitude', userTokenAuth, userSubscriptionStatus, getGratitudeTodayRecord);

// Explore Gratitudes
router.get('/explore-gratitude', userTokenAuth, exploreGratitudes);

// Check app version compatibilty
router.get('/version-compatibility', versionCompatibility);

router.get('/get-mood', userTokenAuth, getMood);
router.post('/set-mood', userTokenAuth, setMood);

router.get('/mood-record', userTokenAuth, getMoodRecord);

//History Handling
router.get('/get-history', userTokenAuth, getHistory);
router.post('/ask', userTokenAuth, askMe);
router.get('/time-spent', userTokenAuth, timeSpent);
router.get('/get-user-mood', userTokenAuth, getUserMood);
router.post('/getShuruFeedback', userTokenAuth, getShuruFeedback);
router.get('/chat-session', userTokenAuth, chatSession);
router.get('/get-session', userTokenAuth, getSession);
router.post('/openai', openai);

// User Rituals
router.get('/rituals', userTokenAuth, userSubscriptionStatus, shoorahRituals);
router.post('/my-rituals', userTokenAuth, userSubscriptionStatus, addMyRituals);
router.get('/my-rituals', userTokenAuth, userSubscriptionStatus, myRitualList);
router.delete('/my-rituals', userTokenAuth, userSubscriptionStatus, deleteMyRitual);
router.post('/my-rituals-status', userTokenAuth, userSubscriptionStatus, myRitualsCompletedStatus);
router.get(
  '/my-rituals-status',
  userTokenAuth,
  userSubscriptionStatus,
  myRitualsCompletedStatusList
);

router.post('/user-ritual', userTokenAuth, userSubscriptionStatus, addEditCustomRitual);
router.get('/user-ritual-drafts', userTokenAuth, userSubscriptionStatus, myRitualDraftList);

// User Reminder
router.post('/reminder', userTokenAuth, addUpdateReminder);
router.get('/reminder', userTokenAuth, reminderList);

// Restore
router.get('/restore/meditations', userTokenAuth, userSubscriptionStatus, restoreMeditationList);
router.get('/restore/sounds', userTokenAuth, userSubscriptionStatus, restoreSoundList);

// Tutorial video
router.get('/tutorial-video', userTokenAuth, getTutorialVideo);

// User Notes
router.post('/notes', userTokenAuth, userSubscriptionStatus, addEditUserNotes);
router.get('/notes', userTokenAuth, userSubscriptionStatus, userNotesDetailedList);
router.delete('/notes', userTokenAuth, userSubscriptionStatus, deleteNote);

// On Board Steps
router.put('/onboard-steps', userTokenAuth, updateOnBoardStep);
router.get('/onboard-steps', userTokenAuth, getOnBoardStep);

// Reminder Crons
// router.get('/reminder-affirmation', reminderAffirmationCron);

// Affirmation
router.get('/today-affirmation', userTokenAuth, todayAffirmation);

// Recently Played
router.post(
  '/recently-played',
  userTokenAuth,
  userSubscriptionStatus,
  validate(addRecentlyPlayedSchema, 'recentlyPlayed', false, true),
  addToRecentlyPlayed
);
router.get(
  '/recently-played',
  userTokenAuth,
  userSubscriptionStatus,
  validate(getRecentlyPlayedSchema, 'recentlyPlayed', true, true),
  recentlyPlayedList
);

// User Refresh Toekn
router.post('/refresh-token', refreshJwtToken);

// Trendings
router.post('/trendings', userTokenAuth, userSubscriptionStatus, addToTrending);
router.get('/trendings', userTokenAuth, userSubscriptionStatus, getTrending);
router.get(
  '/getTrendingByContentType',
  userTokenAuth,
  userSubscriptionStatus,
  getTrendingByContentType
);

// Subscritpion
// router.put('/user-trial', userTokenAuth, enableUserInTrialStatus);
router.get('/user-consistency', userTokenAuth, checkAppConsistency);

// Verify In App Purchase
router.post('/verify-purchase', userTokenAuth, verifyInAppPurchase);

// Get user subscription status
router.get('/user-subscription-status', userTokenAuth, getUserSubscriptionStatus);

// User Acticity Count
router.post('/user-activity-count', userTokenAuth, userSubscriptionStatus, updateUserActivityCount);

// User Badges
router.get('/badge-count', userTokenAuth, userSubscriptionStatus, totalBadgesCount);
router.get('/badge/:badgeType', userTokenAuth, userSubscriptionStatus, badgeDetailsList);

// CMS
router.get('/cms', userTokenAuth, cmsDetailedList);

// verify offer and create promotional offer signature
router.get('/apple-offer', userTokenAuth, createAppleSignature);

router.get('/get-mood', userTokenAuth, getMood);
router.post('/set-mood', userTokenAuth, setMood);

// Get list of shoorah pods
router.get('/shoorah-pods', userTokenAuth, userSubscriptionStatus, shoorahPodsList);

// Explore
router.get('/explore', userTokenAuth, userSubscriptionStatus, exploreList);

// Content Details
router.get(
  '/content-detail/:contentType/:contentId',
  userTokenAuth,
  userSubscriptionStatus,
  getContentDetails
);

// subscription config list
router.get('/subscription-config', userTokenAuth, subscriptionConfigList);

// sos clicks
router.post('/user/sos/:id', userTokenAuth, sosClick);

// user affirmations
router.post('/user-affirmation', userTokenAuth, userSubscriptionStatus, addEditAffirmation);
router.get('/user-affirmation', userTokenAuth, userSubscriptionStatus, affirmationDetailedList);
router.delete('/user-affirmation', userTokenAuth, userSubscriptionStatus, deleteAffirmation);
router.get('/shoorah-affirmation', userTokenAuth, userSubscriptionStatus, shoorahAffirmations);

router.post('/create-payment-intent', userTokenAuth, getStripPayment);
router.post('/get-stripe-payment', userTokenAuth, getStripePaymentIntend);
router.post('/free-subscription', userTokenAuth, freeSubscription);

router.get('/shuru-mood-report', userTokenAuth, userSubscriptionStatus, downloadShuruReport);

router.post('/getAllFocusToCategory', upload.any(), getAllFocus);
router.post('/getAllAffirmationFocusToCategory', upload.any(), getAffirmationFocuses);
router.get('/getCategoriesByContentId/:id', getCategoriesByContentId);
router.post('/addFileToAws', upload.any(), addContentToAws);

router.get('/sound/:contentType/:contentId', userTokenAuth, getSoundById);
router.get('/myfocuses/:focusType', userTokenAuth, myFocuses);

router.post('/app-issue', userTokenAuth, addAppIssue);

router.get('/get-klaviyo-list', getKlaviyoList);
router.post('/add-klaviyo-list', addKlaviyoList);
router.delete('/delete-klaviyo-list/:listId', deleteKlaviyoList);
router.post('/add-email-to-list', addMemberToKlaviyoList);
router.post('/add-emails-to-list', addMembersToKlaviyoList);
router.get('/get-users-klaviyo', getUsersList);

router.patch('/update-member', updateMember);

router.get('/unsubscribe-plan', userTokenAuth, cancelSubscription);
router.get('/get-today-thought', getThoughtOfDay);
router.get('/history-dates', userTokenAuth, getHistoryDates);
router.get('/get-histories', userTokenAuth, getHistories);
router.post('/add-time-spent', userTokenAuth, addEditTimeSpent);
router.get('/get-user-insights', userTokenAuth, getInsights);

router.post('/add-rating', userTokenAuth, addRatings);
router.post('/add-edit-before-sleep', userTokenAuth, addEditBeforeSleep);
router.post('/add-edit-after-sleep', userTokenAuth, addEditAfterSleep);
router.get('/today-before-sleep-log', userTokenAuth, getLatestBeforeSleepDetails);
router.get('/today-after-sleep-log', userTokenAuth, getLatestAfterSleepDetails);

router.get('/ripple-get-mood', RipplegetMood);
router.post('/ripple-set-mood', RipplesetMood);
router.get('/ripple-mood-record', RipplegetMoodRecord);
router.get('/ripple-get-history', RipplegetHistory);
router.post('/ripple-ask', RippleaskMe);
router.get('/ripple-time-spent', RippletimeSpent);
router.get('/ripple-get-user-mood', RipplegetUserMood);
router.post('/ripple-getShuruFeedback', RipplegetShuruFeedback);
router.get('/ripple-chat-session', RipplechatSession);
router.get('/ripple-get-session', RipplegetSession);
router.post('/ripple-openai', Rippleopenai);
router.get('/ripple-user', RippleUser);
router.post('/ripple-add-user', RippleAddUser);

router.get('/get-before-sleep-details', userTokenAuth, getBeforeSleepDetails);
router.get('/get-after-sleep-details', userTokenAuth, getAfterSleepDetails);
router.get('/download-before-sleep-report', userTokenAuth, downloadBeforeSleepReport);
router.get('/download-after-sleep-report', userTokenAuth, downloadAfterSleepReport);

router.get('/get-content-rating', userTokenAuth, getRatings);
router.post('/add-feature-ratings', userTokenAuth, addFeatureRatings);
router.get('/get-feature-ratings', userTokenAuth, getFeatureRatings);

router.get('/get-recommends', userTokenAuth, getRecommendedList);

// User Folders
router.post('/folder', userTokenAuth, addEditUserFolders);
router.get('/folder', userTokenAuth, userFoldersDetailedList);
router.delete('/folder', userTokenAuth, deleteFolder);

router.get('/get-nudge', userTokenAuth, getNudges);

// Breathwork APIS

router.post('/breathwork-profile', userTokenAuth, addUpdateBreathworkInterests);
router.get('/breathwork-profile', userTokenAuth, getBreathworkInterests);
router.get('/breathworks', userTokenAuth, breathworkList);

// User Legals Records
router.post('/user-legals', userTokenAuth, updateUserLegals);
router.get('/user-legals', userTokenAuth, getUserLegals);






router.delete('/clean-cleanse', userTokenAuth, cleanAllCleanse);
router.get('/update-content-time', userTokenAuth, addContentDuration);


//User Emotion
router.post('/add-user-emotion', userTokenAuth, addUserEmotion);

//Add child or Beloved one (child mode)
router.post('/add-beloved-child', userTokenAuth, addBeloveChild);
router.get('/get-beloved-child', userTokenAuth, getBelovedChild);
router.delete('/delete-beloved-child', userTokenAuth, deleteBelovedChild);
router.get('/get-child-affirmation', userTokenAuth, getChildAffirmation);

/**
 * @swagger
 * /add-help-feed:
 *   post:
 *     summary: Add help feeds of user
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               contentid:
 *                 type: string
 *               contenttype:
 *                 type: string
 *               feedback:
 *                 type: string
 *     responses:
 *       200:
 *         description: Add feed successful
 *       401:
 *         description: Unauthorized
 */
router.post('/add-help-feed', userTokenAuth, addFeedback);
/**
 * @swagger
 * /api/v1/get-user-feedback:
 *   get:
 *     summary: Get user feedback for specific audio
 *     tags: [User]
 *     parameters:
 *       - in: query
 *         name: contentId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the content
 *       - in: query
 *         name: contentType
 *         schema:
 *           type: string
 *         required: true
 *         description: The type of the content
 *       - in: header
 *         name: Authorization
 *         schema:
 *           type: string
 *         required: true
 *         description: Bearer token for authorization
 *       - in: header
 *         name: deviceType
 *         schema:
 *           type: string
 *         required: true
 *         description: Bearer token for authorization
 *     responses:
 *       200:
 *         description: Feedback retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 feedback:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Feedback not found
 *       500:
 *         description: Internal server error
 */

router.get('/get-help-feed', userTokenAuth, getUserFeedback);

router.get('/get-user-emotions', userTokenAuth, getUserEmotions);

// ===================================== Playlist =====================================
router.post(
  '/playlist',
  userTokenAuth,
  isUser,
  validate(createPlaylistSchema, 'createPlaylist', false, true),
  createPlaylist
);

router.delete(
  '/playlist',
  userTokenAuth,
  isUser,
  validate(deletePlaylistSchema, 'deletePlaylist', true, true),
  deletePlaylist
);

router.get(
  '/playlist',
  userTokenAuth,
  isUser,
  validate(getPlaylistSchema, 'getPlaylist', true, true),
  getPlaylist
);

router.put(
  '/playlist',
  userTokenAuth,
  isUser,
  validate(updatePlaylistSchema, 'updatePlaylist', false, true),
  updatePlaylist
);

router.get(
  '/playlist/suggested-content',
  userTokenAuth,
  isUser,
  validate(getSuggestedContentSchema, 'getSuggestedContent', true, true),
  getSuggestedContent
);

router.post(
  '/playlist/add-audio',
  userTokenAuth,
  isUser,
  validate(playlistAddRemoveAudioSchema, 'addAudioToPlaylist', false, true),
  addAudioToPlaylist
);

router.post(
  '/playlist/remove-audio',
  userTokenAuth,
  isUser,
  validate(playlistAddRemoveAudioSchema, 'removeAudioFromPlaylist', false, true),
  removeAudioFromPlaylist
);

// ===================================== Pod Experts =====================================
router.get(
  '/pod-expert-profile',
  userTokenAuth,
  isUser,
  validate(getPodExpertsSchema, 'getPodExperts', true, false),
  getPodExperts
);

module.exports = router;
