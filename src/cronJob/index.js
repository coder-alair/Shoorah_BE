try {
  require('./AffirmationCrons');
  require('./ContractCron');
  require('./GoalsCron');
  require('./GratitudeCron');
  require('./MeditationCron');
  require('./MoodsCron');
  require('./reminderCrons');
  require('./RitualsCron');
  require('./ShuruCron');
  require('./BreathworkCrons');


  console.log('Cron Jobs Loaded successfully');
} catch (error) {
  console.log('Error loading cron jobs', error);
}
