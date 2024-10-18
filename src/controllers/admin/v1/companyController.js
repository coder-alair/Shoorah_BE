'use strict';

const { Company } = require('@models');
const { generatePassword } = require('@services/authServices');
const { sendPassword } = require('@services/Mailer');
const { COMPANY_MEDIA_PATH } = require('@services/Constant');
const { unixTimeStamp, makeRandomDigit, makeRandomString } = require('@services/Helper');
const { getUploadURL, removeOldImage } = require('@services/s3Services');
const { PAGE, PER_PAGE, SORT_ORDER } = require('@services/Constant');
const {
  CLOUDFRONT_URL,
  SUCCESS,
  FAIL,
  RESPONSE_CODE,
  ACCOUNT_TYPE,
  USER_TYPE,
  STATUS,
  NOTIFICATION_TYPE,
  NOTIFICATION_ACTION,
  ACCOUNT_STATUS,
  SENT_TO_USER_TYPE,
  MAIL_SUBJECT,
  KLAVIYO_LIST,
  SORT_BY
} = require('../../../services/Constant');
const Response = require('@services/Response');
const { Users, CompanyUsers, Mood } = require('@models');
const {
  convertObjectKeysToCamelCase,
  calculatePercentage,
  toObjectId,
  addEditKlaviyoUser
} = require('../../../services/Helper');
const ProfessionalMood = require('../../../models/ProfessionalMood');
const Notification = require('../../../models/Notifications');
const { sendNotification } = require('@services/Notify');
const { newCompanyNotify } = require('../../../services/adminServices/companyStatusNotify');
const { sendB2BPassword, sendTrialUpdatesReminder } = require('../../../services/Mailer');
const { adminsListValidation } = require('../../../services/adminValidations/adminValidations');
const {
  b2bAdminsListValidation
} = require('../../../services/adminValidations/companyAdminsValidations');
const { DeviceTokens, IntroduceCompany } = require('../../../models');
const CompanySubscriptions = require('../../../models/CompanySubscription');

const updateB2BSubsStatus = async (id) => {
  let company = await Company.findOne({ _id: id }).lean();
  if (company) {
    let subs = await CompanySubscriptions.findOne({ company_id: id }).lean();
    if (subs) {
      if (subs.is_under_trial) {
        await Company.updateOne(
          { _id: id },
          {
            $set: {
              company_subscription: 0
            }
          }
        );
        return true;
      } else {
        if (subs.expires_date) {
          let currDate = new Date();
          if (subs.expires_date > currDate) {
            await Company.updateOne(
              { _id: id },
              {
                $set: {
                  company_subscription: 2
                }
              }
            );
            return true;
          } else {
            await Company.updateOne(
              { _id: id },
              {
                $set: {
                  company_subscription: 3
                }
              }
            );
            return true;
          }
        } else {
          await Company.updateOne(
            { _id: id },
            {
              $set: {
                company_subscription: 3
              }
            }
          );
          return true;
        }
      }
    } else {
      await Company.updateOne(
        { _id: id },
        {
          $set: {
            company_subscription: 3
          }
        }
      );
      return true;
    }
    return true;
  }

  return false;
};

module.exports = {
  updateB2BSubsStatus,
  /**
   * @description This function is used to get Company List
   * @param {*} req
   * @param {*} res
   * @return {*}
   */
  getCompanyList: async (req, res) => {
    try {
      const reqParam = req.query;
      const page = reqParam.page ? parseInt(reqParam.page) : PAGE;
      const perPage = reqParam.perPage ? parseInt(reqParam.perPage) : PER_PAGE;
      const skip = (page - 1) * perPage || 0;
      const sortBy = reqParam.sortBy || 'createdAt';
      const sortOrder = reqParam.sortOrder ? parseInt(reqParam.sortOrder) : SORT_ORDER;

      const filterData = {
        ...(reqParam.searchKey && {
          $or: [
            { company_name: { $regex: '.*' + reqParam.searchKey + '.*', $options: 'i' } },
            { company_email: { $regex: '.*' + reqParam.searchKey + '.*', $options: 'i' } }
          ]
        }),
        ...(reqParam.companySubscription && {
          company_subscription: parseInt(reqParam.companySubscription)
        })
      };

      let companies = await Company.find(filterData)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(perPage)
        .lean();

      await Company.updateMany(
        { auto_renew: { $exists: false } },
        {
          $set: {
            auto_renew: false
          }
        }
      );

      const totalRecords = await Company.countDocuments();

      if (companies.length > 0) {
        for (const i of companies) {
          let companyAdmin = await Users.findOne({
            company_id: i._id,
            user_type: USER_TYPE.COMPANY_ADMIN
          })
            .select('status name user_type email _id')
            .lean();
          i.status = companyAdmin.status;
          i.adminId = companyAdmin._id;
          i.company_logo =
            CLOUDFRONT_URL + COMPANY_MEDIA_PATH.COMPANY_PROFILE + '/' + i.company_logo;

          await updateB2BSubsStatus(toObjectId(i._id));

          let profile = {
            email: i.email,
            userType: USER_TYPE.COMPANY_ADMIN,
            firstName: i.name
          };

          // await addEditKlaviyoUser(profile);
        }
      }

      return Response.successResponseData(res, companies, SUCCESS, res.__('companiesListSuccess'), {
        page,
        perPage,
        totalRecords
      });
    } catch (err) {
      console.error(err);
      return Response.errorResponseWithoutData(res, err.message, FAIL);
    }
  },
  /**
   * @description This function is used to Get a single company by ID
   * @param {*} req
   * @param {*} res
   * @return {*}
   */
  getCompany: async (req, res) => {
    try {
      const { id } = req.params;
      let company = await Company.findOne({ _id: id }).lean();
      if (!company) {
        return res.status(500).json({ message: 'No Company Found with this ID' });
      }

      await updateB2BSubsStatus(toObjectId(id));
      let companyAdmin = await Users.findOne({
        company_id: company._id,
        user_type: USER_TYPE.COMPANY_ADMIN
      })
        .select('-password')
        .lean();
      let partner = await Users.findOne({ _id: company.introduce_by, user_type: USER_TYPE.PARTNER })
        .select('-password')
        .lean();

      let subs = await CompanySubscriptions.findOne({ company_id: company._id }).lean();

      if (partner) {
        company.partnerName = partner.name;
        company.partnerEmail = partner.email;
      }

      if (subs && subs.is_under_trial) {
        let date = new Date();
        let trialEndsAt = new Date(subs?.trial_ends_at);
        let difference = subs?.trial_ends_at
          ? Math.ceil((trialEndsAt - date) / (1000 * 60 * 60 * 24))
          : null;
        company.trialDaysLeft = difference;
      }
      company.status = companyAdmin.status;
      company.adminId = companyAdmin._id;
      company.no_of_seat_bought = company.no_of_seat_bought;
      company.b2bPlan = subs?.product_id;
      company.product = subs?.price_id;

      const activeUsersCount = await Users.countDocuments({
        company_id: company._id,
        user_type: { $in: [USER_TYPE.USER, USER_TYPE.COMPANY_SUB_ADMIN] },
        status: { $in: [STATUS.ACTIVE, STATUS.INACTIVE] }
      });

      const inactiveUsersCount = company.no_of_seat_bought - activeUsersCount;

      company.activeUsersCount = activeUsersCount;
      company.inactiveUsersCount = inactiveUsersCount;
      company.company_logo =
        CLOUDFRONT_URL + COMPANY_MEDIA_PATH.COMPANY_PROFILE + '/' + company.company_logo;

      return Response.successResponseData(res, company, SUCCESS, res.__('getCompanySuccess'));
    } catch (err) {
      console.log(err);
      return Response.internalServerErrorResponse(res);
    }
  },
  /**
   * @description This function is used to add a company
   * @param {*} req
   * @param {*} res
   * @return {*}
   */
  addCompany: async (req, res) => {
    try {
      let {
        company_logo,
        company_name,
        company_address,
        company_email,
        contact_person,
        contact_number,
        no_of_seat_bought,
        seat_price,
        seat_active,
        contract_start_date,
        contract_end_date,
        contract_progress,
        b2b_interest_via,
        terms_agreed,
        contract_sent,
        contract_signed,
        invoice_raised,
        payment_complete,
        restrict_company,
        currency,
        company_type,
        other_admin_emails,
        shuru_usage,
        peap_usage,
        plan,
        salesman,
        vatTax,
        paymentCheck,
        discount,
        auto_renew,
        is_charity,
        trial,
        trialDays,
        product,
        introduce_by,
        b2bPlan
      } = req.body;

      company_name = company_name?.toLowerCase();
      company_address = company_address?.toLowerCase();
      company_email = company_email?.toLowerCase();
      contact_person = contact_person?.toLowerCase();
      introduce_by = introduce_by?.toLowerCase();
      let password = makeRandomDigit(2) + makeRandomString(5) + makeRandomDigit(4);
      const hashPassword = await generatePassword(password);
      let uploadURL = null;

      if (company_logo) {
        const imageExtension = company_logo.split('/')[1];
        const companyImage = `${unixTimeStamp(new Date())}-${makeRandomDigit(4)}.${imageExtension}`;

        let uploaded = await getUploadURL(
          company_logo,
          companyImage,
          COMPANY_MEDIA_PATH.COMPANY_PROFILE
        );

        uploadURL = uploaded?.uploadURL;
        company_logo = uploaded?.filename;
      }

      let existing = await Company.findOne({ company_email });
      if (existing) {
        return Response.errorResponseData(
          res,
          'Same email used by other company',
          RESPONSE_CODE.BAD_REQUEST
        );
      }

      let company_new = await Company.create({
        company_logo,
        company_name,
        company_address,
        company_email,
        contact_person,
        contact_number: contact_number == '' ? null : contact_number,
        no_of_seat_bought,
        seat_price,
        seat_active,
        contract_start_date,
        contract_end_date,
        contract_progress,
        b2b_interest_via,
        terms_agreed,
        contract_sent,
        contract_signed,
        invoice_raised,
        payment_complete,
        restrict_company,
        currency,
        salesman,
        company_type,
        shuru_usage,
        peap_usage,
        introduce_by,
        vat_tax: !!vatTax,
        transaction_id: payment_complete ? Math.floor(Math.random() * 123456789) : null,
        plan: plan ? plan : 'Monthly',
        discount,
        auto_renew,
        is_charity: !!is_charity
      });

      let newComp = await Company.findOne({ company_email });
      if (!newComp) {
        return Response.errorResponseData(
          res,
          'Error in New Company Creation',
          RESPONSE_CODE.NOT_FOUND
        );
      }

      await Users.updateOne(
        { email: newComp.company_email },
        {
          $set: {
            deletedAt: new Date(),
            status: ACCOUNT_STATUS.DELETED
          }
        }
      );

      let user = await Users.create({
        email: newComp.company_email,
        dob: null,
        account_type: ACCOUNT_TYPE.PAID,
        name: newComp.contact_person,
        password: hashPassword,
        user_type: USER_TYPE.COMPANY_ADMIN,
        user_profile: newComp.company_logo,
        status: STATUS.ACTIVE,
        is_email_verified: true,
        login_platform: 0,
        company_id: newComp._id
      });

      if (other_admin_emails?.length && other_admin_emails[0] !== '') {
        for (const email of other_admin_emails) {
          let alreadyUser = await Users.findOne({ email: email });
          await Users.updateOne(
            { email: email },
            {
              $set: {
                deletedAt: new Date(),
                status: ACCOUNT_STATUS.DELETED
              }
            }
          );

          let password = makeRandomDigit(2) + makeRandomString(5) + makeRandomDigit(4);
          const hashPassword = await generatePassword(password);
          const atIndex = email.indexOf('@');
          const name = email.slice(0, atIndex);

          await Users.create({
            email: email,
            dob: null,
            account_type: ACCOUNT_TYPE.PAID,
            password: hashPassword,
            name: name,
            user_type: USER_TYPE.COMPANY_ADMIN,
            status: STATUS.ACTIVE,
            is_email_verified: true,
            login_platform: 0,
            company_id: newComp._id
          });

          const locals = {
            name: name,
            email: email,
            password: password,
            subject: 'Welcome to Shoorah'
          };

          await sendB2BPassword(email, MAIL_SUBJECT.B2B_WELCOME, locals);

          let profile = {
            email: email,
            userType: USER_TYPE.COMPANY_ADMIN,
            firstName: name
          };

          await addEditKlaviyoUser(profile);
        }
      }

      if (trial && !is_charity) {
        if (trialDays > 0) {
          let currDate = new Date();
          let expiryDate = new Date(currDate);
          expiryDate.setDate(expiryDate.getDate() + parseInt(trialDays));

          let payload = {
            trial_ends_at: expiryDate,
            company_id: newComp._id,
            is_under_trial: true,
            auto_renew: false,
            price_id: product,
            subscription: plan == 'One Time' ? false : true,
            product_id: b2bPlan
          };

          if (parseInt(trialDays) <= 7) {
            payload = {
              ...payload,
              one_week_trial_mail_sent: true
            };
          } else if (parseInt(trialDays) <= 1) {
            payload = {
              ...payload,
              one_week_trial_mail_sent: true,
              two_day_trial_mail_sent: true,
              one_day_trial_mail_sent: true
            };
          }

          await CompanySubscriptions.create(payload);
          await Company.updateOne(
            { _id: newComp._id },
            {
              $set: {
                company_subscription: 0
              }
            }
          );

          let locals = {
            hours: `${trialDays}-Day Free Trial`,
            name: newComp.company_name,
            head: 'Congratulations! from Shoorah',
            text: 'your trial days is coming to end within 24 hour',
            imageUrl: 'https://staging-media.shoorah.io/email_assets/Shoorah_brain.png',
            greetTitle: `Congratulations! your company got a free trial for the shoorah usage.`,
            headTitle: `We hope your team ${newComp.company_name} is well being and healthy. You have got a trial plan of ${trialDays} days from shoorah. You can use our app and dashboard freely. `,
            supportMessage: 'Please contact info@shoorah.io for any assistance needed.'
          };

          sendTrialUpdatesReminder(newComp.company_email, locals);
        }
      } else {
        let currDate = new Date();
        let expiryDate = new Date(newComp?.contract_end_date);

        let payload = {
          company_id: newComp._id,
          subscription: plan == 'One Time' || is_charity ? false : true,
          price_id: product,
          product_id: b2bPlan
        };

        if (!paymentCheck || is_charity) {
          payload = {
            ...payload,
            expires_date: expiryDate,
            is_under_trial: false,
            auto_renew: plan == 'One Time' || is_charity ? false : true
          };
        }

        await CompanySubscriptions.create(payload);
        if (!paymentCheck || is_charity) {
          await Company.updateOne(
            { _id: newComp._id },
            {
              $set: {
                company_subscription: 2
              }
            }
          );
        }
      }

      let profile = {
        email: newComp.company_email,
        userType: USER_TYPE.COMPANY_ADMIN,
        firstName: newComp.name
      };

      await addEditKlaviyoUser(profile);
      let filterCondition = {
        company_email: newComp?.company_email
      };

      if (introduce_by) {
        await IntroduceCompany.updateOne(filterCondition, {
          $set: {
            deletedAt: new Date()
          }
        });
      }

      const locals = {
        name: newComp.company_name,
        email: newComp.company_email,
        password: password,
        subject: 'Welcome to Shoorah'
      };
      await sendB2BPassword(newComp.company_email, MAIL_SUBJECT.B2B_WELCOME, locals);
      return Response.successResponseData(res, newComp, SUCCESS, res.__('addCompanySuccess'), {
        uploadURL
      });
    } catch (error) {
      console.error(error);
      if (error.code == 11000) {
        if (error.message.includes('company_name_1')) {
          return Response.errorResponseWithoutData(
            res,
            'Company Name is already registered !',
            RESPONSE_CODE.BAD_REQUEST
          );
        } else if (error.message.includes('company_email_1')) {
          return Response.errorResponseWithoutData(
            res,
            'Company Email is already registered !',
            RESPONSE_CODE.BAD_REQUEST
          );
        } else {
          return Response.errorResponseWithoutData(res, error.message, RESPONSE_CODE.BAD_REQUEST);
        }
      }
      return Response.internalServerErrorResponse(res);
    }
  },
  /**
   * @description This function is used to update a company details by ID
   * @param {*} req
   * @param {*} res
   * @return {*}
   */
  updateCompany: async (req, res) => {
    try {
      let {
        company_logo,
        company_name,
        company_address,
        company_email,
        contact_person,
        contact_number,
        no_of_seat_bought,
        seat_price,
        seat_active,
        contract_start_date,
        contract_end_date,
        contract_progress,
        b2b_interest_via,
        terms_agreed,
        contract_sent,
        contract_signed,
        invoice_raised,
        payment_complete,
        restrict_company,
        salesman,
        role,
        currency,
        company_type,
        shuru_usage,
        peap_usage,
        vatTax,
        paymentCheck,
        plan,
        discount,
        auto_renew,
        other_admin_emails,
        is_charity,
        trial,
        trialDays,
        product,
        b2bPlan
      } = req.body;

      company_name = company_name?.toLowerCase();
      company_address = company_address?.toLowerCase();
      company_email = company_email?.toLowerCase();
      contact_person = contact_person?.toLowerCase();
      company_type = company_type?.toLowerCase();

      let { id } = req.params;
      if (!id) {
        id = req.authCompanyId;
      }

      const company = await Company.findOne({ _id: id });
      if (!company)
        return Response.errorResponseWithoutData(
          res,
          'No Company with this id',
          RESPONSE_CODE.NOT_FOUND
        );

      let uploadURL = null;

      if (company_logo) {
        // delete old logo from the server and save in database
        await removeOldImage(company.company_logo, COMPANY_MEDIA_PATH.COMPANY_PROFILE, res);

        const imageExtension = company_logo.split('/')[1];
        const companyImage = `${unixTimeStamp(new Date())}-${makeRandomDigit(4)}.${imageExtension}`;

        let uploaded = await getUploadURL(
          company_logo,
          companyImage,
          COMPANY_MEDIA_PATH.COMPANY_PROFILE
        );

        uploadURL = uploaded?.uploadURL;
        company_logo = uploaded?.filename;
      }

      if (company_email) {
        if (company_email != company.company_email) {
          let password = makeRandomDigit(2) + makeRandomString(5) + makeRandomDigit(4);
          const hashPassword = await generatePassword(password);

          await Company.findByIdAndUpdate(id, {
            company_logo,
            company_name,
            company_address,
            contact_person,
            company_email,
            contact_number,
            no_of_seat_bought,
            seat_price,
            currency,
            seat_active,
            contract_start_date,
            contract_end_date,
            contract_progress,
            b2b_interest_via,
            terms_agreed,
            contract_sent,
            contract_signed,
            invoice_raised,
            payment_complete,
            restrict_company,
            salesman,
            role,
            company_type,
            shuru_usage,
            peap_usage,
            vat_tax: vatTax ? true : false,
            plan: plan ? plan : 'Monthly',
            discount,
            auto_renew,
            is_charity: !!is_charity
          });

          await Users.updateOne(
            { company_id: id, user_type: USER_TYPE.COMPANY_ADMIN },
            {
              $set: {
                email: company_email,
                name: contact_person,
                password: hashPassword,
                user_profile: company_logo
              }
            }
          );

          let profile = {
            email: company_email,
            userType: USER_TYPE.COMPANY_ADMIN,
            firstName: contact_person
          };

          await addEditKlaviyoUser(profile);

          const locals = {
            name: company_name,
            email: company_email,
            password: password,
            subject: 'Welcome to Shoorah'
          };
          await sendB2BPassword(company_email, MAIL_SUBJECT.B2B_WELCOME, locals);

          const updated = await Company.findOne({ _id: id });
          return Response.successResponseData(
            res,
            updated,
            SUCCESS,
            res.__('companyDetailsUpdated'),
            { uploadURL }
          );
        }
      }

      await Company.findByIdAndUpdate(id, {
        company_logo,
        company_name,
        company_address,
        contact_person,
        contact_number,
        no_of_seat_bought,
        seat_price,
        currency,
        seat_active,
        contract_start_date,
        contract_end_date,
        contract_progress,
        b2b_interest_via,
        terms_agreed,
        contract_sent,
        contract_signed,
        invoice_raised,
        payment_complete,
        restrict_company,
        salesman,
        role,
        company_type,
        shuru_usage,
        peap_usage,
        vat_tax: vatTax ? true : false,
        plan: plan ? plan : 'Monthly',
        discount: discount,
        auto_renew,
        is_charity: !!is_charity
      });

      await Users.updateOne(
        { company_id: id, email: company_email, user_type: USER_TYPE.COMPANY_ADMIN },
        {
          $set: {
            name: contact_person,
            user_profile: company_logo
          }
        }
      );

      const updatedCompany = await Company.findOne({ _id: id });

      let companySubs = await CompanySubscriptions.findOne({ company_id: id });
      if (trial && !is_charity) {
        if (trialDays > 0) {
          let currDate = new Date();
          let expiryDate = new Date(currDate);
          expiryDate.setDate(expiryDate.getDate() + parseInt(trialDays));

          let payload = {
            trial_ends_at: expiryDate,
            company_id: company._id,
            is_under_trial: true,
            auto_renew: false,
            subscription: plan == 'One Time' ? false : true,
            price_id: product,
            two_day_trial_mail_sent: false,
            one_day_trial_mail_sent: false,
            one_week_trial_mail_sent: false,
            trial_end_mail_sent: false,
            product_id: b2bPlan
          };

          if (parseInt(trialDays) <= 7) {
            payload = {
              ...payload,
              one_week_trial_mail_sent: true
            };
          } else if (parseInt(trialDays) <= 1) {
            payload = {
              ...payload,
              one_week_trial_mail_sent: true,
              two_day_trial_mail_sent: true,
              one_day_trial_mail_sent: true
            };
          }

          if (companySubs) {
            delete payload.company_id;
            await CompanySubscriptions.updateOne(
              { company_id: id },
              {
                $set: payload
              }
            );
          } else {
            await CompanySubscriptions.create(payload);
          }

          await Company.updateOne(
            { _id: updatedCompany._id },
            {
              $set: {
                company_subscription: 0
              }
            }
          );

          let locals = {
            hours: `${trialDays}-Day Free Trial`,
            name: updatedCompany.company_name,
            head: 'Congratulations! from Shoorah',
            text: 'your trial days is coming to end within 24 hour',
            imageUrl: 'https://staging-media.shoorah.io/email_assets/Shoorah_brain.png',
            greetTitle: `Congratulations! your company got a free trial for the shoorah usage.`,
            headTitle: `We hope your team ${updatedCompany.company_name} is well being and healthy. You have got a trial plan of ${trialDays} days from shoorah. You can use our app and dashboard freely. `,
            supportMessage: 'Please contact info@shoorah.io for any assistance needed.'
          };

          sendTrialUpdatesReminder(updatedCompany.company_email, locals);
        }
      } else {
        let expiryDate = updatedCompany?.contract_end_date
          ? new Date(updatedCompany?.contract_end_date)
          : new Date();

        let payload = {
          company_id: company._id,
          subscription: plan == 'One Time' || is_charity ? false : true,
          price_id: product,
          product_id: b2bPlan
        };

        if (!paymentCheck || is_charity) {
          payload = {
            ...payload,
            expires_date: expiryDate,
            is_under_trial: false,
            auto_renew: plan == 'One Time' || is_charity ? false : true
          };
        }

        if (companySubs) {
          delete payload.company_id;
          await CompanySubscriptions.updateOne(
            { company_id: id },
            {
              $set: payload
            }
          );
        } else {
          await CompanySubscriptions.create(payload);
        }

        if (!paymentCheck || is_charity) {
          await Company.updateOne(
            { _id: updatedCompany._id },
            {
              $set: {
                company_subscription: 2
              }
            }
          );
        }
      }

      const updated = await Company.findOne({ _id: id }).lean();
      const companyAdmin = await Users.findOne({
        company_id: id,
        user_type: USER_TYPE.COMPANY_ADMIN
      }).lean();
      updated.status = companyAdmin?.status;
      updated.adminId = companyAdmin?._id;

      if (other_admin_emails && other_admin_emails[0].length > 0 && other_admin_emails.length > 0) {
        for (const email of other_admin_emails) {
          let alreadyUser = await Users.findOne({ email: email });
          await Users.updateOne(
            { email: email },
            {
              $set: {
                deletedAt: new Date(),
                status: ACCOUNT_STATUS.DELETED
              }
            }
          );

          let password = makeRandomDigit(2) + makeRandomString(5) + makeRandomDigit(4);
          const hashPassword = await generatePassword(password);
          const atIndex = email.indexOf('@');
          const name = email.slice(0, atIndex);

          await Users.create({
            email: email,
            dob: null,
            account_type: ACCOUNT_TYPE.PAID,
            password: hashPassword,
            name: name,
            user_type: USER_TYPE.COMPANY_ADMIN,
            status: STATUS.ACTIVE,
            is_email_verified: true,
            login_platform: 0,
            company_id: id
          });

          const locals = {
            name: name,
            email: email,
            password: password,
            subject: 'Welcome to Shoorah'
          };

          await sendB2BPassword(email, MAIL_SUBJECT.B2B_WELCOME, locals);

          let profile = {
            email: email,
            userType: USER_TYPE.COMPANY_ADMIN,
            firstName: name
          };

          await addEditKlaviyoUser(profile);
        }
      }

      return Response.successResponseData(res, updated, SUCCESS, res.__('companyDetailsUpdated'), {
        uploadURL
      });
    } catch (error) {
      console.error(error);
      if (error.code == 11000) {
        if (error.message.includes('company_name_1')) {
          return Response.errorResponseWithoutData(
            res,
            'Company Name is already registered !',
            RESPONSE_CODE.BAD_REQUEST
          );
        } else if (error.message.includes('company_email_1')) {
          return Response.errorResponseWithoutData(
            res,
            'Company Email is already registered !',
            RESPONSE_CODE.BAD_REQUEST
          );
        } else if (error.message.includes('contact_number_1')) {
          return Response.errorResponseWithoutData(
            res,
            'Company Number is already registered !',
            RESPONSE_CODE.BAD_REQUEST
          );
        } else {
          return Response.errorResponseWithoutData(res, error.message, RESPONSE_CODE.BAD_REQUEST);
        }
      }
      return Response.internalServerErrorResponse(res);
    }
  },

  getContentCount: async (req, res) => {
    try {
      const company_count = await Company.countDocuments();
      const total_company_user_count = await CompanyUsers.countDocuments();

      const contractsLastMonthCount = await Company.countDocuments({
        contract_start_date: {
          $gte: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
          $lt: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        }
      });

      const newContractsThisMonthCount = await Company.countDocuments({
        contract_start_date: {
          $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          $lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
        }
      });

      const aggregateUserResults = await CompanyUsers.aggregate([
        {
          $lookup: {
            from: 'users', // The name of the Users collection
            localField: 'user_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $unwind: '$user' // Unwind the 'user' array created by the $lookup
        },
        {
          $group: {
            _id: null,
            activeCompaniesUsers: {
              $sum: {
                $cond: [
                  { $eq: ['$user.status', 1] }, // Status in Users
                  1,
                  0
                ]
              }
            },
            inactiveCompaniesUsers: {
              $sum: {
                $cond: [
                  { $eq: ['$user.status', 0] }, // Status in Users
                  1,
                  0
                ]
              }
            }
          }
        }
      ]);

      const aggregateResults = await Company.aggregate([
        {
          $group: {
            _id: null,

            totalSeatsBought: { $sum: '$no_of_seat_bought' },
            activeSeats: {
              $sum: {
                $cond: [{ $eq: ['$seat_active', true] }, '$no_of_seat_bought', 0]
              }
            },
            inactiveSeats: {
              $sum: {
                $cond: [{ $eq: ['$seat_active', false] }, '$no_of_seat_bought', 0]
              }
            },
            activeCompanies: {
              $sum: {
                $cond: [{ $eq: ['$restrict_company', false] }, 1, 0]
              }
            },
            inactiveCompanies: {
              $sum: {
                $cond: [{ $eq: ['$restrict_company', true] }, 1, 0]
              }
            },
            signedActive: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$contract_signed', true] },
                      { $eq: ['$restrict_company', false] }
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            signedInactive: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$contract_signed', true] },
                      { $eq: ['$restrict_company', true] }
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            negotiationActive: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$contract_progress', false] },
                      { $eq: ['$restrict_company', false] }
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            negotiationInactive: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$contract_progress', false] },
                      { $eq: ['$restrict_company', true] }
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            totalSigned: {
              $sum: {
                $cond: [{ $eq: ['$contract_signed', true] }, 1, 0]
              }
            },
            totalnegotiation: {
              $sum: {
                $cond: [{ $eq: ['$contract_progress', false] }, 1, 0]
              }
            }
          }
        }
      ]);

      const activeCompaniesUsers =
        aggregateUserResults && aggregateUserResults[0]
          ? aggregateUserResults[0].activeCompaniesUsers
          : 0;
      const inactiveCompaniesUsers =
        aggregateUserResults && aggregateUserResults[0]
          ? aggregateUserResults[0].inactiveCompaniesUsers
          : 0;
      const activeCompanies =
        aggregateResults && aggregateResults[0] ? aggregateResults[0].activeCompanies : 0;
      const inactiveCompanies =
        aggregateResults && aggregateResults[0] ? aggregateResults[0].inactiveCompanies : 0;
      const totalSeats =
        aggregateResults && aggregateResults[0] ? aggregateResults[0].totalSeatsBought : 0;
      const totalactiveSeats =
        aggregateResults && aggregateResults[0] ? aggregateResults[0].activeSeats : 0;
      const totalinactiveSeats =
        aggregateResults && aggregateResults[0] ? aggregateResults[0].inactiveSeats : 0;
      const signedActive =
        aggregateResults && aggregateResults[0] ? aggregateResults[0].signedActive : 0;
      const signedInactive =
        aggregateResults && aggregateResults[0] ? aggregateResults[0].signedInactive : 0;
      const negotiationActive =
        aggregateResults && aggregateResults[0] ? aggregateResults[0].negotiationActive : 0;
      const negotiationInactive =
        aggregateResults && aggregateResults[0] ? aggregateResults[0].negotiationInactive : 0;
      const totalSigned =
        aggregateResults && aggregateResults[0] ? aggregateResults[0].totalSigned : 0;
      const totalnegotiation =
        aggregateResults && aggregateResults[0] ? aggregateResults[0].totalnegotiation : 0;
      let newContractsThisMonthCountpercentage = (newContractsThisMonthCount / company_count) * 100;
      newContractsThisMonthCountpercentage = Math.round(newContractsThisMonthCountpercentage);
      const contractsLastMonthCountpercent = 100 - newContractsThisMonthCountpercentage;
      return Response.successResponseData(
        res,
        convertObjectKeysToCamelCase({
          total_company_user_count: total_company_user_count,
          activeCompaniesUsers: activeCompaniesUsers,
          inactiveCompaniesUsers: inactiveCompaniesUsers,
          totalCompanies: company_count,
          activeCompanies: activeCompanies,
          inactiveCompanies: inactiveCompanies,
          totalSeats: totalSeats,
          totalactiveSeats: totalactiveSeats,
          totalinactiveSeats: totalinactiveSeats,
          totalSigned: totalSigned,
          signedActive: signedActive,
          signedInactive: signedInactive,
          totalnegotiation: totalnegotiation,
          negotiationActive: negotiationActive,
          negotiationInactive: negotiationInactive,
          contractsLastMonthCount: contractsLastMonthCountpercent,
          newContractsThisMonthCount: newContractsThisMonthCountpercentage
        }),
        SUCCESS,
        res.__('getContentsCountsSuccess')
      );
    } catch (err) {
      console.log(err);
      return Response.internalServerErrorResponse(res);
    }
  },

  getEarningDetails: async (req, res) => {
    try {
      const reqParam = req.query;
      const page = reqParam.page ? parseInt(reqParam.page) : PAGE;
      const perPage = reqParam.perPage ? parseInt(reqParam.perPage) : PER_PAGE;
      const skip = (page - 1) * perPage || 0;
      const sortBy = reqParam.sortBy || 'createdAt';
      const sortOrder = reqParam.sortOrder ? parseInt(reqParam.sortOrder) : SORT_ORDER;
      const filterData = {
        payment_complete: true || 1
      };

      if (reqParam.searchKey) {
        const searchKey = (reqParam?.searchKey).toString();
        filterData.$or = [
          { company_name: { $regex: '.*' + searchKey + '.*', $options: 'i' } },
          { company_email: { $regex: '.*' + searchKey + '.*', $options: 'i' } }
        ];
      }

      let companies = await Company.find(filterData)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(perPage)
        .lean();

      const totalRecords = await Company.countDocuments({ payment_complete: true || 1 });

      if (companies.length > 0) {
        companies.map((i) => {
          if (!i.transaction_id) {
            i.transaction_id = Math.floor(Math.random() * 123456789);
          }
          if (!i.plan) {
            i.plan = 'Monthly';
          }
          if (i.plan) {
            i.status = 'Subscribed';
          } else {
            i.status = 'Not Subscribed';
          }

          i.company_logo =
            CLOUDFRONT_URL + COMPANY_MEDIA_PATH.COMPANY_PROFILE + '/' + i.company_logo;
          i.amount = i.no_of_seat_bought * i.seat_price;
        });
      }
      return Response.successResponseData(
        res,
        convertObjectKeysToCamelCase(companies),
        SUCCESS,
        res.__('earningsListSuccess'),
        {
          page,
          perPage,
          totalRecords
        }
      );
    } catch (err) {
      console.log(err);
      Response.internalServerErrorResponse(res);
    }
  },

  overallCompanyGrowth: async (req, res) => {
    try {
      let { company_id, year, type } = req.query;

      year = parseInt(year);
      const labels = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec'
      ];

      if (type) {
        const allCompanies = await Company.find({
          deletedAt: null,
          company_type: type,
          restrict_company_type: false
        });
        let professionalPercentage = Array(12).fill(0);
        let personalPercentage = Array(12).fill(0);
        let overallPercentage = Array(12).fill(0);
        let overallprofessionalPercentage = Array(12).fill(0);
        let overallpersonalPercentage = Array(12).fill(0);
        let overallPercentages = Array(12).fill(0);

        for (const company of allCompanies) {
          const usersList = await Users.find({ company_id: company._id }, { _id: 1 });
          const usersIds = usersList.map((user) => user._id);

          const pipelineProfesiional = [
            {
              $match: {
                user_id: { $in: usersIds },
                createdAt: {
                  $gte: new Date(`${year}-01-01`), // Start of the year
                  $lt: new Date(`${year + 1}-01-01`) // Start of the next year
                }
              }
            },
            {
              $project: {
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' },
                positiveMoods: {
                  $add: [
                    '$very_satisfied',
                    '$positive',
                    '$comfortable',
                    '$supportive',
                    '$manageable',
                    '$excellent',
                    '$inclusive',
                    '$highly_supported',
                    '$well_equipped',
                    '$comprehensive'
                  ]
                },
                negativeMoods: {
                  $add: [
                    '$dissatisfied',
                    '$unpleasant',
                    '$overwhelming',
                    '$poor',
                    '$unmanageable',
                    '$lacking',
                    '$negative',
                    '$unsupported',
                    '$insufficient',
                    '$inadequate'
                  ]
                }
              }
            },
            {
              $group: {
                _id: {
                  month: '$month'
                },
                docsCount: { $sum: 1 },
                positiveSum: { $sum: '$positiveMoods' },
                negativeSum: { $sum: '$negativeMoods' }
              }
            },
            {
              $project: {
                _id: 0,
                month: '$_id.month',
                docsCount: 1,
                netMood: { $subtract: ['$positiveSum', '$negativeSum'] }
              }
            },
            {
              $sort: {
                year: 1,
                month: 1
              }
            }
          ];

          const aggregationPipelinePersonalMood = [
            {
              $match: {
                user_id: { $in: usersIds },
                createdAt: {
                  $gte: new Date(`${year}-01-01`), // Start of the year
                  $lt: new Date(`${year + 1}-01-01`) // Start of the next year
                }
              }
            },
            {
              $project: {
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' },
                positiveMoods: {
                  $add: [
                    '$motivated',
                    '$happy',
                    '$content',
                    '$i_can_manage',
                    '$i_am_in_control',
                    '$energised',
                    '$balanced',
                    '$relaxed',
                    '$calm'
                  ]
                },
                negativeMoods: {
                  $add: [
                    '$demotivated',
                    '$sad',
                    '$low',
                    '$need_support',
                    '$helpless',
                    '$tired',
                    '$stressed',
                    '$anxious',
                    '$angry'
                  ]
                }
              }
            },
            {
              $group: {
                _id: {
                  month: '$month'
                },
                docsCount: { $sum: 1 },
                positiveSum: { $sum: '$positiveMoods' },
                negativeSum: { $sum: '$negativeMoods' }
              }
            },
            {
              $project: {
                _id: 0,
                month: '$_id.month',
                docsCount: 1,
                netMood: { $subtract: ['$positiveSum', '$negativeSum'] }
              }
            },
            {
              $sort: {
                year: 1,
                month: 1
              }
            }
          ];

          const professionalResult = await ProfessionalMood.aggregate(pipelineProfesiional);
          const personalResult = await Mood.aggregate(aggregationPipelinePersonalMood);
          const MAX_VALUE_PER_DOCUMENT_PERSONAL_MOOD = 45;
          const MAX_VALUE_PER_DOCUMENT_PROFESSIONAL_MOOD = 50;

          personalResult.forEach((elem, index) => {
            personalPercentage[elem.month - 1] = calculatePercentage(
              elem.netMood,
              elem.docsCount * MAX_VALUE_PER_DOCUMENT_PERSONAL_MOOD
            );
          });

          professionalResult.forEach((elem, index) => {
            professionalPercentage[elem.month - 1] = calculatePercentage(
              elem.netMood,
              elem.docsCount * MAX_VALUE_PER_DOCUMENT_PROFESSIONAL_MOOD
            );
          });

          overallPercentage.forEach((elem, index) => {
            overallPercentage[index] = parseFloat(
              (personalPercentage[index] + professionalPercentage[index]) / 2
            ).toFixed(2);
            if (!overallPercentage[index]) {
              overallPercentage[index] = 0;
            }
          });
        }

        return res.status(200).json({
          labels,
          personalPercentage,
          professionalPercentage,
          overallPercentage
        });
      }

      const usersList = await Users.find({ company_id }, { _id: 1 });
      const usersIds = usersList.map((user) => user._id);

      const pipelineProfesiional = [
        {
          $match: {
            user_id: { $in: usersIds },
            createdAt: {
              $gte: new Date(`${year}-01-01`), // Start of the year
              $lt: new Date(`${year + 1}-01-01`) // Start of the next year
            }
          }
        },
        {
          $project: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            positiveMoods: {
              $add: [
                '$very_satisfied',
                '$positive',
                '$comfortable',
                '$supportive',
                '$manageable',
                '$excellent',
                '$inclusive',
                '$highly_supported',
                '$well_equipped',
                '$comprehensive'
              ]
            },
            negativeMoods: {
              $add: [
                '$dissatisfied',
                '$unpleasant',
                '$overwhelming',
                '$poor',
                '$unmanageable',
                '$lacking',
                '$negative',
                '$unsupported',
                '$insufficient',
                '$inadequate'
              ]
            }
          }
        },
        {
          $group: {
            _id: {
              month: '$month'
            },
            docsCount: { $sum: 1 },
            positiveSum: { $sum: '$positiveMoods' },
            negativeSum: { $sum: '$negativeMoods' }
          }
        },
        {
          $project: {
            _id: 0,
            month: '$_id.month',
            docsCount: 1,
            netMood: { $subtract: ['$positiveSum', '$negativeSum'] }
          }
        },
        {
          $sort: {
            year: 1,
            month: 1
          }
        }
      ];

      const aggregationPipelinePersonalMood = [
        {
          $match: {
            user_id: { $in: usersIds },
            createdAt: {
              $gte: new Date(`${year}-01-01`), // Start of the year
              $lt: new Date(`${year + 1}-01-01`) // Start of the next year
            }
          }
        },
        {
          $project: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            positiveMoods: {
              $add: [
                '$motivated',
                '$happy',
                '$content',
                '$i_can_manage',
                '$i_am_in_control',
                '$energised',
                '$balanced',
                '$relaxed',
                '$calm'
              ]
            },
            negativeMoods: {
              $add: [
                '$demotivated',
                '$sad',
                '$low',
                '$need_support',
                '$helpless',
                '$tired',
                '$stressed',
                '$anxious',
                '$angry'
              ]
            }
          }
        },
        {
          $group: {
            _id: {
              month: '$month'
            },
            docsCount: { $sum: 1 },
            positiveSum: { $sum: '$positiveMoods' },
            negativeSum: { $sum: '$negativeMoods' }
          }
        },
        {
          $project: {
            _id: 0,
            month: '$_id.month',
            docsCount: 1,
            netMood: { $subtract: ['$positiveSum', '$negativeSum'] }
          }
        },
        {
          $sort: {
            year: 1,
            month: 1
          }
        }
      ];

      const professionalResult = await ProfessionalMood.aggregate(pipelineProfesiional);
      const personalResult = await Mood.aggregate(aggregationPipelinePersonalMood);
      const MAX_VALUE_PER_DOCUMENT_PERSONAL_MOOD = 45;
      const MAX_VALUE_PER_DOCUMENT_PROFESSIONAL_MOOD = 50;

      let professionalPercentage = Array(12).fill(0);
      let personalPercentage = Array(12).fill(0);
      let overallPercentage = Array(12).fill(0);

      personalResult.forEach((elem, index) => {
        personalPercentage[elem.month - 1] = calculatePercentage(
          elem.netMood,
          elem.docsCount * MAX_VALUE_PER_DOCUMENT_PERSONAL_MOOD
        );
      });

      professionalResult.forEach((elem, index) => {
        professionalPercentage[elem.month - 1] = calculatePercentage(
          elem.netMood,
          elem.docsCount * MAX_VALUE_PER_DOCUMENT_PROFESSIONAL_MOOD
        );
      });

      overallPercentage.forEach((elem, index) => {
        overallPercentage[index] = parseFloat(
          (personalPercentage[index] + professionalPercentage[index]) / 2
        ).toFixed(2);
        if (!overallPercentage[index]) {
          overallPercentage[index] = 0;
        }
      });

      return res.status(200).json({
        labels,
        personalPercentage,
        professionalPercentage,
        overallPercentage
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  b2bAdminsList: (req, res) => {
    try {
      if (req.userType !== USER_TYPE.SUPER_ADMIN) {
        return Response.errorResponseData(res, res.__('accessDenied'), RESPONSE_CODE.UNAUTHORIZED);
      }
      const reqParam = req.query;
      b2bAdminsListValidation(reqParam, res, async (validate) => {
        if (validate) {
          const page = reqParam.page ? parseInt(reqParam.page) : PAGE;
          const perPage = reqParam.perPage ? parseInt(reqParam.perPage) : PER_PAGE;
          const skip = (page - 1) * perPage || 0;
          const sortBy = reqParam.sortBy || SORT_BY;
          const sortOrder = reqParam.sortOrder ? parseInt(reqParam.sortOrder) : SORT_ORDER;
          const filterData = {
            _id: { $ne: toObjectId(req.authAdminId) },
            company_id: toObjectId(reqParam.companyId),
            status: {
              $ne: ACCOUNT_STATUS.DELETED
            },
            user_type: {
              $in: [USER_TYPE.COMPANY_ADMIN, USER_TYPE.COMPANY_SUB_ADMIN]
            },
            ...(reqParam.id && { _id: toObjectId(reqParam.id) }),
            ...(reqParam.searchKey && {
              $or: [
                { name: { $regex: '.*' + reqParam.searchKey + '.*', $options: 'i' } },
                { email: { $regex: '.*' + reqParam.searchKey + '.*', $options: 'i' } }
              ]
            }),
            ...(reqParam.userType && { user_type: parseInt(reqParam.userType) }),
            ...(reqParam.accountStatus && { status: parseInt(reqParam.accountStatus) })
          };
          const aggregationPipeline = [
            {
              $match: filterData
            },
            {
              $sort: {
                [sortBy]: sortOrder
              }
            },
            {
              $skip: skip
            },
            {
              $limit: perPage
            },
            {
              $project: {
                id: '$_id',
                name: '$name',
                profile: {
                  $concat: [
                    CLOUDFRONT_URL,
                    COMPANY_MEDIA_PATH.COMPANY_PROFILE,
                    '/',
                    '$user_profile'
                  ]
                },
                email: '$email',
                lastLogin: '$last_login',
                last_login: 1,
                userType: '$user_type',
                accountStatus: '$status',
                companyId: '$company_id',
                createdAt: 1,
                _id: 0
              }
            }
          ];
          const totalRecords = await Users.countDocuments(filterData);
          const adminsData = await Users.aggregate(aggregationPipeline);
          return Response.successResponseData(
            res,
            adminsData,
            SUCCESS,
            res.__('adminsListSuccess'),
            {
              page,
              perPage,
              totalRecords
            }
          );
        } else {
          return Response.internalServerErrorResponse(res);
        }
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  deleteCompanyAdmin: async (req, res) => {
    try {
      const reqParam = req.query;
      await Users.findByIdAndUpdate(reqParam.id, {
        status: ACCOUNT_STATUS.DELETED,
        deletedAt: new Date()
      });
      await CompanyUsers.findOneAndUpdate({ user_id: reqParam.id }, { deletedAt: new Date() });
      await DeviceTokens.deleteMany({ user_id: reqParam.id });
      return Response.successResponseWithoutData(res, res.__('adminDeleteSuccess'), SUCCESS);
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  }
};
