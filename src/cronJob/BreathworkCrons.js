'use strict';

const cron = require('node-cron');
const { breathwork } = require('@config/cron');
const {
  CRON_QUERY_TYPE,
  NOTIFICATION_TYPE,
  REMINDER_TYPE,
  BREATHWORK_NOTIFICATION_MESSAGE,
  REMINDER_CRON_PAGE_LIMIT,
  CRON_TYPE
} = require('@services/Constant');
const { currentDateOnly, getRandomItem } = require('@services/Helper');
const { Reminder, CronStatus } = require('@models');
const {
  reminderCronQuery,
  createCronHistory,
  chunkReminderQuery
} = require('@services/userServices/cronServices');

const reminderBreathworkCron = async (queryType) => {
  const startDate = new Date();
  try {
    const cronStatus = await CronStatus.findOne({
      cron_type: CRON_TYPE.BREATHWORK_REMINDER
    }).select('cron_status');
    if (!cronStatus || !cronStatus.cron_status) {
      const endsDate = new Date();
      await createCronHistory(
        'Breathwork',
        'Breathwork cron is off',
        startDate,
        endsDate,
        true,
        queryType
      );
      return console.log('Breathwork cron is off');
    }
    const filterCondition = reminderCronQuery(REMINDER_TYPE.BREATHWORKS, queryType);
    const totalCount = await Reminder.countDocuments(filterCondition);
    const aggregateCondition = [
      {
        $match: filterCondition
      },
      {
        $skip: 0
      },
      {
        $limit: REMINDER_CRON_PAGE_LIMIT
      },
      {
        $project: {
          user_id: 1
        }
      },
      {
        $lookup: {
          from: 'device_tokens',
          let: {
            user_id: '$user_id'
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ['$user_id', '$$user_id']
                }
              }
            },
            {
              $project: {
                device_token: 1,
                _id: 0
              }
            }
          ],
          as: 'deviceTokens'
        }
      },
      {
        $match: {
          $expr: {
            $gt: [
              {
                $size: '$deviceTokens'
              },
              0
            ]
          }
        }
      },
      {
        $project: {
          user_id: 1,
          deviceTokens: '$deviceTokens.device_token'
        }
      }
    ];
    const breathworkMessage = getRandomItem(BREATHWORK_NOTIFICATION_MESSAGE);
    const reminderData = await chunkReminderQuery(
      aggregateCondition,
      totalCount,
      NOTIFICATION_TYPE.BREATHWORK_REMINDER,
      'Breathwork',
      breathworkMessage
    );
    const endsDate = new Date();
    await createCronHistory(
      'Breathwork',
      reminderData ? 'Breathwork cron run successfully' : 'There is no data to run breathwork cron',
      startDate,
      endsDate,
      true,
      queryType
    );
    return reminderData
      ? console.log('Breathwork cron run successfully')
      : console.log('There is no data to run breathwork cron');
  } catch (err) {
    const endsDate = new Date();
    await createCronHistory('Breathwork', err, startDate, endsDate, false, queryType);
    return console.error(err);
  }
};

// This cron will executed at 6:00 AM daily
cron.schedule(breathwork[0], () => {
  const date = currentDateOnly();
  const weekDay = date.getDay();
  const todayDate = date.getDate();

  reminderBreathworkCron(CRON_QUERY_TYPE.DAILY__WEEKLY_ALL);
  switch (weekDay) {
    case 1:
    reminderBreathworkCron(CRON_QUERY_TYPE.WEEKLY_1_3_5);
      break;
    case 2:
    case 4:
    case 6:
    case 7:
        reminderBreathworkCron(CRON_QUERY_TYPE.WEEKLY_5);
      break;
    case 3:
    case 5:
        reminderBreathworkCron(CRON_QUERY_TYPE.WEEKLY_3);
      break;
    default:
      console.log('Wrong weekly day');
      break;
  }
  switch (todayDate) {
    case 1:
        reminderBreathworkCron(CRON_QUERY_TYPE.MONTHLY_10_8_5_3_1);
      break;
    case 3:
    case 7:
    case 9:
    case 13:
    case 17:
        reminderBreathworkCron(CRON_QUERY_TYPE.MONTHLY_10_8);
      break;
    case 5:
        reminderBreathworkCron(CRON_QUERY_TYPE.MONTHLY_10_5);
      break;
    case 15:
        reminderBreathworkCron(CRON_QUERY_TYPE.MONTHLY_10_5_3);
      break;
    case 21:
        reminderBreathworkCron(CRON_QUERY_TYPE.MONTHLY_10_8_5);
      break;
    case 25:
        reminderBreathworkCron(CRON_QUERY_TYPE.MONTHLY_10_8_5_3);
      break;
    default:
      console.log('No cron neeed to be executed on this monthly day');
      break;
  }
});

// This cron will be executed at 07:00 AM daily
cron.schedule(breathwork[1], () => {
    reminderBreathworkCron(CRON_QUERY_TYPE.DAILY_AT_7_AM);
});

// This cron will be executed at 08:00 AM daily
cron.schedule(breathwork[2], () => {
    reminderBreathworkCron(CRON_QUERY_TYPE.DAILY_AT_8_AM);
});

// This cron will be executed at 10:00 AM daily
cron.schedule(breathwork[3], () => {
  reminderBreathworkCron(CRON_QUERY_TYPE.DAILY_AT_10_AM);
});

// This cron will be executed at 12:00 PM daily
cron.schedule(breathwork[4], () => {
  reminderBreathworkCron(CRON_QUERY_TYPE.DAILY_AT_12_PM);
});

// This cron will be executed at 2:00 PM daily
cron.schedule(breathwork[5], () => {
  reminderBreathworkCron(CRON_QUERY_TYPE.DAILY_AT_2_PM);
});

// This cron will be executed at 03:00 PM daily
cron.schedule(breathwork[6], () => {
  reminderBreathworkCron(CRON_QUERY_TYPE.DAILY_AT_3_PM);
});

// This cron will be executed at 04:00 PM daily
cron.schedule(breathwork[7], () => {
  reminderBreathworkCron(CRON_QUERY_TYPE.DAILY_AT_4_PM);
});

// This cron will be executed at 06:00 PM daily
cron.schedule(breathwork[8], () => {
  reminderBreathworkCron(CRON_QUERY_TYPE.DAILY_AT_6_PM);
});

// This cron will be executed at 08:00 PM daily
cron.schedule(breathwork[9], () => {
  reminderBreathworkCron(CRON_QUERY_TYPE.DAILY_AT_8_AM);
});

// This cron will be executed at 11:00 PM daily
cron.schedule(breathwork[10], () => {
  reminderBreathworkCron(CRON_QUERY_TYPE.DAILY_AT_11_PM);
});

console.log('Breathwork Crons Started');
