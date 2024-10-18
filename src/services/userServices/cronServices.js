'use strict ';

const {
  CRON_QUERY_TYPE,
  REMINDER_PERIOD,
  NOTIFICATION_ACTION,
  FEATURE_TYPE,
  CATEGORY_TYPE,
  BADGE_TYPE,
  NOTIFICATION_TYPE,
  STATUS,
  REMINDER_CRON_PAGE_LIMIT,
  REMINDER_TYPE
} = require('@services/Constant');
const { sendNotification } = require('@services/Notify');
const { CronHistory, Reminder, UserActivityCounts, Affirmation } = require('@models');
const { updateBadges, sendBadgeNotification } = require('@services/userServices/badgeServices');
const { toObjectId, currentDateOnly } = require('@services/Helper');

module.exports = {
  /**
   * @description This function is used to get reminder cron query
   * @param {*} reminderType
   * @param {*} queryType
   * @returns {*}
   */
  reminderCronQuery: (reminderType, queryType) => {
    const filterCondition = {
      reminder: {
        $elemMatch: {
          reminder_type: reminderType
        }
      },
      deletedAt: null
    };
    switch (queryType) {
      case CRON_QUERY_TYPE.DAILY__WEEKLY_ALL:
        filterCondition.reminder.$elemMatch.$or = [
          reminderType === REMINDER_TYPE.MEDITATION
            ? {
                reminder_period: REMINDER_PERIOD.DAILY,
                interval: {
                  $ne: 0
                }
              }
            : {
                reminder_period: REMINDER_PERIOD.DAILY,
                interval: {
                  $nin: [0, 1]
                }
              },
          {
            reminder_period: REMINDER_PERIOD.WEEKLY,
            interval: 7
          }
        ];
        break;
      case CRON_QUERY_TYPE.DAILY_AT_2_PM:
        filterCondition.reminder.$elemMatch.reminder_period = REMINDER_PERIOD.DAILY;
        filterCondition.reminder.$elemMatch.interval = {
          $in: [3, 5, 8, 10]
        };
        break;
      case CRON_QUERY_TYPE.DAILY_AT_11_PM:
        filterCondition.reminder.$elemMatch.reminder_period = REMINDER_PERIOD.DAILY;
        filterCondition.reminder.$elemMatch.interval = {
          $in: [3, 5]
        };
        break;
      case CRON_QUERY_TYPE.DAILY_AT_10_AM:
        filterCondition.reminder.$elemMatch.reminder_period = REMINDER_PERIOD.DAILY;
        filterCondition.reminder.$elemMatch.interval =
          reminderType === REMINDER_TYPE.AFFIRMATION
            ? {
                $in: [1, 5, 8, 10]
              }
            : {
                $in: [5, 8, 10]
              };
        break;
      case CRON_QUERY_TYPE.DAILY_AT_8_PM:
        filterCondition.reminder.$elemMatch.reminder_period = REMINDER_PERIOD.DAILY;
        filterCondition.reminder.$elemMatch.interval = {
          $in: [5, 8, 10]
        };
        break;
      case CRON_QUERY_TYPE.DAILY_AT_8_AM:
        filterCondition.reminder.$elemMatch.reminder_period = REMINDER_PERIOD.DAILY;
        filterCondition.reminder.$elemMatch.interval =
          reminderType === REMINDER_TYPE.GOAL
            ? {
                $in: [1, 8, 10]
              }
            : {
                $in: [8, 10]
              };
        break;
      case CRON_QUERY_TYPE.DAILY_AT_12_PM:
        filterCondition.reminder.$elemMatch.reminder_period = REMINDER_PERIOD.DAILY;
        filterCondition.reminder.$elemMatch.interval =
          reminderType === REMINDER_TYPE.RITUALS
            ? {
                $in: [1, 8, 10]
              }
            : {
                $in: [8, 10]
              };
        break;
      case CRON_QUERY_TYPE.DAILY_AT_4_PM:
      case CRON_QUERY_TYPE.DAILY_AT_6_PM:
        filterCondition.reminder.$elemMatch.reminder_period = REMINDER_PERIOD.DAILY;
        filterCondition.reminder.$elemMatch.interval = {
          $in: [8, 10]
        };
        break;
      case CRON_QUERY_TYPE.DAILY_AT_7_AM:
        filterCondition.reminder.$elemMatch.reminder_period = REMINDER_PERIOD.DAILY;
        reminderType === REMINDER_TYPE.GRATITUDE
          ? (filterCondition.reminder.$elemMatch.interval = { $in: [1, 10] })
          : (filterCondition.reminder.$elemMatch.interval = 10);
        break;
      case CRON_QUERY_TYPE.DAILY_AT_3_PM:
        filterCondition.reminder.$elemMatch.reminder_period = REMINDER_PERIOD.DAILY;
        filterCondition.reminder.$elemMatch.interval = 10;
        break;
      case CRON_QUERY_TYPE.WEEKLY_1_3_5:
        filterCondition.reminder.$elemMatch.reminder_period = REMINDER_PERIOD.WEEKLY;
        filterCondition.reminder.$elemMatch.interval = {
          $in: [1, 3, 5]
        };
        break;
      case CRON_QUERY_TYPE.WEEKLY_5:
        filterCondition.reminder.$elemMatch.reminder_period = REMINDER_PERIOD.WEEKLY;
        filterCondition.reminder.$elemMatch.interval = 5;
        break;
      case CRON_QUERY_TYPE.WEEKLY_3:
        filterCondition.reminder.$elemMatch.reminder_period = REMINDER_PERIOD.WEEKLY;
        filterCondition.reminder.$elemMatch.interval = 3;
        break;
      case CRON_QUERY_TYPE.MONTHLY_10_8_5_3_1:
        filterCondition.reminder.$elemMatch.reminder_period = REMINDER_PERIOD.MONTHLY;
        filterCondition.reminder.$elemMatch.interval = {
          $in: [10, 8, 5, 3, 1]
        };
        break;
      case CRON_QUERY_TYPE.MONTHLY_10_8:
        filterCondition.reminder.$elemMatch.reminder_period = REMINDER_PERIOD.MONTHLY;
        filterCondition.reminder.$elemMatch.interval = {
          $in: [10, 8]
        };
        break;
      case CRON_QUERY_TYPE.MONTHLY_10_5:
        filterCondition.reminder.$elemMatch.reminder_period = REMINDER_PERIOD.MONTHLY;
        filterCondition.reminder.$elemMatch.interval = {
          $in: [10, 5]
        };
        break;
      case CRON_QUERY_TYPE.MONTHLY_10_5_3:
        filterCondition.reminder.$elemMatch.reminder_period = REMINDER_PERIOD.MONTHLY;
        filterCondition.reminder.$elemMatch.interval = {
          $in: [10, 5, 3]
        };
        break;
      case CRON_QUERY_TYPE.MONTHLY_10_8_5:
        filterCondition.reminder.$elemMatch.reminder_period = REMINDER_PERIOD.MONTHLY;
        filterCondition.reminder.$elemMatch.interval = {
          $in: [10, 8, 5]
        };
        break;
      case CRON_QUERY_TYPE.MONTHLY_10_8_5_3:
        filterCondition.reminder.$elemMatch.reminder_period = REMINDER_PERIOD.MONTHLY;
        filterCondition.reminder.$elemMatch.interval = {
          $in: [10, 8, 5, 3]
        };
        break;
      default:
        console.error('Please select valid query type');
        break;
    }
    return filterCondition;
  },

  /**
   * @description This function is used to covert data in to chunks to send notification
   * @param {*} array
   * @param {*} notificationType
   * @returns {*}
   */
  // chunkedData: (array, notificationType, action, message = null) => {
  //   let length = array.length;
  //   if (length === 0) {
  //     return console.log('chunked data finished');
  //   }
  //   const splicedArray = array.splice(0, 5000);
  //   length = array.length;
  //   const title =
  //     action === NOTIFICATION_ACTION.GOALS_ACTIVITY
  //       ? 'Goals'
  //       : action === NOTIFICATION_ACTION.RITUALS_ACTIVITY
  //       ? 'Rituals'
  //       : action === NOTIFICATION_ACTION.MEDITATION_ACTIVITY
  //       ? 'Meditation'
  //       : 'Gratitude';
  //   splicedArray.forEach((data) => {
  //     const notifyData = {
  //       title: `${process.env.APP_NAME} ${title}`,
  //       message: data.message || message,
  //       notificationType
  //     };
  //     sendNotification(
  //       data.deviceTokens,
  //       notifyData.message,
  //       notifyData,
  //       action || NOTIFICATION_ACTION.MAIN_ACTIVITY
  //     );
  //   });

  //   return module.exports.chunkedData(array, notificationType, action, message);
  // },

  /**
   * @description This function is used to create cron history
   * @param {*} cronName
   * @param {*} action
   * @param {*} cronStarts
   * @param {*} cronEnds
   * @param {*} isSuccess
   * @param {*} res
   * @returns {*}
   */
  createCronHistory: async (
    cronName,
    action,
    cronStarts,
    cronEnds,
    isSuccess,
    queryType = null
  ) => {
    try {
      const createObj = {
        cron_name: cronName,
        action,
        cron_started_at: cronStarts,
        cron_ended_at: cronEnds,
        is_success: isSuccess,
        query_type: queryType
      };
      return await CronHistory.create(createObj);
    } catch (err) {
      return console.log(err);
    }
  },

  /**
   * @description This function is used to chunk affirmation cron data
   * @param {*} array
   * @returns {*}
   */
  // chunkedAffirmations: async (array) => {
  //   const updateQuery = [];
  //   let length = array.length;
  //   if (length === 0) {
  //     return console.log('chunked data finished');
  //   }
  //   const splicedArray = array.splice(0, 5000);
  //   async.forEachOf(
  //     splicedArray,
  //     async function (el) {
  //       let offset = el.offset + 1;
  //       let affirmationData;
  //       const filterData = {
  //         user_id: el.user_id,
  //         feature_type: FEATURE_TYPE.RECEIVED_NOTIFICATION,
  //         deletedAt: null
  //       };
  //       const updateData = {
  //         $inc: {
  //           count: 1
  //         }
  //       };
  //       const UserActivityCount = await UserActivityCounts.findOneAndUpdate(
  //         filterData,
  //         updateData,
  //         {
  //           upsert: true,
  //           new: true
  //         }
  //       ).select('feature_type count');
  //       let badgeReceived = false;
  //       switch (UserActivityCount.count) {
  //         case 10:
  //           badgeReceived = await updateBadges(
  //             el.user_id,
  //             CATEGORY_TYPE.RECEIVED_NOTIFICATION,
  //             BADGE_TYPE.BRONZE
  //           );
  //           badgeReceived &&
  //             (await sendBadgeNotification(
  //               el.user_id,
  //               CATEGORY_TYPE.RECEIVED_NOTIFICATION,
  //               BADGE_TYPE.BRONZE
  //             ));
  //           break;
  //         case 25:
  //           badgeReceived = await updateBadges(
  //             el.user_id,
  //             CATEGORY_TYPE.RECEIVED_NOTIFICATION,
  //             BADGE_TYPE.SILVER
  //           );
  //           badgeReceived &&
  //             (await sendBadgeNotification(
  //               el.user_id,
  //               CATEGORY_TYPE.RECEIVED_NOTIFICATION,
  //               BADGE_TYPE.SILVER
  //             ));
  //           break;
  //         case 50:
  //           badgeReceived = await updateBadges(
  //             el.user_id,
  //             CATEGORY_TYPE.RECEIVED_NOTIFICATION,
  //             BADGE_TYPE.GOLD
  //           );
  //           badgeReceived &&
  //             (await sendBadgeNotification(
  //               el.user_id,
  //               CATEGORY_TYPE.RECEIVED_NOTIFICATION,
  //               BADGE_TYPE.GOLD
  //             ));
  //           break;
  //         case 100:
  //           badgeReceived = await updateBadges(
  //             el.user_id,
  //             CATEGORY_TYPE.RECEIVED_NOTIFICATION,
  //             BADGE_TYPE.PLATINUM
  //           );
  //           badgeReceived &&
  //             (await sendBadgeNotification(
  //               el.user_id,
  //               CATEGORY_TYPE.RECEIVED_NOTIFICATION,
  //               BADGE_TYPE.PLATINUM
  //             ));
  //           break;
  //         case 200:
  //           badgeReceived = await updateBadges(
  //             el.user_id,
  //             CATEGORY_TYPE.RECEIVED_NOTIFICATION,
  //             BADGE_TYPE.DIAMOND
  //           );
  //           badgeReceived &&
  //             (await sendBadgeNotification(
  //               el.user_id,
  //               CATEGORY_TYPE.RECEIVED_NOTIFICATION,
  //               BADGE_TYPE.DIAMOND
  //             ));
  //           break;
  //       }
  //       if (el.affirmations.length > 0) {
  //         affirmationData = el.affirmations[el.offset];
  //         if (!affirmationData) {
  //           affirmationData = el.affirmations[0];
  //           offset = 0;
  //         }
  //         const updateCondition = {
  //           updateOne: {
  //             filter: {
  //               user_id: el.user_id
  //             },
  //             update: {
  //               $set: {
  //                 offset
  //               }
  //             }
  //           }
  //         };
  //         updateQuery.push(updateCondition);
  //         const reqData = {
  //           title: `${process.env.APP_NAME} Affirmation`,
  //           message: affirmationData.display_name,
  //           affirmationId: affirmationData._id,
  //           notificationType: NOTIFICATION_TYPE.AFFIRMATION_NOTIFICATION
  //         };
  //         sendNotification(
  //           el.deviceTokens,
  //           reqData.message,
  //           reqData,
  //           NOTIFICATION_ACTION.AFFIRMATION_ACTIVITY
  //         );
  //       } else {
  //         const bookmarkedData = await Bookmarks.aggregate([
  //           {
  //             $match: {
  //               user_id: el.user_id,
  //               content_type: CONTENT_TYPE.AFFIRMATION,
  //               deletedAt: null
  //             }
  //           },
  //           {
  //             $group: {
  //               _id: '$user_id',
  //               bookmarkIds: {
  //                 $addToSet: '$content_id'
  //               }
  //             }
  //           },
  //           {
  //             $lookup: {
  //               from: 'affirmations',
  //               let: {
  //                 bookmarkIds: '$bookmarkIds'
  //               },
  //               pipeline: [
  //                 {
  //                   $match: {
  //                     status: STATUS.ACTIVE,
  //                     approved_by: {
  //                       $ne: null
  //                     },
  //                     $expr: {
  //                       $not: {
  //                         $in: ['$_id', '$$bookmarkIds']
  //                       }
  //                     }
  //                   }
  //                 },
  //                 {
  //                   $project: {
  //                     display_name: 1
  //                   }
  //                 }
  //               ],
  //               as: 'affirmations'
  //             }
  //           },
  //           {
  //             $project: {
  //               affirmations: 1
  //             }
  //           }
  //         ]);
  //         affirmationData = bookmarkedData[0].affirmations[el.offset];
  //         if (!affirmationData) {
  //           affirmationData = bookmarkedData[0].affirmations[0];
  //           offset = 0;
  //         }
  //         const reqData = {
  //           title: `${process.env.APP_NAME} Affirmations`,
  //           message: affirmationData.display_name,
  //           affirmationId: affirmationData._id,
  //           notificationType: NOTIFICATION_TYPE.AFFIRMATION_NOTIFICATION
  //         };
  //         sendNotification(
  //           el.deviceTokens,
  //           reqData.message,
  //           reqData,
  //           NOTIFICATION_ACTION.AFFIRMATION_ACTIVITY
  //         );
  //         const updateCondition = {
  //           updateOne: {
  //             filter: {
  //               user_id: el.user_id
  //             },
  //             update: {
  //               $set: {
  //                 offset
  //               }
  //             }
  //           }
  //         };
  //         updateQuery.push(updateCondition);
  //       }
  //     },
  //     async function (err) {
  //       if (err) {
  //         console.log('err', err);
  //       } else {
  //         length = array.length;
  //         await Reminder.bulkWrite(updateQuery);
  //         return module.exports.chunkedAffirmations(array);
  //       }
  //     }
  //   );
  // },

  /**
   * @description This function is used to run reminder cron in chunk
   * @param {*} condition
   * @param {*} count
   * @param {*} page
   * @param {*} array
   * @returns {*}
   */
  chunkReminderQuery: async (
    condition,
    count = 0,
    notificationType,
    titleName,
    message = null,
    page = 1
  ) => {
    try {
      const offset = (page - 1) * REMINDER_CRON_PAGE_LIMIT;
      condition[1].$skip = offset;
      // console.log('totalCount', count);
      // console.log('page', page);
      // console.log('totalPage', Math.ceil(count / REMINDER_CRON_PAGE_LIMIT));
      if (count === 0) {
        return false;
      }
      if (page > Math.ceil(count / REMINDER_CRON_PAGE_LIMIT)) {
        console.log('query data finished.....');
        return true;
      }
      let title = titleName ? titleName : '';
      let action = NOTIFICATION_ACTION.MAIN_ACTIVITY;
      switch (notificationType) {
        case NOTIFICATION_TYPE.GOALS_NOTIFICATION:
          title = 'Goals';
          action = NOTIFICATION_ACTION.GOALS_ACTIVITY;
          break;
        case NOTIFICATION_TYPE.RITUALS_NOTIFICATION:
          title = 'Rituals';
          action = NOTIFICATION_ACTION.RITUALS_ACTIVITY;
          break;
        case NOTIFICATION_TYPE.MEDITATION_NOTIFICATION:
          title = 'Meditation';
          action = NOTIFICATION_ACTION.MEDITATION_ACTIVITY;
          break;
        case NOTIFICATION_TYPE.GRATITUDE_NOTIFICATION:
          title = 'Gratitude';
          action = NOTIFICATION_ACTION.GRATITUDE_ACTIVITY;
          break;
        case NOTIFICATION_TYPE.SHURU_REMINDER:
          title = 'Shuru';
          action = NOTIFICATION_ACTION.SHURU_ACTIVITY;
          break;
        case NOTIFICATION_TYPE.MOODS_REMINDER:
          title = 'Moods';
          action = NOTIFICATION_ACTION.MOODS_ACTIVITY;
          break;
        case NOTIFICATION_TYPE.BREATHWORK_REMINDER:
            title = 'Breathwork';
            action = NOTIFICATION_ACTION.BREATHWORK_ACTIVITY;
            break;
      }
      const reminderData = Reminder.aggregate(condition).cursor({ batchSize: 1000 });
      //  console.log('condition', JSON.stringify(condition));
      console.log('reminderData', reminderData.length);
      await reminderData.eachAsync((doc) => {
        const notifyData = {
          title: `${process.env.APP_NAME} ${title}`,
          message: doc.message || message,
          notificationType
        };
        sendNotification(doc.deviceTokens, notifyData.message, notifyData, action);
      });

      return await module.exports.chunkReminderQuery(
        condition,
        count,
        notificationType,
        titleName,
        message,
        (page += 1)
      );
    } catch (e) {
      return console.error('errr', e);
    }
  },

  /**
   * @description This function is used to run affirmation reminder cron in chunk
   * @param {*} condition
   * @param {*} count
   * @param {*} page
   * @param {*} updateQuery
   * @returns {*}
   */
  chunkReminderAffirmationQuery: async (condition, count = 0, page = 1, updateQuery = []) => {
    try {
      if (updateQuery.length > 0) {
        await Reminder.bulkWrite(updateQuery);
        updateQuery = [];
      }

      const offset = (page - 1) * REMINDER_CRON_PAGE_LIMIT;
      condition[2].$skip = offset;

      if (!count) {
        return false;
      }
      if (page > Math.ceil(count / REMINDER_CRON_PAGE_LIMIT)) {
        console.log('query data finished.....');
        return true;
      }

      const reminderData = Reminder.aggregate(condition).cursor({ batchSize: 1000 });

      for await (const doc of reminderData) {
        if (!doc.affirmations) {
          const affirmationsData = await Affirmation.aggregate([
            {
              $match: {
                status: STATUS.ACTIVE,
                approved_by: {
                  $ne: null
                }
              }
            },
            {
              $project: {
                display_name: 1
              }
            },
            {
              $lookup: {
                from: 'bookmarks',
                localField: '_id',
                foreignField: 'content_id',
                as: 'bookmarks',
                pipeline: [
                  {
                    $match: {
                      user_id: toObjectId(doc._id)
                    }
                  },
                  {
                    $limit: 1
                  },
                  {
                    $project: {
                      _id: 1
                    }
                  }
                ]
              }
            },
            {
              $match: {
                $expr: {
                  $not: {
                    $gt: [
                      {
                        $size: '$bookmarks'
                      },
                      0
                    ]
                  }
                }
              }
            },
            {
              $limit: doc.offset + 1
            },
            {
              $facet: {
                affirmations: [{ $project: { bookmarks: 0 } }]
              }
            },
            {
              $project: {
                affirmations: {
                  $ifNull: [
                    { $arrayElemAt: ['$affirmations', doc.offset] },
                    { $arrayElemAt: ['$affirmations', 0] }
                  ]
                }
              }
            }
          ]).exec();

          doc.affirmations = affirmationsData[0]?.affirmations || null;
        }

        const filterData = {
          user_id: doc._id,
          feature_type: FEATURE_TYPE.RECEIVED_NOTIFICATION,
          deletedAt: null
        };

        const updateData = {
          $inc: {
            count: 1
          }
        };

        const UserActivityCount = await UserActivityCounts.findOneAndUpdate(
          filterData,
          updateData,
          {
            upsert: true,
            new: true
          }
        ).select('feature_type count');

        let badgeReceived = false;
        switch (UserActivityCount.count) {
          case 10:
            badgeReceived = await updateBadges(
              doc._id,
              CATEGORY_TYPE.RECEIVED_NOTIFICATION,
              BADGE_TYPE.BRONZE
            );
            badgeReceived &&
              (await sendBadgeNotification(
                doc._id,
                CATEGORY_TYPE.RECEIVED_NOTIFICATION,
                BADGE_TYPE.BRONZE
              ));
            break;
          case 25:
            badgeReceived = await updateBadges(
              doc._id,
              CATEGORY_TYPE.RECEIVED_NOTIFICATION,
              BADGE_TYPE.SILVER
            );
            badgeReceived &&
              (await sendBadgeNotification(
                doc._id,
                CATEGORY_TYPE.RECEIVED_NOTIFICATION,
                BADGE_TYPE.SILVER
              ));
            break;
          case 50:
            badgeReceived = await updateBadges(
              doc._id,
              CATEGORY_TYPE.RECEIVED_NOTIFICATION,
              BADGE_TYPE.GOLD
            );
            badgeReceived &&
              (await sendBadgeNotification(
                doc._id,
                CATEGORY_TYPE.RECEIVED_NOTIFICATION,
                BADGE_TYPE.GOLD
              ));
            break;
          case 100:
            badgeReceived = await updateBadges(
              doc._id,
              CATEGORY_TYPE.RECEIVED_NOTIFICATION,
              BADGE_TYPE.PLATINUM
            );
            badgeReceived &&
              (await sendBadgeNotification(
                doc._id,
                CATEGORY_TYPE.RECEIVED_NOTIFICATION,
                BADGE_TYPE.PLATINUM
              ));
            break;
          case 200:
            badgeReceived = await updateBadges(
              doc._id,
              CATEGORY_TYPE.RECEIVED_NOTIFICATION,
              BADGE_TYPE.DIAMOND
            );
            badgeReceived &&
              (await sendBadgeNotification(
                doc._id,
                CATEGORY_TYPE.RECEIVED_NOTIFICATION,
                BADGE_TYPE.DIAMOND
              ));
            break;
        }

        const updateCondition = {
          updateOne: {
            filter: {
              user_id: doc._id
            },
            update: {
              $set: {
                offset: doc.affirmations ? doc.offset + 1 : 1
              }
            }
          }
        };
        updateQuery.push(updateCondition);

        const reqData = {
          title: `${process.env.APP_NAME} Affirmation`,
          message: doc?.affirmations?.display_name,
          affirmationId: doc?.affirmations?._id,
          notificationType: NOTIFICATION_TYPE.AFFIRMATION_NOTIFICATION
        };
        console.log('doc.deviceTokens', doc.deviceTokens);
        sendNotification(
          doc.deviceTokens,
          reqData.message,
          reqData,
          NOTIFICATION_ACTION.AFFIRMATION_ACTIVITY
        );
      }
      // const reminderData = await Reminder.aggregate(condition).cursor({ batchSize: 1000 });
      // console.log('reminderData', reminderData);
      // await reminderData.eachAsync(async (doc) => {
      //   console.log('doctor', doc);
      //   if (!doc.affirmations) {
      //     const affirmationsData = await Affirmation.aggregate([
      //       {
      //         $match: {
      //           status: STATUS.ACTIVE,
      //           approved_by: {
      //             $ne: null
      //           }
      //         }
      //       },
      //       {
      //         $project: {
      //           display_name: 1
      //         }
      //       },
      //       {
      //         $lookup: {
      //           from: 'bookmarks',
      //           localField: '_id',
      //           foreignField: 'content_id',
      //           as: 'bookmarks',
      //           pipeline: [
      //             {
      //               $match: {
      //                 user_id: toObjectId(doc._id)
      //               }
      //             },
      //             {
      //               $limit: 1
      //             },
      //             {
      //               $project: {
      //                 _id: 1
      //               }
      //             }
      //           ]
      //         }
      //       },
      //       {
      //         $match: {
      //           $expr: {
      //             $not: {
      //               $gt: [
      //                 {
      //                   $size: '$bookmarks'
      //                 },
      //                 0
      //               ]
      //             }
      //           }
      //         }
      //       },
      //       {
      //         $limit: doc.offset + 1
      //       },
      //       {
      //         $facet: {
      //           affirmations: [{ $project: { bookmarks: 0 } }]
      //         }
      //       },
      //       {
      //         $project: {
      //           affirmations: {
      //             $ifNull: [
      //               { $arrayElemAt: ['$affirmations', doc.offset] },
      //               { $arrayElemAt: ['$affirmations', 0] }
      //             ]
      //           }
      //         }
      //       }
      //     ])
      //       .cursor()
      //       .toArray();
      //     doc.affirmations = affirmationsData[0].affirmations || null;
      //   }
      //   const filterData = {
      //     user_id: doc._id,
      //     feature_type: FEATURE_TYPE.RECEIVED_NOTIFICATION,
      //     deletedAt: null
      //   };

      //   const updateData = {
      //     $inc: {
      //       count: 1
      //     }
      //   };
      //   const UserActivityCount = await UserActivityCounts.findOneAndUpdate(
      //     filterData,
      //     updateData,
      //     {
      //       upsert: true,
      //       new: true
      //     }
      //   ).select('feature_type count');

      //   let badgeReceived = false;
      //   switch (UserActivityCount.count) {
      //     case 10:
      //       badgeReceived = await updateBadges(
      //         doc._id,
      //         CATEGORY_TYPE.RECEIVED_NOTIFICATION,
      //         BADGE_TYPE.BRONZE
      //       );
      //       badgeReceived &&
      //         (await sendBadgeNotification(
      //           doc._id,
      //           CATEGORY_TYPE.RECEIVED_NOTIFICATION,
      //           BADGE_TYPE.BRONZE
      //         ));
      //       break;
      //     case 25:
      //       badgeReceived = await updateBadges(
      //         doc._id,
      //         CATEGORY_TYPE.RECEIVED_NOTIFICATION,
      //         BADGE_TYPE.SILVER
      //       );
      //       badgeReceived &&
      //         (await sendBadgeNotification(
      //           doc._id,
      //           CATEGORY_TYPE.RECEIVED_NOTIFICATION,
      //           BADGE_TYPE.SILVER
      //         ));
      //       break;
      //     case 50:
      //       badgeReceived = await updateBadges(
      //         doc._id,
      //         CATEGORY_TYPE.RECEIVED_NOTIFICATION,
      //         BADGE_TYPE.GOLD
      //       );
      //       badgeReceived &&
      //         (await sendBadgeNotification(
      //           doc._id,
      //           CATEGORY_TYPE.RECEIVED_NOTIFICATION,
      //           BADGE_TYPE.GOLD
      //         ));
      //       break;
      //     case 100:
      //       badgeReceived = await updateBadges(
      //         doc._id,
      //         CATEGORY_TYPE.RECEIVED_NOTIFICATION,
      //         BADGE_TYPE.PLATINUM
      //       );
      //       badgeReceived &&
      //         (await sendBadgeNotification(
      //           doc._id,
      //           CATEGORY_TYPE.RECEIVED_NOTIFICATION,
      //           BADGE_TYPE.PLATINUM
      //         ));
      //       break;
      //     case 200:
      //       badgeReceived = await updateBadges(
      //         doc._id,
      //         CATEGORY_TYPE.RECEIVED_NOTIFICATION,
      //         BADGE_TYPE.DIAMOND
      //       );
      //       badgeReceived &&
      //         (await sendBadgeNotification(
      //           doc._id,
      //           CATEGORY_TYPE.RECEIVED_NOTIFICATION,
      //           BADGE_TYPE.DIAMOND
      //         ));
      //       break;
      //   }

      //   const updateCondition = {
      //     updateOne: {
      //       filter: {
      //         user_id: doc._id
      //       },
      //       update: {
      //         $set: {
      //           offset: doc.affirmations ? doc.offset + 1 : 1
      //         }
      //       }
      //     }
      //   };
      //   updateQuery.push(updateCondition);

      //   const reqData = {
      //     title: `${process.env.APP_NAME} Affirmation`,
      //     message: doc?.affirmations?.display_name,
      //     affirmationId: doc?.affirmations?._id,
      //     notificationType: NOTIFICATION_TYPE.AFFIRMATION_NOTIFICATION
      //   };
      //   console.log('doc.deviceTokens', doc.deviceTokens);
      //   sendNotification(
      //     doc.deviceTokens,
      //     reqData.message,
      //     reqData,
      //     NOTIFICATION_ACTION.AFFIRMATION_ACTIVITY
      //   );
      // });

      return module.exports.chunkReminderAffirmationQuery(
        condition,
        count,
        (page += 1),
        updateQuery
      );
    } catch (e) {
      return console.error('errr', e);
    }
  },

  /**
   * @description this function is used to get which query need to b called for cron at what time
   * @param {*} param
   * @returns {*}
   */
  cronQueryTypeSelector: (param) => {
    try {
      let queryType;
      const date = currentDateOnly();
      const weekDay = date.getDay();
      const todayDate = date.getDate();
      switch (parseInt(param)) {
        case 1:
          queryType = CRON_QUERY_TYPE.DAILY__WEEKLY_ALL;
          break;
        case 2:
          switch (weekDay) {
            case 1:
              queryType = CRON_QUERY_TYPE.WEEKLY_1_3_5;
              break;
            case 2:
            case 4:
            case 6:
            case 7:
              queryType = CRON_QUERY_TYPE.WEEKLY_5;
              break;
            case 3:
            case 5:
              queryType = CRON_QUERY_TYPE.WEEKLY_3;
              break;
            default:
              console.log('Wrong weekly day');
              break;
          }
          break;
        case 3:
          switch (todayDate) {
            case 1:
              queryType = CRON_QUERY_TYPE.MONTHLY_10_8_5_3_1;
              break;
            case 3:
            case 7:
            case 9:
            case 13:
            case 17:
              queryType = CRON_QUERY_TYPE.MONTHLY_10_8;
              break;
            case 5:
              queryType = CRON_QUERY_TYPE.MONTHLY_10_5;
              break;
            case 15:
              queryType = CRON_QUERY_TYPE.MONTHLY_10_5_3;
              break;
            case 21:
              queryType = CRON_QUERY_TYPE.MONTHLY_10_8_5;
              break;
            case 25:
              queryType = CRON_QUERY_TYPE.MONTHLY_10_8_5_3;
              break;
            default:
              console.log('No cron neeed to be executed on this monthly day');
              break;
          }
          break;
        case 4:
          queryType = CRON_QUERY_TYPE.DAILY_AT_7_AM;
          break;
        case 5:
          queryType = CRON_QUERY_TYPE.DAILY_AT_8_AM;
          break;
        case 6:
          queryType = CRON_QUERY_TYPE.DAILY_AT_10_AM;
          break;
        case 7:
          queryType = CRON_QUERY_TYPE.DAILY_AT_12_PM;
          break;
        case 8:
          queryType = CRON_QUERY_TYPE.DAILY_AT_2_PM;
          break;
        case 9:
          queryType = CRON_QUERY_TYPE.DAILY_AT_3_PM;
          break;
        case 10:
          queryType = CRON_QUERY_TYPE.DAILY_AT_4_PM;
          break;
        case 11:
          queryType = CRON_QUERY_TYPE.DAILY_AT_6_PM;
          break;
        case 12:
          queryType = CRON_QUERY_TYPE.DAILY_AT_8_AM;
          break;
        case 13:
          queryType = CRON_QUERY_TYPE.DAILY_AT_11_PM;
          break;
      }
      return queryType;
    } catch (err) {
      console.log(err);
    }
  }
};
