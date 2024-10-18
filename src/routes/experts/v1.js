'use strict';

const router = require('express').Router();
const {
  uploadExpertFocuses,
  expertFocusList,
} = require('../../controllers/expert/v1/expertFocusController');
const {
  updateExpertProfile,
  updateExpertProfessionalBackground,
  expertComplinceAndVerification,
  identityVerifyOnfido,
  findStatus,
  notificationDetailedList,
  getExpertProfile
} = require('../../controllers/expert/v1/profileController');
const {
  addEditExpertAttachments,
  getAllExpertDocuments,
  uploadApplicantDocsHandler,
  deleteAttachments,
  getExpertAttachments
} = require('../../controllers/expert/v1/attachmentController');
const { adminTokenAuth, isExpert } = require('../../middleware/adminAuth');
const {
  addDocVerify,
  getApprovalStatus
} = require('../../controllers/expert/v1/verificationController');
const { addEditExpertAvailability } = require('../../controllers/expert/v1/availabilityController');
const upload = require('../../middleware/multer');
const { createInterviewSchedual, getInterviewSchedual } = require('@root/src/controllers/expert/v1/interviewController');

router.post('/create-interview-schedule', adminTokenAuth, createInterviewSchedual);
router.get('/get-interview-schedule', adminTokenAuth, getInterviewSchedual);


router.get('/profile', adminTokenAuth, isExpert, getExpertProfile);
// router.put('/update-profiles', adminTokenAuth, upload.single('file'),updateExpertProfile);
router.put('/update-profiles', adminTokenAuth, upload.fields([{ name: 'file' }, { name: 'profile' }]), updateExpertProfile);

router.put('/update-professional', adminTokenAuth, updateExpertProfessionalBackground);
router.put(
  '/doc-verification',
  upload.single('file'),
  adminTokenAuth,
  expertComplinceAndVerification
);
router.get('/notification', adminTokenAuth, notificationDetailedList);
router.get('/identity-verification', adminTokenAuth, identityVerifyOnfido);
router.get('/find-status', adminTokenAuth, findStatus);
router.post('/upload-expert-focus', uploadExpertFocuses);
router.get('/get-expert-focus', adminTokenAuth, expertFocusList);
router.post(
  '/add-edit-attachments',
  adminTokenAuth,
  upload.single('file'),
  addEditExpertAttachments
);
router.get('/get-attachments', adminTokenAuth, getAllExpertDocuments);
router.post(
  '/onfido-attachments',
  adminTokenAuth,
  upload.array('file', 10),
  uploadApplicantDocsHandler
);

router.get('/get-expert-attachments', adminTokenAuth, getExpertAttachments);
router.delete('/delete-expert-attachment', adminTokenAuth, deleteAttachments);
router.post('/add-doc-verification', adminTokenAuth, addDocVerify);
router.get('/get-expert-approval', adminTokenAuth, getApprovalStatus);

router.post('/add-edit-availability', adminTokenAuth, addEditExpertAvailability);

module.exports = router;
