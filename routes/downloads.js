const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const { protect } = require("../middleware/auth");
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedDownloadUrl } = require("../utils/r2Storage");
const {
  getDownloadOptions,
  getMimeType,
} = require("../utils/fileFormatHandler");
const { resizeImage, isImageFile } = require("../utils/imageProcessor");
const archiver = require("archiver");
const { Readable } = require("stream");

// Initialize S3 client for direct downloads
let s3Client = null;
const initS3 = () => {
  if (!s3Client) {
    s3Client = new S3Client({
      region: "auto",
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return s3Client;
};

// Get download options for a product
router.get("/:productId/options", async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    const options = getDownloadOptions(product);
    res.json({ options });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Download product files
router.post("/:productId/download", protect, async (req, res) => {
  try {
    const { optionKey, size = "original" } = req.body;
    const product = await Product.findById(req.params.productId);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    const options = getDownloadOptions(product);
    const selectedOption = options.find(
      (opt) => opt.key === optionKey || opt.type === "single",
    );

    if (!selectedOption) {
      return res.status(400).json({ error: "Invalid download option" });
    }

    // Increment download count
    product.downloads += 1;
    await product.save();

    const client = initS3();
    const bucketName = process.env.R2_BUCKET_NAME;

    // If single file, return download URL directly
    if (selectedOption.files.length === 1 && size === "original") {
      const file = selectedOption.files[0];
      const downloadUrl = await getSignedDownloadUrl(file.key, file.fileName);

      return res.json({
        type: "single",
        url: downloadUrl,
        fileName: file.fileName,
        mimeType: getMimeType(file.format),
      });
    }

    // Create ZIP for multiple files or sized images
    const zipFileName = `${product.title.replace(/[^a-z0-9]/gi, "_")}_${size}.zip`;

    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${zipFileName}"`,
    );

    const archive = archiver("zip", { zlib: { level: 9 } });

    archive.on("error", (err) => {
      console.error("Archive error:", err);
      res.status(500).json({ error: "Error creating archive" });
    });

    archive.pipe(res);

    // Add files to ZIP
    for (const file of selectedOption.files) {
      try {
        const command = new GetObjectCommand({
          Bucket: bucketName,
          Key: file.key,
        });

        const response = await client.send(command);
        const chunks = [];

        for await (const chunk of response.Body) {
          chunks.push(chunk);
        }

        let fileBuffer = Buffer.concat(chunks);
        let fileName = file.fileName;

        // Apply resizing to JPEG files if size is specified
        if (
          size !== "original" &&
          (file.format === "JPEG" ||
            file.format === "JPG" ||
            file.format === "PNG")
        ) {
          fileBuffer = await resizeImage(fileBuffer, size);
          fileName = fileName.replace(/\.(jpg|jpeg|png)$/i, `_${size}.jpg`);
        }

        archive.append(fileBuffer, { name: fileName });
      } catch (error) {
        console.error(`Error adding file ${file.fileName}:`, error);
      }
    }

    await archive.finalize();
  } catch (error) {
    console.error("Download error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
});

module.exports = router;
