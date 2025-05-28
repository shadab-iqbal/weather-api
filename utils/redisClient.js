const redis = require("redis");

let redisClient;

async function initializeRedis() {
  try {
    redisClient = redis.createClient({
      url: process.env.REDIS_URL || "redis://localhost:6379",
    });

    redisClient.on("error", (err) => {
      console.error("Redis Client Error:", err);
    });

    redisClient.on("connect", () => {
      console.log("Connected to Redis");
    });

    await redisClient.connect();
  } catch (error) {
    console.error("Failed to connect to Redis:", error.message);
    console.log("Continuing without Redis caching...");
    redisClient = null;
  }
}

// Function to get cached weather data
async function getCachedWeather(city) {
  if (!redisClient) return null;

  try {
    const cacheKey = `weather:${city.toLowerCase()}`;
    const cachedData = await redisClient.get(cacheKey);

    if (cachedData) {
      const parsed = JSON.parse(cachedData);
      return parsed;
    }
    return null;
  } catch (error) {
    console.error("Redis get error:", error);
    return null;
  }
}

// Function to cache weather data
async function cacheWeatherData(city, weatherData) {
  if (!redisClient) return;

  try {
    const cacheKey = `weather:${city.toLowerCase()}`;

    // Cache for 5 minutes
    await redisClient.setEx(cacheKey, 300, JSON.stringify(weatherData));
  } catch (error) {
    console.error("Redis set error:", error);
  }
}

// Graceful shutdown
const closeRedisConnection = async () => {
  if (redisClient) {
    await redisClient.quit();
    console.log("Redis connection closed");
  }
};

module.exports = {
  initializeRedis,
  getRedisClient: () => redisClient,
  getCachedWeather,
  cacheWeatherData,
  closeRedisConnection,
};
