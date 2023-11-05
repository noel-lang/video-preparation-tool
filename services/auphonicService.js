// services/auphonicService.js
const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");

class AuphonicService {
  constructor(user, pass, preset) {
    this.auth = {
      username: user,
      password: pass,
    };
    this.preset = preset;
  }

  async uploadToAuphonic(filePath, title) {
    const url = "https://auphonic.com/api/simple/productions.json";
    const audioFile = fs.createReadStream(filePath);
    const formData = new FormData();

    formData.append("input_file", audioFile);
    formData.append("preset", this.preset);
    formData.append("title", title);
    formData.append("action", "start");

    const response = await axios.post(url, formData, {
      auth: this.auth,
      headers: formData.getHeaders(),
    });

    return response.data.data.uuid;
  }

  async downloadFromAuphonic(uuid, outputPath) {
    const url = `https://auphonic.com/api/production/${uuid}.json`;
    let production = null;

    do {
      const response = await axios.get(url, {
        auth: this.auth,
      });
      production = response.data.data;

      if (production.status_string !== "Done") {
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    } while (production.status_string !== "Done");

    const outputFileUrl = production.output_files[0].download_url;
    const outputResponse = await axios.get(outputFileUrl, {
      responseType: "stream",
      auth: this.auth,
    });

    const writeStream = fs.createWriteStream(outputPath);
    outputResponse.data.pipe(writeStream);

    return new Promise((resolve, reject) => {
      writeStream.on("finish", () => resolve(outputPath));
      writeStream.on("error", reject);
    });
  }
}

module.exports = AuphonicService;
