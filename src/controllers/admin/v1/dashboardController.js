'use strict';

const {
  Users,
  Meditation,
  Sound,
  Ritual,
  Affirmation,
  ShoorahPods,
  Focus,
  Subscriptions
} = require('@models');
const Response = require('@services/Response');
const {
  SUCCESS,
  USER_TYPE,
  STATUS,
  ACCOUNT_TYPE,
  FOCUS_TYPE,
  PRODUCT_TYPE
} = require('@services/Constant');
const { GENDER } = require('../../../services/Constant');
const Usage = require('../../../models/Usage');

module.exports = {
  /**
   * @description This function is used get total content and user count
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */
  countUsersAndContent: async (req, res) => {
    try {
      const userDetails = await Users.aggregate([
        {
          $group: {
            totalActiveUser: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      {
                        $eq: ['$status', STATUS.ACTIVE]
                      },
                      {
                        $eq: ['$user_type', USER_TYPE.USER]
                      },
                      { $eq: [{ $ifNull: ['$company_id', null] }, null] }
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            totalActiveB2CUser: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      {
                        $eq: ['$status', STATUS.ACTIVE]
                      },
                      {
                        $eq: ['$user_type', USER_TYPE.USER]
                      },
                      { $ne: [{ $ifNull: ['$company_id', null] }, null] }
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            totalUser: {
              $sum: {
                $cond: [
                  {
                    $eq: ['$user_type', USER_TYPE.USER]
                  },
                  1,
                  0
                ]
              }
            },
            totalInactiveUser: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      {
                        $eq: ['$status', STATUS.INACTIVE]
                      },
                      {
                        $eq: ['$user_type', USER_TYPE.USER]
                      }
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            totalDeletedAccount: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$status', STATUS.DELETED] },
                      { $eq: ['$user_type', USER_TYPE.USER] }
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            totalTrialAccount: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      {
                        $eq: ['$is_under_trial', true]
                      },
                      {
                        $eq: ['$user_type', USER_TYPE.USER]
                      },
                      // {
                      //   $eq: ['$account_type', ACCOUNT_TYPE.IS_UNDER_TRIAL]
                      // },
                      {
                        $eq: ['$deletedAt', null]
                      }
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            totalPaidAccount: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      {
                        $eq: ['$is_under_trial', false]
                      },
                      {
                        $eq: ['$account_type', ACCOUNT_TYPE.PAID]
                      },
                      {
                        $eq: ['$user_type', USER_TYPE.USER]
                      },
                      {
                        $eq: ['$deletedAt', null]
                      }
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            totalExpiredAccount: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      {
                        $eq: ['$account_type', ACCOUNT_TYPE.EXPIRED]
                      },
                      {
                        $eq: ['$user_type', USER_TYPE.USER]
                      },
                      {
                        $eq: ['$deletedAt', null]
                      }
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            totalNoTrialAccount: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      {
                        $eq: ['$account_type', ACCOUNT_TYPE.FREE]
                      },
                      { $eq: ['$user_type', USER_TYPE.USER] },
                      { $eq: ['$is_under_trial', false] },
                      {
                        $eq: ['$deletedAt', null]
                      }
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            _id: 0
          }
        }
      ]);
      const meditationDetails = await Meditation.aggregate([
        {
          $group: {
            _id: 0,
            totalActiveMeditation: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      {
                        $eq: ['$status', STATUS.ACTIVE]
                      },
                      {
                        $gt: ['$approved_by', null]
                      }
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            totalInactiveMeditation: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      {
                        $eq: ['$status', STATUS.INACTIVE]
                      },
                      {
                        $gt: ['$approved_by', null]
                      }
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            totalMeditation: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      {
                        $ne: ['$status', STATUS.DELETED]
                      },
                      {
                        $gt: ['$approved_by', null]
                      }
                    ]
                  },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]);
      const soundDetails = await Sound.aggregate([
        {
          $group: {
            _id: 0,
            totalActiveSound: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      {
                        $eq: ['$status', STATUS.ACTIVE]
                      },
                      {
                        $gt: ['$approved_by', null]
                      }
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            totalInactiveSound: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      {
                        $eq: ['$status', STATUS.INACTIVE]
                      },
                      {
                        $gt: ['$approved_by', null]
                      }
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            totalSound: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      {
                        $ne: ['$status', STATUS.DELETED]
                      },
                      {
                        $gt: ['$approved_by', null]
                      }
                    ]
                  },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]);
      const ritualDetails = await Ritual.aggregate([
        {
          $group: {
            _id: 0,
            totalActiveRitual: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      {
                        $eq: ['$status', STATUS.ACTIVE]
                      },
                      {
                        $gt: ['$approved_by', null]
                      }
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            totalInactiveRitual: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      {
                        $eq: ['$status', STATUS.INACTIVE]
                      },
                      {
                        $gt: ['$approved_by', null]
                      }
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            totalRitual: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      {
                        $ne: ['$status', STATUS.DELETED]
                      },
                      {
                        $gt: ['$approved_by', null]
                      }
                    ]
                  },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]);
      const affirmationDetails = await Affirmation.aggregate([
        {
          $group: {
            _id: 0,
            totalActiveAffirmation: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      {
                        $eq: ['$status', STATUS.ACTIVE]
                      },
                      {
                        $gt: ['$approved_by', null]
                      }
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            totalInactiveAffirmation: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      {
                        $eq: ['$status', STATUS.INACTIVE]
                      },
                      {
                        $gt: ['$approved_by', null]
                      }
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            totalAffirmation: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      {
                        $ne: ['$status', STATUS.DELETED]
                      },
                      {
                        $gt: ['$approved_by', null]
                      }
                    ]
                  },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]);
      const podDetails = await ShoorahPods.aggregate([
        {
          $group: {
            _id: 0,
            totalActivePod: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      {
                        $eq: ['$status', STATUS.ACTIVE]
                      },
                      {
                        $gt: ['$approved_by', null]
                      }
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            totalInactivePod: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      {
                        $eq: ['$status', STATUS.INACTIVE]
                      },
                      {
                        $gt: ['$approved_by', null]
                      }
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            totalPod: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      {
                        $ne: ['$status', STATUS.DELETED]
                      },
                      {
                        $gt: ['$approved_by', null]
                      }
                    ]
                  },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]);
      const focusDetails = await Focus.aggregate([
        {
          $group: {
            _id: 0,
            totalActiveMainFocus: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      {
                        $eq: ['$status', STATUS.ACTIVE]
                      },
                      {
                        $eq: ['$focus_type', FOCUS_TYPE.MAIN]
                      },
                      {
                        $gt: ['$approved_by', null]
                      }
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            totalInactiveMainFocus: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      {
                        $eq: ['$status', STATUS.INACTIVE]
                      },
                      {
                        $eq: ['$focus_type', FOCUS_TYPE.MAIN]
                      },
                      {
                        $gt: ['$approved_by', null]
                      }
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            totalActiveAffirmationFocus: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      {
                        $eq: ['$status', STATUS.ACTIVE]
                      },
                      {
                        $eq: ['$focus_type', FOCUS_TYPE.AFFIRMATION]
                      },
                      {
                        $gt: ['$approved_by', null]
                      }
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            totalInactiveAffirmationFocus: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      {
                        $eq: ['$status', STATUS.INACTIVE]
                      },
                      {
                        $eq: ['$focus_type', FOCUS_TYPE.AFFIRMATION]
                      },
                      {
                        $gt: ['$approved_by', null]
                      }
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            totalFocus: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      {
                        $ne: ['$status', STATUS.DELETED]
                      },
                      {
                        $gt: ['$approved_by', null]
                      }
                    ]
                  },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]);
      const subscriptionDetails = await Subscriptions.aggregate([
        {
          $group: {
            _id: 0,
            monthlySubscribedCount: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      {
                        $eq: ['$product_id', PRODUCT_TYPE.ONE_MONTH]
                      },
                      {
                        $gte: ['$expires_date', new Date()]
                      },
                      {
                        $eq: ['$deletedAt', null]
                      }
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            sixMonthsSubscribedCount: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      {
                        $eq: ['$product_id', PRODUCT_TYPE.SIX_MONTH]
                      },
                      {
                        $gte: ['$expires_date', new Date()]
                      },
                      {
                        $eq: ['$deletedAt', null]
                      }
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            annualSubscribedCount: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      {
                        $eq: ['$product_id', PRODUCT_TYPE.ANNUAL]
                      },
                      {
                        $gte: ['$expires_date', new Date()]
                      },
                      {
                        $eq: ['$deletedAt', null]
                      }
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            lifetimeSubscribedCount: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      {
                        $eq: ['$product_id', PRODUCT_TYPE.LIFETIME]
                      },
                      {
                        $gte: ['$expires_date', new Date()]
                      },
                      {
                        $eq: ['$deletedAt', null]
                      }
                    ]
                  },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]);

      delete userDetails[0]?._id;
      delete meditationDetails[0]?._id;
      delete soundDetails[0]?._id;
      delete ritualDetails[0]?._id;
      delete affirmationDetails[0]?._id;
      delete podDetails[0]?._id;
      delete focusDetails[0]?._id;
      delete subscriptionDetails[0]?._id;

      let totalBasicPlansAccounts =
        subscriptionDetails[0]?.monthlySubscribedCount +
        subscriptionDetails[0]?.sixMonthsSubscribedCount +
        subscriptionDetails[0]?.annualSubscribedCount || 0;

      const resObj = {
        ...userDetails[0],
        ...meditationDetails[0],
        ...soundDetails[0],
        ...ritualDetails[0],
        ...affirmationDetails[0],
        ...podDetails[0],
        ...focusDetails[0],
        ...subscriptionDetails[0],
        totalBasicPlansAccounts
      };
      return Response.successResponseData(res, resObj, SUCCESS, res.__('contentCountSuccess'));
    } catch (err) {
      console.error(err);
      return Response.internalServerErrorResponse(res);
    }
  },

  getJobRolesPercent: async (req, res) => {
    try {
      const reqParam = req.body;
      if (reqParam.jobs.length) {
        let users = await Users.aggregate([
          {
            $match: {
              deletedAt: null,
              user_type: { $nin: [USER_TYPE.SUPER_ADMIN, USER_TYPE.SUB_ADMIN] },
              job_role: { $in: reqParam.jobs, $exists: true },
              status: STATUS.ACTIVE
            }
          },
          {
            $group: {
              _id: null,
              totalMaleCounts: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        {
                          $eq: ['$gender', [GENDER.MALE]]
                        }
                      ]
                    },
                    1,
                    0
                  ]
                }
              },
              totalFemaleCounts: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        {
                          $eq: ['$gender', [GENDER.FEMALE]]
                        }
                      ]
                    },
                    1,
                    0
                  ]
                }
              },
              totalNotPreferCounts: {
                $sum: {
                  $cond: [
                    {
                      $or: [
                        {
                          $eq: ['$gender', [GENDER.NOT_PREFERRED]]
                        },
                        {
                          $eq: ['$gender', []]
                        }
                      ]
                    },
                    1,
                    0
                  ]
                }
              },
              totalNonBinaryCounts: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        {
                          $eq: ['$gender', [GENDER.NON_BINARY]]
                        }
                      ]
                    },
                    1,
                    0
                  ]
                }
              },
              totalTransgenderCounts: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        {
                          $eq: ['$gender', [GENDER.TRANSGENDER]]
                        }
                      ]
                    },
                    1,
                    0
                  ]
                }
              },
              totalIntersexCounts: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        {
                          $eq: ['$gender', [GENDER.INTERSEX]]
                        }
                      ]
                    },
                    1,
                    0
                  ]
                }
              }
            }
          }
        ]);

        let userData = await Users.aggregate([
          {
            $match: {
              deletedAt: null,
              user_type: { $nin: [USER_TYPE.SUPER_ADMIN, USER_TYPE.SUB_ADMIN] },
              job_role: { $in: reqParam.jobs, $exists: true },
              status: STATUS.ACTIVE
            }
          },
          {
            $project: {
              _id: 0,
              name: 1,
              email: 1,
              accountType: '$account_type',
              createdAt: 1,
              jobRole: '$job_role',
              loginPlatform: '$login_platform',
              userType: '$user_type',
              gender: 1
            }
          }
        ]);

        let totalUsers = await Users.countDocuments({
          deletedAt: null,
          user_type: { $nin: [USER_TYPE.SUPER_ADMIN, USER_TYPE.SUB_ADMIN] },
          job_role: { $in: reqParam.jobs, $exists: true },
          status: STATUS.ACTIVE
        });
        let resObj;
        resObj = {
          notPrefer: 0,
          maleCounts: 0,
          femaleCounts: 0,
          nonBinaryCounts: 0,
          intersexCounts: 0,
          transgenderCounts: 0,
          userData
        };
        if (users.length) {
          let malePercent =
            parseFloat((users[0]?.totalMaleCounts / totalUsers) * 100).toFixed(2) || 0;
          let femalePercent =
            parseFloat((users[0]?.totalFemaleCounts / totalUsers) * 100).toFixed(2) || 0;
          let notPreferPercent =
            parseFloat((users[0]?.totalNotPreferCounts / totalUsers) * 100).toFixed(2) || 0;
          let nonBinaryPercent =
            parseFloat((users[0]?.totalNonBinaryCounts / totalUsers) * 100).toFixed(2) || 0;
          let transgenderPercent =
            parseFloat((users[0]?.totalTransgenderCounts / totalUsers) * 100).toFixed(2) || 0;
          let intersexPercent =
            parseFloat((users[0]?.totalIntersexCounts / totalUsers) * 100).toFixed(2) || 0;

          resObj = {
            notPrefer: notPreferPercent,
            maleCounts: malePercent,
            femaleCounts: femalePercent,
            nonBinaryCounts: nonBinaryPercent,
            intersexCounts: transgenderPercent,
            transgenderCounts: intersexPercent,
            userData
          };
        }

        return Response.successResponseData(
          res,
          resObj,
          SUCCESS,
          res.__('getJobRolesPercentSuccess')
        );
      } else {
        return Response.internalServerErrorResponse(res);
      }
    } catch (err) {
      console.error(err);
      return Response.internalServerErrorResponse(res);
    }
  },

  countUsersAndUsage: async (req, res) => {
    try {
      let reqParam = req.query;

      let currentDate = new Date();
      let todayStartDate = new Date();
      todayStartDate.setHours(0, 0, 0, 0);
      let todayEndDate = new Date();
      todayEndDate.setHours(23, 59, 59, 0);

      let weeklyStartDate = new Date();
      weeklyStartDate.setDate(weeklyStartDate.getDate() - 7);
      weeklyStartDate.setHours(0, 0, 0, 0);
      let weeklyEndDate = new Date();
      weeklyEndDate.setHours(23, 59, 59, 999);

      let monthlyStartDate = new Date();
      monthlyStartDate.setDate(monthlyStartDate.getDate() - 30);
      monthlyStartDate.setHours(0, 0, 0, 0);
      let monthlyEndDate = new Date();
      monthlyEndDate.setHours(23, 59, 59, 999);

      let annuallyStartDate = new Date();
      annuallyStartDate.setDate(annuallyStartDate.getDate() - 365);
      annuallyStartDate.setHours(0, 0, 0, 0);
      let annuallyEndDate = new Date();
      annuallyEndDate.setHours(23, 59, 59, 999);

      let customStartDate;
      let customEndDate;
      if (reqParam.startDate || reqParam.endDate) {
        customStartDate = new Date(reqParam.startDate);
        customStartDate.setHours(0, 0, 0, 0);
        
        customEndDate = new Date(reqParam.endDate);
        customEndDate.setDate(customEndDate.getDate() +1);
        customEndDate.setHours(0, 0, 0, 0);
      } else {
        customStartDate = new Date();
        customStartDate.setHours(0, 0, 0, 0);
        customEndDate = new Date();
        customEndDate.setDate(customEndDate.getDate() +1);
        customStartDate.setHours(23, 59, 59, 999);
      }

      //  logic here for users login count and app durations 
      let todayUsers = await Users.find({
        deletedAt: null,
        last_login: {
          $gte: todayStartDate,
          $lt: todayEndDate
        }
      }).select('_id');

      let weeklyUsers = await Users.find({
        deletedAt: null,
        last_login: {
          $gte: weeklyStartDate,
          $lt: weeklyEndDate
        }
      }).select('_id');

      let monthlyUsers = await Users.find({
        deletedAt: null,
        last_login: {
          $gte: monthlyStartDate,
          $lt: monthlyEndDate
        }
      }).select('_id');

      let annuallyUsers = await Users.find({
        deletedAt: null,
        last_login: {
          $gte: annuallyStartDate,
          $lt: annuallyEndDate
        }
      }).select('_id');

      let customUsers = await Users.find({
        deletedAt: null,
        last_login: {
          $gte: customStartDate,
          $lt: customEndDate
        }
      }).select('_id');


      let todayUsersIds = todayUsers.map(user => user._id);
      let weeklyUsersIds = weeklyUsers.map(user => user._id);
      let monthlyUsersIds = monthlyUsers.map(user => user._id);
      let annuallyUsersIds = annuallyUsers.map(user => user._id);
      let customUsersIds = customUsers.map(user => user._id);

      let dailyUsage = await Usage.aggregate([
        {
          $match: {
            user_id: {
              $in: todayUsersIds
            },
            createdAt: {
              $gte: todayStartDate,
              $lt: todayEndDate
            }
          }
        },
        {
          $group: {
            _id: null,
            totalAppDuration: { $sum: "$app_durations" }
          }
        },
        {
          $project: {
            totalAppDuration: { $divide: ["$totalAppDuration",60] } // Convert milliseconds to hours
          }
        },
        {
          $project: {
            totalAppDuration: { $round: ["$totalAppDuration", 2] } // Round to two decimal points
          }
        }
      ]);

      let weeklyUsage = await Usage.aggregate([
        {
          $match: {
            user_id: {
              $in: weeklyUsersIds
            },
            createdAt: {
              $gte: weeklyStartDate,
              $lt: weeklyEndDate
            }
          }
        },
        {
          $group: {
            _id: null,
            totalAppDuration: { $sum: "$app_durations" }
          }
        },
        {
          $project: {
            totalAppDuration: { $divide: ["$totalAppDuration",60] } // Convert milliseconds to hours
          }
        },
        {
          $project: {
            totalAppDuration: { $round: ["$totalAppDuration", 2] } // Round to two decimal points
          }
        }
      ]);

      let monthlyUsage = await Usage.aggregate([
        {
          $match: {
            user_id: {
              $in: monthlyUsersIds
            },
            createdAt: {
              $gte: monthlyStartDate,
              $lt: monthlyEndDate
            }
          }
        },
        {
          $group: {
            _id: null,
            totalAppDuration: { $sum: "$app_durations" }
          }
        },
        {
          $project: {
            totalAppDuration: { $divide: ["$totalAppDuration", 60] } // Convert milliseconds to hours
          }
        },
        {
          $project: {
            totalAppDuration: { $round: ["$totalAppDuration", 2] } // Round to two decimal points
          }
        }
      ]);

      let annuallyUsage = await Usage.aggregate([
        {
          $match: {
            user_id: {
              $in: annuallyUsersIds
            },
            createdAt: {
              $gte: annuallyStartDate,
              $lt: annuallyEndDate
            }
          }
        },
        {
          $group: {
            _id: null,
            totalAppDuration: { $sum: "$app_durations" }
          }
        },
        {
          $project: {
            totalAppDuration: { $divide: ["$totalAppDuration",60] } // Convert milliseconds to hours
          }
        },
        {
          $project: {
            totalAppDuration: { $round: ["$totalAppDuration", 2] } // Round to two decimal points
          }
        }
      ]);

      let customUsage = await Usage.aggregate([
        {
          $match: {
            user_id: {
              $in: customUsersIds
            },
            createdAt: {
              $gte: customStartDate,
              $lt: customEndDate
            }
          }
        },
        {
          $group: {
            _id: null,
            totalAppDuration: { $sum: "$app_durations" }
          }
        },
        {
          $project: {
            totalAppDuration: { $divide: ["$totalAppDuration",60] } // Convert milliseconds to hours
          }
        },
        {
          $project: {
            totalAppDuration: { $round: ["$totalAppDuration", 2] } // Round to two decimal points
          }
        }
      ])


      let result = [{
        name: "Day",
        users: todayUsersIds.length,
        duration: dailyUsage.length ? dailyUsage[0].totalAppDuration : 0
      },
      {
        name: "Weekly",
        users: weeklyUsersIds.length,
        duration:weeklyUsage.length ? weeklyUsage[0].totalAppDuration : 0
      },
      {
        name: "Monthly",
        users: monthlyUsersIds.length,
        duration: monthlyUsage.length ? monthlyUsage[0].totalAppDuration : 0
      },
      {
        name: "Yearly",
        users: annuallyUsersIds.length,
        duration: annuallyUsage.length ? annuallyUsage[0].totalAppDuration : 0
      },
      {
        name: "Custom",
        users: customUsersIds.length,
        duration: customUsage.length ? customUsage[0].totalAppDuration : 0
      },
      ]

      return Response.successResponseData(res, result, SUCCESS, res.__('userUsageSuccess'));
    } catch (err) {
      console.error(err);
      return Response.internalServerErrorResponse(res);
    }
  },

};
