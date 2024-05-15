const ffmpeg = require("fluent-ffmpeg");
const path = require("path");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const ffprobePath = require("@ffprobe-installer/ffprobe").path;
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);
const fsp = require('fs').promises;

async function generateVideo(generatedFiles, topicId) {
  try {
    const videoPaths = await createVideoWithGeneratedFiles(generatedFiles, topicId);
    console.log('...........................................................................................................................')
    await addSubtitlesToVideos(generatedFiles,topicId);
  } catch (error) {
    console.error(`Error generating video: ${error.message}`);
  }
}

function calculateLoopDuration(audioDuration) {
  return Math.ceil(audioDuration);
}

async function createVideoWithGeneratedFiles(generatedFiles, topicId) {
  if (!generatedFiles || generatedFiles.length === 0) {
    throw new Error("No generated files provided or empty array.");
  }
  const folderPath = path.join(__dirname,  "tempFolder");
  const videoPaths = [];

  try {
    for (let i = 0; i < generatedFiles.length; i++) {
      const dataset = generatedFiles[i];
      const imageToVideo = path.join(folderPath, `videoImage_${topicId}_${i + 1}.mp4`);
      const images = [{
        path: path.join(folderPath, dataset.image),
        loop: calculateLoopDuration(dataset.duration),
      }];
      const audioPath = path.join(folderPath, dataset.audio);
      const subtitlePath = path.join(folderPath, dataset.captions);
      console.log(images)
      console.log('...................')
      console.log('audioPath', audioPath)
      console.log('...................')
      console.log(subtitlePath)

      await new Promise((resolve, reject) => {
        ffmpeg()
          .input(images[0].path)
          .loop(images[0].loop)
          .input(audioPath)
          .outputOptions('-c:v libx264')
          .outputOptions('-c:a aac')
          .outputOptions('-shortest')
          .save(imageToVideo)
          .on('end', () => {
            console.log(`Video created: ${imageToVideo}`);
            videoPaths.push(imageToVideo);
            resolve();
          })
          .on('error', (err) => {
            console.error(`Error creating video: ${err.message}`);
            reject(err);
          });
      });
    }

    return videoPaths;
  } catch (error) {
    console.error("Error creating videos:", error);
    throw new Error(`Error creating videos for topicId ${topicId}: ${error.message}`);
  }
}

async function addSubtitlesToVideos(generatedFiles, topicId) {
  if (!generatedFiles || generatedFiles.length === 0) {
    throw new Error("No generated files provided or empty array.");
  }
  const folderPath = path.join(__dirname,  "tempFolder");

  try {
    for (let i = 0; i < generatedFiles.length; i++) {
      const subtitlePath = path.join(folderPath, generatedFiles[i].captions);
      const videoWithSubtitlePath = path.join(folderPath, `videoSub_${topicId}_${i + 1}.mp4`);
      const imageToVideo = path.join(folderPath, `videoImage_${topicId}_${i + 1}.mp4`);
      
      console.log(`Adding subtitles: ${subtitlePath} to video: ${imageToVideo}`);
 
      await new Promise((resolve, reject) => {
        ffmpeg(imageToVideo)
          .outputOptions('-vf', `subtitles=${subtitlePath.replace(/\\/g, '\\\\').replace(/:/g, '\\:')}`)
          .save(videoWithSubtitlePath)
          .on('end', () => {
            console.log(`Subtitles added: ${videoWithSubtitlePath}`);
            resolve();
          })
          .on('error', (err) => {
            console.error(`Error adding subtitles: ${err.message}`);
            reject(err);
          });
      });
    }
  } catch (error) {
    console.error("Error adding subtitles to videos:", error);
    throw new Error(`Error adding subtitles for topicId ${topicId}: ${error.message}`);
  }
}

const generatedFiles = [
  {
    audio: 'output_38ead003-70a7-490e-bc1c-b1f79a1fe9d3_0.mp3',
    captions: 'output_38ead003-70a7-490e-bc1c-b1f79a1fe9d3_0.srt',
    image: 'image_38ead003-70a7-490e-bc1c-b1f79a1fe9d3_1.jpg',
    duration: 10.292188
  },
  {
    audio: 'output_38ead003-70a7-490e-bc1c-b1f79a1fe9d3_1.mp3',
    captions: 'output_38ead003-70a7-490e-bc1c-b1f79a1fe9d3_1.srt',
    image: 'image_38ead003-70a7-490e-bc1c-b1f79a1fe9d3_2.jpg',
    duration: 7.183625
  },
  {
    audio: 'output_38ead003-70a7-490e-bc1c-b1f79a1fe9d3_2.mp3',
    captions: 'output_38ead003-70a7-490e-bc1c-b1f79a1fe9d3_2.srt',
    image: 'image_38ead003-70a7-490e-bc1c-b1f79a1fe9d3_3.jpg',
    duration: 4.179563
  },
  {
    audio: 'output_38ead003-70a7-490e-bc1c-b1f79a1fe9d3_3.mp3',
    captions: 'output_38ead003-70a7-490e-bc1c-b1f79a1fe9d3_3.srt',
    image: 'image_38ead003-70a7-490e-bc1c-b1f79a1fe9d3_4.jpg',
    duration: 5.746938
  },
  {
    audio: 'output_38ead003-70a7-490e-bc1c-b1f79a1fe9d3_4.mp3',
    captions: 'output_38ead003-70a7-490e-bc1c-b1f79a1fe9d3_4.srt',
    image: 'image_38ead003-70a7-490e-bc1c-b1f79a1fe9d3_5.jpg',
    duration: 3.422
  }
];

const topicId = '38ead003-70a7-490e-bc1c-b1f79a1fe9d3';

async function testCreateVideoWithGeneratedFiles(generatedFiles, topicId) {
  await generateVideo(generatedFiles, topicId);
  console.log('Final steps reached at generateVideo');
}

testCreateVideoWithGeneratedFiles(generatedFiles, topicId);

module.exports = { generateVideo };
