/* eslint-disable prefer-promise-reject-errors */
'use strict';

const sendGridMail = require('@sendgrid/mail');
const client = require('twilio')(process.env.ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const { OTP_EXPIRY } = require('@services/Constant');

sendGridMail.setApiKey(process.env.SENDGRID_API_KEY);

const RippleText = `***********************************************
*Congratulations!
You've received 30 days Free Trial for Shoorah.*
***********************************************

Dear {{name}},

Congratulations! You have received a 30 day free trial from shoorah mental health and well being.

Kindly use this credentials to access shoorah app :

Email : {{email}}

Password : {{password}}

Suicide may seem like the only way out. But in the end, it's not just you that you are hurting but those who love and care about you. It takes strength and power but you are so much stronger than you know. There is a reason you are still here.

Shoorah would like to enhance your mental health and help you prevent negative thoughts that comes in your mind.

Best regards,

Lorri Haines (CEO)

Take a moment for yourself, and remember that Shoorah is here to support you in maintaining a positive and productive mindset.

Sincerely,

The Shoorah Team`;

const PartnerWelcome = `

**************************
Welcome to Shoorah Partner
**************************

Your Industry-Leading Partner for Elevating Workplace Productivity, Engagement & Well-being.

Visit our website ( https://webapp.shoorah.io )
Admin Portal ( https://admin.shoorah.io/ )

---------------------
Hey There {{name}}!
---------------------

We are absolutely delighted that you have chosen to become a part of Shoorah Partnerships !

We're thrilled for you to start building your mentally workforce, paving the way for a brighter future of work.

Let's get you started!

Get Logged in now!
------------------

*Email:* {{email}}

*Password:* {{password}}

Note: Please do not share your credentials with anyone

---------------------------------
It's all only a stone throw away!
---------------------------------

Apple Store : ( https://apps.apple.com/us/app/shoorah-mental-health-calm/id1669683359 )

Play Store : ( https://play.google.com/store/apps/details?id=com.shoorah )

Where mental wellness meets workplace excellence!`;

const B2BWelcome = `

***************************
Welcome to Shoorah Business
***************************

Your Industry-Leading Partner for Elevating Workplace Productivity, Engagement & Well-being.

Visit our website ( https://webapp.shoorah.io )
Admin Portal ( https://admin.shoorah.io )

---------------------
Hey There {{name}}!
---------------------

We are absolutely delighted that you have chosen to become a part of Shoorah Business!

We're thrilled for you to start building your mentally workforce, paving the way for a brighter future of work.

Let's get you started!

Get Logged in now!
------------------

*Email:* {{email}}

*Password:* {{password}}

Note: Please do not share your credentials with anyone

Apple Store : ( https://apps.apple.com/us/app/shoorah-mental-health-calm/id1669683359 )

Play Store : ( https://play.google.com/store/apps/details?id=com.shoorah )

---------------------------------
It's all only a stone throw away!
---------------------------------

Where mental wellness meets workplace excellence!`;

const SendPassword = `

*******************
Welcome to Shoorah!
*******************

Minds In Motion

---------------------
Hey There {{name}}!
---------------------

We are absolutely delighted that you have chosen to become a part of Shoorah!

We're thrilled for you to start building your mentally healthy environment, paving the way for a brighter and healthy you.

Let's get you started!

Get Logged in now!
------------------

*Email:* {{email}}

*Password:* {{password}}

Note: Please do not share your credentials with anyone

---------------------------------
It's all only a stone throw away!
---------------------------------

Where mental wellness meets your needs!`;

const PraiseText = `************************
*Congratulations!
You've received a praise*
************************

Dear {{user_name}},

Congratulations! You have received a praise from your employer, {{company_name}}, via the Shoorah platform.

This recognition is a testament to your commitment to personal growth, well-being, and professional development, and we are honored to play a role in your success.

Shoorah would like to extend our sincere congratulations on this well-deserved recognition.

Please find the full praise message from your employer below:

Dear {{user_name}},

We're pleased to acknowledge your efforts in using the Shoorah platform for our mental health strategy.

Your dedication and progress are inspiring, and we thank you for promoting a positive work environment.

Congratulations on this accomplishment, and keep up the excellent work!

Best regards,

{{admin_name}}

{{company_name}}

Take a moment to celebrate this milestone, and remember that Shoorah is here to support you in maintaining a positive and productive mindset.

Sincerely,

The Shoorah Team`;

const OtpText = `

**************
Verify Account
**************

---------------------
Hey There {{name}}!
---------------------

Shoorah is a fresh and comprehensive wellbeing app that helps you support your mental health and nourish your wellbeing through a range of wellness tools.
It’s a place for you to look after YOU.

Transform the way you feel both mentally and physically through our mental health & wellbeing app.

Let's get you started!

Please Enter below OTP to verify your email address!
----------------------------------------------------

*{{otp}}*

Note: Please do not share your credentials with anyone

---------------------------------
It's all only a stone throw away!
---------------------------------

Where mental wellness meets your needs!
`;

module.exports = {
  sendMail: (message) => {
    return new Promise((resolve, reject) => {
      sendGridMail
        .send(message)
        .then(() => {
          resolve(true);
          console.log('Email sent');
        })
        .catch((error) => {
          console.log(error, '<<<<error');
          reject(false);
        });
    });
  },

  /**
   * @description This function is used to send otp
   * @param {*} toEmail
   * @param {*} mailSubject
   * @param {*} locals
   */
  sendOtp: async (toEmail, mailSubject, locals) => {
    await sendGridMail.send({
      from: {
        email: process.env.FROM_EMAIL,
        name: process.env.FROM_NAME
      },
      to: toEmail,
      templateId: process.env.SEND_OTP_TEMPLATE_ID,
      subject: `Your OTP for verification is - ${locals.otp}`,
      dynamic_template_data: { ...locals, subject: `Your OTP for verification is - ${locals.otp}` },
      substitutions: {
        '{{WEBAPP_URL}}': 'https://webapp.shoorah.io', // Your WEBAPP_URL
        '{{ADMN_URL}}': 'https://admin.shoorah.io', // Your ADMN_URL
        '{{APPLE_STORE_URL}}':
          'https://apps.apple.com/us/app/shoorah-mental-health-calm/id1669683359', // Your Apple Store URL
        '{{PLAY_STORE_URL}}': 'https://play.google.com/store/apps/details?id=com.shoorah' // Your Play Store URL
      },
      tracking_settings: {
        click_tracking: {
          enable: false // Enable click tracking for all URLs except those specified in substitutions
        }
      }
    });

    // const replacedString = OtpText.replace(
    //   /{{name}}|{{otp}}/g,
    //   (match) => locals[match.slice(2, -2)]
    // );

    // await module.exports.sendMail({
    //   from: {
    //     email: process.env.FROM_EMAIL,
    //     name: process.env.FROM_NAME
    //   },
    //   to: toEmail,
    //   text: replacedString,
    //   subject: `Your OTP for verification is - ${locals.otp}`
    // });
  },

  /**
   * @description This function is used to send verification link
   * @param {*} toEmail
   * @param {*} mailSubject
   * @param {*} locals
   */
  // Function to send the verification email
  sendVerificationEmail: async (toEmail, locals) => {
    try {
      // Prepare the email message
      const emailMessage = {
        from: {
          email: process.env.FROM_EMAIL,
          name: process.env.FROM_NAME
        },
        to: toEmail,
        templateId: process.env.SEND_VERIFICATION_LINK, // Use your SendGrid email verification template ID
        subject: `Verify your email address`,
        dynamic_template_data: {
          ...locals
        },
        tracking_settings: {
          click_tracking: {
            enable: true
          }
        }
      };
      console.log(emailMessage, '<<<<<<<emailMessage');
      // Send the email
      await sendGridMail.send(emailMessage);
      console.log('Verification email sent to:', toEmail);
    } catch (error) {
      console.log('Error sending verification email:', error);
    }
  },

  /**
   * @description This function is used to reset password link
   * @param {*} toEmail
   * @param {*} mailSubject
   * @param {*} locals
   */
  // Function to send the reset password link
  sendResetPasswordLink: async (toEmail, locals) => {
    try {
      // Prepare the email message
      const emailMessage = {
        from: {
          email: process.env.FROM_EMAIL,
          name: process.env.FROM_NAME
        },
        to: toEmail,
        templateId: process.env.SEND_RESET_PASSWORD_LINK, // Use your SendGrid email verification template ID
        subject: `Reset your password ${locals.firstName}`,
        dynamic_template_data: {
          ...locals
        },
        tracking_settings: {
          click_tracking: {
            enable: true
          }
        }
      };
      console.log(emailMessage, '<<<<<<<emailMessage');
      // Send the email
      await sendGridMail.send(emailMessage);
      console.log('Verification email sent to:', toEmail);
    } catch (error) {
      console.log('Error sending verification email:', error?.response?.body);
    }
  },

  /**
   * @description This function is used to Invite for interview
   * @param {*} toEmail
   * @param {*} mailSubject
   * @param {*} locals
   */
  sendInviteForInterview: async (toEmail, locals) => {
    try {
      // Prepare the email message
      const emailMessage = {
        from: {
          email: process.env.FROM_EMAIL,
          name: process.env.FROM_NAME
        },
        to: toEmail,
        templateId: process.env.INVITE_FOR_INTERVIEW, // Use your SendGrid email verification template ID
        dynamic_template_data: {
          ...locals,
          subject: ` ${locals.firstName}`
        },
        tracking_settings: {
          click_tracking: {
            enable: true
          }
        }
      };
      console.log(emailMessage, '<<<<<<<emailMessage');
      // Send the email
      await sendGridMail.send(emailMessage);
      console.log('Invite for interview email sent to:', toEmail);
    } catch (error) {
      console.log('Error sending Invite for interview email:', error?.response?.body);
    }
  },

  /**
   * @description This function is used to send Interview Confirmation
   * @param {*} toEmail
   * @param {*} mailSubject
   * @param {*} locals
   */
  sendInterviewConfirmation: async (toEmail, locals) => {
    try {
      // Prepare the email message
      const emailMessage = {
        from: {
          email: process.env.FROM_EMAIL,
          name: process.env.FROM_NAME
        },
        to: toEmail,
        templateId: process.env.INTERVIEW_CONFIRMATION, // Use your SendGrid email verification template ID
        subject: `Interview Confirmation ${locals.firstName}`,
        dynamic_template_data: {
          ...locals
        },
        tracking_settings: {
          click_tracking: {
            enable: true
          }
        }
      };
      console.log(emailMessage, '<<<<<<<emailMessage');
      // Send the email
      await sendGridMail.send(emailMessage);
      console.log('Interview Confirmation email sent to:', toEmail);
    } catch (error) {
      console.log('Error sending Interview Confirmation email:', error?.response?.body);
    }
  },
  /**
   * @description This function is used to send Expert Account Approve template
   * @param {*} toEmail
   * @param {*} mailSubject
   * @param {*} locals
   */
  sendExpertAccountApprove: async (toEmail, locals) => {
    try {
      // Prepare the email message
      const emailMessage = {
        from: {
          email: process.env.FROM_EMAIL,
          name: process.env.FROM_NAME
        },
        to: toEmail,
        templateId: process.env.EXPERT_ACCOUNT_APPROVE,
        subject: `Your Account is Approved ${locals.firstName}`,
        dynamic_template_data: {
          ...locals
        },
        tracking_settings: {
          click_tracking: {
            enable: true
          }
        }
      };
      console.log(emailMessage, '<<<<<<<emailMessage');
      // Send the email
      await sendGridMail.send(emailMessage);
      console.log('Interview Confirmation email sent to:', toEmail);
    } catch (error) {
      console.log('Error sending Interview Confirmation email:', error?.response?.body);
    }
  },

  /**
   * @description This function is used to send user otp
   * @param {*} toEmail
   * @param {*} mailSubject
   * @param {*} locals
   */

  sendUserOtp: async (toEmail, mailSubject, locals) => {
    await module.exports.sendMail({
      from: {
        email: process.env.FROM_EMAIL,
        name: process.env.FROM_NAME
      },
      to: toEmail,
      templateId: process.env.SEND_OTP_TEMPLATE_ID_USER,
      subject: `Your OTP for verification is - ${locals.otp}`,
      dynamic_template_data: { ...locals, subject: `Your OTP for verification is - ${locals.otp}` },
      substitutions: {
        '{{WEBAPP_URL}}': 'https://webapp.shoorah.io', // Your WEBAPP_URL
        '{{ADMN_URL}}': 'https://admin.shoorah.io', // Your ADMN_URL
        '{{APPLE_STORE_URL}}':
          'https://apps.apple.com/us/app/shoorah-mental-health-calm/id1669683359', // Your Apple Store URL
        '{{PLAY_STORE_URL}}': 'https://play.google.com/store/apps/details?id=com.shoorah' // Your Play Store URL
      },
      tracking_settings: {
        click_tracking: {
          enable: false // Enable click tracking for all URLs except those specified in substitutions
        }
      }
    });

    const replacedString = OtpText.replace(
      /{{name}}|{{otp}}/g,
      (match) => locals[match.slice(2, -2)]
    );

    await module.exports.sendMail({
      from: {
        email: process.env.FROM_EMAIL,
        name: process.env.FROM_NAME
      },
      to: toEmail,
      text: replacedString,
      subject: `Your OTP for verification is - ${locals.otp}`
    });
  },

  /**
   * @description This function is used to send password
   * @param {*} toEmail
   * @param {*} locals
   */
  sendPassword: async (toEmail, locals) => {
    await module.exports.sendMail({
      from: {
        email: process.env.FROM_EMAIL,
        name: process.env.FROM_NAME
      },
      to: toEmail,
      templateId: process.env.SEND_PASSWORD_TEMPLATE_ID,
      dynamic_template_data: locals,
      subject: `Welcome to Shoorah`,
      substitutions: {
        '{{WEBAPP_URL}}': 'https://webapp.shoorah.io', // Your WEBAPP_URL
        '{{ADMN_URL}}': 'https://admin.shoorah.io', // Your ADMN_URL
        '{{APPLE_STORE_URL}}':
          'https://apps.apple.com/us/app/shoorah-mental-health-calm/id1669683359', // Your Apple Store URL
        '{{PLAY_STORE_URL}}': 'https://play.google.com/store/apps/details?id=com.shoorah' // Your Play Store URL
      },
      tracking_settings: {
        click_tracking: {
          enable: false // Enable click tracking for all URLs except those specified in substitutions
        }
      }
    });

    const replacedString = SendPassword.replace(
      /{{name}}|{{email}}|{{password}}/g,
      (match) => locals[match.slice(2, -2)]
    );

    await module.exports.sendMail({
      from: {
        email: process.env.FROM_EMAIL,
        name: process.env.FROM_NAME
      },
      to: toEmail,
      text: replacedString,
      subject: `Welcome to Shoorah`
    });
  },

  sendB2BPassword: async (toEmail, mailSubject, locals) => {
    await module.exports.sendMail({
      from: {
        email: process.env.FROM_EMAIL,
        name: process.env.FROM_NAME
      },
      to: toEmail,
      templateId: process.env.B2B_PASSWORD_TEMPLATE_ID,
      dynamic_template_data: {
        ...locals,
        webapp_url: 'https://webapp.shoorah.io',
        admin_url: 'https://admin.shoorah.io/'
      },
      subject: mailSubject
    });

    const replacedString = B2BWelcome.replace(
      /{{name}}|{{email}}|{{password}}/g,
      (match) => locals[match.slice(2, -2)]
    );

    await module.exports.sendMail({
      from: {
        email: process.env.FROM_EMAIL,
        name: process.env.FROM_NAME
      },
      to: toEmail,
      text: replacedString,
      subject: mailSubject,
      substitutions: {
        '{{WEBAPP_URL}}': 'https://webapp.shoorah.io', // Your WEBAPP_URL
        '{{ADMN_URL}}': 'https://admin.shoorah.io', // Your ADMN_URL
        '{{APPLE_STORE_URL}}':
          'https://apps.apple.com/us/app/shoorah-mental-health-calm/id1669683359', // Your Apple Store URL
        '{{PLAY_STORE_URL}}': 'https://play.google.com/store/apps/details?id=com.shoorah' // Your Play Store URL
      },
      tracking_settings: {
        click_tracking: {
          enable: false // Enable click tracking for all URLs except those specified in substitutions
        }
      }
    });
  },

  sendPartnerPassword: async (toEmail, mailSubject, locals) => {
    await module.exports.sendMail({
      from: {
        email: process.env.FROM_EMAIL,
        name: process.env.FROM_NAME
      },
      to: toEmail,
      templateId: process.env.PARTNER_TEMPLATE_ID,
      dynamic_template_data: { ...locals },
      subject: `Welcome to Shoorah Partner`
    });

    const replacedString = PartnerWelcome.replace(
      /{{name}}|{{email}}|{{password}}/g,
      (match) => locals[match.slice(2, -2)]
    );

    await module.exports.sendMail({
      from: {
        email: process.env.FROM_EMAIL,
        name: process.env.FROM_NAME
      },
      to: toEmail,
      text: replacedString,
      subject: `Welcome to Shoorah Partner`,
      substitutions: {
        '{{WEBAPP_URL}}': 'https://webapp.shoorah.io', // Your WEBAPP_URL
        '{{ADMN_URL}}': 'https://admin.shoorah.io', // Your ADMN_URL
        '{{APPLE_STORE_URL}}':
          'https://apps.apple.com/us/app/shoorah-mental-health-calm/id1669683359', // Your Apple Store URL
        '{{PLAY_STORE_URL}}': 'https://play.google.com/store/apps/details?id=com.shoorah' // Your Play Store URL
      },
      tracking_settings: {
        click_tracking: {
          enable: false // Enable click tracking for all URLs except those specified in substitutions
        }
      }
    });
  },

  /**
   * @description This function is used to send praise to employee
   * @param {*}
   * @param {*}
   * @returns {*}
   */

  sendPraise: async (toEmail, mailSubject, locals) => {
    await module.exports.sendMail({
      from: {
        email: process.env.FROM_EMAIL,
        name: process.env.FROM_NAME
      },
      to: toEmail,
      templateId: process.env.PRAISE_TEMPLATE_ID,
      dynamic_template_data: { ...locals },
      asm: {
        group_id: 104273
      },
      subject: mailSubject
    });

    const replacedString = PraiseText.replace(
      /{{user_name}}|{{company_name}}|{{admin_name}}/g,
      (match) => locals[match.slice(2, -2)]
    );

    await module.exports.sendMail({
      from: {
        email: process.env.FROM_EMAIL,
        name: process.env.FROM_NAME
      },
      to: toEmail,
      asm: {
        group_id: 104273
      },
      text: replacedString,
      subject: `Congratulations!
      You've received a praise.`,
      substitutions: {
        '{{WEBAPP_URL}}': 'https://webapp.shoorah.io', // Your WEBAPP_URL
        '{{ADMN_URL}}': 'https://admin.shoorah.io', // Your ADMN_URL
        '{{APPLE_STORE_URL}}':
          'https://apps.apple.com/us/app/shoorah-mental-health-calm/id1669683359', // Your Apple Store URL
        '{{PLAY_STORE_URL}}': 'https://play.google.com/store/apps/details?id=com.shoorah' // Your Play Store URL
      },
      tracking_settings: {
        click_tracking: {
          enable: false // Enable click tracking for all URLs except those specified in substitutions
        }
      }
    });
  },

  /**
   * @description This function is used to send otp to mobile number
   * @param {*} toMobile
   * @param {*} otp
   * @returns {*}
   */
  sendOtpToMobile: (toMobile, otp) => {
    return new Promise((resolve, reject) => {
      client.messages
        .create({
          body: `${otp} is your One Time Password (OTP) for Shoorah, This OTP will only be valid for ${OTP_EXPIRY} minutes`,
          from: process.env.FROM_PHONE_NUMBER,
          to: `+${toMobile}`
        })
        .then(() => {
          resolve(true);
          console.log('OTP send to registered mobile number');
        })
        .catch((error) => {
          console.log(error);
          return reject(false);
        });
    }).catch(() => {
      return false;
    });
  },

  sendRipplePassword: async (toEmail, locals) => {
    await module.exports.sendMail({
      from: {
        email: process.env.FROM_EMAIL,
        name: process.env.FROM_NAME
      },
      to: toEmail,
      templateId: process.env.RIPPLE_TEMPLATE_ID,
      dynamic_template_data: { ...locals },
      subject: `Congratulations!
      You've received 30 days Free Trial for Shoorah.`,
      substitutions: {
        '{{WEBAPP_URL}}': 'https://webapp.shoorah.io', // Your WEBAPP_URL
        '{{ADMN_URL}}': 'https://admin.shoorah.io', // Your ADMN_URL
        '{{APPLE_STORE_URL}}':
          'https://apps.apple.com/us/app/shoorah-mental-health-calm/id1669683359', // Your Apple Store URL
        '{{PLAY_STORE_URL}}': 'https://play.google.com/store/apps/details?id=com.shoorah' // Your Play Store URL
      },
      tracking_settings: {
        click_tracking: {
          enable: false // Enable click tracking for all URLs except those specified in substitutions
        }
      }
    });
    const replacedString = RippleText.replace(
      /{{name}}|{{email}}|{{password}}/g,
      (match) => locals[match.slice(2, -2)]
    );

    await module.exports.sendMail({
      from: {
        email: process.env.FROM_EMAIL,
        name: process.env.FROM_NAME
      },
      to: toEmail,
      text: replacedString,
      subject: `Congratulations!
      You've received 30 days Free Trial for Shoorah.`
    });
  },

  sendB2BWeekReport: async (toEmail, locals) => {
    await module.exports.sendMail({
      from: {
        email: process.env.FROM_EMAIL,
        name: process.env.FROM_NAME
      },
      to: toEmail,
      templateId: process.env.B2B_WEEK_REPORT,
      dynamic_template_data: { ...locals },
      asm: {
        group_id: 104273
      },
      subject: `Weekly Insights - ${locals.company_name}`,
      substitutions: {
        '{{WEBAPP_URL}}': 'https://webapp.shoorah.io', // Your WEBAPP_URL
        '{{ADMN_URL}}': 'https://admin.shoorah.io', // Your ADMN_URL
        '{{APPLE_STORE_URL}}':
          'https://apps.apple.com/us/app/shoorah-mental-health-calm/id1669683359', // Your Apple Store URL
        '{{PLAY_STORE_URL}}': 'https://play.google.com/store/apps/details?id=com.shoorah' // Your Play Store URL
      },
      tracking_settings: {
        click_tracking: {
          enable: false // Enable click tracking for all URLs except those specified in substitutions
        }
      }
    });
    // const replacedString = RippleText.replace(/{{name}}|{{email}}|{{password}}/g, match => locals[match.slice(2, -2)]);

    // await module.exports.sendMail({
    //   from: {
    //     email: process.env.FROM_EMAIL,
    //     name: process.env.FROM_NAME
    //   },
    //   to: toEmail,
    //   text: replacedString,
    //   subject: `Congratulations!
    //   You've received 30 days Free Trial for Shoorah.`
    // });
  },

  sendUserWeekReport: async (toEmail, locals, accountType) => {
    await module.exports.sendMail({
      from: {
        email: process.env.FROM_EMAIL,
        name: process.env.FROM_NAME
      },
      to: toEmail,
      asm: {
        group_id: 104273
      },
      templateId:
        accountType == 1 ? process.env.USER_WEEK_REPORT_FREE : process.env.USER_WEEK_REPORT_PAID,
      dynamic_template_data: { ...locals },
      subject: `Weekly Insights - ${locals.name}`,
      substitutions: {
        '{{WEBAPP_URL}}': 'https://webapp.shoorah.io', // Your WEBAPP_URL
        '{{ADMN_URL}}': 'https://admin.shoorah.io', // Your ADMN_URL
        '{{APPLE_STORE_URL}}':
          'https://apps.apple.com/us/app/shoorah-mental-health-calm/id1669683359', // Your Apple Store URL
        '{{PLAY_STORE_URL}}': 'https://play.google.com/store/apps/details?id=com.shoorah' // Your Play Store URL
      },
      tracking_settings: {
        click_tracking: {
          enable: false // Enable click tracking for all URLs except those specified in substitutions
        }
      }
    });
    // const replacedString = RippleText.replace(/{{name}}|{{email}}|{{password}}/g, match => locals[match.slice(2, -2)]);

    // await module.exports.sendMail({
    //   from: {
    //     email: process.env.FROM_EMAIL,
    //     name: process.env.FROM_NAME
    //   },
    //   to: toEmail,
    //   text: replacedString,
    //   subject: `Congratulations!
    //   You've received 30 days Free Trial for Shoorah.`
    // });
  },

  sendRenewalReminder: async (toEmail, locals) => {
    await module.exports.sendMail({
      from: {
        email: process.env.FROM_EMAIL,
        name: process.env.FROM_NAME
      },
      to: toEmail,
      templateId: process.env.B2B_RENEW_EMAIL,
      dynamic_template_data: { ...locals },
      asm: {
        group_id: 104273
      },
      subject: `Contract reminder - ${locals.name}`,
      substitutions: {
        '{{WEBAPP_URL}}': 'https://webapp.shoorah.io', // Your WEBAPP_URL
        '{{ADMN_URL}}': 'https://admin.shoorah.io', // Your ADMN_URL
        '{{APPLE_STORE_URL}}':
          'https://apps.apple.com/us/app/shoorah-mental-health-calm/id1669683359', // Your Apple Store URL
        '{{PLAY_STORE_URL}}': 'https://play.google.com/store/apps/details?id=com.shoorah' // Your Play Store URL
      },
      tracking_settings: {
        click_tracking: {
          enable: false // Enable click tracking for all URLs except those specified in substitutions
        }
      }
    });
  },
  sendRenewalPaymentReminder: async (toEmail, locals) => {
    await module.exports.sendMail({
      from: {
        email: process.env.FROM_EMAIL,
        name: process.env.FROM_NAME
      },
      to: toEmail,
      templateId: process.env.B2B_RENEW_PAYMENT,
      asm: {
        group_id: 104273
      },
      dynamic_template_data: { ...locals },
      subject: `Contract Renew Reminder - ${locals.name}`,
      substitutions: {
        '{{WEBAPP_URL}}': 'https://webapp.shoorah.io', // Your WEBAPP_URL
        '{{ADMN_URL}}': 'https://admin.shoorah.io', // Your ADMN_URL
        '{{APPLE_STORE_URL}}':
          'https://apps.apple.com/us/app/shoorah-mental-health-calm/id1669683359', // Your Apple Store URL
        '{{PLAY_STORE_URL}}': 'https://play.google.com/store/apps/details?id=com.shoorah' // Your Play Store URL
      },
      tracking_settings: {
        click_tracking: {
          enable: false // Enable click tracking for all URLs except those specified in substitutions
        }
      }
    });
  },
  sendTrialUpdatesReminder: async (toEmail, locals) => {
    await module.exports.sendMail({
      from: {
        email: process.env.FROM_EMAIL,
        name: process.env.FROM_NAME
      },
      to: toEmail,
      templateId: process.env.B2B_TRIAL_UPDATE,
      asm: {
        group_id: 104273
      },
      dynamic_template_data: { ...locals },
      subject: `Shoorah Trial Reminder - ${locals.name}`,
      substitutions: {
        '{{WEBAPP_URL}}': 'https://webapp.shoorah.io', // Your WEBAPP_URL
        '{{ADMN_URL}}': 'https://admin.shoorah.io', // Your ADMN_URL
        '{{APPLE_STORE_URL}}':
          'https://apps.apple.com/us/app/shoorah-mental-health-calm/id1669683359', // Your Apple Store URL
        '{{PLAY_STORE_URL}}': 'https://play.google.com/store/apps/details?id=com.shoorah' // Your Play Store URL
      },
      tracking_settings: {
        click_tracking: {
          enable: false // Enable click tracking for all URLs except those specified in substitutions
        }
      }
    });
  },
  sendTrialUpdateAdminReminder: async (toEmail, locals) => {
    await module.exports.sendMail({
      from: {
        email: process.env.FROM_EMAIL,
        name: process.env.FROM_NAME
      },
      to: toEmail,
      templateId: process.env.ADMIN_TRIAL_UPDATE,
      dynamic_template_data: { ...locals },
      asm: {
        group_id: 104273
      },
      subject: `Shoorah Trial Reminder - ${locals.name}`,
      substitutions: {
        '{{WEBAPP_URL}}': 'https://webapp.shoorah.io', // Your WEBAPP_URL
        '{{ADMN_URL}}': 'https://admin.shoorah.io', // Your ADMN_URL
        '{{APPLE_STORE_URL}}':
          'https://apps.apple.com/us/app/shoorah-mental-health-calm/id1669683359', // Your Apple Store URL
        '{{PLAY_STORE_URL}}': 'https://play.google.com/store/apps/details?id=com.shoorah' // Your Play Store URL
      },
      tracking_settings: {
        click_tracking: {
          enable: false // Enable click tracking for all URLs except those specified in substitutions
        }
      }
    });
  },
  sendReusableTemplate: async (toEmail, locals, subject) => {
    await module.exports.sendMail({
      from: {
        email: process.env.FROM_EMAIL,
        name: process.env.FROM_NAME
      },
      to: toEmail,
      templateId: process.env.REUSABLE_TEMPLATE,
      dynamic_template_data: { ...locals },
      asm: {
        group_id: 104273
      },
      subject: subject,
      substitutions: {
        '{{WEBAPP_URL}}': 'https://webapp.shoorah.io', // Your WEBAPP_URL
        '{{ADMN_URL}}': 'https://admin.shoorah.io', // Your ADMN_URL
        '{{APPLE_STORE_URL}}':
          'https://apps.apple.com/us/app/shoorah-mental-health-calm/id1669683359', // Your Apple Store URL
        '{{PLAY_STORE_URL}}': 'https://play.google.com/store/apps/details?id=com.shoorah' // Your Play Store URL
      },
      tracking_settings: {
        click_tracking: {
          enable: false // Enable click tracking for all URLs except those specified in substitutions
        }
      }
    });
  }
};
