const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const crypto = require("crypto");

let s3Client = null;
let R2_CONFIGURED = false;
let BUCKET_NAME = "placeholder";

const initializeR2 = () => {
  BUCKET_NAME = process.env.R2_BUCKET_NAME || "placeholder";
  R2_CONFIGURED = !!(
    process.env.R2_ENDPOINT &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY
  );

  if (R2_CONFIGURED) {
    s3Client = new S3Client({
      region: "auto",
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });
    console.log("✓ Cloudflare R2 configured successfully");
  } else {
    console.warn(
      "⚠ Cloudflare R2 not configured. File uploads will not work until credentials are added.",
    );
  }
};

const uploadToR2 = async (file, folder = "") => {
  if (!R2_CONFIGURED || !s3Client) {
    throw new Error(
      "R2 storage not configured. Please add Cloudflare R2 credentials.",
    );
  }

  const fileExtension = file.originalname.split(".").pop();
  const fileName = `${folder}/${crypto.randomBytes(16).toString("hex")}.${fileExtension}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileName,
    Body: file.buffer,
    ContentType: file.mimetype,
  });

  await s3Client.send(command);
  return fileName;
};

const getSignedDownloadUrl = async (fileKey, fileName) => {
  if (!R2_CONFIGURED || !s3Client) {
    throw new Error(
      "R2 storage not configured. Please add Cloudflare R2 credentials.",
    );
  }

  // Determine Content-Type from file extension
  const ext = fileName.split(".").pop().toLowerCase();
  const contentTypeMap = {
    pdf: "application/pdf",
    zip: "application/zip",
    psd: "application/octet-stream",
    ai: "application/postscript",
    eps: "application/postscript",
    cdr: "application/coreldraw",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    svg: "image/svg+xml",
    mp4: "video/mp4",
    mov: "video/quicktime",
    avi: "video/x-msvideo",
  };

  const contentType = contentTypeMap[ext] || "application/octet-stream";

  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileKey,
    ResponseContentDisposition: `attachment; filename="${encodeURIComponent(fileName)}"`,
    ResponseContentType: contentType,
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  return url;
};

const getSignedViewUrl = async (fileKey) => {
  if (!R2_CONFIGURED || !s3Client) {
    throw new Error(
      "R2 storage not configured. Please add Cloudflare R2 credentials.",
    );
  }

  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileKey,
  });

  // Extend expiration to 7 days (604800 seconds) for preview images and videos
  // This reduces the need for frequent regeneration and improves user experience
  const url = await getSignedUrl(s3Client, command, { expiresIn: 604800 });
  return url;
};

module.exports = {
  initializeR2,
  uploadToR2,
  getSignedDownloadUrl,
  getSignedViewUrl,
};
