'use strict';

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const cron = require('node-cron');
const { NOTIFICATION_TYPE } = require('@services/Constant');
const { sendNotification } = require('@services/Notify');
const {
  Notification,
  Users,
  ContentCounts,
  Company,
  Bookmarks,
  CompanySubscriptions
} = require('../models');
const {
  getOverallScore,
  getPersonalMoodsPercent,
  getProfessionalMoodsPercent,
  getUserPersonalMoodsPercent,
  getUserProfessionalMoodsPercent
} = require('../controllers/company/v1/companyController');
const {
  employeeActivity,
  timeSpentUsers
} = require('../controllers/company/v1/dashboardController');
const {
  sendB2BWeekReport,
  sendUserWeekReport,
  sendReusableTemplate,
  sendRenewalReminder,
  sendRenewalPaymentReminder,
  sendTrialUpdatesReminder
} = require('../services/Mailer');
const { getUserShuruUsageTime } = require('../controllers/admin/v1/shuruController');

// cron for scheduling notifications when a notification is set a time
cron.schedule('* * * * *', async () => {
  try {
    const currentDate = new Date();
    const notificationsToSend = await Notification.find({
      sent_on_date: { $lte: currentDate },
      cron_sent: false
    });

    for (const notification of notificationsToSend) {
      const users = await Users.aggregate([
        {
          $match: {
            _id: { $in: notification.to_user_ids }
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
        }
      ]);

      if (
        notification.to_user_ids.length > 0 &&
        users.length > 0 &&
        users[0].device_tokens.length > 0
      ) {
        const reqData = {
          title: process.env.APP_NAME,
          message: notification.message,
          notificationType: NOTIFICATION_TYPE.SHOORAH_NOTIFICATION
        };

        sendNotification(
          users[0].device_tokens,
          notification.message,
          reqData,
          NOTIFICATION_ACTION.MAIN_ACTIVITY
        );
      }
      // Update the cron_sent status to avoid sending the notification again
      await Notification.findByIdAndUpdate(notification._id, { cron_sent: true });
    }
    console.log('running Notification cron');
  } catch (error) {
    console.error('Cron Job Error:', error);
  }
});

// cron for scheduling notifications when a notification is reminder
cron.schedule('* * * * *', async () => {
  try {
    const currentDate = new Date();
    const notificationsToSend = await Notification.find({
      sent_on_date: { $lte: currentDate },
      cron_sent: false
    });

    for (const notification of notificationsToSend) {
      let toUserIds = notification.to_user_ids;
      let readBy = notification.is_read_by;
      const notifyIds = toUserIds.filter((element) => !readBy.includes(element));
      //  console.log('notifyIds', notifyIds);
      const users = await Users.aggregate([
        {
          $match: {
            _id: { $in: notifyIds }
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
        }
      ]);

      if (
        notification.to_user_ids.length > 0 &&
        users.length > 0 &&
        users[0].device_tokens.length > 0
      ) {
        const reqData = {
          title: process.env.APP_NAME,
          message: notification.message,
          notificationType: NOTIFICATION_TYPE.SHOORAH_NOTIFICATION
        };

        sendNotification(
          users[0].device_tokens,
          notification.message,
          reqData,
          NOTIFICATION_ACTION.MAIN_ACTIVITY
        );
      }
      // Update the cron_sent status to avoid sending the notification again
      await Notification.findByIdAndUpdate(notification._id, {
        cron_sent: true,
        reminder: notification?.reminder - 1
      });
    }
    console.log('running reminder notification cron');
  } catch (error) {
    console.error('Cron Job Error:', error);
  }
});

// cron for warm message when user chat with negative moods
cron.schedule('* * * * *', async () => {
  try {
    const currentDate = new Date();
    const contentCounts = await ContentCounts.find({
      shuru_mood_count: { $gte: 4 }
    });

    const admin = await Users.findOne({ user_type: 0, deletedAt: null });

    for (const content of contentCounts) {
      await ContentCounts.updateOne(
        { _id: content._id },
        {
          $set: {
            shuru_mood_count: 0
          }
        }
      );

      let newData = {
        title: 'Hello Friend',
        message:
          'Shuru has told us you have been feeling negative recently and not so good, we jut wanted to tell you that you are doing just fine, and you need to take each day 1 by 1. We care about you and we believe in you! keep going x',
        sent_to_user_type: 4,
        from_user_id: admin._id,
        type: NOTIFICATION_TYPE.SHURU_WARM_NOTIFICATION,
        to_user_ids: [content.user_id]
      };
      const notificationData = await Notification.create(newData);

      let filterCondition = {
        _id: { $eq: content.user_id }
      };

      const user = await Users.aggregate([
        {
          $match: filterCondition
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
        }
      ]);

      if (user.length > 0 && user[0].device_tokens.length > 0) {
        const reqData = {
          title: process.env.APP_NAME,
          message: notificationData.message,
          notificationType: NOTIFICATION_TYPE.SHURU_WARM_NOTIFICATION
        };

        sendNotification(
          user[0].device_tokens,
          notificationData.message,
          reqData,
          NOTIFICATION_ACTION.SHURU_WARM_NOTIFY
        );
      }
    }
    console.log('running Shuru negative mood cron');
  } catch (error) {
    console.error('Cron Job Error:', error);
  }
});

// cron for B2B weekly reports
cron.schedule('0 0 * * *', async () => {
  try {
    if (process.env.B2B_WEEK_REPORTS_CRON != 'false') {
      const currentDate = new Date();
      const sevenDaysAgo = new Date(currentDate);
      sevenDaysAgo.setDate(currentDate.getDate() - 7);
      await Users.updateMany(
        { report_sent: { $exists: false } },
        {
          $set: {
            report_sent: sevenDaysAgo
          }
        }
      );
      const users = await Users.find({
        user_type: 3,
        deletedAt: null,
        report_sent: { $eq: sevenDaysAgo }
      }).select('name email company_id report_sent ');

      function formatDate(date) {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear().toString().slice(-2);

        return `${day}.${month}.${year}`;
      }

      if (users.length) {
        for await (const user of users) {
          if (user.email) {
            let companyName;
            let companyAdminName = user.name;
            let emoji = '😊';
            let moodsStartDate = new Date(user.report_sent);
            let moodsEndDate = new Date(moodsStartDate);
            moodsEndDate.setHours(23, 59, 59, 999);
            moodsEndDate.setDate(moodsStartDate.getDate() + 8);

            let overallData = await getOverallScore(user.company_id, user.report_sent);
            let employeeActivityStats = await employeeActivity(user.report_sent, user.company_id);
            let timeSpent = await timeSpentUsers(user.company_id);
            let personalMoods = await getPersonalMoodsPercent(user.company_id, user.report_sent);
            let professionalMoods = await getProfessionalMoodsPercent(
              user.company_id,
              user.report_sent
            );
            let company = await Company.findOne({ _id: user.company_id }).select('company_name');
            if (company) {
              companyName = company.company_name;
            }
            if (overallData) {
              if (overallData.overallMoodPercentage > 50) {
                emoji = '😊';
              } else if (overallData.overallMoodPercentage < 50) {
                emoji = '😟';
              } else {
                emoji = '😑';
              }
            }

            const formattedStartDate = formatDate(moodsStartDate);
            const formattedEndDate = formatDate(moodsEndDate);

            let locals = {
              company_name: companyName,
              user_name: companyAdminName,
              tag: overallData.overallMood,
              score: overallData.overallMoodPercentage,
              emoji: emoji,
              employees: employeeActivityStats.weekUsers,
              hours: timeSpent.totalTimeSpent,
              active_enployee_bg_color: employeeActivityStats.bgColor,
              emp_arrow: employeeActivityStats.emplArrow,
              active_emp_arrow_color: employeeActivityStats.arrowColor,
              personal_mood_color: personalMoods.personalMoodBg,
              personal_mood_percent: personalMoods.moodPercentage,
              personal_mood_text: personalMoods.moodsText,
              professional_mood_color: professionalMoods.professionalMoodBg,
              professional_mood_percent: professionalMoods.moodPercentage,
              professional_mood_text: professionalMoods.moodsText,
              start_date: formattedStartDate,
              end_date: formattedEndDate
            };

            await sendB2BWeekReport(user.email, locals);
            await Users.updateOne(
              { _id: user._id },
              {
                $set: {
                  report_sent: new Date()
                }
              }
            );
            console.log('Weekly insights sent success');
          }

          await Users.updateOne(
            { _id: user._id },
            {
              $set: {
                report_sent: new Date()
              }
            }
          );
          console.log('Require Email for updates');
        }
      }

      console.log('running B2B weekly reports cron', users.length);
    } else {
      console.log('B2B Weekly insights cron is off.');
    }
  } catch (error) {
    console.error('Cron Job Error:', error);
  }
});

// cron for User weekly reports
cron.schedule('0 0 * * *', async () => {
  try {
    if (process.env.USER_WEEK_REPORTS_CRON != 'false') {
      const currentDate = new Date();
      const oneMonthAgo = new Date(currentDate);
      oneMonthAgo.setMonth(currentDate.getMonth() - 1);
      await Users.updateMany(
        { report_sent: { $exists: false } },
        {
          $set: {
            report_sent: oneMonthAgo
          }
        }
      );
      await Users.updateMany(
        { report_sent: { $eq: null, $exists: true } },
        {
          $set: {
            report_sent: oneMonthAgo
          }
        }
      );
      const users = await Users.find({
        user_type: 2,
        deletedAt: null,
        report_sent: { $eq: oneMonthAgo }
      }).select('name account_type email report_sent ');

      function formatDate(date) {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear().toString().slice(-2);

        return `${day}.${month}.${year}`;
      }

      if (users.length) {
        for await (const user of users) {
          if (user.email) {
            let name = user.name;
            let startDate = new Date(user.report_sent);
            let endDate = new Date(startDate);
            endDate.setHours(23, 59, 59, 999);
            endDate.setDate(startDate.getDate() + 8);
            let duration = 0;

            let personalMoods = await getUserPersonalMoodsPercent(user._id, user.report_sent);
            let professionalMoods = await getUserProfessionalMoodsPercent(
              user._id,
              user.report_sent
            );
            let shuruUsage = await getUserShuruUsageTime(user._id, user.report_sent);
            let affirmations = await Bookmarks.countDocuments({
              user_id: user._id,
              content_type: 2,
              deletedAt: null,
              createdAt: {
                $gte: startDate,
                $lte: endDate
              }
            });

            let contents = await ContentCounts.findOne({ user_id: user._id }).select(
              'app_durations'
            );
            if (contents) {
              duration = Math.floor(contents.app_durations / 60);
            }

            const formattedStartDate = formatDate(startDate);
            const formattedEndDate = formatDate(endDate);

            let locals = {
              name: name,
              shuru_hours: shuruUsage.totalShuruUsageTimeInHours,
              hours: duration,
              affirmations: affirmations,
              personal_mood_color: personalMoods.personalMoodBg,
              personal_mood_percent: personalMoods.moodPercentage,
              personal_mood_text: personalMoods.moodsText,
              professional_mood_color: professionalMoods.professionalMoodBg,
              professional_mood_percent: professionalMoods.moodPercentage,
              professional_mood_text: professionalMoods.moodsText,
              start_date: formattedStartDate,
              end_date: formattedEndDate
            };

            await sendUserWeekReport(user.email, locals, user.account_type);
            await Users.updateOne(
              { _id: user._id },
              {
                $set: {
                  report_sent: new Date()
                }
              }
            );
            console.log('Monthly insights User sent success');
          }
          await Users.updateOne(
            { _id: user._id },
            {
              $set: {
                report_sent: new Date()
              }
            }
          );
          console.log('Require Email for updates');
        }
      }
      console.log('running User weekly reports cron', users.length);
    } else {
      console.log('User Weekly insights cron is off.');
    }
  } catch (error) {
    console.error('Cron Job Error:', error);
  }
});

// // cron for ending subscription B2B
// cron.schedule('* * * * *', async () => {
//   try {
//     const currentDate = new Date();
//     const subscriptions = await CompanySubscriptions.find({
//       $or: [
//         { expires_date: { $lt: currentDate } },
//         { trial_ends_at: { $lte: currentDate } }
//       ]
//     });

//     for (const subscription of subscriptions) {
//       await CompanySubscriptions.updateOne({ _id: subscription._id }, {
//         $set: {
//           expires_date: null,
//           is_under_trial: false,
//           trial_ends_at: null,
//           auto_renew: false,
//         }
//       })
//     }

//     console.log('running Subscription cron');
//   } catch (error) {
//     console.error('Cron Job Error:', error);
//   }
// });

// cron for  B2B renew reminder
cron.schedule('0 0 * * *', async () => {
  try {
    const currentDate = new Date();
    const threeMonthsFromNow = new Date(currentDate);
    threeMonthsFromNow.setMonth(currentDate.getMonth() + 3);

    const threeDaysFromNow = new Date(currentDate);
    threeDaysFromNow.setDate(currentDate.getDate() + 3);

    const oneDayFromToday = new Date(currentDate);
    oneDayFromToday.setDate(currentDate.getDate() + 1);

    // Set the start and end of the day
    const startOfDay = new Date(oneDayFromToday);
    startOfDay.setHours(0, 0, 0, 0); // Set to midnight

    const endOfDay = new Date(oneDayFromToday);
    endOfDay.setHours(23, 59, 59, 999); // Set to end of the day

    const companies = await Company.find({
      $or: [
        { contract_end_date: threeMonthsFromNow }, // Contract end date exactly 3 months from now
        { contract_end_date: threeDaysFromNow } // Contract end date exactly 3 days from now
      ],
      auto_renew: true
    });

    const contractEndingCompanies = await Company.find({
      contract_end_date: {
        $gte: startOfDay, // Greater than or equal to start of the day
        $lte: endOfDay // Less than or equal to end of the day
      }
    });

    // for payment urls
    for (const company of contractEndingCompanies) {
      let contractEnd = new Date(company.contract_end_date);
      let contractStart = new Date(company.contract_start_date);
      let timeDifference = contractEnd - contractStart;
      let timeInMonths = timeDifference / (1000 * 60 * 60 * 24 * 30.44);
      let roundedTimeInMonths = Math.floor(timeInMonths);

      let seats = company.no_of_seat_bought;
      let productId = '';
      let priceId = '';
      let compsub = await CompanySubscriptions.findOne({ company_id: company._id });
      if (compsub) {
        productId = compsub.product_id;
        priceId = compsub?.price_id;
      }

      let session;

      if (priceId) {
        let lineItem = {
          price: priceId,
          quantity: seats
        };

        if (roundedTimeInMonths > 0) {
          lineItem = {
            ...lineItem,
            quantity: seats * parseInt(roundedTimeInMonths)
          };
        }

        if (compsub && priceId) {
          if (compsub.subscription) {
            session = await stripe.checkout.sessions.create({
              line_items: [lineItem],
              mode: 'subscription',
              success_url: process.env.ADMIN_DOMAIN,
              cancel_url: process.env.ADMIN_DOMAIN,
              client_reference_id: company._id,
              metadata: {
                companyId: company._id,
                seats: seats,
                payType: '',
                productId: productId,
                plan: productId,
                web: true
              }
            });
          } else {
            session = await stripe.checkout.sessions.create({
              line_items: [lineItem],
              mode: 'payment',
              success_url: process.env.ADMIN_DOMAIN,
              cancel_url: process.env.ADMIN_DOMAIN,
              client_reference_id: company._id,
              metadata: {
                companyId: company._id,
                seats: seats,
                payType: 'One Time',
                productId: productId,
                plan: productId,
                web: true
              }
            });
          }
        }

        // const session = await stripe.checkout.sessions.create({
        //   line_items: [
        //     lineItem
        //   ],
        //   mode: 'payment',
        //   success_url: process.env.ADMIN_DOMAIN,
        //   cancel_url: process.env.ADMIN_DOMAIN,
        //   client_reference_id: company._id,
        //   metadata: {
        //     companyId: company._id,
        //     seats: seats,
        //     payType: 'One Time',
        //     productId: productId,
        //     plan: productId,
        //     web: true,
        //   },
        // });

        let url = session ? session?.url : '';

        let locals = {
          name: company.company_name,
          url
        };

        sendRenewalPaymentReminder(company.company_email, locals);
      } else {
        console.log('Company has not buyed before.');
      }
    }

    // for renew notifications
    for (const company of companies) {
      const subs = await CompanySubscriptions.findOne({ company_id: company._id });
      if (subs) {
        if (subs.expires_date > currentDate) {
          let plan = '';
          if (subs.product_id) {
            switch (subs.product_id) {
              case process.env.B2B_TEAM_PLAN:
                plan = 'Team Plan';
                break;
              case process.env.B2B_BUSINESS_PLAN:
                plan = 'Business Plan';
                break;
              case process.env.B2B_CORPORATE_PLAN:
                plan = 'Corporate Plan';
                break;
              default:
                plan = '';
                break;
            }
          }

          let dateFormat = new Date(subs.expires_date);
          const formattedDate = dateFormat.toLocaleDateString('en-US', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          });

          // send renew notify
          let locals = {
            name: company.company_name,
            company_name: company.company_name,
            company_plan: plan,
            end_date: formattedDate
          };
          sendRenewalReminder(company.company_email, locals);
        }
      }
    }

    console.log('running Renew Updates cron');
  } catch (error) {
    console.error('Cron Job Error:', error);
  }
});

//  cron for B2B trial updates
cron.schedule('0 0 * * *', async () => {
  try {
    const now = new Date();
    const twoDaysLater = new Date(now);
    twoDaysLater.setDate(now.getDate() + 2);
    const oneDaysLater = new Date(now);
    oneDaysLater.setDate(now.getDate() + 1);
    const oneWeekLater = new Date(now);
    oneWeekLater.setDate(now.getDate() + 7);

    const trialTwoDayExpiredCompanies = await CompanySubscriptions.find({
      trial_ends_at: {
        $gte: now,
        $lt: twoDaysLater
      },
      two_day_trial_mail_sent: { $in: [false, null] }
    });
    const trialOneDayExpiredCompanies = await CompanySubscriptions.find({
      trial_ends_at: {
        $gte: now,
        $lt: oneDaysLater
      },
      one_day_trial_mail_sent: { $in: [false, null] }
    });
    const trialOneWeekExpiredCompanies = await CompanySubscriptions.find({
      trial_ends_at: {
        $gte: now,
        $lt: oneWeekLater
      },
      one_week_trial_mail_sent: { $in: [false, null] }
    });

    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    const trialExpiredCompanies = await CompanySubscriptions.find({
      trial_ends_at: {
        $lte: currentDate
      },
      trial_end_mail_sent: { $in: [false, null] }
    });

    // for two days notification
    for (const company of trialTwoDayExpiredCompanies) {
      let companyData = await Company.findOne({ _id: company.company_id }).select(
        'company_name company_email'
      );
      if (companyData) {
        console.log('company Data for 2 days', companyData.company_name);
        let locals = {
          hours: `48 Hour's`,
          name: `${companyData.company_name}`,
          head: 'Trial updates',
          text: 'your trial days is coming to end within 48 hours',
          imageUrl: 'https://staging-media.shoorah.io/email_assets/Shoorah_Alarm_Clock_v1.1.png',
          greetTitle: 'Time flies when you are prioritising workplace, well-being, right?',
          headTitle: `We hope your team ${companyData.company_name} has been enjoying the benefit of our app. This is a friendly reminder that your trial days is coming to end within 48 hours.`,
          supportMessage:
            'Please go to your Shoorah admin dashboard: https://admin.shoorah.io under tab “My Company” to purchase licenses or alternatively you can email welcome@shoorah.io and a member of the team will reach out to you asap.'
        };
        sendTrialUpdatesReminder(companyData.company_email, locals).catch(console.error);
        await CompanySubscriptions.updateOne(
          { _id: company._id },
          {
            $set: {
              two_day_trial_mail_sent: true
            }
          }
        );
      }
    }

    // for one day notification
    for (const company of trialOneDayExpiredCompanies) {
      let companyData = await Company.findOne({ _id: company.company_id }).select(
        'company_name company_email'
      );
      if (companyData) {
        console.log('company Data for 1 days', companyData.company_name);
        let locals = {
          hours: `24 Hour's`,
          name: companyData.company_name,
          head: 'Trial updates',
          text: 'your trial days is coming to end within 24 hours',
          imageUrl: 'https://staging-media.shoorah.io/email_assets/Shoorah_Alarm_Clock_v1.1.png',
          greetTitle: 'Time flies when you are prioritising workplace, well-being, right?',
          headTitle: `We hope your team ${companyData.company_name} has been enjoying the benefit of our app. This is a friendly reminder that your trial days is coming to end within 24 hours.`,
          supportMessage:
            'Please go to your Shoorah admin dashboard: https://admin.shoorah.io under tab “My Company” to purchase licenses or alternatively you can email welcome@shoorah.io and a member of the team will reach out to you asap.'
        };

        sendTrialUpdatesReminder(companyData.company_email, locals).catch(console.error);
        await CompanySubscriptions.updateOne(
          { _id: company._id },
          {
            $set: {
              one_day_trial_mail_sent: true
            }
          }
        );
      }
    }

    // for one week notification
    for (const company of trialOneWeekExpiredCompanies) {
      let companyData = await Company.findOne({ _id: company.company_id }).select(
        'company_name company_email'
      );
      if (companyData) {
        console.log('company Data for 1 week', companyData.company_name);
        let locals = {
          hours: `1 Week`,
          name: companyData.company_name,
          head: 'Trial updates',
          text: 'your trial days is coming to end within a week',
          imageUrl: 'https://staging-media.shoorah.io/email_assets/Shoorah_Alarm_Clock_v1.1.png',
          greetTitle: 'Time flies when you are prioritising workplace, well-being, right?',
          headTitle: `We hope your team ${companyData.company_name} has been enjoying the benefit of our app. This is a friendly reminder that your trial days is coming to end within a week.`,
          supportMessage:
            'Please go to your Shoorah admin dashboard: https://admin.shoorah.io under tab “My Company” to purchase licenses or alternatively you can email welcome@shoorah.io and a member of the team will reach out to you asap.'
        };

        sendTrialUpdatesReminder(companyData.company_email, locals).catch(console.error);
        await CompanySubscriptions.updateOne(
          { _id: company._id },
          {
            $set: {
              one_week_trial_mail_sent: true
            }
          }
        );
      }
    }

    // for expired notification
    for (const company of trialExpiredCompanies) {
      let companyData = await Company.findOne({ _id: company.company_id }).select(
        'company_name company_email'
      );
      if (companyData) {
        console.log('company Data expired', companyData.company_name);
        let locals = {
          hours: `Your Trial Expired`,
          name: companyData.company_name,
          head: '',
          text: 'your trial days are end',
          greetTitle: 'Your company trial has now expired',
          imageUrl: 'https://staging-media.shoorah.io/email_assets/Shoorah_Alarm_Clock_v1.1.png',
          headTitle: ``,
          supportMessage:
            ' Please go to your Shoorah admin dashboard: https://admin.shoorah.io under tab “My Company” to purchase licenses or alternatively you can email welcome@shoorah.io and a member of the team will reach out to you asap.'
        };

        sendTrialUpdatesReminder(companyData.company_email, locals).catch(console.error);
        const mailList = [
          { name: 'Lorri Haines', email: 'lorrihaines@shoorah.io' },
          { name: 'Naveen Kumar', email: 'technology@shoorah.io' }
        ];
        console.log('super admin company Data expired', companyData.company_name);
        for (const mail of mailList) {
          let mailBox = {
            title: 'Company Trial Alert',
            titleButton: 'Go to dashboard',
            titleButtonUrl: 'https://admin.shoorah.io',
            titleImage: 'https://staging-media.shoorah.io/email_assets/Shoorah_brain.png',
            name: mail.name,
            firstLine: `I hope this message finds you well. The company '${companyData.company_name}' plan has expired today. you can connect them for there reviews and update the contract.`,
            secondLine: ` `,
            thirdLine: '',
            regards: `Shoorah`
          };
          await sendReusableTemplate(mail.email, mailBox, 'Company Trial Alert');
        }

        await CompanySubscriptions.updateOne(
          { _id: company._id },
          {
            $set: {
              trial_end_mail_sent: true
            }
          }
        );
      }
    }

    const subscriptions = await CompanySubscriptions.find({
      $or: [{ expires_date: { $lte: currentDate } }, { trial_ends_at: { $lte: currentDate } }]
    });

    for (const subscription of subscriptions) {
      await CompanySubscriptions.updateOne(
        { _id: subscription._id },
        {
          $set: {
            expires_date: null,
            is_under_trial: false,
            trial_ends_at: null,
            auto_renew: false,
            subscription: false,
            first_purchase: false
          }
        }
      );
    }

    console.log('Cron Job successfully run');
  } catch (error) {
    console.error('Cron Job Error:', error);
  }
});

console.log('Reminder Crons Started');
