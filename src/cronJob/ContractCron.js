'use strict';

const cron = require('node-cron');
const { contract_end } = require('@config/cron');
const { USER_TYPE } = require('@services/Constant');
const { Users } = require('../models');

const notifyCompaniesWithEndingContracts = async () => {
  const currentDate = dayjs().toDate();

  const thirtyDaysFromNow = dayjs().add(30, 'day').toDate();
  const fourteenDaysFromNow = dayjs().add(14, 'day').toDate();

  // Query Companies collection for contracts ending in 30 days
  const companiesWithContractsEndingIn30Days = await Companies.find({
    contract_end_date: {
      $gte: currentDate,
      $lte: thirtyDaysFromNow
    }
  });

  for (const company of companiesWithContractsEndingIn30Days) {
    const companyId = company._id;
    const companyName = company.company_name;
    const contactPersonName = company.contact_person;
    const fromUserId = 'SYSTEM';

    const daysLeft = dayjs(company.contract_end_date).diff(currentDate, 'day');
    const message = `Hi ${contactPersonName}, the contract for ${companyName} is ending in ${daysLeft} days. Please review and take necessary actions.`;

    const adminData = await Users.findOne({
      name: contactPersonName,
      user_type: USER_TYPE.COMPANY_ADMIN
    });

    if (adminData) {
      await newCompanyNotify(contactPersonName, fromUserId, companyId, message);
    }
  }

  // Query Companies collection for contracts ending in 14 days
  const companiesWithContractsEndingIn14Days = await Companies.find({
    contract_end_date: {
      $gte: currentDate,
      $lte: fourteenDaysFromNow
    }
  });

  for (const company of companiesWithContractsEndingIn14Days) {
    const companyId = company._id;
    const companyName = company.company_name;
    const contactPersonName = company.contact_person;
    const fromUserId = 'SYSTEM';

    const daysLeft = dayjs(company.contract_end_date).diff(currentDate, 'day');
    const message = `Hi ${contactPersonName}, the contract for ${companyName} is ending in ${daysLeft} days. Please review and take necessary actions.`;

    const adminData = await Users.findOne({
      name: contactPersonName,
      user_type: USER_TYPE.COMPANY_ADMIN
    });

    if (adminData) {
      await newCompanyNotify(contactPersonName, fromUserId, companyId, message);
    }
  }
};

// This cron will be executed at 8:00 AM daily
cron.schedule(contract_end[0], async () => {
  await notifyCompaniesWithEndingContracts();
});

// This cron will be executed at 8:00 PM daily
cron.schedule(contract_end[1], async () => {
  await notifyCompaniesWithEndingContracts();
});

console.log('Contract Crons Started');
