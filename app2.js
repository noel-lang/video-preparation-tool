// app.js
require("dotenv").config();
const ffmpegService = require("./services/ffmpegService");
const AuphonicService = require("./services/auphonicService");
const fileUtils = require("./utils/fileUtils");

async function main(videoPath) {
  try {
    const temporaryFileName = fileUtils.createTempId() + ".wav";

    // Konvertiere das Video zu WAV und lade es hoch
    console.log(`Konvertiere Videodatei [${videoPath}] in eine .WAV-Datei`);
    const wavPath = await ffmpegService.convertToWav(
      videoPath,
      temporaryFileName
    );
    console.log(`WAV-Datei erstellt: ${wavPath}`);

    const auphonic = new AuphonicService(
      process.env.AUPHONIC_USER,
      process.env.AUPHONIC_PASS,
      "JJ7J7dWUcmuMmtiZyih6Ge"
    );

    console.log(`Lade Datei [${wavPath}] zu Auphonic hoch.`);
    const uuid = await auphonic.uploadToAuphonic(wavPath, temporaryFileName);
    console.log(`Auphonic Produktion gestartet mit UUID: ${uuid}`);

    // Warte auf das Ende der Produktion und lade die Datei herunter
    const processedFilePath = await auphonic.downloadFromAuphonic(
      uuid,
      temporaryFileName
    );
    console.log(`Verarbeitete Datei heruntergeladen: ${processedFilePath}`);

    // Kopiere die Originalvideodatei in das Ausgabeverzeichnis
    const outputDirectory = fileUtils.createOutputPath(videoPath);
    const copiedVideoPath = fileUtils.copyToOutputDirectory(
      videoPath,
      outputDirectory,
      temporaryFileName
    );
    console.log(`Kopierte Videodatei nach: ${copiedVideoPath}`);

    // Ersetze die Audiospur im Video
    const finalVideoPath = await ffmpegService.replaceAudioInVideo(
      copiedVideoPath,
      processedFilePath
    );
    console.log(`Audio im Video ersetzt: ${finalVideoPath}`);
  } catch (error) {
    console.error("Ein Fehler ist aufgetreten:", error);
  }
}

const videoPath = process.argv[2];

if (!videoPath) {
  console.error("Bitte gebe den Pfad zur Videodatei an.");
  process.exit(1);
}

main(videoPath);
