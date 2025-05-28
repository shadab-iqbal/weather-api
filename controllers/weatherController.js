const axios = require("axios");

const AppError = require("../utils/appError");
const { getCachedWeather, cacheWeatherData } = require("../utils/redisClient");

async function getWeatherFromAPI(city) {
  const API_KEY = process.env.VISUAL_CROSSING_API_KEY;

  if (!API_KEY) {
    throw new Error("Weather API key not configured");
  }

  try {
    const response = await axios.get(
      `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${encodeURIComponent(
        city
      )}`,
      {
        params: {
          key: API_KEY,
          unitGroup: "us", // 'us' for Fahrenheit
          include: "current", // Include current weather conditions
          contentType: "json",
        },
        timeout: 8000, // Set a timeout of 8 seconds for the request
      }
    );

    const data = response.data;
    const current = data.currentConditions;

    const locationParts = data.resolvedAddress.split(", ");
    const cityName = locationParts[0];
    const country = locationParts[locationParts.length - 1];

    return {
      city: cityName,
      country: country,
      temperature: Math.round(current.temp), // Fahrenheit because of unitGroup: 'us'
    };
  } catch (error) {
    // When communicating with a 3rd party API, we need to handle various error scenarios
    // such as 400 Bad Request, 401 Unauthorized, 429 Too Many Requests, etc.
    if (error.response) {
      if (error.response.status === 400) {
        const errorMsg = error.response.data?.message || `City '${city}' not found`;
        throw new AppError(errorMsg, 400);
      } else if (error.response.status === 401) {
        throw new AppError("Invalid API key", 401);
      } else if (error.response.status === 429) {
        throw new AppError("API rate limit exceeded. Please try again later.", 429);
      } else {
        const errorMsg = error.response.data?.message || "Unknown API error";
        throw new AppError(`Weather API error: ${errorMsg}`, error.response.status);
      }
    } else if (error.code === "ECONNABORTED") {
      throw new AppError("Weather API request timeout", 504);
    } else if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
      throw new AppError("Unable to connect to weather service", 503);
    } else {
      throw new AppError("Failed to fetch weather data", 500);
    }
  }
}

exports.getWeather = async (req, res, next) => {
  const city = req.query.city;
  if (!city) return next(new AppError("City is required", 400));

  try {
    // 1. Try cache
    const cached = await getCachedWeather(city);
    if (cached) {
      return res.status(200).json({
        status: "success",
        source: "cache",
        data: cached,
      });
    }

    // 2. If not cached, fetch from API
    const weather = await getWeatherFromAPI(city);

    // 3. Cache it
    await cacheWeatherData(city, weather);

    res.status(200).json({
      status: "success",
      source: "api",
      data: weather,
    });
  } catch (err) {
    next(err);
  }
};
