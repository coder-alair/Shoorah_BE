'use strict';

const router = require('express').Router();
const { cmsDetailedList } = require('../../controllers/partner/cmsController');
const {
  getContentCount,
  getEarningDetails
} = require('../../controllers/partner/earningController');
const {
  addIntroduceCompany,
  getIntroduceCompanies,
  getMyIntroduceCompanyList,
  getEarningsCounts
} = require('../../controllers/partner/introduceController');
const {
  addNotification,
  notificationDetailedList,
  usersEmailList,
  deleteMyNotification,
  unreadNotificationCount
} = require('../../controllers/partner/notificationController');
const { getProfile, updateProfile } = require('../../controllers/partner/profileController');
const { adminTokenAuth } = require('../../middleware/adminAuth');
const upload = require('../../middleware/multer');

router.get('/partner-profile', adminTokenAuth, getProfile);
router.put('/partner-profile', adminTokenAuth, updateProfile);
router.post('/add-introduce', adminTokenAuth, addIntroduceCompany);
router.get('/introduce-companies', adminTokenAuth, getIntroduceCompanies);
router.get('/partner-content-counts', adminTokenAuth, getContentCount);
router.get('/partner-earnings', adminTokenAuth, getEarningDetails);
router.get('/my-introduced-companies', adminTokenAuth, getMyIntroduceCompanyList);
router.get('/get-revenue-data', adminTokenAuth, getEarningsCounts);

router.post('/notification', adminTokenAuth, addNotification);
router.get('/notification', adminTokenAuth, notificationDetailedList);
router.get('/users-email-list', adminTokenAuth, usersEmailList);
router.delete('/notification', adminTokenAuth, deleteMyNotification);
router.get('/unread-notification', adminTokenAuth, unreadNotificationCount);

router.get('/get-cms', adminTokenAuth, cmsDetailedList);

module.exports = router;
