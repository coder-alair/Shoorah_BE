'use strict';

const cron = require('node-cron');
const { gratitude } = require('@config/cron');
const {
  CRON_QUERY_TYPE,
  NOTIFICATION_TYPE,
  REMINDER_TYPE,
  GRATITUDE_NOTIFICATION_MESSAGE,
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

const reminderGratitudeCron = async (queryType) => {
  const startDate = new Date();
  try {
    const cronStatus = await CronStatus.findOne({
      cron_type: CRON_TYPE.GRATITUDE_REMINDER
    }).select('cron_status');
    if (!cronStatus || !cronStatus.cron_status) {
      const endsDate = new Date();
      await createCronHistory(
        'Gratitude',
        'Gratitude cron is off',
        startDate,
        endsDate,
        true,
        queryType
      );
      return console.log('Gratitude cron is off');
    }
    const filterCondition = reminderCronQuery(REMINDER_TYPE.GRATITUDE, queryType);
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
    const gratitudeMessage = getRandomItem(GRATITUDE_NOTIFICATION_MESSAGE);
    const reminderData = await chunkReminderQuery(
      aggregateCondition,
      totalCount,
      NOTIFICATION_TYPE.GRATITUDE_NOTIFICATION,
      'Gratitude',
      gratitudeMessage
    );
    const endsDate = new Date();
    await createCronHistory(
      'Gratitude',
      reminderData ? 'Gratitude cron run successfully' : 'There is no data to run Gratitude cron',
      startDate,
      endsDate,
      true,
      queryType
    );
    return reminderData
      ? console.log('Gratitude cron run successfully')
      : console.log('There is no data to run Gratitude cron');
  } catch (err) {
    const endsDate = new Date();
    await createCronHistory('Gratitude', err, startDate, endsDate, false, queryType);
    return console.error(err);
  }
};

// This cron will executed at 6:00 AM daily
cron.schedule(gratitude[0], () => {
  const date = currentDateOnly();
  const weekDay = date.getDay();
  const todayDate = date.getDate();

  reminderGratitudeCron(CRON_QUERY_TYPE.DAILY__WEEKLY_ALL);
  switch (weekDay) {
    case 1:
      reminderGratitudeCron(CRON_QUERY_TYPE.WEEKLY_1_3_5);
      break;
    case 2:
    case 4:
    case 6:
    case 7:
      reminderGratitudeCron(CRON_QUERY_TYPE.WEEKLY_5);
      break;
    case 3:
    case 5:
      reminderGratitudeCron(CRON_QUERY_TYPE.WEEKLY_3);
      break;
    default:
      console.log('Wrong weekly day');
      break;
  }
  switch (todayDate) {
    case 1:
      reminderGratitudeCron(CRON_QUERY_TYPE.MONTHLY_10_8_5_3_1);
      break;
    case 3:
    case 7:
    case 9:
    case 13:
    case 17:
      reminderGratitudeCron(CRON_QUERY_TYPE.MONTHLY_10_8);
      break;
    case 5:
      reminderGratitudeCron(CRON_QUERY_TYPE.MONTHLY_10_5);
      break;
    case 15:
      reminderGratitudeCron(CRON_QUERY_TYPE.MONTHLY_10_5_3);
      break;
    case 21:
      reminderGratitudeCron(CRON_QUERY_TYPE.MONTHLY_10_8_5);
      break;
    case 25:
      reminderGratitudeCron(CRON_QUERY_TYPE.MONTHLY_10_8_5_3);
      break;
    default:
      console.log('No cron neeed to be executed on this monthly day');
      break;
  }
});

// This cron will be executed at 07:00 AM daily
cron.schedule(gratitude[1], () => {
  reminderGratitudeCron(CRON_QUERY_TYPE.DAILY_AT_7_AM);
});

// This cron will be executed at 08:00 AM daily
cron.schedule(gratitude[2], () => {
  reminderGratitudeCron(CRON_QUERY_TYPE.DAILY_AT_8_AM);
});

// This cron will be executed at 10:00 AM daily
cron.schedule(gratitude[3], () => {
  reminderGratitudeCron(CRON_QUERY_TYPE.DAILY_AT_10_AM);
});

// This cron will be executed at 12:00 PM daily
cron.schedule(gratitude[4], () => {
  reminderGratitudeCron(CRON_QUERY_TYPE.DAILY_AT_12_PM);
});

// This cron will be executed at 2:00 PM daily
cron.schedule(gratitude[5], () => {
  reminderGratitudeCron(CRON_QUERY_TYPE.DAILY_AT_2_PM);
});

// This cron will be executed at 03:00 PM daily
cron.schedule(gratitude[6], () => {
  reminderGratitudeCron(CRON_QUERY_TYPE.DAILY_AT_3_PM);
});

// This cron will be executed at 04:00 PM daily
cron.schedule(gratitude[7], () => {
  reminderGratitudeCron(CRON_QUERY_TYPE.DAILY_AT_4_PM);
});

// This cron will be executed at 06:00 PM daily
cron.schedule(gratitude[8], () => {
  reminderGratitudeCron(CRON_QUERY_TYPE.DAILY_AT_6_PM);
});

// This cron will be executed at 08:00 PM daily
cron.schedule(gratitude[9], () => {
  reminderGratitudeCron(CRON_QUERY_TYPE.DAILY_AT_8_AM);
});

// This cron will be executed at 11:00 PM daily
cron.schedule(gratitude[10], () => {
  reminderGratitudeCron(CRON_QUERY_TYPE.DAILY_AT_11_PM);
});

console.log('Gratitude Crons Started');
