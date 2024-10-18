'use strict';

const cron = require('node-cron');
const { Moods } = require('@config/cron');
const {
  CRON_QUERY_TYPE,
  NOTIFICATION_TYPE,
  REMINDER_TYPE,
  REMINDER_CRON_PAGE_LIMIT,
  CRON_TYPE,
  MOODS_NOTIFICATION_MESSAGE
} = require('@services/Constant');
const { currentDateOnly, getRandomItem } = require('@services/Helper');
const { Reminder, CronStatus } = require('@models');
const {
  reminderCronQuery,
  createCronHistory,
  chunkReminderQuery
} = require('@services/userServices/cronServices');

const reminderMoodsCron = async (queryType) => {
  const startDate = new Date();
  try {
    const cronStatus = await CronStatus.findOne({
      cron_type: CRON_TYPE.MOODS_REMINDER
    }).select('cron_status');
    if (!cronStatus || !cronStatus.cron_status) {
      const endsDate = new Date();
      await createCronHistory('Moods', 'Moods cron is off', startDate, endsDate, true, queryType);
      return console.log('Moods cron is off');
    }
    const filterCondition = reminderCronQuery(REMINDER_TYPE.MOODS_EMOTION, queryType);
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
    const moodsMessage = getRandomItem(MOODS_NOTIFICATION_MESSAGE);
    const reminderData = await chunkReminderQuery(
      aggregateCondition,
      totalCount,
      NOTIFICATION_TYPE.MOODS_REMINDER,
      'Moods',
      moodsMessage
    );
    const endsDate = new Date();
    await createCronHistory(
      'Moods',
      reminderData ? 'Moods cron run successfully' : 'There is no data to run Moods cron',
      startDate,
      endsDate,
      true,
      queryType
    );
    return reminderData
      ? console.log('Moods cron run successfully')
      : console.log('There is no data to run Moods cron');
  } catch (err) {
    const endsDate = new Date();
    await createCronHistory('Moods', err, startDate, endsDate, false, queryType);
    return console.error(err);
  }
};

// This cron will executed at 6:00 AM daily
cron.schedule(Moods[0], () => {
  const date = currentDateOnly();
  const weekDay = date.getDay();
  const todayDate = date.getDate();
  reminderMoodsCron(CRON_QUERY_TYPE.DAILY__WEEKLY_ALL);
  switch (weekDay) {
    case 1:
      reminderMoodsCron(CRON_QUERY_TYPE.WEEKLY_1_3_5);
      break;
    case 2:
    case 4:
    case 6:
    case 7:
      reminderMoodsCron(CRON_QUERY_TYPE.WEEKLY_5);
      break;
    case 3:
    case 5:
      reminderMoodsCron(CRON_QUERY_TYPE.WEEKLY_3);
      break;
    default:
      console.log('Wrong weekly day');
      break;
  }
  switch (todayDate) {
    case 1:
      reminderMoodsCron(CRON_QUERY_TYPE.MONTHLY_10_8_5_3_1);
      break;
    case 3:
    case 7:
    case 9:
    case 13:
    case 17:
      reminderMoodsCron(CRON_QUERY_TYPE.MONTHLY_10_8);
      break;
    case 5:
      reminderMoodsCron(CRON_QUERY_TYPE.MONTHLY_10_5);
      break;
    case 15:
      reminderMoodsCron(CRON_QUERY_TYPE.MONTHLY_10_5_3);
      break;
    case 21:
      reminderMoodsCron(CRON_QUERY_TYPE.MONTHLY_10_8_5);
      break;
    case 25:
      reminderMoodsCron(CRON_QUERY_TYPE.MONTHLY_10_8_5_3);
      break;
    default:
      console.log('No cron neeed to be executed on this monthly day');
      break;
  }
});

// This cron will be executed at 07:00 AM daily
cron.schedule(Moods[1], () => {
  reminderMoodsCron(CRON_QUERY_TYPE.DAILY_AT_7_AM);
});

// This cron will be executed at 08:00 AM daily
cron.schedule(Moods[2], () => {
  reminderMoodsCron(CRON_QUERY_TYPE.DAILY_AT_8_AM);
});

// This cron will be executed at 10:00 AM daily
cron.schedule(Moods[3], () => {
  reminderMoodsCron(CRON_QUERY_TYPE.DAILY_AT_10_AM);
});

// This cron will be executed at 12:00 PM daily
cron.schedule(Moods[4], () => {
  reminderMoodsCron(CRON_QUERY_TYPE.DAILY_AT_12_PM);
});

// This cron will be executed at 2:00 PM daily
cron.schedule(Moods[5], () => {
  reminderMoodsCron(CRON_QUERY_TYPE.DAILY_AT_2_PM);
});

// This cron will be executed at 03:00 PM daily
cron.schedule(Moods[6], () => {
  reminderMoodsCron(CRON_QUERY_TYPE.DAILY_AT_3_PM);
});

// This cron will be executed at 04:00 PM daily
cron.schedule(Moods[7], () => {
  reminderMoodsCron(CRON_QUERY_TYPE.DAILY_AT_4_PM);
});

// This cron will be executed at 06:00 PM daily
cron.schedule(Moods[8], () => {
  reminderMoodsCron(CRON_QUERY_TYPE.DAILY_AT_6_PM);
});

// This cron will be executed at 08:00 PM daily
cron.schedule(Moods[9], () => {
  reminderMoodsCron(CRON_QUERY_TYPE.DAILY_AT_8_AM);
});

// This cron will be executed at 11:00 PM daily
cron.schedule(Moods[10], () => {
  reminderMoodsCron(CRON_QUERY_TYPE.DAILY_AT_11_PM);
});

console.log('Moods Crons Started');
