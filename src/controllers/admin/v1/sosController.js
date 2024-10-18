'use strict';

const Response = require('@services/Response');
const moment = require('moment');
const { Sos } = require('@models');
const SOSCall = require('../../../models/SosCall');
const puppeteer = require('puppeteer');
const pug = require('pug');
const { NODE_ENVIRONMENT, MOOD_PDF_SIZE } = require('../../../services/Constant');
// const arrowSvg=require('../../../views/arrow.svg');

module.exports = {
  /**
   * @description This function is used to Get SOS CLicks
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */

  getAllSosClicks: async (req, res) => {
    try {
      let { startDate, endDate } = req.body;

      // If startDate or endDate is not provided, set default range for current month
      if (!startDate && !endDate) {
        const currentMonthStart = moment().startOf('month').format('YYYY-MM-DD');
        // const currentMonthEnd = moment().endOf('day').toISOString(); // Including time
        const currentMonthEnd = moment().endOf('month').format('YYYY-MM-DD');
        startDate = currentMonthStart;
        endDate = currentMonthEnd;
      } else if (startDate && !endDate) {
        // Calculate endDate if startDate is given
        // endDate = moment(startDate).endOf('day').toISOString();
        endDate = moment().endOf('month').format('YYYY-MM-DD');
      } else if (!startDate && endDate) {
        // Calculate startDate if endDate is given
        startDate = moment(endDate).startOf('month').format('YYYY-MM-DD');
        // endDate = moment(endDate).endOf('day').toISOString(); // Including time
        endDate = moment().endOf('month').format('YYYY-MM-DD');
      }

      console.log('Start Date:', startDate, 'End Date:', endDate); // Logging for diagnostics

      const pipeline = [
        {
          $match: {
            createdAt: {
              $gte: new Date(startDate),
              $lte: new Date(endDate)
            }
          }
        }
      ];

      const uniqueUserPipeline = [
        ...pipeline,
        { $group: { _id: '$user_id' } }, // Updated to user_id
        { $group: { _id: null, uniqueUserCount: { $sum: 1 } } }
      ];

      const result = await Sos.aggregate(pipeline);

      const phoneresult = await SOSCall.aggregate(pipeline);

      const uniqueUsersResult = await SOSCall.aggregate(uniqueUserPipeline);
      const uniquePhoneUsers =
        uniqueUsersResult.length > 0 ? uniqueUsersResult[0].uniqueUserCount : 0;

      return res.status(200).json({
        sosClicks: result.length,
        sosPhone: phoneresult.length,
        uniqueSosPhoneUsers: uniquePhoneUsers
      });
    } catch (err) {
      return Response.internalServerErrorResponse(res);
    }
  },

  /**
   * @description This function is used to Download report of sos click
   * @param {*} req
   * @param {*} res
   * @returns {*}
   */

  downloadSosClickReport: async (req, res) => {
    try {
      let { startDate, endDate, reportType } = req.query;

      if (reportType == 1) {
        const currentMonthStart = moment().startOf('month').format('YYYY-MM-DD');
        const currentMonthEnd = moment().endOf('month').format('YYYY-MM-DD');
        startDate = currentMonthStart;
        endDate = currentMonthEnd;
      }
      if (reportType == 2) {
        const currentMonthEnd = moment().endOf('month').format('YYYY-MM-DD');
        const threeMonthsAgoStart = moment()
          .subtract(3, 'months')
          .startOf('month')
          .format('YYYY-MM-DD');
        startDate = threeMonthsAgoStart;
        endDate = currentMonthEnd;
      }

      if (reportType == 3) {
        if (!startDate && !endDate) {
          const currentMonthStart = moment().startOf('month').format('YYYY-MM-DD');
          // const currentMonthEnd = moment().endOf('day').toISOString(); // Including time
          const currentMonthEnd = moment().endOf('month').format('YYYY-MM-DD');
          startDate = currentMonthStart;
          endDate = currentMonthEnd;
        } else if (startDate && !endDate) {
          // Calculate endDate if startDate is given
          // endDate = moment(startDate).endOf('day').toISOString();
          endDate = moment().endOf('month').format('YYYY-MM-DD');
        } else if (!startDate && endDate) {
          // Calculate startDate if endDate is given
          startDate = moment(endDate).startOf('month').format('YYYY-MM-DD');
          // endDate = moment(endDate).endOf('day').toISOString(); // Including time
          endDate = moment().endOf('month').format('YYYY-MM-DD');
        }
      }

      const pipeline = [
        {
          $match: {
            createdAt: {
              $gte: new Date(startDate),
              $lte: new Date(endDate)
            }
          }
        }
      ];

      const uniqueUserPipeline = [
        ...pipeline,
        { $group: { _id: '$user_id' } }, // Updated to user_id
        { $group: { _id: null, uniqueUserCount: { $sum: 1 } } }
      ];

      const totalSosClicks = await Sos.find().countDocuments();
      const totalPhoneClicks = await SOSCall.find().countDocuments();

      const result = await Sos.aggregate(pipeline);
      const phoneresult = await SOSCall.aggregate(pipeline);
      const uniqueUsersResult = await SOSCall.aggregate(uniqueUserPipeline);
      const uniquePhoneUsers =
        uniqueUsersResult.length > 0 ? uniqueUsersResult[0].uniqueUserCount : 0;
      let finalResult = {
        sosClicks: result.length,
        sosPhone: phoneresult.length,
        uniqueSosPhoneUsers: uniquePhoneUsers
      };

      startDate = new Date(startDate);
      endDate = new Date(endDate);

      let sosPercent;
      let sosIncrease = true;
      let phonePercent;
      let phoneIncrease = true;

      if (totalSosClicks > finalResult.sosClicks) {
        sosPercent = parseFloat(
          (((totalSosClicks - finalResult.sosClicks) / totalSosClicks) * 100).toFixed(1)
        );
        sosIncrease = true;
      } else {
        sosPercent = ((finalResult.sosClicks - totalSosClicks) / totalSosClicks) * 100;
        sosIncrease = false;
      }

      if (totalPhoneClicks > finalResult.sosPhone) {
        phonePercent = parseFloat(
          (((totalPhoneClicks - finalResult.sosPhone) / totalPhoneClicks) * 100).toFixed(1)
        );
        phoneIncrease = true;
      } else {
        phonePercent = ((finalResult.sosPhone - totalPhoneClicks) / totalPhoneClicks) * 100;
        phoneIncrease = false;
      }

      let monthText = null;

      if (reportType == 1) {
        monthText = 'From Previous 1 Month';
      }

      if (reportType == 2) {
        monthText = 'From Previous 3 Month';
      }

      if (reportType == 3) {
        monthText = 'From Previous Months';
      }

      const locals = {
        sosClicks: finalResult.sosClicks,
        sosPhone: finalResult.sosPhone,
        totalSosClicks: totalSosClicks,
        totalPhoneClicks: totalPhoneClicks,
        uniqueSosPhoneUsers: finalResult.uniqueSosPhoneUsers,
        sosPercent,
        sosIncrease,
        phoneIncrease,
        phonePercent,
        monthText,
        finalMessage:
          'Our Intervention button is for anyone who feels like they need urgent support or someone to talk to right away. The button links to the Samaritans Charity which offers comprehensive 24/7 support',
        secondMessage:
          'For businesses it adds another crucial level to the support that employees can experience through Shoorah and is another important tool that can be monitored and tracked to ensure the continued improvement in employee wellbeing. ',
        fromDate: startDate.toLocaleDateString('en-gb', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }),
        toDate: endDate.toLocaleDateString('en-gb', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }),
        happySmallIcon: process.env.PDF_HAPPY_SMALL_ICON,
        sadSmallIcon: process.env.PDF_SAD_SMALL_ICON
      };

      const compiledFunction = pug.compileFile('src/views/sosReport.pug');
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
      // return res.status(200).json();
    } catch (err) {
      console.error(err);
      return Response.internalServerErrorResponse(res);
    }
  }
};
