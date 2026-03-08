require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("./models/Product");
const Category = require("./models/Category");

async function checkProducts() {
  try {
    const MONGO_URL = process.env.MONGO_URL;
    const DB_NAME = process.env.DB_NAME;

    console.log(`Connecting to MongoDB...`);
    console.log(`Database: ${DB_NAME}`);

    await mongoose.connect(MONGO_URL, {
      dbName: DB_NAME,
    });
    console.log("Connected to MongoDB\n");

    // Check all products
    const allProducts = await Product.find({}).populate("category");
    console.log(
      `\n=== Total Products in Database: ${allProducts.length} ===\n`,
    );

    // Check active products
    const activeProducts = await Product.find({ isActive: true }).populate(
      "category",
    );
    console.log(`✅ Active Products: ${activeProducts.length}`);

    // Check inactive products
    const inactiveProducts = await Product.find({ isActive: false }).populate(
      "category",
    );
    console.log(`❌ Inactive Products: ${inactiveProducts.length}`);

    // Check products with undefined isActive
    const undefinedProducts = await Product.find({
      isActive: { $exists: false },
    }).populate("category");
    console.log(
      `⚠️  Products with undefined isActive: ${undefinedProducts.length}\n`,
    );

    if (inactiveProducts.length > 0) {
      console.log("\n=== Inactive Products ===");
      inactiveProducts.forEach((product) => {
        console.log(`\nTitle: ${product.title}`);
        console.log(`Category: ${product.category?.name}`);
        console.log(`Price: ₹${product.price}`);
        console.log(`isActive: ${product.isActive}`);
      });
    }

    if (undefinedProducts.length > 0) {
      console.log("\n=== Products with undefined isActive ===");
      undefinedProducts.forEach((product) => {
        console.log(`\nTitle: ${product.title}`);
        console.log(`Category: ${product.category?.name}`);
        console.log(`Price: ₹${product.price}`);
        console.log(`isActive: ${product.isActive}`);
      });
    }

    console.log("\n=== Active Products List ===");
    activeProducts.forEach((product) => {
      console.log(
        `✓ ${product.title} - ${product.category?.name || "No Category"}`,
      );
    });

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkProducts();
