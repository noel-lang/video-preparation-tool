require("dotenv").config();
const ffmpeg = require("fluent-ffmpeg");
const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");
const path = require("path");
const crypto = require("crypto");

const videoPath = process.argv[2];

// Konvertiert das Video zu WAV
function convertToWav(videoPath, tempId, callback) {
  console.log(`Konvertiere Videodatei [${videoPath}] in eine .WAV-Datei`);
  ffmpeg(videoPath).toFormat("wav").on("end", callback).save(`${tempId}.wav`);
}

// Lädt die WAV-Datei zu Auphonic hoch und startet die Produktion
async function uploadToAuphonic(filePath) {
  console.log(`Lade Datei [${filePath}] zu Auphonic hoch.`);

  const url = "https://auphonic.com/api/simple/productions.json";
  const auphonicUser = process.env.AUPHONIC_USER;
  const auphonicPass = process.env.AUPHONIC_PASS;
  const audioFile = fs.createReadStream(filePath);

  const formData = new FormData();
  formData.append("input_file", audioFile);
  formData.append("preset", "JJ7J7dWUcmuMmtiZyih6Ge");
  formData.append("title", "Test Title");
  formData.append("action", "start");

  const response = await axios.post(url, formData, {
    auth: {
      username: auphonicUser,
      password: auphonicPass,
    },
    headers: formData.getHeaders(),
  });

  console.log(
    `Datei erfolgreich bei Auphonic hochgeladen. Produktion wurde gestartet.`
  );

  // Gibt die UUID der Produktion zurück
  return response.data.data.uuid;
}

// Lädt die verarbeitete Datei von Auphonic herunter
async function downloadFromAuphonic(uuid, tempId) {
  const auphonicUser = process.env.AUPHONIC_USER;
  const auphonicPass = process.env.AUPHONIC_PASS;
  const url = `https://auphonic.com/api/production/${uuid}.json`;

  // Warte, bis die Produktion abgeschlossen ist (Polling)
  let production = null;

  do {
    console.log(`Frage Status für Auphonic-Produktion [${uuid}] ab`);

    const response = await axios.get(url, {
      auth: {
        username: auphonicUser,
        password: auphonicPass,
      },
    });

    production = response.data.data;

    if (production.status_string !== "Done") {
      // Hier können Sie einen Timeout einfügen, um die API nicht zu überlasten
      await new Promise((resolve) => setTimeout(resolve, 5000)); // 5 Sekunden warten
    }
  } while (production.status_string !== "Done");

  // Nachdem die Produktion abgeschlossen ist, laden Sie die Datei herunter
  const outputFileUrl = production.output_files[0].download_url; // Erste Ausgabedatei
  const outputResponse = await axios.get(outputFileUrl, {
    responseType: "stream",
    auth: {
      username: process.env.AUPHONIC_USER,
      password: process.env.AUPHONIC_PASS,
    },
  });

  const writeStream = fs.createWriteStream(`processed_${tempId}.wav`);
  outputResponse.data.pipe(writeStream);
}

function createCopyInOutputDirectory(
  originalVideoPath,
  outputDirectory,
  tempId
) {
  console.log(
    `Kopiere Videodatei [${originalVideoPath}] nach [${outputDirectory}]`
  );

  const newVideoPath = path.join(
    outputDirectory,
    "copy_" + tempId + "_" + path.basename(originalVideoPath)
  );

  fs.copyFileSync(originalVideoPath, newVideoPath);

  return newVideoPath;
}

function replaceAudioInVideo(videoPath, audioPath) {
  console.log(`Ersetze Audiospur von ${videoPath} mit ${audioPath}`);

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
      .save(
        path.join(path.dirname(videoPath), "final_" + path.basename(videoPath))
      );
  });
}

const tempId = crypto.randomBytes(3 * 4).toString("base64");

convertToWav(videoPath, tempId, async () => {
  console.log(
    `Starte Verarbeitung der Datei [${videoPath}] -> [${tempId}.wav]`
  );
  const uuid = await uploadToAuphonic(`${tempId}.wav`);

  await downloadFromAuphonic(uuid, tempId);
  console.log("Datei erfolgreich verarbeitet und heruntergeladen!");

  const outputDirectory = path.dirname(`${tempId}.wav`);
  const copiedVideoPath = createCopyInOutputDirectory(
    videoPath,
    outputDirectory,
    tempId
  );

  replaceAudioInVideo(copiedVideoPath, `processed_${tempId}.wav`)
    .then(() => {
      console.log("Audio erfolgreich im Video ersetzt!");
    })
    .catch((error) => {
      console.error("Fehler beim Ersetzen des Audios im Video:", error);
    });
});
