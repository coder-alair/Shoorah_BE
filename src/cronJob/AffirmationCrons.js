'use strict';

const cron = require('node-cron');
const { Affirmation } = require('@config/cron');
const {
  CRON_QUERY_TYPE,
  REMINDER_TYPE,
  STATUS,
  CONTENT_TYPE,
  REMINDER_CRON_PAGE_LIMIT,
  CRON_TYPE
} = require('@services/Constant');
const { currentDateOnly } = require('@services/Helper');
const { Reminder, CronStatus } = require('@models');
const {
  reminderCronQuery,
  createCronHistory,
  chunkReminderAffirmationQuery
} = require('@services/userServices/cronServices');

const reminderAffirmationCron = async (queryType) => {
  const startDate = new Date();
  try {
    const cronStatus = await CronStatus.findOne({
      cron_type: CRON_TYPE.AFFIRMAATION_REMINDER
    }).select('cron_status');
    if (!cronStatus || !cronStatus.cron_status) {
      const endsDate = new Date();
      await createCronHistory(
        'Affirmation',
        'Affirmation cron is off',
        startDate,
        endsDate,
        true,
        queryType
      );
      return console.log('Affirmation cron is off');
    }

    const filterCondition = reminderCronQuery(REMINDER_TYPE.AFFIRMATION, queryType);
    const totalCount = await Reminder.countDocuments(filterCondition);
    const aggregateCondition = [
      {
        $match: filterCondition
      },
      {
        $project: {
          user_id: 1,
          offset: 1
        }
      },
      {
        $skip: 0
      },
      {
        $limit: REMINDER_CRON_PAGE_LIMIT
      },
      {
        $lookup: {
          from: 'device_tokens',
          localField: 'user_id',
          foreignField: 'user_id',
          pipeline: [
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
        $lookup: {
          from: 'user_interests',
          localField: 'user_id',
          foreignField: 'user_id',
          pipeline: [
            {
              $project: {
                user_id: 1,
                affirmation_focus_ids: 1
              }
            },
            {
              $lookup: {
                from: 'bookmarks',
                localField: 'user_id',
                foreignField: 'user_id',
                pipeline: [
                  {
                    $match: {
                      content_type: CONTENT_TYPE.AFFIRMATION
                    }
                  },
                  {
                    $project: {
                      content_id: 1
                    }
                  }
                ],
                as: 'bookmarks'
              }
            },
            {
              $unwind: {
                path: '$bookmarks',
                preserveNullAndEmptyArrays: true
              }
            },
            {
              $unwind: {
                path: '$affirmation_focus_ids',
                preserveNullAndEmptyArrays: true
              }
            },
            {
              $lookup: {
                from: 'affirmations',
                localField: 'affirmation_focus_ids',
                foreignField: 'focus_ids',
                pipeline: [
                  {
                    $match: {
                      status: STATUS.ACTIVE,
                      approved_by: {
                        $ne: null
                      },
                      _id: {
                        $ne: '$bookmarks.content_id'
                      }
                    }
                  },
                  {
                    $project: {
                      display_name: 1
                    }
                  }
                ],
                as: 'affirmations'
              }
            },
            {
              $project: {
                affirmations: 1
              }
            }
          ],
          as: 'userInterest'
        }
      },
      {
        $unwind: {
          path: '$userInterest',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: '$user_id',
          affirmations: {
            $addToSet: '$userInterest.affirmations'
          },
          offset: {
            $first: '$offset'
          },
          deviceTokens: {
            $first: '$deviceTokens.device_token'
          }
        }
      },
      {
        $addFields: {
          affirmations: {
            $reduce: {
              input: '$affirmations',
              initialValue: [],
              in: {
                $concatArrays: ['$$value', '$$this']
              }
            }
          }
        }
      },
      {
        $project: {
          affirmations: {
            $cond: [
              {
                $gt: [
                  {
                    $arrayElemAt: ['$affirmations', '$offset']
                  },
                  null
                ]
              },
              {
                $arrayElemAt: ['$affirmations', '$offset']
              },
              {
                $arrayElemAt: ['$affirmations', 0]
              }
            ]
          },
          deviceTokens: 1,
          offset: 1
        }
      }
    ];

    const reminderData = await chunkReminderAffirmationQuery(aggregateCondition, totalCount);
    console.log('reminderData', JSON.stringify(reminderData));
    const endsDate = new Date();
    await createCronHistory(
      'Affirmation',
      reminderData ? 'Affirmation cron executed successfully.' : 'No reminder data found',
      startDate,
      endsDate,
      true,
      queryType
    );
    return console.log(
      reminderData ? 'Affirmation cron executed successfully.' : 'No reminder data found'
    );
  } catch (err) {
    const endsDate = new Date();
    await createCronHistory('Affirmation', err, startDate, endsDate, false, queryType);
    return console.error(err);
  }
};

// This cron will executed at 6:00 AM daily
cron.schedule(Affirmation[0], () => {
  const date = currentDateOnly();
  const weekDay = date.getDay();
  const todayDate = date.getDate();
  reminderAffirmationCron(CRON_QUERY_TYPE.DAILY__WEEKLY_ALL);
  switch (weekDay) {
    case 1:
      reminderAffirmationCron(CRON_QUERY_TYPE.WEEKLY_1_3_5);
      break;
    case 2:
    case 4:
    case 6:
    case 7:
      reminderAffirmationCron(CRON_QUERY_TYPE.WEEKLY_5);
      break;
    case 3:
    case 5:
      reminderAffirmationCron(CRON_QUERY_TYPE.WEEKLY_3);
      break;
    default:
      console.log('Wrong weekly day');
      break;
  }
  switch (todayDate) {
    case 1:
      reminderAffirmationCron(CRON_QUERY_TYPE.MONTHLY_10_8_5_3_1);
      break;
    case 3:
    case 7:
    case 9:
    case 13:
    case 17:
      reminderAffirmationCron(CRON_QUERY_TYPE.MONTHLY_10_8);
      break;
    case 5:
      reminderAffirmationCron(CRON_QUERY_TYPE.MONTHLY_10_5);
      break;
    case 15:
      reminderAffirmationCron(CRON_QUERY_TYPE.MONTHLY_10_5_3);
      break;
    case 21:
      reminderAffirmationCron(CRON_QUERY_TYPE.MONTHLY_10_8_5);
      break;
    case 25:
      reminderAffirmationCron(CRON_QUERY_TYPE.MONTHLY_10_8_5_3);
      break;
    default:
      console.log('No cron neeed to be executed on this monthly day');
      break;
  }
});

// This cron will be executed at 07:00 AM daily
cron.schedule(Affirmation[1], () => {
  reminderAffirmationCron(CRON_QUERY_TYPE.DAILY_AT_7_AM);
});

// This cron will be executed at 08:00 AM daily
cron.schedule(Affirmation[2], () => {
  reminderAffirmationCron(CRON_QUERY_TYPE.DAILY_AT_8_AM);
});

// This cron will be executed at 10:00 AM daily
cron.schedule(Affirmation[3], () => {
  reminderAffirmationCron(CRON_QUERY_TYPE.DAILY_AT_10_AM);
});

// This cron will be executed at 12:00 PM daily
cron.schedule(Affirmation[4], () => {
  reminderAffirmationCron(CRON_QUERY_TYPE.DAILY_AT_12_PM);
});

// This cron will be executed at 2:00 PM daily
cron.schedule(Affirmation[5], () => {
  reminderAffirmationCron(CRON_QUERY_TYPE.DAILY_AT_2_PM);
});

// This cron will be executed at 03:00 PM daily
cron.schedule(Affirmation[6], () => {
  reminderAffirmationCron(CRON_QUERY_TYPE.DAILY_AT_3_PM);
});

// This cron will be executed at 04:00 PM daily
cron.schedule(Affirmation[7], () => {
  reminderAffirmationCron(CRON_QUERY_TYPE.DAILY_AT_4_PM);
});

// This cron will be executed at 06:00 PM daily
cron.schedule(Affirmation[8], () => {
  reminderAffirmationCron(CRON_QUERY_TYPE.DAILY_AT_6_PM);
});

// This cron will be executed at 08:00 PM daily
cron.schedule(Affirmation[9], () => {
  reminderAffirmationCron(CRON_QUERY_TYPE.DAILY_AT_8_AM);
});

// This cron will be executed at 11:00 PM daily
cron.schedule(Affirmation[10], () => {
  reminderAffirmationCron(CRON_QUERY_TYPE.DAILY_AT_11_PM);
});

console.log('Affirmation Crons Started');
