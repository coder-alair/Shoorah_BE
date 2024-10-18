'use strict';

const {
  checkFileExists,
  startTranscription,
  checkTranscriptionStatus,
  deleteFile
} = require('@services/s3Services');
const { CONTENT_TYPE, CHECK_TRANSCRIPTION_STATUS_DELAY } = require('@services/Constant');
const { Breathwork, Meditation, ShoorahPods, Sound } = require('@models');

module.exports = {
  audioToSrtHandler: async (contentId, contentType, inputPath, fileName, outputPath) => {
    try {
      const audioFileExists = await checkFileExists(inputPath, fileName);

      if (audioFileExists) {
        await startTranscription(inputPath, fileName, outputPath);

        const jobName = fileName.split('.')[0];
        let jobStatus = 'IN_PROGRESS';
        while (jobStatus === 'IN_PROGRESS') {
          jobStatus = await checkTranscriptionStatus(jobName);
          if (!jobStatus || jobStatus === 'FAILED') {
            throw new Error('Transcription job failed');
          }
          if (jobStatus === 'COMPLETED') {
            break;
          }

          await new Promise((resolve) => setTimeout(resolve, CHECK_TRANSCRIPTION_STATUS_DELAY));
        }

        const transcriptFileName = jobName + '.json';
        const transcriptFileExists = await checkFileExists(outputPath, transcriptFileName);
        if (transcriptFileExists) {
          await deleteFile(outputPath, transcriptFileName);
        }

        const srtFileName = jobName + '.srt';
        const srtFileExists = await checkFileExists(outputPath, srtFileName);
        if (srtFileExists) {
          switch (contentType) {
            case CONTENT_TYPE.BREATHWORK:
              await Breathwork.findByIdAndUpdate(contentId, {
                is_srt_available: true,
                breathwork_srt: srtFileName
              });
              break;
            case CONTENT_TYPE.MEDITATION:
              await Meditation.findByIdAndUpdate(contentId, {
                is_srt_available: true,
                meditation_srt: srtFileName
              });
              break;
            case CONTENT_TYPE.SHOORAH_PODS:
              await ShoorahPods.findByIdAndUpdate(contentId, {
                is_srt_available: true,
                pods_srt: srtFileName
              });
              break;
            case CONTENT_TYPE.SOUND:
              await Sound.findByIdAndUpdate(contentId, {
                is_srt_available: true,
                sound_srt: srtFileName
              });
              break;
            default:
              break;
          }
        }
      }
    } catch (error) {
      console.log('Error in audioToSrtHandler: ', error);
    }
  }
};
