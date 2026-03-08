const ffmpeg = require("fluent-ffmpeg");
const ffmpegStatic = require("ffmpeg-static");
const path = require("path");
const fs = require("fs");
const os = require("os");

// Set ffmpeg binary path
ffmpeg.setFfmpegPath(ffmpegStatic);

// Check if file is a video
const isVideoFile = (filename) => {
  const videoExtensions = [
    ".mp4",
    ".mov",
    ".avi",
    ".mkv",
    ".webm",
    ".flv",
    ".wmv",
    ".m4v",
  ];
  const ext = path.extname(filename).toLowerCase();
  return videoExtensions.includes(ext);
};

// Generate thumbnail from video
const generateVideoThumbnail = (videoBuffer, originalFilename) => {
  return new Promise((resolve, reject) => {
    const tempVideoPath = path.join(
      os.tmpdir(),
      `temp_video_${Date.now()}${path.extname(originalFilename)}`,
    );
    const tempThumbnailPath = path.join(
      os.tmpdir(),
      `thumbnail_${Date.now()}.jpg`,
    );

    // Write video buffer to temp file
    fs.writeFileSync(tempVideoPath, videoBuffer);

    ffmpeg(tempVideoPath)
      .screenshots({
        count: 1,
        filename: path.basename(tempThumbnailPath),
        folder: path.dirname(tempThumbnailPath),
        size: "1920x?", // Maintain aspect ratio
        timemarks: ["2"], // Take screenshot at 2 seconds
      })
      .on("end", () => {
        // Read the generated thumbnail
        const thumbnailBuffer = fs.readFileSync(tempThumbnailPath);

        // Clean up temp files
        try {
          fs.unlinkSync(tempVideoPath);
          fs.unlinkSync(tempThumbnailPath);
        } catch (e) {
          console.error("Error cleaning up temp files:", e);
        }

        resolve(thumbnailBuffer);
      })
      .on("error", (err) => {
        // Clean up temp files on error
        try {
          if (fs.existsSync(tempVideoPath)) fs.unlinkSync(tempVideoPath);
          if (fs.existsSync(tempThumbnailPath))
            fs.unlinkSync(tempThumbnailPath);
        } catch (e) {
          console.error("Error cleaning up temp files:", e);
        }

        reject(err);
      });
  });
};

// Generate 5-second preview clip from video
const generateVideoPreview = (videoBuffer, originalFilename) => {
  return new Promise((resolve, reject) => {
    const tempVideoPath = path.join(
      os.tmpdir(),
      `temp_video_${Date.now()}${path.extname(originalFilename)}`,
    );
    const tempPreviewPath = path.join(os.tmpdir(), `preview_${Date.now()}.mp4`);

    // Write video buffer to temp file
    fs.writeFileSync(tempVideoPath, videoBuffer);

    ffmpeg(tempVideoPath)
      .setStartTime(0) // Start from beginning
      .setDuration(5) // 5 seconds
      .output(tempPreviewPath)
      .videoCodec("libx264")
      .size("1280x?") // 720p width, maintain aspect ratio
      .outputOptions([
        "-crf 28", // Compression quality
        "-preset fast",
        "-movflags +faststart", // Enable streaming
      ])
      .on("end", () => {
        // Read the generated preview video
        const previewBuffer = fs.readFileSync(tempPreviewPath);

        // Clean up temp files
        try {
          fs.unlinkSync(tempVideoPath);
          fs.unlinkSync(tempPreviewPath);
        } catch (e) {
          console.error("Error cleaning up temp files:", e);
        }

        resolve(previewBuffer);
      })
      .on("error", (err) => {
        // Clean up temp files on error
        try {
          if (fs.existsSync(tempVideoPath)) fs.unlinkSync(tempVideoPath);
          if (fs.existsSync(tempPreviewPath)) fs.unlinkSync(tempPreviewPath);
        } catch (e) {
          console.error("Error cleaning up temp files:", e);
        }

        reject(err);
      })
      .run();
  });
};

module.exports = {
  isVideoFile,
  generateVideoThumbnail,
  generateVideoPreview,
};
