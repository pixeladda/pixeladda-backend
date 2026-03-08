require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("./models/Product");

async function checkProducts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    const products = await Product.find({
      title: { $regex: "cinematic", $options: "i" },
    }).populate("category");

    console.log("\n=== Video Products ===\n");
    products.forEach((product) => {
      console.log(`Title: ${product.title}`);
      console.log(`File: ${product.fileName}`);
      console.log(`Category: ${product.category?.name}`);
      console.log(`Preview Images:`, product.previewImages);
      console.log(`Preview Video:`, product.previewVideo || "NOT SET");
      console.log("---\n");
    });

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkProducts();
