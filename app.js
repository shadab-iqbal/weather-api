const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const hpp = require("hpp");
const mongoSanitize = require("express-mongo-sanitize");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const xss = require("xss-clean");
const compression = require("compression");

const errorHandler = require("./middlewares/errorHandler");
const routeNotFoundHandler = require("./middlewares/routeNotFoundHandler");
const weatherRoutes = require("./routes/weatherRoutes");

const app = express();

// Helps Express correctly interpret headers like X-Forwarded-For and X-Forwarded-Proto
// when our deployed app is behind a reverse proxy (e.g. Render, Heroku)
app.enable("trust proxy");

// Add security-related HTTP headers to the response
app.use(helmet());

// Enable Cross-Origin Resource Sharing (CORS) to allow requests from other domains
app.use(cors());

// Parse cookies attached to the client request
app.use(cookieParser());

// Apply rate limiting to prevent DOS attacks from the same IP
const limiter = rateLimit({
  max: 100, // max 100 requests
  windowMs: 15 * 60 * 1000, // within 15 mintues
  message: {
    error: "Too many requests from this IP, please try again later.",
    retryAfter: "15 minutes",
  },
  // keyGenerator allows us to define a custom function
  // to generate the key to track request counts.
  keyGenerator: (req) => {
    // Use the 'x-forwarded-for' header to get the client's real IP
    return req.headers["x-forwarded-for"] || req.ip;
  },
});
app.use("/api", limiter); // applicable to all routes starting with /api

// Enable logging of HTTP requests in the console when in development mode
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Parse incoming JSON requests and populate req.body with the parsed data.
// Limits the JSON payload size to 10KB to prevent large data inputs.
app.use(express.json({ limit: "10kb" }));

// Parse incoming URL-encoded form data (from form submissions),
// and populate req.body with the parsed data. Limits the payload size to 10KB.
// The 'extended: true' option allows parsing of rich data structures (like arrays and objects).
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// Sanitize data against NoSQL query injection
app.use(mongoSanitize());

// Sanitize data against XSS attacks
app.use(xss());

// Prevent HTTP Parameter Pollution (keep only the last value for each parameter)
app.use(
  hpp({
    // the following parameters are allowed to have multiple values
    // (e.g., ?sort=price&sort=rating)
    whitelist: [],
  })
);

// Compress responses to reduce the size of the response body
app.use(compression());

// Serve static files from the "public" directory (e.g., images, CSS files, JavaScript files)
app.use(express.static(`${__dirname}/public`));

// API Routes
app.get("/", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Welcome to the API!",
  });
});

app.use("/api/v1", weatherRoutes);

// Error Handling Middlewares
app.all("*", routeNotFoundHandler); // Handle undefined routes
app.use(errorHandler); // Handle all errors

module.exports = app;
