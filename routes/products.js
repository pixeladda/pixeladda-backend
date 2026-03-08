const express = require("express");
const router = express.Router();
const multer = require("multer");
const Product = require("../models/Product");
const Category = require("../models/Category");
const { protect, adminOnly } = require("../middleware/auth");
const {
  uploadToR2,
  getSignedDownloadUrl,
  getSignedViewUrl,
} = require("../utils/r2Storage");
const {
  isVideoFile,
  generateVideoThumbnail,
  generateVideoPreview,
} = require("../utils/videoProcessor");

const upload = multer({ storage: multer.memoryStorage() });

// Helper function to add signed URLs to product
const addSignedUrlsToProduct = async (product) => {
  const productObj = product.toObject ? product.toObject() : product;

  if (productObj.previewImages && productObj.previewImages.length > 0) {
    productObj.previewImagesUrls = await Promise.all(
      productObj.previewImages.map((key) => getSignedViewUrl(key)),
    );
  }

  if (productObj.previewVideo) {
    productObj.previewVideoUrl = await getSignedViewUrl(
      productObj.previewVideo,
    );
  }

  return productObj;
};

// Get all products
router.get("/", async (req, res) => {
  try {
    const { category } = req.query;
    const filter = { isActive: true };

    if (category) {
      filter.category = category;
    }

    const products = await Product.find(filter)
      .populate("category", "name slug")
      .sort({ createdAt: -1 });

    // Add signed URLs to all products
    const productsWithUrls = await Promise.all(
      products.map((product) => addSignedUrlsToProduct(product)),
    );

    res.json(productsWithUrls);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single product
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate(
      "category",
      "name slug",
    );

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    const productWithUrls = await addSignedUrlsToProduct(product);
    res.json(productWithUrls);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create product (Admin only)
router.post(
  "/",
  protect,
  adminOnly,
  upload.fields([
    { name: "previewImages", maxCount: 5 },
    { name: "file", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { title, description, category, price, isFree } = req.body;

      if (!req.files || !req.files.file || !req.files.file[0]) {
        return res.status(400).json({ error: "Product file is required" });
      }

      const file = req.files.file[0];
      const fileKey = await uploadToR2(file, "products");

      const previewImages = [];
      let previewVideoKey = null;

      // Check if preview images were uploaded
      if (req.files.previewImages) {
        for (const image of req.files.previewImages) {
          const imageKey = await uploadToR2(image, "previews");
          previewImages.push(imageKey);
        }
      }

      // ALWAYS generate preview video for video files, even if preview images exist
      if (isVideoFile(file.originalname)) {
        try {
          // Generate thumbnail if no preview images were provided
          if (previewImages.length === 0) {
            console.log("Generating thumbnail for video:", file.originalname);
            const thumbnailBuffer = await generateVideoThumbnail(
              file.buffer,
              file.originalname,
            );

            // Create a thumbnail object to upload
            const thumbnail = {
              buffer: thumbnailBuffer,
              originalname: `thumbnail_${Date.now()}.jpg`,
              mimetype: "image/jpeg",
            };

            const thumbnailKey = await uploadToR2(thumbnail, "previews");
            previewImages.push(thumbnailKey);
            console.log("Video thumbnail generated successfully");
          }

          // Generate 5-second preview video
          console.log("Generating 5-second preview video...");
          const previewVideoBuffer = await generateVideoPreview(
            file.buffer,
            file.originalname,
          );

          const previewVideo = {
            buffer: previewVideoBuffer,
            originalname: `preview_${Date.now()}.mp4`,
            mimetype: "video/mp4",
          };

          previewVideoKey = await uploadToR2(previewVideo, "previews");
          console.log("Preview video generated successfully");
        } catch (error) {
          console.error("Error generating video preview:", error);
          console.error("Error details:", error.stack);
          // Continue without preview - not critical
        }
      }

      const product = await Product.create({
        title,
        description,
        category,
        price,
        isFree: isFree === "true" || isFree === true,
        isActive: true,
        previewImages,
        previewVideo: previewVideoKey,
        fileKey,
        fileName: file.originalname,
        fileSize: file.size,
      });

      const populatedProduct = await Product.findById(product._id).populate(
        "category",
        "name slug",
      );
      res.status(201).json(populatedProduct);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Update product (Admin only)
router.put(
  "/:id",
  protect,
  adminOnly,
  upload.fields([
    { name: "previewImages", maxCount: 5 },
    { name: "file", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { title, description, category, price, isActive, isFree } =
        req.body;
      const updateData = {
        title,
        description,
        category,
        price,
        isActive,
        isFree: isFree === "true" || isFree === true,
      };

      if (req.files && req.files.file && req.files.file[0]) {
        const file = req.files.file[0];
        const fileKey = await uploadToR2(file, "products");
        updateData.fileKey = fileKey;
        updateData.fileName = file.originalname;
        updateData.fileSize = file.size;
      }

      if (req.files && req.files.previewImages) {
        const previewImages = [];
        for (const image of req.files.previewImages) {
          const imageKey = await uploadToR2(image, "previews");
          previewImages.push(imageKey);
        }
        updateData.previewImages = previewImages;
      }

      // Generate preview for video files when updating
      if (
        req.files &&
        req.files.file &&
        req.files.file[0] &&
        isVideoFile(req.files.file[0].originalname)
      ) {
        try {
          // Generate thumbnail if no preview images were uploaded
          if (!req.files.previewImages) {
            console.log("Generating thumbnail for updated video");
            const thumbnailBuffer = await generateVideoThumbnail(
              req.files.file[0].buffer,
              req.files.file[0].originalname,
            );

            const thumbnail = {
              buffer: thumbnailBuffer,
              originalname: `thumbnail_${Date.now()}.jpg`,
              mimetype: "image/jpeg",
            };

            const thumbnailKey = await uploadToR2(thumbnail, "previews");
            updateData.previewImages = [thumbnailKey];
            console.log("Video thumbnail generated successfully");
          }

          // Generate preview video
          console.log("Generating 5-second preview video for update...");
          const previewVideoBuffer = await generateVideoPreview(
            req.files.file[0].buffer,
            req.files.file[0].originalname,
          );

          const previewVideo = {
            buffer: previewVideoBuffer,
            originalname: `preview_${Date.now()}.mp4`,
            mimetype: "video/mp4",
          };

          const previewVideoKey = await uploadToR2(previewVideo, "previews");
          updateData.previewVideo = previewVideoKey;
          console.log("Preview video generated successfully");
        } catch (error) {
          console.error("Error generating video preview:", error);
          console.error("Error details:", error.stack);
        }
      }

      const product = await Product.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true },
      ).populate("category", "name slug");

      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      res.json(product);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Delete product (Admin only)
router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get download URL (Protected - only for purchased products or free products)
router.get("/:id/download", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Allow download if product is free
    if (!product.isFree) {
      // For paid products, require authentication
      if (!req.headers.authorization) {
        return res
          .status(401)
          .json({ error: "Authentication required for paid products" });
      }

      // Verify token for paid products
      const token = req.headers.authorization.split(" ")[1];
      const jwt = require("jsonwebtoken");
      const User = require("../models/User");

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (!user) {
          return res.status(401).json({ error: "User not found" });
        }

        // Check if user has purchased this product
        if (
          !user.purchasedProducts.includes(product._id.toString()) &&
          user.role !== "admin"
        ) {
          return res
            .status(403)
            .json({ error: "You have not purchased this product" });
        }
      } catch (err) {
        return res.status(401).json({ error: "Invalid token" });
      }
    }

    const downloadUrl = await getSignedDownloadUrl(
      product.fileKey,
      product.fileName,
    );

    // Increment download count
    product.downloads += 1;
    await product.save();

    res.json({ downloadUrl, fileName: product.fileName });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
