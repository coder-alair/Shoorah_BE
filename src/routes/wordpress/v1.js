'use strict';

const { addCompany, addUpdateCompanyPlan, getCompany, getCompanyPlan, addUpdateCompany } = require('../../controllers/wordpress/v1/companyController');

const router = require('express').Router();

router.post('/add-company', addCompany);
router.get('/get-company', getCompany);
router.get('/update-company', addUpdateCompanyPlan);
router.get('/get-company-plan', getCompanyPlan);
router.post('/update-company-detail',addUpdateCompany);

module.exports = router;
