const ffmpeg = require("fluent-ffmpeg");

function convertToWav(videoPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .toFormat("wav")
      .on("end", () => resolve(outputPath))
      .on("error", (err) => reject(err))
      .save(outputPath);
  });
}

const replaceAudioInVideo = (videoPath, audioPath, outputPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .input(audioPath)
      .inputOptions(["-hwaccel cuda"])
      .audioCodec("aac")
      .toFormat("mp4")
      .videoFilters("transpose=1")
      .on("end", resolve)
      .on("error", reject)
      .outputOptions("-map 0:v") // Videostream aus erster Eingabedatei
      .outputOptions("-map 1:a") // Audiostream aus zweiter Eingabedatei
      .outputOptions("-c:v h264_nvenc")
      .outputOptions(["-b:v 15000k"]) // 15 Mbps Video Bitrate
      .outputOptions(["-b:a 256k"]) // 256 kbps Audio Bitrate
      .on("end", () => resolve(outputPath))
      .on("error", (err) => reject(err))
      .save(outputPath);
  });
};

module.exports = {
  convertToWav,
  replaceAudioInVideo,
};
