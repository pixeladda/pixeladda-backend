const sharp = require("sharp");
const { SIZE_PRESETS } = require("./fileFormatHandler");

// Resize image to specified size preset
const resizeImage = async (imageBuffer, size = "original") => {
  if (size === "original") {
    return imageBuffer;
  }

  const preset = SIZE_PRESETS[size];
  if (!preset) {
    throw new Error(`Invalid size preset: ${size}`);
  }

  const resized = await sharp(imageBuffer)
    .resize(preset.width, preset.height, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 90 })
    .toBuffer();

  return resized;
};

// Generate JPEG preview from various image formats
const generateJpegPreview = async (fileBuffer, format) => {
  try {
    // For raster formats, convert to JPEG
    const jpeg = await sharp(fileBuffer).jpeg({ quality: 85 }).toBuffer();

    return jpeg;
  } catch (error) {
    console.error("Error generating JPEG preview:", error);
    return null;
  }
};

// Check if file is an image format
const isImageFile = (filename) => {
  const imageExtensions = [
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".bmp",
    ".tiff",
    ".webp",
  ];
  const ext = filename.split(".").pop().toLowerCase();
  return imageExtensions.some((e) => e === `.${ext}`);
};

module.exports = {
  resizeImage,
  generateJpegPreview,
  isImageFile,
};
