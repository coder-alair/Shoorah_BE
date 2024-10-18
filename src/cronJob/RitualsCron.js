'use strict';

const cron = require('node-cron');
const { rituals } = require('@config/cron');
const {
  CRON_QUERY_TYPE,
  NOTIFICATION_TYPE,
  REMINDER_TYPE,
  RITUALS_NOTIFICATION_MESSAGE,
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

const reminderRitualsCron = async (queryType) => {
  const startDate = new Date();
  try {
    const cronStatus = await CronStatus.findOne({
      cron_type: CRON_TYPE.RITUALS_REMINDER
    }).select('cron_status');
    if (!cronStatus || !cronStatus.cron_status) {
      const endsDate = new Date();
      await createCronHistory(
        'Rituals',
        'Rituals cron is off',
        startDate,
        endsDate,
        true,
        queryType
      );
      return console.log('Rituals cron is off');
    }
    const filterCondition = reminderCronQuery(REMINDER_TYPE.RITUALS, queryType);
    const totalCount = await Reminder.countDocuments(filterCondition);
    const dateFrom = currentDateOnly();
    const dateTo = currentDateOnly();
    dateTo.setDate(dateFrom.getDate() + 1);
    const noRitualMessage = getRandomItem(RITUALS_NOTIFICATION_MESSAGE.NO_RITUAL);
    const allRitualsCompletedMessage = getRandomItem(
      RITUALS_NOTIFICATION_MESSAGE.ALL_RITUALS_COMPLETED
    );
    const ritualsNotCompletedMessage = getRandomItem(
      RITUALS_NOTIFICATION_MESSAGE.RITUALS_NOT_COMPLETED
    );
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
        $lookup: {
          from: 'user_rituals',
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
                ritual_ids: 1,
                user_id: 1,
                _id: 0
              }
            },
            {
              $limit: 1
            },
            {
              $lookup: {
                from: 'user_completed_rituals',
                let: {
                  user_id: '$user_id',
                  ritual_ids: '$ritual_ids'
                },
                pipeline: [
                  {
                    $match: {
                      createdAt: {
                        $gte: dateFrom,
                        $lt: dateTo
                      },
                      $expr: {
                        $and: [
                          {
                            $eq: ['$user_id', '$$user_id']
                          },
                          {
                            $in: ['$ritual_id', '$$ritual_ids']
                          }
                        ]
                      }
                    }
                  },
                  {
                    $project: {
                      is_completed: 1,
                      _id: 0
                    }
                  },
                  {
                    $limit: 1
                  }
                ],
                as: 'userRitualStatus'
              }
            }
          ],
          as: 'userRituals'
        }
      },
      {
        $unwind: {
          path: '$userRituals',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          user_id: 1,
          deviceTokens: '$deviceTokens.device_token',
          message: {
            $cond: {
              if: {
                $and: [
                  {
                    $gt: ['$userRituals', null]
                  },
                  {
                    $gt: [
                      {
                        $size: '$userRituals.ritual_ids'
                      },
                      0
                    ]
                  }
                ]
              },
              then: {
                $cond: {
                  if: {
                    $and: [
                      {
                        $gt: [
                          {
                            $size: '$userRituals.userRitualStatus'
                          },
                          0
                        ]
                      },
                      {
                        $allElementsTrue: ['$userRituals.userRitualStatus.is_completed']
                      }
                    ]
                  },
                  then: allRitualsCompletedMessage,
                  else: ritualsNotCompletedMessage
                }
              },
              else: noRitualMessage
            }
          }
        }
      }
    ];
    const reminderData = await chunkReminderQuery(
      aggregateCondition,
      totalCount,
      NOTIFICATION_TYPE.RITUALS_NOTIFICATION,
      'Rituals'
    );
    const endsDate = new Date();
    await createCronHistory(
      'Rituals',
      reminderData ? 'Rituals cron run successfully' : 'There is no data to run rituals cron',
      startDate,
      endsDate,
      true,
      queryType
    );
    return reminderData
      ? console.log('Rituals cron run successfully')
      : console.log('There is no data to run rituals cron');
  } catch (err) {
    const endsDate = new Date();
    await createCronHistory('Rituals', err, startDate, endsDate, false, queryType);
    return console.error(err);
  }
};

// This cron will executed at 6:00 AM daily
cron.schedule(rituals[0], () => {
  const date = currentDateOnly();
  const weekDay = date.getDay();
  const todayDate = date.getDate();

  reminderRitualsCron(CRON_QUERY_TYPE.DAILY__WEEKLY_ALL);
  switch (weekDay) {
    case 1:
      reminderRitualsCron(CRON_QUERY_TYPE.WEEKLY_1_3_5);
      break;
    case 2:
    case 4:
    case 6:
    case 7:
      reminderRitualsCron(CRON_QUERY_TYPE.WEEKLY_5);
      break;
    case 3:
    case 5:
      reminderRitualsCron(CRON_QUERY_TYPE.WEEKLY_3);
      break;
    default:
      console.log('Wrong weekly day');
      break;
  }
  switch (todayDate) {
    case 1:
      reminderRitualsCron(CRON_QUERY_TYPE.MONTHLY_10_8_5_3_1);
      break;
    case 3:
    case 7:
    case 9:
    case 13:
    case 17:
      reminderRitualsCron(CRON_QUERY_TYPE.MONTHLY_10_8);
      break;
    case 5:
      reminderRitualsCron(CRON_QUERY_TYPE.MONTHLY_10_5);
      break;
    case 15:
      reminderRitualsCron(CRON_QUERY_TYPE.MONTHLY_10_5_3);
      break;
    case 21:
      reminderRitualsCron(CRON_QUERY_TYPE.MONTHLY_10_8_5);
      break;
    case 25:
      reminderRitualsCron(CRON_QUERY_TYPE.MONTHLY_10_8_5_3);
      break;
    default:
      console.log('No cron neeed to be executed on this monthly day');
      break;
  }
});

// This cron will be executed at 07:00 AM daily
cron.schedule(rituals[1], () => {
  reminderRitualsCron(CRON_QUERY_TYPE.DAILY_AT_7_AM);
});

// This cron will be executed at 08:00 AM daily
cron.schedule(rituals[2], () => {
  reminderRitualsCron(CRON_QUERY_TYPE.DAILY_AT_8_AM);
});

// This cron will be executed at 10:00 AM daily
cron.schedule(rituals[3], () => {
  reminderRitualsCron(CRON_QUERY_TYPE.DAILY_AT_10_AM);
});

// This cron will be executed at 12:00 PM daily
cron.schedule(rituals[4], () => {
  reminderRitualsCron(CRON_QUERY_TYPE.DAILY_AT_12_PM);
});

// This cron will be executed at 2:00 PM daily
cron.schedule(rituals[5], () => {
  reminderRitualsCron(CRON_QUERY_TYPE.DAILY_AT_2_PM);
});

// This cron will be executed at 03:00 PM daily
cron.schedule(rituals[6], () => {
  reminderRitualsCron(CRON_QUERY_TYPE.DAILY_AT_3_PM);
});

// This cron will be executed at 04:00 PM daily
cron.schedule(rituals[7], () => {
  reminderRitualsCron(CRON_QUERY_TYPE.DAILY_AT_4_PM);
});

// This cron will be executed at 06:00 PM daily
cron.schedule(rituals[8], () => {
  reminderRitualsCron(CRON_QUERY_TYPE.DAILY_AT_6_PM);
});

// This cron will be executed at 08:00 PM daily
cron.schedule(rituals[9], () => {
  reminderRitualsCron(CRON_QUERY_TYPE.DAILY_AT_8_AM);
});

// This cron will be executed at 11:00 PM daily
cron.schedule(rituals[10], () => {
  reminderRitualsCron(CRON_QUERY_TYPE.DAILY_AT_11_PM);
});

console.log('Rituals Crons Started');
