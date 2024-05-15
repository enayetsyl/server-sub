const videoshow = require("videoshow");
const ffmpeg = require("fluent-ffmpeg");
const path = require("path");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const ffprobePath = require("@ffprobe-installer/ffprobe").path;
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);
const fs = require("fs");
const fsp = require('fs').promises; 
const { exec } = require("child_process");


async function generateVideo(generatedFiles ,topicId) {
 
  const videoFileName = `${topicId}_finalVideo.mp4`;

  const videoFilePath = path.join(
    __dirname,
    "/tempFolder",
    videoFileName
  );

  let cloudinaryLink;
  let videoPaths = []; 
  // let generatedFiles;
  try {


    // generatedFiles = await getAllMidjourneyData(topicId, document);

    // creating video for each quote along with subtitle

    const paths = await createVideoWithGeneratedFiles(generatedFiles, topicId);
    videoPaths = paths;

    // await concatenateVideos(topicId);


    // uploading the video in cloudinary


    // cloudinaryLink = await uploadVideoToCloudinary(videoFilePath);

// console.log('cloudinary link', cloudinaryLink)
    // Saving uploaded video link to the database.
    // await uploadVideoLinkToMongoDB(cloudinaryLink, document._id);


    return true;
  } catch (error) {
    console.error("Error in the generate function:", error);
    throw error;
  } finally {
  //   await cleanupFiles(videoPaths, generatedFiles)
  //   try {
  //     await fsp.unlink(videoFilePath);
  // } catch (error) {
  //     console.error(`Failed to delete final video file ${videoFilePath}:`, error);
  // }
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
  const audio = path.join(__dirname,  "tempFolder", "song.mp3");
  const videoPaths = [];

  try {
    for (let i = 0; i < generatedFiles.length; i++) {
      const dataset = generatedFiles[i];
      const images = [
        {
          path: path.join(folderPath, dataset.image),
          loop: calculateLoopDuration(dataset.duration),
        },
      ];
      const outputFileName = `video_${topicId}_${i + 1}.mp4`;
      const subtitles = path.join(folderPath, dataset.captions);
      const videoShowFilePath = path.join(folderPath,outputFileName)
      const inputAudioPath = path.join(folderPath, dataset.audio);
      const outputVideoPath = path.join(folderPath, `final_${topicId}_${i + 1}.mp4`);
     const paths =  await createVideoShoe(
        images,
        videoShowFilePath,
        inputAudioPath,
        outputVideoPath,
        audio, subtitles
      );
      videoPaths.push(paths.intermediateVideoPath, paths.finalVideoPath);
    }
    return videoPaths;
  } catch (error) {
    console.error("Error creating videos:", error);
    throw new Error(
      `Error creating videos for topicId ${topicId}: ${error.message}`
    );
  }
}

async function createVideoShoe(
  images,
  videoShowFilePath,
  inputAudioPath,
  outputVideoPath,
  audio, subtitles
) {
  return new Promise((resolve, reject) => {
    
    videoshow(images, { transition: true })
      .audio(audio)
      .subtitles(subtitles)
      .save(videoShowFilePath)
      .on("start", (command) =>
        console.log(`Video process started for inside video show`)
      )
      .on("error", (err) =>
        reject(new Error(`Error processing ${videoShowFilePath}: ${err}`))
      )
      .on("end", async () => {
        console.log(`Video created for ${videoShowFilePath} in:`, videoShowFilePath);
        try {
          await mergeAudioWithVideo(
            videoShowFilePath,
            inputAudioPath,
            outputVideoPath
          );
          resolve({intermediateVideoPath,finalVideoPath: outputVideoPath});
        } catch (error) {
          reject({
            error: new Error(`Error merging audio and video for ${outputVideoPath}: ${error.message}`),
            path: intermediateVideoPath // Include intermediate path for cleanup
          });
        }
      });
  });
}

async function mergeAudioWithVideo(
  videoShowFilePath,
            inputAudioPath,
            outputVideoPath
) {
  try {
    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(videoShowFilePath)
        .input(inputAudioPath)
        .complexFilter("[0:a][1:a]amix=inputs=2:duration=longest")
        .videoCodec("copy")
        .save(outputVideoPath)
        .on("error", (err) =>
          reject(new Error(`Error in merging audio and video: ${err}`))
        )
        .on("end", () => resolve('finalVideo output', outputVideoPath));
    });
  } catch (error) {
    console.error("Error in mergeAudioWithVideo:", error);
    throw new Error(`Error merging videos ${error}`);
  }
}

async function concatenateVideos(topicId) {
  return new Promise((resolve, reject) => {
   try {
    //todo for 5 images use it
    // const fileIndices = [1, 2, 3, 4, 5];
    //todo for 2 images use it
    const fileIndices = [1, 2];
    // Generate input video filenames dynamically based on topicId and indices
    const inputs = fileIndices.map((index) =>
      path.join(
        __dirname, 'tempFolder',
        `final_${topicId}_${index}.mp4`
      )
    );

    // Output video file
    const outputFilePath = path.join(
      __dirname,
      "..",
      
        "tempFolder",
      `${topicId}_finalVideo.mp4`
    );
    // Construct the ffmpeg command string dynamically
    const inputCmdPart = inputs.map((input) => `-i "${input}"`).join(" ");
    const filterComplex = `concat=n=${inputs.length}:v=1:a=1`;
    const command = `ffmpeg ${inputCmdPart} -filter_complex "${filterComplex}" -f mp4 -y "${outputFilePath}"`;

    // Execute the command
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error in video concat: ${error.message}`);
        reject(new Error(`Error in  video concatenation for topic id: ${topicId}: ${error}`))
              }
      // if (stderr) {
      //     // console.error(`ffmpeg stderr: ${stderr}`);
      //     reject(new Error(stderr));  // Treat stderr as an error
      //     return;
      // }
      console.log(`Video concatenated successfully. topicId: ${topicId}`);
      resolve(outputFilePath); // Resolve the promise with the output path
    });
   } catch (error) {
    console.error(`Error in video concatenation for topic id: ${topicId}: ${error}`);
    throw new Error(`Error in video concatenation for topic id: ${topicId}: ${error.message}`);
   }
  });
}

async function cleanupFiles(videoPaths, generatedFiles) {
  generatedFiles.forEach(file => {
    videoPaths.push(path.join(__dirname, "..", "tempFolder", file.audio));
    videoPaths.push(path.join(__dirname, "..", "tempFolder", file.image));
  });
  // Perform deletion of all files
  for (const filePath of videoPaths) {
    try {
      await fsp.unlink(filePath);
    } catch (error) {
      console.error(`Failed to delete file ${filePath}:`, error);
    }
  }
}


// todo for test purpose
const generatedFiles =  [
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
]

const topicId = '38ead003-70a7-490e-bc1c-b1f79a1fe9d3'


async function testCreateVideoWithGeneratedFiles(generatedFiles ,topicId){
  const res = await generateVideo(generatedFiles ,topicId)
  console.log('testCreateVideoWithGeneratedFiles', res)
  // const res2 = await concatenateVideos(topicId)
}



// testCreateVideo(topicId, document)
testCreateVideoWithGeneratedFiles(generatedFiles ,topicId)

