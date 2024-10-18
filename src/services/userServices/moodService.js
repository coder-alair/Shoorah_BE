'use strict';

const { averageValue, calculatePercentage } = require('@services/Helper');
const { MAX_VALUE_OF_MOOD } = require('../Constant');

module.exports = {
  moodChartCalculation: (array, dateRange) => {
    const moodData = [];
    let totalAnxious,
      totalCalm,
      totalNeedSupport,
      totalDemotivated,
      totalMotivated,
      totalLow,
      totalContent,
      totalAngry,
      totalHappy,
      totalICanManage,
      totalHelpless,
      totalIAmInControl,
      totalTired,
      totalStressed,
      totalBalanced,
      totalEnergised,
      totalSad,
      totalRelaxed,
      totalNotGood,
      totalGreat,
      anxiousCount,
      calmCount,
      needSupportCount,
      demotivatedCount,
      motivatedCount,
      lowCount,
      contentCount,
      angryCount,
      happyCount,
      iCanManageCount,
      helplessCount,
      iAmInControlCount,
      tiredCount,
      stressedCount,
      balancedCount,
      energisedCount,
      sadCount,
      notGoodCount,
      greatCount,
      relaxedCount;

    totalAnxious =
      totalCalm =
      totalNeedSupport =
      totalDemotivated =
      totalMotivated =
      totalLow =
      totalContent =
      totalAngry =
      totalHappy =
      totalICanManage =
      totalHelpless =
      totalIAmInControl =
      totalTired =
      totalStressed =
      totalBalanced =
      totalEnergised =
      totalSad =
      totalRelaxed =
      totalNotGood =
      totalGreat =
      anxiousCount =
      calmCount =
      needSupportCount =
      demotivatedCount =
      motivatedCount =
      lowCount =
      contentCount =
      angryCount =
      happyCount =
      iCanManageCount =
      helplessCount =
      iAmInControlCount =
      tiredCount =
      stressedCount =
      balancedCount =
      energisedCount =
      sadCount =
      relaxedCount =
      notGoodCount =
      greatCount =
      0;
    let index = 1;
    dateRange.forEach((date) => {
      const data = array.filter((x) => x._id.toString() === date.toString());
      totalAnxious += data[0]?.anxious || 0;
      totalCalm += data[0]?.calm || 0;
      totalNeedSupport += data[0]?.needSupport || 0;
      totalDemotivated += data[0]?.demotivated || 0;
      totalMotivated += data[0]?.motivated || 0;
      totalLow += data[0]?.low || 0;
      totalContent += data[0]?.content || 0;
      totalAngry += data[0]?.angry || 0;
      totalHappy += data[0]?.happy || 0;
      totalICanManage += data[0]?.iCanManage || 0;
      totalHelpless += data[0]?.helpless || 0;
      totalIAmInControl += data[0]?.iAmInControl || 0;
      totalTired += data[0]?.tired || 0;
      totalStressed += data[0]?.stressed || 0;
      totalBalanced += data[0]?.balanced || 0;
      totalEnergised += data[0]?.energised || 0;
      totalSad += data[0]?.sad || 0;
      totalRelaxed += data[0]?.relaxed || 0;
      totalNotGood += data[0]?.notGood || 0;
      totalGreat += data[0]?.great || 0;

      anxiousCount += data[0]?.anxiousCount || 0;
      calmCount += data[0]?.calmCount || 0;
      needSupportCount += data[0]?.needSupportCount || 0;
      demotivatedCount += data[0]?.demotivatedCount || 0;
      motivatedCount += data[0]?.motivatedCount || 0;
      lowCount += data[0]?.lowCount || 0;
      contentCount += data[0]?.contentCount || 0;
      angryCount += data[0]?.angryCount || 0;
      happyCount += data[0]?.happyCount || 0;
      iCanManageCount += data[0]?.iCanManageCount || 0;
      helplessCount += data[0]?.helplessCount || 0;
      iAmInControlCount += data[0]?.iAmInControlCount || 0;
      tiredCount += data[0]?.tiredCount || 0;
      stressedCount += data[0]?.stressedCount || 0;
      balancedCount += data[0]?.balancedCount || 0;
      energisedCount += data[0]?.energisedCount || 0;
      sadCount += data[0]?.sadCount || 0;
      relaxedCount += data[0]?.relaxedCount || 0;
      notGoodCount += data[0]?.notGoodCount || 0;
      greatCount += data[0]?.greatCount || 0;

      const tempObj = {
        interval: index,
        anxious: data[0]?.anxious || 0,
        calm: data[0]?.calm || 0,
        needSupport: data[0]?.needSupport || 0,
        demotivated: data[0]?.demotivated || 0,
        motivated: data[0]?.motivated || 0,
        low: data[0]?.low || 0,
        content: data[0]?.content || 0,
        angry: data[0]?.angry || 0,
        happy: data[0]?.happy || 0,
        iCanManage: data[0]?.iCanManage || 0,
        helpless: data[0]?.helpless || 0,
        iAmInControl: data[0]?.iAmInControl || 0,
        tired: data[0]?.tired || 0,
        stressed: data[0]?.stressed || 0,
        balanced: data[0]?.balanced || 0,
        energised: data[0]?.energised || 0,
        sad: data[0]?.sad || 0,
        relaxed: data[0]?.relaxed || 0,
        notGood: data[0]?.notGood || 0,
        great: data[0]?.great || 0
      };
      moodData.push(tempObj);
      index += 1;
    });
    const averageMoodValue = {
      anxious: averageValue(totalAnxious, index - 1, 2),
      calm: averageValue(totalCalm, index - 1, 2),
      needSupport: averageValue(totalNeedSupport, index - 1, 2),
      demotivated: averageValue(totalDemotivated, index - 1, 2),
      motivated: averageValue(totalMotivated, index - 1, 2),
      low: averageValue(totalLow, index - 1, 2),
      content: averageValue(totalContent, index - 1, 2),
      angry: averageValue(totalAngry, index - 1, 2),
      happy: averageValue(totalHappy, index - 1, 2),
      iCanManage: averageValue(totalICanManage, index - 1, 2),
      helpless: averageValue(totalHelpless, index - 1, 2),
      iAmInControl: averageValue(totalIAmInControl, index - 1, 2),
      tired: averageValue(totalTired, index - 1, 2),
      stressed: averageValue(totalStressed, index - 1, 2),
      balanced: averageValue(totalBalanced, index - 1, 2),
      energised: averageValue(totalEnergised, index - 1, 2),
      sad: averageValue(totalSad, index - 1, 2),
      relaxed: averageValue(totalRelaxed, index - 1, 2),
      notGood: averageValue(totalNotGood, index - 1, 2),
      great: averageValue(totalGreat, index - 1, 2)
    };
    const resData = {
      moodData,
      averageMoodPercentage: {
        demotivated: calculatePercentage(
          averageMoodValue.demotivated,
          averageMoodValue.demotivated + averageMoodValue.motivated
        ),
        motivated: calculatePercentage(
          averageMoodValue.motivated,
          averageMoodValue.demotivated + averageMoodValue.motivated
        ),
        low: calculatePercentage(
          averageMoodValue.low,
          averageMoodValue.low + averageMoodValue.content
        ),
        content: calculatePercentage(
          averageMoodValue.content,
          averageMoodValue.low + averageMoodValue.content
        ),
        sad: calculatePercentage(
          averageMoodValue.sad,
          averageMoodValue.sad + averageMoodValue.happy
        ),
        happy: calculatePercentage(
          averageMoodValue.happy,
          averageMoodValue.sad + averageMoodValue.happy
        ),
        needSupport: calculatePercentage(
          averageMoodValue.needSupport,
          averageMoodValue.needSupport + averageMoodValue.iCanManage
        ),
        iCanManage: calculatePercentage(
          averageMoodValue.iCanManage,
          averageMoodValue.needSupport + averageMoodValue.iCanManage
        ),
        helpless: calculatePercentage(
          averageMoodValue.helpless,
          averageMoodValue.helpless + averageMoodValue.iAmInControl
        ),
        iAmInControl: calculatePercentage(
          averageMoodValue.iAmInControl,
          averageMoodValue.helpless + averageMoodValue.iAmInControl
        ),
        tired: calculatePercentage(
          averageMoodValue.tired,
          averageMoodValue.tired + averageMoodValue.energised
        ),
        energised: calculatePercentage(
          averageMoodValue.energised,
          averageMoodValue.tired + averageMoodValue.energised
        ),
        angry: calculatePercentage(
          averageMoodValue.angry,
          averageMoodValue.angry + averageMoodValue.calm
        ),
        calm: calculatePercentage(
          averageMoodValue.calm,
          averageMoodValue.angry + averageMoodValue.calm
        ),
        anxious: calculatePercentage(
          averageMoodValue.anxious,
          averageMoodValue.anxious + averageMoodValue.relaxed
        ),
        relaxed: calculatePercentage(
          averageMoodValue.relaxed,
          averageMoodValue.anxious + averageMoodValue.relaxed
        ),
        stressed: calculatePercentage(
          averageMoodValue.stressed,
          averageMoodValue.stressed + averageMoodValue.balanced
        ),
        balanced: calculatePercentage(
          averageMoodValue.balanced,
          averageMoodValue.stressed + averageMoodValue.balanced
        ),
        notGood: calculatePercentage(
          averageMoodValue.notGood,
          averageMoodValue.notGood + averageMoodValue.great
        ),
        great: calculatePercentage(
          averageMoodValue.great,
          averageMoodValue.notGood + averageMoodValue.great
        )
      },
      moodCount: {
        anxious: anxiousCount,
        calm: calmCount,
        needSupport: needSupportCount,
        demotivated: demotivatedCount,
        motivated: motivatedCount,
        low: lowCount,
        content: contentCount,
        angry: angryCount,
        happy: happyCount,
        iCanManage: iCanManageCount,
        helpless: helplessCount,
        iAmInControl: iAmInControlCount,
        tired: tiredCount,
        stressed: stressedCount,
        balanced: balancedCount,
        energised: energisedCount,
        sad: sadCount,
        relaxed: relaxedCount,
        notGood: notGoodCount,
        great: greatCount
      }
    };
    return resData;
  },
  professionalMoodChartCalculation: (array, dateRange) => {
    const moodData = [];
    let totalDissatisfied,
      totalVerySatisfied,
      totalUnpleasant,
      totalPositive,
      totalOverwhelming,
      totalComfortable,
      totalPoor,
      totalSupportive,
      totalUnmanageable,
      totalManageable,
      totalLacking,
      totalExcellent,
      totalNegative,
      totalInclusive,
      totalUnsupported,
      totalHighlySupported,
      totalInsufficient,
      totalWellEquipped,
      totalInadequate,
      totalComprehensive,
      dissatisfiedCount,
      verySatisfiedCount,
      unpleasantCount,
      positiveCount,
      overwhelmingCount,
      comfortableCount,
      poorCount,
      supportiveCount,
      unmanageableCount,
      manageableCount,
      lackingCount,
      excellentCount,
      negativeCount,
      inclusiveCount,
      unsupportedCount,
      highlySupportedCount,
      insufficientCount,
      wellEquippedCount,
      inadequateCount,
      comprehensiveCount;

    totalDissatisfied =
      totalComfortable =
      totalComprehensive =
      totalManageable =
      totalExcellent =
      totalHighlySupported =
      totalInadequate =
      totalInclusive =
      totalInsufficient =
      totalLacking =
      totalNegative =
      totalOverwhelming =
      totalPoor =
      totalPositive =
      totalSupportive =
      totalUnmanageable =
      totalUnpleasant =
      totalUnsupported =
      totalVerySatisfied =
      totalWellEquipped =
      dissatisfiedCount =
      comfortableCount =
      comprehensiveCount =
      manageableCount =
      excellentCount =
      highlySupportedCount =
      inadequateCount =
      inclusiveCount =
      insufficientCount =
      lackingCount =
      negativeCount =
      overwhelmingCount =
      poorCount =
      positiveCount =
      supportiveCount =
      unmanageableCount =
      unpleasantCount =
      unsupportedCount =
      verySatisfiedCount =
      wellEquippedCount =
      0;
    let index = 1;
    dateRange.forEach((date) => {
      const data = array.filter((x) => x._id.toString() === date.toString());
      totalDissatisfied += data[0]?.dissatisfied || 0;
      totalComfortable += data[0]?.comfortable || 0;
      totalComprehensive += data[0]?.comprehensive || 0;
      totalManageable += data[0]?.manageable || 0;
      totalExcellent += data[0]?.excellent || 0;
      totalHighlySupported += data[0]?.highlySupported || 0;
      totalInadequate += data[0]?.inadequate || 0;
      totalInclusive += data[0]?.inclusive || 0;
      totalInsufficient += data[0]?.insufficient || 0;
      totalLacking += data[0]?.lacking || 0;
      totalNegative += data[0]?.negative || 0;
      totalOverwhelming += data[0]?.overwhelming || 0;
      totalPoor += data[0]?.poor || 0;
      totalPositive += data[0]?.positive || 0;
      totalSupportive += data[0]?.supportive || 0;
      totalUnmanageable += data[0]?.unmanageable || 0;
      totalUnpleasant += data[0]?.unpleasant || 0;
      totalUnsupported += data[0]?.unsupported || 0;
      totalVerySatisfied += data[0]?.verySatisfied || 0;
      totalWellEquipped += data[0]?.wellEquipped || 0;

      dissatisfiedCount += data[0]?.dissatisfiedCount || 0;
      comfortableCount += data[0]?.comfortableCount || 0;
      comprehensiveCount += data[0]?.comprehensiveCount || 0;
      manageableCount += data[0]?.manageableCount || 0;
      excellentCount += data[0]?.excellentCount || 0;
      highlySupportedCount += data[0]?.highlySupportedCount || 0;
      inadequateCount += data[0]?.inadequateCount || 0;
      inclusiveCount += data[0]?.inclusiveCount || 0;
      insufficientCount += data[0]?.insufficientCount || 0;
      lackingCount += data[0]?.lackingCount || 0;
      negativeCount += data[0]?.negativeCount || 0;
      overwhelmingCount += data[0]?.overwhelmingCount || 0;
      poorCount += data[0]?.poorCount || 0;
      positiveCount += data[0]?.positiveCount || 0;
      supportiveCount += data[0]?.supportiveCount || 0;
      unmanageableCount += data[0]?.unmanageableCount || 0;
      unpleasantCount += data[0]?.unpleasantCount || 0;
      unsupportedCount += data[0]?.unsupportedCount || 0;
      verySatisfiedCount += data[0]?.verySatisfiedCount || 0;
      wellEquippedCount += data[0]?.wellEquippedCount || 0;

      const tempObj = {
        interval: index,
        dissatisfied: data[0]?.dissatisfied || 0,
        comfortable: data[0]?.comfortable || 0,
        comprehensive: data[0]?.comprehensive || 0,
        manageable: data[0]?.manageable || 0,
        excellent: data[0]?.excellent || 0,
        highlySupported: data[0]?.highlySupported || 0,
        inadequate: data[0]?.inadequate || 0,
        inclusive: data[0]?.inclusive || 0,
        insufficient: data[0]?.insufficient || 0,
        lacking: data[0]?.lacking || 0,
        negative: data[0]?.negative || 0,
        overwhelming: data[0]?.overwhelming || 0,
        poor: data[0]?.poor || 0,
        positive: data[0]?.positive || 0,
        supportive: data[0]?.supportive || 0,
        unmanageable: data[0]?.unmanageable || 0,
        unpleasant: data[0]?.unpleasant || 0,
        unsupported: data[0]?.unsupported || 0,
        verySatisfied: data[0]?.verySatisfied || 0,
        wellEquipped: data[0]?.wellEquipped || 0
      };
      moodData.push(tempObj);
      index += 1;
    });
    const averageMoodValue = {
      dissatisfied: averageValue(totalDissatisfied, index - 1, 2),
      comfortable: averageValue(totalComfortable, index - 1, 2),
      comprehensive: averageValue(totalComprehensive, index - 1, 2),
      manageable: averageValue(totalManageable, index - 1, 2),
      excellent: averageValue(totalExcellent, index - 1, 2),
      highlySupported: averageValue(totalHighlySupported, index - 1, 2),
      inadequate: averageValue(totalInadequate, index - 1, 2),
      inclusive: averageValue(totalInclusive, index - 1, 2),
      insufficient: averageValue(totalInsufficient, index - 1, 2),
      lacking: averageValue(totalLacking, index - 1, 2),
      negative: averageValue(totalNegative, index - 1, 2),
      overwhelming: averageValue(totalOverwhelming, index - 1, 2),
      poor: averageValue(totalPoor, index - 1, 2),
      positive: averageValue(totalPositive, index - 1, 2),
      supportive: averageValue(totalSupportive, index - 1, 2),
      unmanageable: averageValue(totalUnmanageable, index - 1, 2),
      unpleasant: averageValue(totalUnpleasant, index - 1, 2),
      unsupported: averageValue(totalUnsupported, index - 1, 2),
      verySatisfied: averageValue(totalVerySatisfied, index - 1, 2),
      wellEquipped: averageValue(totalWellEquipped, index - 1, 2)
    };
    const resData = {
      moodData,
      averageMoodPercentage: {
        dissatisfied: calculatePercentage(
          averageMoodValue.dissatisfied,
          averageMoodValue.dissatisfied + averageMoodValue.verySatisfied
        ),
        verySatisfied: calculatePercentage(
          averageMoodValue.verySatisfied,
          averageMoodValue.dissatisfied + averageMoodValue.verySatisfied
        ),
        unpleasant: calculatePercentage(
          averageMoodValue.unpleasant,
          averageMoodValue.unpleasant + averageMoodValue.positive
        ),
        positive: calculatePercentage(
          averageMoodValue.positive,
          averageMoodValue.unpleasant + averageMoodValue.positive
        ),
        overwhelming: calculatePercentage(
          averageMoodValue.overwhelming,
          averageMoodValue.overwhelming + averageMoodValue.comfortable
        ),
        comfortable: calculatePercentage(
          averageMoodValue.comfortable,
          averageMoodValue.overwhelming + averageMoodValue.comfortable
        ),
        poor: calculatePercentage(
          averageMoodValue.poor,
          averageMoodValue.poor + averageMoodValue.supportive
        ),
        supportive: calculatePercentage(
          averageMoodValue.supportive,
          averageMoodValue.poor + averageMoodValue.supportive
        ),
        unmanageable: calculatePercentage(
          averageMoodValue.unmanageable,
          averageMoodValue.unmanageable + averageMoodValue.manageable
        ),
        manageable: calculatePercentage(
          averageMoodValue.manageable,
          averageMoodValue.unmanageable + averageMoodValue.manageable
        ),
        lacking: calculatePercentage(
          averageMoodValue.lacking,
          averageMoodValue.lacking + averageMoodValue.excellent
        ),
        excellent: calculatePercentage(
          averageMoodValue.excellent,
          averageMoodValue.lacking + averageMoodValue.excellent
        ),
        negative: calculatePercentage(
          averageMoodValue.negative,
          averageMoodValue.negative + averageMoodValue.inclusive
        ),
        inclusive: calculatePercentage(
          averageMoodValue.inclusive,
          averageMoodValue.negative + averageMoodValue.inclusive
        ),
        unsupported: calculatePercentage(
          averageMoodValue.unsupported,
          averageMoodValue.unsupported + averageMoodValue.highlySupported
        ),
        highlySupported: calculatePercentage(
          averageMoodValue.highlySupported,
          averageMoodValue.unsupported + averageMoodValue.highlySupported
        ),
        insufficient: calculatePercentage(
          averageMoodValue.insufficient,
          averageMoodValue.insufficient + averageMoodValue.wellEquipped
        ),
        wellEquipped: calculatePercentage(
          averageMoodValue.wellEquipped,
          averageMoodValue.insufficient + averageMoodValue.wellEquipped
        ),
        inadequate: calculatePercentage(
          averageMoodValue.inadequate,
          averageMoodValue.inadequate + averageMoodValue.comprehensive
        ),
        comprehensive: calculatePercentage(
          averageMoodValue.comprehensive,
          averageMoodValue.inadequate + averageMoodValue.comprehensive
        )
      },
      moodCount: {
        dissatisfied: dissatisfiedCount,
        verySatisfied: verySatisfiedCount,
        unpleasant: unpleasantCount,
        positive: positiveCount,
        overwhelming: overwhelmingCount,
        comfortable: comfortableCount,
        poor: poorCount,
        supportive: supportiveCount,
        unmanageable: unmanageableCount,
        manageable: manageableCount,
        lacking: lackingCount,
        excellent: excellentCount,
        negative: negativeCount,
        inclusive: inclusiveCount,
        unsupported: unsupportedCount,
        highlySupported: highlySupportedCount,
        insufficient: insufficientCount,
        wellEquipped: wellEquippedCount,
        inadequate: inadequateCount,
        comprehensive: comprehensiveCount
      }
    };
    return resData;
  },
  emotionChartCalculation: (array, dateRange) => {
    const emotionData = [];
    let happyCount,
      sadCount,
      overjoyedCount,
      neutralCount,
      depressedCount;


    happyCount =
      sadCount =
      overjoyedCount =
      neutralCount =
      depressedCount =
      0;
    let index = 1;
    dateRange.forEach((date) => {
      const data = array.filter((x) => x._id.toString() === date.toString());

      happyCount += data[0]?.happyCount || 0;
      sadCount += data[0]?.sadCount || 0;
      overjoyedCount += data[0]?.overjoyedCount || 0;
      neutralCount += data[0]?.neutralCount || 0;
      depressedCount += data[0]?.depressedCount || 0;

      const tempObj = {
        interval: index,
        happyCount: data[0]?.happyCount || 0,
        sadCount: data[0]?.sadCount || 0,
        overjoyedCount: data[0]?.overjoyedCount || 0,
        neutralCount: data[0]?.neutralCount || 0,
        depressedCount: data[0]?.depressedCount || 0,
      };
      emotionData.push(tempObj);
      index += 1;
    });
    const resData = {
      emotionData,
      emotionCount: {
        happyCount: happyCount,
        sadCount: sadCount,
        overjoyedCount: overjoyedCount,
        neutralCount: neutralCount,
        depressedCount: depressedCount,
      }
    };
    return resData;
  },
};
