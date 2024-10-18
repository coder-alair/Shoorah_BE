'use strict';

const Response = require('@services/Response');
const moment = require('moment');
const { Sos } = require('@models');
const SOSCall = require('../../../models/SosCall');
const puppeteer = require('puppeteer');
const pug = require('pug');
const { NODE_ENVIRONMENT, MOOD_PDF_SIZE, RESPONSE_CODE, SUCCESS } = require('../../../services/Constant');
const BeforeSleep = require('../../../models/BeforeSleep');
const { calculatePercentage } = require('../../../services/Helper');
const AfterSleep = require('../../../models/AfterSleep');

module.exports = {
    getBeforeSleep: async (req, res) => {
        try {
            const aggregationCondition = [
                {
                    $match: {
                        deletedAt: null,
                    }
                },
                {
                    $facet: {
                        averageMoods: [
                            {
                                $group: {
                                    _id: '$user_id',
                                    anxious: {
                                        $avg: '$anxious'
                                    },
                                    calm: {
                                        $avg: '$calm'
                                    },
                                    sad: {
                                        $avg: '$sad'
                                    },
                                    happy: {
                                        $avg: '$happy'
                                    },
                                    noisy: {
                                        $avg: '$noisy'
                                    },
                                    quiet: {
                                        $avg: '$quiet'
                                    },
                                    cold: {
                                        $avg: '$cold'
                                    },
                                    warm: {
                                        $avg: '$warm'
                                    },
                                    agitated: {
                                        $avg: '$agitated'
                                    },
                                    peaceful: {
                                        $avg: '$peaceful'
                                    },
                                    uneasy: {
                                        $avg: '$uneasy'
                                    },
                                    settled: {
                                        $avg: '$settled'
                                    },
                                    worried: {
                                        $avg: '$worried'
                                    },
                                    atEase: {
                                        $avg: '$at_ease'
                                    },
                                    overwhelmed: {
                                        $avg: '$overwhelmed'
                                    },
                                    inControl: {
                                        $avg: '$in_control'
                                    }
                                }
                            }
                        ],
                        moodCount: [
                            {
                                $group: {
                                    _id: null,
                                    anxious: {
                                        $sum: {
                                            $cond: [
                                                {
                                                    $gt: ['$anxious', 0]
                                                },
                                                1,
                                                0
                                            ]
                                        }
                                    },
                                    calm: {
                                        $sum: {
                                            $cond: [
                                                {
                                                    $gt: ['$calm', 0]
                                                },
                                                1,
                                                0
                                            ]
                                        }
                                    },
                                    happy: {
                                        $sum: {
                                            $cond: [
                                                {
                                                    $gt: ['$happy', 0]
                                                },
                                                1,
                                                0
                                            ]
                                        }
                                    },
                                    sad: {
                                        $sum: {
                                            $cond: [
                                                {
                                                    $gt: ['$sad', 0]
                                                },
                                                1,
                                                0
                                            ]
                                        }
                                    },
                                    noisy: {
                                        $sum: {
                                            $cond: [
                                                {
                                                    $gt: ['$noisy', 0]
                                                },
                                                1,
                                                0
                                            ]
                                        }
                                    },
                                    quiet: {
                                        $sum: {
                                            $cond: [
                                                {
                                                    $gt: ['$quiet', 0]
                                                },
                                                1,
                                                0
                                            ]
                                        }
                                    },
                                    cold: {
                                        $sum: {
                                            $cond: [
                                                {
                                                    $gt: ['$cold', 0]
                                                },
                                                1,
                                                0
                                            ]
                                        }
                                    },
                                    warm: {
                                        $sum: {
                                            $cond: [
                                                {
                                                    $gt: ['$warm', 0]
                                                },
                                                1,
                                                0
                                            ]
                                        }
                                    },
                                    agitated: {
                                        $sum: {
                                            $cond: [
                                                {
                                                    $gt: ['$agitated', 0]
                                                },
                                                1,
                                                0
                                            ]
                                        }
                                    },
                                    peaceful: {
                                        $sum: {
                                            $cond: [
                                                {
                                                    $gt: ['$peaceful', 0]
                                                },
                                                1,
                                                0
                                            ]
                                        }
                                    },
                                    uneasy: {
                                        $sum: {
                                            $cond: [
                                                {
                                                    $gt: ['$uneasy', 0]
                                                },
                                                1,
                                                0
                                            ]
                                        }
                                    },
                                    settled: {
                                        $sum: {
                                            $cond: [
                                                {
                                                    $gt: ['$settled', 0]
                                                },
                                                1,
                                                0
                                            ]
                                        }
                                    },
                                    atEase: {
                                        $sum: {
                                            $cond: [
                                                {
                                                    $gt: ['$at_ease', 0]
                                                },
                                                1,
                                                0
                                            ]
                                        }
                                    },
                                    overwhelmed: {
                                        $sum: {
                                            $cond: [
                                                {
                                                    $gt: ['$overwhelmed', 0]
                                                },
                                                1,
                                                0
                                            ]
                                        }
                                    },
                                    inControl: {
                                        $sum: {
                                            $cond: [
                                                {
                                                    $gt: ['$in_control', 0]
                                                },
                                                1,
                                                0
                                            ]
                                        }
                                    },
                                    worried: {
                                        $sum: {
                                            $cond: [
                                                {
                                                    $gt: ['$worried', 0]
                                                },
                                                1,
                                                0
                                            ]
                                        }
                                    }
                                }
                            }
                        ]
                    }
                }
            ];
            const moodDetails = await BeforeSleep.aggregate(aggregationCondition);
            if (!moodDetails[0].averageMoods.length > 0) {
                return Response.errorResponseData(
                    res,
                    res.__('NoSleepDataFound'),
                    RESPONSE_CODE.NOT_FOUND
                );
            }
            const averageMoods = moodDetails[0].averageMoods[0];
            const positiveIndex =
                averageMoods.calm +
                averageMoods.happy +
                averageMoods.quiet +
                averageMoods.warm +
                averageMoods.peaceful +
                averageMoods.settled +
                averageMoods.atEase +
                averageMoods.inControl;

            const negativeIndex =
                averageMoods.anxious +
                averageMoods.sad +
                averageMoods.noisy +
                averageMoods.cold +
                averageMoods.agitated +
                averageMoods.uneasy +
                averageMoods.worried +
                averageMoods.overwhelmed;

            const totalIndexValue = positiveIndex + negativeIndex;
            const postivePercentage = calculatePercentage(positiveIndex, totalIndexValue);
            const negativePercentage = calculatePercentage(negativeIndex, totalIndexValue);

            let resObj = {
                positive: postivePercentage,
                negative: negativePercentage
            }
            return Response.successResponseData(res, resObj, SUCCESS, res.__('getSleepPercentSuccess'));

        } catch (err) {
            console.log(err)
            return Response.internalServerErrorResponse(res);
        }
    },

    getAfterSleep: async (req, res) => {
        try {
            const aggregationCondition = [
                {
                    $match: {
                        deletedAt: null,
                    }
                },
                {
                    $facet: {
                        averageMoods: [
                            {
                                $group: {
                                    _id: '$user_id',
                                    tossingTurning: {
                                        $avg: '$tossing_and_turning'
                                    },
                                    sleepSoundly: {
                                        $avg: '$sleep_soundly'
                                    },
                                    lightSleep: {
                                        $avg: '$light_sleep'
                                    },
                                    deepSleep: {
                                        $avg: '$deep_sleep'
                                    },
                                    nightmare: {
                                        $avg: '$nightmare'
                                    },
                                    lovelyDream: {
                                        $avg: '$lovely_dream'
                                    },
                                    restless: {
                                        $avg: '$restless'
                                    },
                                    still: {
                                        $avg: '$still'
                                    },
                                    sweaty: {
                                        $avg: '$sweaty'
                                    },
                                    cool: {
                                        $avg: '$cool'
                                    },
                                    sleepwalking: {
                                        $avg: '$sleepwalking'
                                    },
                                    stayingPut: {
                                        $avg: '$staying_put'
                                    },
                                    snoring: {
                                        $avg: '$snoring'
                                    },
                                    silent: {
                                        $avg: '$silent'
                                    },
                                    needMoreSleep: {
                                        $avg: '$need_more_sleep'
                                    },
                                    rested: {
                                        $avg: '$rested'
                                    },
                                    nocturnalEating: {
                                        $avg: '$nocturnal_eating'
                                    },
                                    noMidnightSnacks: {
                                        $avg: '$no_midnight_snacks'
                                    }
                                }
                            }
                        ],
                        moodCount: [
                            {
                                $group: {
                                    _id: null,
                                    tossingTurning: {
                                        $sum: {
                                            $cond: [
                                                {
                                                    $gt: ['$tossing_and_turning', 0]
                                                },
                                                1,
                                                0
                                            ]
                                        }
                                    },
                                    sleepSoundly: {
                                        $sum: {
                                            $cond: [
                                                {
                                                    $gt: ['$sleep_soundly', 0]
                                                },
                                                1,
                                                0
                                            ]
                                        }
                                    },
                                    lightSleep: {
                                        $sum: {
                                            $cond: [
                                                {
                                                    $gt: ['$light_sleep', 0]
                                                },
                                                1,
                                                0
                                            ]
                                        }
                                    },
                                    deepSleep: {
                                        $sum: {
                                            $cond: [
                                                {
                                                    $gt: ['$deep_sleep', 0]
                                                },
                                                1,
                                                0
                                            ]
                                        }
                                    },
                                    nightmare: {
                                        $sum: {
                                            $cond: [
                                                {
                                                    $gt: ['$nightmare', 0]
                                                },
                                                1,
                                                0
                                            ]
                                        }
                                    },
                                    lovelyDream: {
                                        $sum: {
                                            $cond: [
                                                {
                                                    $gt: ['$lovely_dream', 0]
                                                },
                                                1,
                                                0
                                            ]
                                        }
                                    },
                                    restless: {
                                        $sum: {
                                            $cond: [
                                                {
                                                    $gt: ['$restless', 0]
                                                },
                                                1,
                                                0
                                            ]
                                        }
                                    },
                                    still: {
                                        $sum: {
                                            $cond: [
                                                {
                                                    $gt: ['$still', 0]
                                                },
                                                1,
                                                0
                                            ]
                                        }
                                    },
                                    sweaty: {
                                        $sum: {
                                            $cond: [
                                                {
                                                    $gt: ['$sweaty', 0]
                                                },
                                                1,
                                                0
                                            ]
                                        }
                                    },
                                    cool: {
                                        $sum: {
                                            $cond: [
                                                {
                                                    $gt: ['$cool', 0]
                                                },
                                                1,
                                                0
                                            ]
                                        }
                                    },
                                    sleepwalking: {
                                        $sum: {
                                            $cond: [
                                                {
                                                    $gt: ['$sleepwalking', 0]
                                                },
                                                1,
                                                0
                                            ]
                                        }
                                    },
                                    stayingPut: {
                                        $sum: {
                                            $cond: [
                                                {
                                                    $gt: ['$staying_put', 0]
                                                },
                                                1,
                                                0
                                            ]
                                        }
                                    },
                                    snoring: {
                                        $sum: {
                                            $cond: [
                                                {
                                                    $gt: ['$snoring', 0]
                                                },
                                                1,
                                                0
                                            ]
                                        }
                                    },
                                    silent: {
                                        $sum: {
                                            $cond: [
                                                {
                                                    $gt: ['$silent', 0]
                                                },
                                                1,
                                                0
                                            ]
                                        }
                                    },
                                    needMoreSleep: {
                                        $sum: {
                                            $cond: [
                                                {
                                                    $gt: ['$need_more_sleep', 0]
                                                },
                                                1,
                                                0
                                            ]
                                        }
                                    },
                                    rested: {
                                        $sum: {
                                            $cond: [
                                                {
                                                    $gt: ['$rested', 0]
                                                },
                                                1,
                                                0
                                            ]
                                        }
                                    },
                                    nocturnalEating: {
                                        $sum: {
                                            $cond: [
                                                {
                                                    $gt: ['$nocturnal_eating', 0]
                                                },
                                                1,
                                                0
                                            ]
                                        }
                                    },
                                    noMidnightSnacks: {
                                        $sum: {
                                            $cond: [
                                                {
                                                    $gt: ['$no_midnight_snacks', 0]
                                                },
                                                1,
                                                0
                                            ]
                                        }
                                    }
                                }
                            }
                        ]
                    }
                }
            ];
            const moodDetails = await AfterSleep.aggregate(aggregationCondition);
            if (!moodDetails[0].averageMoods.length > 0) {
                return Response.errorResponseData(
                    res,
                    res.__('NoSleepDataFound'),
                    RESPONSE_CODE.NOT_FOUND
                );
            }
            const averageMoods = moodDetails[0].averageMoods[0];
            const positiveIndex =
                averageMoods.sleepSoundly +
                averageMoods.deepSleep +
                averageMoods.lovelyDream +
                averageMoods.still +
                averageMoods.cool +
                averageMoods.stayingPut +
                averageMoods.silent +
                averageMoods.noMidnightSnacks +
                averageMoods.rested;

            const negativeIndex =
                averageMoods.tossingTurning +
                averageMoods.lightSleep +
                averageMoods.nightmare +
                averageMoods.restless +
                averageMoods.sweaty +
                averageMoods.sleepwalking +
                averageMoods.snoring +
                averageMoods.nocturnalEating +
                averageMoods.needMoreSleep;

            const totalIndexValue = positiveIndex + negativeIndex;
            const postivePercentage = calculatePercentage(positiveIndex, totalIndexValue);
            const negativePercentage = calculatePercentage(negativeIndex, totalIndexValue);
          
            let resObj = {
                positive: postivePercentage,
                negative: negativePercentage
            }
            return Response.successResponseData(res, resObj, SUCCESS, res.__('getSleepPercentSuccess'));

        } catch (err) {
            return Response.internalServerErrorResponse(res);
        }
    },
};
