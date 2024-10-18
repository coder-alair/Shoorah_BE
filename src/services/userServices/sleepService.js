'use strict';

const { averageValue, calculatePercentage } = require('@services/Helper');
const { MAX_VALUE_OF_MOOD } = require('../Constant');

module.exports = {
  beforeSleepChartCalculation: (array, dateRange) => {
    const moodData = [];
    let totalAnxious,
      totalCalm,
      totalHappy,
      totalSad,
      totalNoisy,
      totalQuiet,
      totalAgitated,
      totalPeaceful,
      totalUneasy,
      totalSettled,
      totalCold,
      totalWarm,
      totalWorried,
      totalAtEase,
      totalOverwhelmed,
      totalInControl,
      anxiousCount,
      calmCount,
      happyCount,
      sadCount,
      coldCount,
      warmCount,
      agitatedCount,
      peacefulCount,
      uneasyCount,
      settledCount,
      worriedCount,
      atEaseCount,
      overwhelmedCount,
      inControlCount,
      noisyCount,
      quietCount;

    totalAnxious =
      totalCalm =
      totalHappy =
      totalSad =
      totalNoisy =
      totalQuiet =
      totalAgitated =
      totalPeaceful =
      totalUneasy =
      totalSettled =
      totalCold =
      totalWarm =
      totalWorried =
      totalAtEase =
      totalOverwhelmed =
      totalInControl =
      anxiousCount =
      calmCount =
      happyCount =
      sadCount =
      coldCount =
      warmCount =
      agitatedCount =
      peacefulCount =
      uneasyCount =
      settledCount =
      worriedCount =
      atEaseCount =
      overwhelmedCount =
      inControlCount =
      noisyCount =
      quietCount =
        0;

    let index = 1;
    dateRange.forEach((date) => {
      const data = array.filter((x) => x._id.toString() === date.toString());
      totalAnxious += data[0]?.anxious || 0;
      totalCalm += data[0]?.calm || 0;
      totalCold += data[0]?.cold || 0;
      totalWarm += data[0]?.warm || 0;
      totalNoisy += data[0]?.noisy || 0;
      totalQuiet += data[0]?.quiet || 0;
      totalAgitated += data[0]?.agitated || 0;
      totalPeaceful += data[0]?.peaceful || 0;
      totalUneasy += data[0]?.uneasy || 0;
      totalSettled += data[0]?.settled || 0;
      totalWorried += data[0]?.worried || 0;
      totalAtEase += data[0]?.atEase || 0;
      totalOverwhelmed += data[0]?.overwhelmed || 0;
      totalInControl += data[0]?.inControl || 0;
      totalHappy += data[0]?.happy || 0;
      totalSad += data[0]?.sad || 0;

      anxiousCount += data[0]?.anxiousCount || 0;
      calmCount += data[0]?.calmCount || 0;
      coldCount += data[0]?.coldCount || 0;
      warmCount += data[0]?.warmCount || 0;
      noisyCount += data[0]?.noisyCount || 0;
      quietCount += data[0]?.quietCount || 0;
      happyCount += data[0]?.happyCount || 0;
      sadCount += data[0]?.sadCount || 0;
      uneasyCount += data[0]?.uneasyCount || 0;
      settledCount += data[0]?.settledCount || 0;
      agitatedCount += data[0]?.agitatedCount || 0;
      peacefulCount += data[0]?.peacefulCount || 0;
      overwhelmedCount += data[0]?.overwhelmedCount || 0;
      worriedCount += data[0]?.worriedCount || 0;
      atEaseCount += data[0]?.atEaseCount || 0;
      inControlCount += data[0]?.inControlCount || 0;

      const tempObj = {
        interval: index,
        anxious: data[0]?.anxious || 0,
        calm: data[0]?.calm || 0,
        cold: data[0]?.cold || 0,
        warm: data[0]?.warm || 0,
        happy: data[0]?.happy || 0,
        sad: data[0]?.sad || 0,
        agitated: data[0]?.agitated || 0,
        peaceful: data[0]?.peaceful || 0,
        uneasy: data[0]?.uneasy || 0,
        settled: data[0]?.settled || 0,
        overwhelmed: data[0]?.overwhelmed || 0,
        inControl: data[0]?.inControl || 0,
        atEase: data[0]?.atEase || 0,
        worried: data[0]?.worried || 0,
        noisy: data[0]?.noisy || 0,
        quiet: data[0]?.quiet || 0
      };
      moodData.push(tempObj);
      index += 1;
    });
    const averageMoodValue = {
      anxious: averageValue(totalAnxious, index - 1, 2),
      calm: averageValue(totalCalm, index - 1, 2),
      cold: averageValue(totalCold, index - 1, 2),
      warm: averageValue(totalWarm, index - 1, 2),
      noisy: averageValue(totalNoisy, index - 1, 2),
      quiet: averageValue(totalQuiet, index - 1, 2),
      agitated: averageValue(totalAgitated, index - 1, 2),
      peaceful: averageValue(totalPeaceful, index - 1, 2),
      uneasy: averageValue(totalUneasy, index - 1, 2),
      settled: averageValue(totalSettled, index - 1, 2),
      atEase: averageValue(totalAtEase, index - 1, 2),
      worried: averageValue(totalWorried, index - 1, 2),
      overwhelmed: averageValue(totalOverwhelmed, index - 1, 2),
      inControl: averageValue(totalInControl, index - 1, 2),
      happy: averageValue(totalHappy, index - 1, 2),
      sad: averageValue(totalSad, index - 1, 2)
    };
    const resData = {
      sleepData: moodData,
      averageSleepPercentage: {
        anxious: calculatePercentage(
          averageMoodValue.anxious,
          averageMoodValue.anxious + averageMoodValue.calm
        ),
        calm: calculatePercentage(
          averageMoodValue.calm,
          averageMoodValue.anxious + averageMoodValue.calm
        ),
        happy: calculatePercentage(
          averageMoodValue.happy,
          averageMoodValue.happy + averageMoodValue.sad
        ),
        sad: calculatePercentage(
          averageMoodValue.sad,
          averageMoodValue.happy + averageMoodValue.sad
        ),
        quiet: calculatePercentage(
          averageMoodValue.quiet,
          averageMoodValue.quiet + averageMoodValue.noisy
        ),
        noisy: calculatePercentage(
          averageMoodValue.noisy,
          averageMoodValue.quiet + averageMoodValue.noisy
        ),
        cold: calculatePercentage(
          averageMoodValue.cold,
          averageMoodValue.cold + averageMoodValue.warm
        ),
        warm: calculatePercentage(
          averageMoodValue.warm,
          averageMoodValue.cold + averageMoodValue.warm
        ),
        agitated: calculatePercentage(
          averageMoodValue.agitated,
          averageMoodValue.agitated + averageMoodValue.peaceful
        ),
        peaceful: calculatePercentage(
          averageMoodValue.peaceful,
          averageMoodValue.agitated + averageMoodValue.peaceful
        ),
        uneasy: calculatePercentage(
          averageMoodValue.uneasy,
          averageMoodValue.uneasy + averageMoodValue.settled
        ),
        settled: calculatePercentage(
          averageMoodValue.settled,
          averageMoodValue.uneasy + averageMoodValue.settled
        ),
        worried: calculatePercentage(
          averageMoodValue.worried,
          averageMoodValue.worried + averageMoodValue.atEase
        ),
        atEase: calculatePercentage(
          averageMoodValue.atEase,
          averageMoodValue.worried + averageMoodValue.atEase
        ),
        overwhelmed: calculatePercentage(
          averageMoodValue.overwhelmed,
          averageMoodValue.overwhelmed + averageMoodValue.inControl
        ),
        inControl: calculatePercentage(
          averageMoodValue.inControl,
          averageMoodValue.overwhelmed + averageMoodValue.inControl
        )
      },
      sleepCount: {
        anxious: anxiousCount,
        calm: calmCount,
        cold: coldCount,
        warm: warmCount,
        happy: happyCount,
        sad: sadCount,
        noisy: noisyCount,
        quiet: quietCount,
        agitated: agitatedCount,
        peaceful: peacefulCount,
        uneasy: uneasyCount,
        settled: settledCount,
        worried: worriedCount,
        atEase: atEaseCount,
        overwhelmed: overwhelmedCount,
        inControl: inControlCount
      }
    };
    return resData;
  },
  afterSleepChartCalculation: (array, dateRange) => {
    const moodData = [];
    let totalTossingTurning,
      totalSleepSoundly,
      totalLightSleep,
      totalDeepSleep,
      totalNightmare,
      totalLovelyDream,
      totalRestless,
      totalStill,
      totalSweaty,
      totalCool,
      totalSleepwalking,
      totalStayingPut,
      totalSnoring,
      totalSilent,
      totalNeedMoreSleep,
      totalRested,
      totalNocturnalEating,
      totalNoMidnightSnacks,
      tossingTurningCount,
      sleepingSoundlyCount,
      lightSleepCount,
      deepSleepCount,
      nightmareCount,
      lovelyDreamCount,
      restlessCount,
      stillCount,
      sweatyCount,
      coolCount,
      sleepwalkingCount,
      stayingPutCount,
      snoringCount,
      silentCount,
      needMoreSleepCount,
      nocturnalEatingCount,
      noMidnightSnacksCount,
      restedCount;

    totalTossingTurning =
      totalSleepSoundly =
      totalLightSleep =
      totalDeepSleep =
      totalNightmare =
      totalLovelyDream =
      totalRestless =
      totalStill =
      totalSweaty =
      totalCool =
      totalSleepwalking =
      totalStayingPut =
      totalSnoring =
      totalSilent =
      totalNeedMoreSleep =
      totalRested =
      totalNocturnalEating =
      totalNoMidnightSnacks =
      tossingTurningCount =
      sleepingSoundlyCount =
      lightSleepCount =
      deepSleepCount =
      nightmareCount =
      lovelyDreamCount =
      restlessCount =
      stillCount =
      sweatyCount =
      coolCount =
      sleepwalkingCount =
      stayingPutCount =
      snoringCount =
      silentCount =
      needMoreSleepCount =
      nocturnalEatingCount =
      noMidnightSnacksCount =
      restedCount =
        0;

    let index = 1;
    dateRange.forEach((date) => {
      const data = array.filter((x) => x._id.toString() === date.toString());
      totalTossingTurning += data[0]?.tossingTurning || 0;
      totalSleepSoundly += data[0]?.sleepingSoundly || 0;
      totalCool += data[0]?.cool || 0;
      totalDeepSleep += data[0]?.deepSleep || 0;
      totalLightSleep += data[0]?.lightSleep || 0;
      totalNightmare += data[0]?.nightmare || 0;
      totalLovelyDream += data[0]?.lovelyDream || 0;
      totalRestless += data[0]?.restless || 0;
      totalStill += data[0]?.still || 0;
      totalSweaty += data[0]?.sweaty || 0;
      totalSleepwalking += data[0]?.sleepwalking || 0;
      totalStayingPut += data[0]?.stayingPut || 0;
      totalSnoring += data[0]?.snoring || 0;
      totalSilent += data[0]?.silent || 0;
      totalNeedMoreSleep += data[0]?.needMoreSleep || 0;
      totalRested += data[0]?.rested || 0;
      totalNocturnalEating += data[0]?.nocturnalEating || 0;
      totalNoMidnightSnacks += data[0]?.noMidnightSnacks || 0;

      tossingTurningCount += data[0]?.tossingTurningCount || 0;
      sleepingSoundlyCount += data[0]?.sleepingSoundlyCount || 0;
      nightmareCount += data[0]?.nightmareCount || 0;
      lightSleepCount += data[0]?.lightSleepCount || 0;
      deepSleepCount += data[0]?.deepSleepCount || 0;
      lovelyDreamCount += data[0]?.lovelyDreamCount || 0;
      restlessCount += data[0]?.restlessCount || 0;
      stillCount += data[0]?.stillCount || 0;
      sweatyCount += data[0]?.sweatyCount || 0;
      coolCount += data[0]?.coolCount || 0;
      sleepwalkingCount += data[0]?.sleepwalkingCount || 0;
      stayingPutCount += data[0]?.stayingPutCount || 0;
      snoringCount += data[0]?.snoringCount || 0;
      silentCount += data[0]?.silentCount || 0;
      needMoreSleepCount += data[0]?.needMoreSleepCount || 0;
      restedCount += data[0]?.restedCount || 0;
      nocturnalEatingCount += data[0]?.nocturnalEatingCount || 0;
      noMidnightSnacksCount += data[0]?.noMidnightSnacksCount || 0;

      const tempObj = {
        interval: index,
        tossingTurning: data[0]?.tossingTurning || 0,
        sleepingSoundly: data[0]?.sleepingSoundly || 0,
        nightmare: data[0]?.nightmare || 0,
        deepSleep: data[0]?.deepSleep || 0,
        lightSleep: data[0]?.lightSleep || 0,
        lovelyDream: data[0]?.lovelyDream || 0,
        restless: data[0]?.restless || 0,
        still: data[0]?.still || 0,
        sweaty: data[0]?.sweaty || 0,
        cool: data[0]?.cool || 0,
        sleepwalking: data[0]?.sleepwalking || 0,
        stayingPut: data[0]?.stayingPut || 0,
        needMoreSleep: data[0]?.needMoreSleep || 0,
        rested: data[0]?.rested || 0,
        nocturnalEating: data[0]?.nocturnalEating || 0,
        noMidnightSnacks: data[0]?.noMidnightSnacks || 0,
        snoring: data[0]?.snoring || 0,
        silent: data[0]?.silent || 0
      };
      moodData.push(tempObj);
      index += 1;
    });
    const averageMoodValue = {
      tossingTurning: averageValue(totalTossingTurning, index - 1, 2),
      sleepingSoundly: averageValue(totalSleepSoundly, index - 1, 2),
      lightSleep: averageValue(totalLightSleep, index - 1, 2),
      deepSleep: averageValue(totalDeepSleep, index - 1, 2),
      nightmare: averageValue(totalNightmare, index - 1, 2),
      lovelyDream: averageValue(totalLovelyDream, index - 1, 2),
      restless: averageValue(totalRestless, index - 1, 2),
      still: averageValue(totalStill, index - 1, 2),
      sweaty: averageValue(totalSweaty, index - 1, 2),
      cool: averageValue(totalCool, index - 1, 2),
      sleepwalking: averageValue(totalSleepwalking, index - 1, 2),
      stayingPut: averageValue(totalStayingPut, index - 1, 2),
      snoring: averageValue(totalSnoring, index - 1, 2),
      silent: averageValue(totalSilent, index - 1, 2),
      needMoreSleep: averageValue(totalNeedMoreSleep, index - 1, 2),
      rested: averageValue(totalRested, index - 1, 2),
      nocturnalEating: averageValue(totalNocturnalEating, index - 1, 2),
      noMidnightSnacks: averageValue(totalNoMidnightSnacks, index - 1, 2)
    };
    const resData = {
      sleepData: moodData,
      averageSleepPercentage: {
        tossingTurning: calculatePercentage(
          averageMoodValue.tossingTurning,
          averageMoodValue.tossingTurning + averageMoodValue.sleepSoundly
        ),
        sleepSoundly: calculatePercentage(
          averageMoodValue.sleepSoundly,
          averageMoodValue.tossingTurning + averageMoodValue.sleepSoundly
        ),
        lightSleep: calculatePercentage(
          averageMoodValue.lightSleep,
          averageMoodValue.lightSleep + averageMoodValue.deepSleep
        ),
        deepSleep: calculatePercentage(
          averageMoodValue.deepSleep,
          averageMoodValue.lightSleep + averageMoodValue.deepSleep
        ),
        nightmare: calculatePercentage(
          averageMoodValue.nightmare,
          averageMoodValue.nightmare + averageMoodValue.lovelyDream
        ),
        lovelyDream: calculatePercentage(
          averageMoodValue.lovelyDream,
          averageMoodValue.nightmare + averageMoodValue.lovelyDream
        ),
        restless: calculatePercentage(
          averageMoodValue.restless,
          averageMoodValue.restless + averageMoodValue.still
        ),
        still: calculatePercentage(
          averageMoodValue.still,
          averageMoodValue.restless + averageMoodValue.still
        ),
        sweaty: calculatePercentage(
          averageMoodValue.sweaty,
          averageMoodValue.sweaty + averageMoodValue.cool
        ),
        cool: calculatePercentage(
          averageMoodValue.cool,
          averageMoodValue.sweaty + averageMoodValue.cool
        ),
        sleepwalking: calculatePercentage(
          averageMoodValue.sleepwalking,
          averageMoodValue.sleepwalking + averageMoodValue.stayingPut
        ),
        stayingPut: calculatePercentage(
          averageMoodValue.stayingPut,
          averageMoodValue.sleepwalking + averageMoodValue.stayingPut
        ),
        snoring: calculatePercentage(
          averageMoodValue.snoring,
          averageMoodValue.snoring + averageMoodValue.silent
        ),
        silent: calculatePercentage(
          averageMoodValue.silent,
          averageMoodValue.snoring + averageMoodValue.silent
        ),
        rested: calculatePercentage(
          averageMoodValue.rested,
          averageMoodValue.rested + averageMoodValue.needMoreSleep
        ),
        needMoreSleep: calculatePercentage(
          averageMoodValue.needMoreSleep,
          averageMoodValue.rested + averageMoodValue.needMoreSleep
        ),
        nocturnalEating: calculatePercentage(
          averageMoodValue.nocturnalEating,
          averageMoodValue.nocturnalEating + averageMoodValue.noMidnightSnacks
        ),
        noMidnightSnacks: calculatePercentage(
          averageMoodValue.noMidnightSnacks,
          averageMoodValue.nocturnalEating + averageMoodValue.noMidnightSnacks
        )
      },
      sleepCount: {
        tossingTurning: tossingTurningCount,
        sleepingSoundly: sleepingSoundlyCount,
        nightmare: nightmareCount,
        lovelyDream: lovelyDreamCount,
        lightSleep: lightSleepCount,
        deepSleep: deepSleepCount,
        restless: restlessCount,
        still: stillCount,
        sweaty: sweatyCount,
        cool: coolCount,
        sleepwalking: sleepwalkingCount,
        stayingPut: stayingPutCount,
        snoring: snoringCount,
        silent: silentCount,
        needMoreSleep: needMoreSleepCount,
        rested: restedCount,
        nocturnalEating: nocturnalEatingCount,
        noMidnightSnacks: noMidnightSnacksCount
      }
    };
    return resData;
  }
};
