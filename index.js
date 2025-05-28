/* eslint-disable no-console */
const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config({ path: "./config.env" });

const { initializeRedis, closeRedisConnection } = require("./utils/redisClient");

// Globally handling sync and async errors which are outside of express

const handleFatalError = (err) => {
  console.error(`\n${err.name}, ${err.message}\n`);
  console.error(`❌ Server shutting down...\n`);
  process.exit(1);
};

process.on("uncaughtException", handleFatalError); // sync errors
process.on("unhandledRejection", handleFatalError); // async errors

const app = require("./app");

async function startApp() {
  try {
    // Connecting to MongoDB Atlas
    console.log("------------");
    console.log("Connecting to DB...");
    await mongoose.connect(process.env.DATABASE_CONNECTION_STRING);
    console.log("DB connection successful!");

    await initializeRedis(); // ✅ Redis

    // Starting the Express app
    const port = process.env.PORT || 5001;
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
      console.log("------------");
    });

    // Graceful shutdown
    process.on("SIGTERM", async () => {
      console.log("\nSIGTERM received. Shutting down...");
      await closeRedisConnection();
      console.log("Redis connection closed.");
      mongoose.connection.close(() => {
        console.log("MongoDB connection closed.");
      });
      server.close(() => {
        console.log("Process terminated.");
      });
    });
  } catch (err) {
    handleFatalError(err);
  }
}

startApp();
