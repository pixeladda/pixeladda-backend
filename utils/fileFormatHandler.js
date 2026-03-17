// File format definitions and handling

const FILE_FORMATS = {
  // Vector formats
  EPS: {
    extension: ".eps",
    mimeType: "application/postscript",
    category: "vector",
  },
  AI: {
    extension: ".ai",
    mimeType: "application/illustrator",
    category: "vector",
  },
  CDR: { extension: ".cdr", mimeType: "application/cdr", category: "vector" },
  SVG: { extension: ".svg", mimeType: "image/svg+xml", category: "vector" },

  // Raster formats
  PSD: {
    extension: ".psd",
    mimeType: "image/vnd.adobe.photoshop",
    category: "raster",
  },
  JPEG: { extension: ".jpg", mimeType: "image/jpeg", category: "raster" },
  JPG: { extension: ".jpg", mimeType: "image/jpeg", category: "raster" },
  PNG: { extension: ".png", mimeType: "image/png", category: "raster" },

  // Video formats
  MP4: { extension: ".mp4", mimeType: "video/mp4", category: "video" },
  MOV: { extension: ".mov", mimeType: "video/quicktime", category: "video" },
  AVI: { extension: ".avi", mimeType: "video/x-msvideo", category: "video" },
  WEBM: { extension: ".webm", mimeType: "video/webm", category: "video" },
};

// Download bundle template definitions
const DOWNLOAD_BUNDLES = {
  vector_eps: {
    name: "Vector (EPS + JPEG)",
    formats: ["EPS", "AI", "JPEG"],
    productTypes: ["vector"],
  },
  vector_cdr: {
    name: "Vector (CDR + JPEG)",
    formats: ["CDR", "JPEG"],
    productTypes: ["vector"],
  },
  raster_psd: {
    name: "Raster (PSD + JPEG)",
    formats: ["PSD", "JPEG"],
    productTypes: ["raster", "template"],
  },
};

// Size presets for image exports
const SIZE_PRESETS = {
  small: { width: 714, height: 1000, label: "Small" },
  medium: { width: 1071, height: 1500, label: "Medium" },
  large: { width: 1428, height: 2000, label: "Large" },
  original: { label: "Original" },
};

// Get file format from filename
const getFileFormat = (filename) => {
  const ext = filename.split(".").pop().toUpperCase();
  return ext;
};

// Get mime type for format
const getMimeType = (format) => {
  return FILE_FORMATS[format]?.mimeType || "application/octet-stream";
};

// Get category for format
const getCategory = (format) => {
  return FILE_FORMATS[format]?.category || "other";
};

// Determine product type from uploaded files
const determineProductType = (files) => {
  if (!files || files.length === 0) return "other";

  const formats = files.map((f) => getFileFormat(f.originalname));
  const categories = formats.map((f) => getCategory(f));

  if (categories.includes("video")) return "video";
  if (categories.includes("vector")) return "vector";
  if (categories.includes("raster")) return "raster";

  return "other";
};

// Get available download options for a product
const getDownloadOptions = (product) => {
  const options = [];

  if (!product.files || product.files.length === 0) {
    // Legacy product with single file
    if (product.fileKey) {
      options.push({
        type: "single",
        label: "Download",
        files: [{ key: product.fileKey, fileName: product.fileName }],
      });
    }
    return options;
  }

  const availableFormats = product.files.map((f) => f.format);

  // Check which bundles are available
  Object.entries(DOWNLOAD_BUNDLES).forEach(([key, bundle]) => {
    if (!bundle.productTypes.includes(product.productType)) return;

    const hasAllFormats = bundle.formats.every((format) =>
      availableFormats.includes(format),
    );

    if (hasAllFormats) {
      const bundleFiles = bundle.formats.map((format) => {
        const file = product.files.find((f) => f.format === format);
        return {
          format,
          key: file.key,
          fileName: file.fileName,
          fileSize: file.fileSize,
        };
      });

      options.push({
        type: "bundle",
        key,
        label: bundle.name,
        files: bundleFiles,
      });
    }
  });

  // Add individual file options
  product.files.forEach((file) => {
    options.push({
      type: "single",
      label: `${file.format} Only`,
      files: [
        {
          format: file.format,
          key: file.key,
          fileName: file.fileName,
          fileSize: file.fileSize,
        },
      ],
    });
  });

  return options;
};

module.exports = {
  FILE_FORMATS,
  DOWNLOAD_BUNDLES,
  SIZE_PRESETS,
  getFileFormat,
  getMimeType,
  getCategory,
  determineProductType,
  getDownloadOptions,
};
