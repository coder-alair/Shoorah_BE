'use strict';
const { Users } = require('@models');

const { FAIL, SUCCESS } = require('@services/Constant');

const Response = require('@services/Response');
const { BetaAnalyticsDataClient } = require('@google-analytics/data');
const {
  convertObjectKeysToCamelCase,
  toObjectId,
  currentDateOnly
} = require('../../../services/Helper');
const Subscriptions = require('../../../models/Subscriptions');
const { Company, CompanyUsers, B2BMoods } = require('../../../models');
const { USER_TYPE, MOOD_PDF_SIZE, NODE_ENVIRONMENT } = require('../../../services/Constant');
const puppeteer = require('puppeteer');
const pug = require('pug');
const analyticsDataClient = new BetaAnalyticsDataClient();

module.exports = {
  /**
   * @description This function is used for getting google analytics data
   * @param {*} req
   * @param {*} res
   * @return {*}
   */

  googleAnalyticsData: async (req, res) => {
    try {
      const reqParam = req.query;

      // for user counts
      if (reqParam.reportType == 1) {
        const [response] = await analyticsDataClient.runReport({
          property: `properties/347268375`,
          dateRanges: [
            {
              startDate: reqParam.startDate,
              endDate: reqParam.endDate
            }
          ],
          dimensions: [
            {
              name: 'date'
            }
          ],
          metrics: [
            {
              name: 'totalUsers'
            },
            {
              name: 'newUsers'
            },
            {
              name: 'activeUsers'
            }
          ]
        });

        let resultCount = {
          sumOfTotalUsers: 0,
          sumOfNewUsers: 0,
          sumOfActiveUsers: 0
        };

        response.rows.forEach((row) => {
          resultCount.sumOfTotalUsers += parseInt(row.metricValues[0].value);
          resultCount.sumOfNewUsers += parseInt(row.metricValues[1].value);
          resultCount.sumOfActiveUsers += parseInt(row.metricValues[2].value);
        });

        return Response.successResponseData(
          res,
          convertObjectKeysToCamelCase(resultCount),
          SUCCESS,
          res.__('googleAnalyticsUserCountsData')
        );
      }

      // for revenue data
      if (reqParam.reportType == 2) {
        const [response] = await analyticsDataClient.runReport({
          property: `properties/347268375`,
          dateRanges: [
            {
              startDate: reqParam.startDate,
              endDate: reqParam.endDate
            }
          ],
          dimensions: [
            {
              name: 'date'
            }
          ],
          metrics: [
            {
              name: 'totalRevenue'
            },
            {
              name: 'sessions'
            },
            {
              name: 'totalUsers'
            },
            {
              name: 'sessionConversionRate'
            },
            {
              name: 'userConversionRate'
            }
          ]
        });

        let resultCount = {
          sumOfTotalUsers: 0,
          totalRevenue: 0,
          totalSessions: 0,
          totalSessionsConversionRate: 0,
          totalUserConversionRate: 0
        };

        response.rows.forEach((row) => {
          resultCount.sumOfTotalUsers += parseInt(row.metricValues[2].value);
          resultCount.totalRevenue += parseInt(row.metricValues[0].value);
          resultCount.totalSessions += parseInt(row.metricValues[1].value);
          resultCount.totalSessionsConversionRate += parseInt(row.metricValues[3].value);
          resultCount.totalUserConversionRate += parseInt(row.metricValues[4].value);
        });

        return Response.successResponseData(
          res,
          convertObjectKeysToCamelCase(resultCount),
          SUCCESS,
          res.__('googleAnalyticsRevenueCountsData')
        );
      }

      // for overall Revenue graph
      if (reqParam.reportType == 3) {
        const [response] = await analyticsDataClient.runReport({
          property: `properties/347268375`,
          dateRanges: [
            {
              startDate: reqParam.startDate,
              endDate: reqParam.endDate
            }
          ],
          dimensions: [
            {
              name: 'date'
            }
          ],
          metrics: [
            {
              name: 'totalRevenue'
            },
            {
              name: 'totalUsers'
            }
          ]
        });

        let userCount = [];
        let revenueCount = [];
        let intervals = [];

        response.rows.forEach((row) => {
          revenueCount.push(parseInt(row.metricValues[0].value));
          userCount.push(parseInt(row.metricValues[1].value));
          intervals.push(parseInt(row.dimensionValues[0].value));
        });

        intervals = intervals.map((interval) => {
          const intervalString = interval.toString();
          return `${intervalString.slice(0, 4)}-${intervalString.slice(4, 6)}-${intervalString.slice(6, 8)}`;
        });

        return Response.successResponseData(
          res,
          convertObjectKeysToCamelCase({ userCount, revenueCount, intervals }),
          SUCCESS,
          res.__('googleAnalyticsOverallRevenueGraphData')
        );
      } else {
        return Response.successResponseWithoutData(res, res.__('noAnalyticsTypeFound'), SUCCESS);
      }
    } catch (err) {
      console.log(err);
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used for getting user plan data
   * @param {*} req
   * @param {*} res
   * @return {*}
   */

  getUserPlansData: async (req, res) => {
    try {
      const reqParam = req.query;

      // Subscriptions Count
      if (reqParam.type == 1) {
        const filterCondition = {
          deletedAt: null,
          user_type: 2,
          account_type: { $in: [0, 1, 3] }
        };
        const users = await Users.find(filterCondition);
        const aggregateCondition = [
          {
            $match: {
              deletedAt: null
            }
          },
          {
            $facet: {
              subscriptions: [
                {
                  $group: {
                    _id: null,
                    count: { $sum: 1 }
                  }
                }
              ],
              activeSubscriptions: [
                {
                  $match: {
                    expires_date: { $gte: new Date() }
                  }
                },
                {
                  $group: {
                    _id: null,
                    count: { $sum: 1 }
                  }
                }
              ],
              inactiveSubscriptions: [
                {
                  $match: {
                    expires_date: { $lte: new Date() }
                  }
                },
                {
                  $group: {
                    _id: null,
                    count: { $sum: 1 }
                  }
                }
              ]
            }
          }
        ];
        const data = await Subscriptions.aggregate(aggregateCondition);
        const totalSubscription = data[0]?.subscriptions[0]?.count || 0;

        const subscribed = data[0]?.activeSubscriptions[0]?.count || 0;
        const totalUsers = users.length;
        // const unsubscribed = totalUsers - data[0]?.activeSubscriptions[0]?.count || 0;
        const unsubscribed = totalUsers;

        const result = {
          totalUsers,
          subscribed,
          unsubscribed
        };

        return Response.successResponseData(res, result, SUCCESS, res.__('userSubscriptionsData'));
      }

      // Active Subscriptions Counts
      if (reqParam.type == 2) {
        const filterCondition = {
          deletedAt: null
        };
        const users = await Users.find(filterCondition);

        const aggregateCondition = [
          {
            $match: {
              deletedAt: null
            }
          },
          {
            $facet: {
              subscriptions: [
                {
                  $match: {
                    expires_date: { $gte: new Date() }
                  }
                },
                {
                  $group: {
                    _id: null,
                    count: { $sum: 1 }
                  }
                }
              ],
              monthlySubscriptions: [
                {
                  $match: {
                    expires_date: { $gte: new Date() },
                    product_id: { $eq: 'com.shoorah.monthly' }
                  }
                },
                {
                  $group: {
                    _id: null,
                    count: { $sum: 1 }
                  }
                }
              ],
              sixMonthsSubscriptions: [
                {
                  $match: {
                    expires_date: { $gte: new Date() },
                    product_id: { $eq: 'com.shoorah.sixmonths' }
                  }
                },
                {
                  $group: {
                    _id: null,
                    count: { $sum: 1 }
                  }
                }
              ],
              yearlySubscriptions: [
                {
                  $match: {
                    expires_date: { $gte: new Date() },
                    product_id: { $eq: 'com.shoorah.annually' }
                  }
                },
                {
                  $group: {
                    _id: null,
                    count: { $sum: 1 }
                  }
                }
              ],
              lifetimeSubscriptions: [
                {
                  $match: {
                    expires_date: { $gte: new Date() },
                    product_id: { $eq: 'com.shoorah.lifetime' }
                  }
                },
                {
                  $group: {
                    _id: null,
                    count: { $sum: 1 }
                  }
                }
              ]
            }
          }
        ];

        const freePlanAggregation = [
          {
            $match: {
              deletedAt: null
            }
          },
          {
            $facet: {
              freePlanUsers: [
                {
                  $match: {
                    account_type: 1,
                    user_type: USER_TYPE.USER,
                    is_under_trial: false
                  }
                },
                {
                  $group: {
                    _id: null,
                    count: { $sum: 1 }
                  }
                }
              ],
              underTrialUsers: [
                {
                  $match: {
                    user_type: USER_TYPE.USER,
                    account_type: 0,
                    is_under_trial: true
                  }
                },
                {
                  $group: {
                    _id: null,
                    count: { $sum: 1 }
                  }
                }
              ]
            }
          }
        ];

        const freeplandata = await Users.aggregate(freePlanAggregation);
        const freePlanUsers = freeplandata[0]?.freePlanUsers[0]?.count || 0;
        const underTrialUsers = freeplandata[0]?.underTrialUsers[0]?.count || 0;

        const data = await Subscriptions.aggregate(aggregateCondition);
        const monthlySubscriptionsCount = data[0]?.monthlySubscriptions[0]?.count || 0;
        const sixMonthsSubscriptionsCount = data[0]?.sixMonthsSubscriptions[0]?.count || 0;
        const annuallySubscriptionsCount = data[0]?.yearlySubscriptions[0]?.count || 0;
        const lifetimeSubscriptionsCount = data[0]?.lifetimeSubscriptions[0]?.count || 0;

        const subscriptions = data[0]?.subscriptions[0]?.count || 0;

        const totalUsers = users.length;

        const result = {
          subscriptions,
          freePlanUsers,
          underTrialUsers,
          monthlySubscriptionsCount,
          sixMonthsSubscriptionsCount,
          annuallySubscriptionsCount,
          lifetimeSubscriptionsCount
        };

        return Response.successResponseData(res, result, SUCCESS, res.__('userActivePayingData'));
      } else {
        return Response.successResponseWithoutData(res, res.__('noTypeFound'), SUCCESS);
      }
    } catch (err) {
      console.log(err);
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used for get B2B via graph data
   * @param {*} req
   * @param {*} res
   * @return {*}
   */

  getB2BviaGraph: async (req, res) => {
    try {
      const reqParam = req.query;

      const filterCondition = {
        deletedAt: null
      };
      const companies = await Company.find(filterCondition);

      const aggregateCondition = [
        {
          $match: {
            deletedAt: null
          }
        },
        {
          $facet: {
            viaWebsite: [
              {
                $match: {
                  b2b_interest_via: { $eq: 'website' }
                }
              },
              {
                $group: {
                  _id: null,
                  count: { $sum: 1 }
                }
              }
            ],
            viaSales: [
              {
                $match: {
                  b2b_interest_via: { $eq: 'sales team' }
                }
              },
              {
                $group: {
                  _id: null,
                  count: { $sum: 1 }
                }
              }
            ],
            viaPaidAds: [
              {
                $match: {
                  b2b_interest_via: { $eq: 'paid advertisement' }
                }
              },
              {
                $group: {
                  _id: null,
                  count: { $sum: 1 }
                }
              }
            ],
            viaGoogle: [
              {
                $match: {
                  b2b_interest_via: { $eq: 'google' }
                }
              },
              {
                $group: {
                  _id: null,
                  count: { $sum: 1 }
                }
              }
            ],
            viaFacebook: [
              {
                $match: {
                  b2b_interest_via: { $eq: 'facebook' }
                }
              },
              {
                $group: {
                  _id: null,
                  count: { $sum: 1 }
                }
              }
            ],
            viaLinkedin: [
              {
                $match: {
                  b2b_interest_via: { $eq: 'linkedin' }
                }
              },
              {
                $group: {
                  _id: null,
                  count: { $sum: 1 }
                }
              }
            ]
          }
        }
      ];

      const data = await Company.aggregate(aggregateCondition);
      const totalCompanies = companies.length;
      const totalViaWebsite = data[0]?.viaWebsite[0]?.count || 0;
      const totalViaSales = data[0]?.viaSales[0]?.count || 0;
      const totalViaPaidAds = data[0]?.viaPaidAds[0]?.count || 0;
      const totalViaGoogle = data[0]?.viaGoogle[0]?.count || 0;
      const totalViaFacebook = data[0]?.viaFacebook[0]?.count || 0;
      const totalViaLinkedin = data[0]?.viaLinkedin[0]?.count || 0;

      const result = {
        totalCompanies,
        totalViaWebsite,
        totalViaSales,
        totalViaPaidAds,
        totalViaGoogle,
        totalViaFacebook,
        totalViaLinkedin
      };

      return Response.successResponseData(res, result, SUCCESS, res.__('b2bInterestViaGraphData'));
    } catch (err) {
      console.log(err);
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used for getting B2B Earning Graph
   * @param {*} req
   * @param {*} res
   * @return {*}
   */

  getB2BEarningGraph: async (req, res) => {
    try {
      const reqParam = req.query;

      let aggregateCompanyUsersCondition = [];
      let aggregateCompanyCondition = [];

      if (reqParam.companyId && reqParam.companyId != 'All') {
        aggregateCompanyUsersCondition = [
          {
            $match: {
              company_id: toObjectId(reqParam.companyId)
            }
          }
        ];

        let earning = {
          sixMonth: 0,
          totalAnnualEarning: 0,
          monthly: 0
        };
        const company = await Company.findOne({ _id: toObjectId(reqParam.companyId) });
        if (company) {
          let amount = company.no_of_seat_bought * company.seat_price;
          switch (company.currency) {
            case 'gbp':
              amount = amount;
              break;
            case 'usd':
              amount = amount * 0.8;
              break;
            case 'eur':
              amount = amount * 0.85;
              break;
            case 'inr':
              amount = amount * 0.0095;
              break;
            case 'cny':
              amount = amount * 0.11;
              break;
          }

          if (company.vat_tax) {
            amount = amount + Math.round((amount * 20) / 100);
          }

          if (company.plan) {
            let monthlyEarning = amount - (amount * company.discount) / 100;
            earning = {
              monthly: Math.round(monthlyEarning),
              sixMonth: Math.round(monthlyEarning * 6),
              totalAnnualEarning: Math.round(monthlyEarning * 12)
            };
          }

          const companyUsers = await CompanyUsers.aggregate(aggregateCompanyUsersCondition);

          const totalCompanyUsers = companyUsers.length;
          const totalCompanyStats = earning;

          const result = {
            totalCompanyUsers: totalCompanyUsers || 0,
            totalCompanyAnnualEarning: totalCompanyStats?.totalAnnualEarning || 0,
            totalCompanySixMonthEarning: totalCompanyStats?.sixMonth || 0,
            totalCompanyMonthlyEarning: totalCompanyStats?.monthly || 0
          };

          return Response.successResponseData(
            res,
            convertObjectKeysToCamelCase(result),
            SUCCESS,
            res.__('b2bInterestViaGraphData')
          );
        }
      } else {
        aggregateCompanyUsersCondition = [
          {
            $match: {
              deletedAt: null
            }
          }
        ];

        let totalEarning = {
          sixMonth: 0,
          totalAnnualEarning: 0,
          monthly: 0
        };
        const companies = await Company.find({ restrict_company: false });

        if (companies.length) {
          for await (const company of companies) {
            const companyData = await Company.findOne({ _id: toObjectId(company._id) });
            if (companyData) {
              let earning = {
                sixMonth: 0,
                totalAnnualEarning: 0,
                monthly: 0
              };
              let amount = company.no_of_seat_bought * company.seat_price;
              switch (company.currency) {
                case 'gbp':
                  amount = amount;
                  break;
                case 'usd':
                  amount = amount * 0.8;
                  break;
                case 'eur':
                  amount = amount * 0.85;
                  break;
                case 'inr':
                  amount = amount * 0.0095;
                  break;
                case 'cny':
                  amount = amount * 0.11;
                  break;
              }

              if (companyData.plan) {
                let monthlyEarning = amount - (amount * company.discount) / 100;
                earning = {
                  monthly: Math.round(monthlyEarning),
                  sixMonth: Math.round(monthlyEarning * 6),
                  totalAnnualEarning: Math.round(monthlyEarning * 12)
                };
              }

              totalEarning = {
                sixMonth: totalEarning.sixMonth + earning.sixMonth,
                totalAnnualEarning: totalEarning.totalAnnualEarning + earning.totalAnnualEarning,
                monthly: totalEarning.monthly + earning.monthly
              };
            }
          }
        }
        const companyUsers = await CompanyUsers.aggregate(aggregateCompanyUsersCondition);
        const totalCompanyUsers = companyUsers.length;
        const totalCompanyStats = totalEarning;
        const result = {
          totalCompanyUsers: totalCompanyUsers || 0,
          totalCompanyAnnualEarning: totalCompanyStats?.totalAnnualEarning || 0,
          totalCompanySixMonthEarning: totalCompanyStats?.sixMonth || 0,
          totalCompanyMonthlyEarning: totalCompanyStats?.monthly || 0
        };

        return Response.successResponseData(
          res,
          convertObjectKeysToCamelCase(result),
          SUCCESS,
          res.__('b2bInterestViaGraphData')
        );
      }
    } catch (err) {
      console.log(err);
      return Response.internalServerErrorResponse(res);
    }
  },

  getB2BAdminMoodCounts: async (req, res) => {
    try {
      const happyb2bMoods = await B2BMoods.find({ mood_type: 1 }).countDocuments();
      const sadb2bMoods = await B2BMoods.find({ mood_type: 2 }).countDocuments();
      const angryb2bMoods = await B2BMoods.find({ mood_type: 3 }).countDocuments();
      const neutralb2bMoods = await B2BMoods.find({ mood_type: 4 }).countDocuments();

      let response = {
        happy: happyb2bMoods,
        sad: sadb2bMoods,
        angry: angryb2bMoods,
        neutral: neutralb2bMoods
      };

      return Response.successResponseData(
        res,
        convertObjectKeysToCamelCase(response),
        SUCCESS,
        res.__('b2bAdminMoods')
      );
    } catch (err) {
      console.log(err);
      return Response.internalServerErrorResponse(res);
    }
  },

  downloadB2BReport: async (req, res) => {
    try {
      const reqParam = req.body;
      let fromDate = currentDateOnly();

      let companyData = reqParam.companyData;
      const b2b = reqParam.b2bData;
      const b2bMood = reqParam.b2bMoodData;

      const b2bVia = {
        totalCompanies: b2b.totalCompanies,
        totalViaWebsite: b2b.totalViaWebsite,
        totalViaSales: b2b.totalViaSales,
        totalViaPaidAds: b2b.totalViaPaidAds,
        totalViaGoogle: b2b.totalViaGoogle,
        totalViaFacebook: b2b.totalViaFacebook,
        totalViaLinkedin: b2b.totalViaLinkedin,
        websitePercent: parseFloat(
          (b2b.totalViaWebsite /
            (b2b.totalViaWebsite +
              b2b.totalViaSales +
              b2b.totalViaPaidAds +
              b2b.totalViaGoogle +
              b2b.totalViaFacebook +
              b2b.totalViaLinkedin)) *
            100
        ).toFixed(2),
        salesPercent: parseFloat(
          (b2b.totalViaSales /
            (b2b.totalViaWebsite +
              b2b.totalViaSales +
              b2b.totalViaPaidAds +
              b2b.totalViaGoogle +
              b2b.totalViaFacebook +
              b2b.totalViaLinkedin)) *
            100
        ).toFixed(2),
        adsPercent: parseFloat(
          (b2b.totalViaPaidAds /
            (b2b.totalViaWebsite +
              b2b.totalViaSales +
              b2b.totalViaPaidAds +
              b2b.totalViaGoogle +
              b2b.totalViaFacebook +
              b2b.totalViaLinkedin)) *
            100
        ).toFixed(2),
        googlePercent: parseFloat(
          (b2b.totalViaGoogle /
            (b2b.totalViaWebsite +
              b2b.totalViaSales +
              b2b.totalViaPaidAds +
              b2b.totalViaGoogle +
              b2b.totalViaFacebook +
              b2b.totalViaLinkedin)) *
            100
        ).toFixed(2),
        facebookPercent: parseFloat(
          (b2b.totalViaFacebook /
            (b2b.totalViaWebsite +
              b2b.totalViaSales +
              b2b.totalViaPaidAds +
              b2b.totalViaGoogle +
              b2b.totalViaFacebook +
              b2b.totalViaLinkedin)) *
            100
        ).toFixed(2),
        linkedinPercent: parseFloat(
          (b2b.totalViaLinkedin /
            (b2b.totalViaWebsite +
              b2b.totalViaSales +
              b2b.totalViaPaidAds +
              b2b.totalViaGoogle +
              b2b.totalViaFacebook +
              b2b.totalViaLinkedin)) *
            100
        ).toFixed(2)
      };

      const locals = {
        name: 'B2B Overall Report',
        b2bVia,
        companyData,
        b2bMood,
        issuedAt: fromDate.toLocaleDateString('en-gb', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })
      };

      const compiledFunction = pug.compileFile('src/views/b2b-overall-report.pug');
      const html = compiledFunction(locals);
      const browser = await puppeteer.launch({
        executablePath:
          process.env.NODE_ENV === NODE_ENVIRONMENT.DEVELOPMENT ? null : '/usr/bin/google-chrome',
        ignoreDefaultArgs: ['--disable-extensions'],
        headless: true,
        args: ['--no-sandbox', '--disabled-setupid-sandbox']
      });
      const page = await browser.newPage();
      await page.setContent(html);
      const pdf = await page.pdf({
        format: MOOD_PDF_SIZE,
        printBackground: true
      });
      await browser.close();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=file.pdf');
      res.setHeader('Content-Length', pdf.length);
      res.send(pdf);
    } catch (err) {
      console.error(err);
      return Response.internalServerErrorResponse(res);
    }
  }
};
