// utils/fileUtils.js
const fs = require("fs");
const path = require("path");

function createTempId() {
  const crypto = require("crypto");
  return crypto.randomBytes(16).toString("hex");
}

function copyFile(sourcePath, targetPath) {
  fs.copyFileSync(sourcePath, targetPath);
  return targetPath;
}

function createOutputPath(originalPath, prefix, suffix) {
  const dir = path.dirname(originalPath);
  const ext = path.extname(originalPath);
  const baseName = path.basename(originalPath, ext);
  return path.join(dir, `${prefix}${baseName}${suffix}${ext}`);
}

function createReadStream(filePath) {
  return fs.createReadStream(filePath);
}

function createWriteStream(filePath) {
  return fs.createWriteStream(filePath);
}

module.exports = {
  createTempId,
  copyFile,
  createOutputPath,
  createReadStream,
  createWriteStream,
};
