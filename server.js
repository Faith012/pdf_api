const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const logger = require("./logger"); // Import the logger
const zlib = require("zlib");
const pdf = require("html-pdf");
const ejs = require("ejs");
const sendEmail = require("./emailService");
const multer = require("multer");

const app = express();

const port = 3000;
const os = require("os");

// Middleware to log incoming requests
app.use((req, res, next) => {
  logger.info(`Incoming request: ${req.method} ${req.originalUrl}`);
  next();
});

// Serve static files from /pdf before defining custom routes
app.use("/pdf", express.static(path.join(__dirname, "pdf")));

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get("/", (req, res) => {
  logger.info(`GET / request received`);
  res.send("<h1>PDF and Maintenance API is running</h1>");
});

// Custom route for /pdf/:id/:file - Ensure this is reached if needed
app.get("/pdf/:id/:file", (req, res) => {
  const filePath = `${req.params.id}/${req.params.file}`;
  logger.info(`GET /pdf/${req.params.id}/${req.params.file} request received`);
  res.render("pdf", { file: filePath });
});

app.get("/getFileNames/:id", (req, res) => {
  const id = req.params.id;
  const folderPath = path.join(__dirname, "pdf", id);

  fs.readdir(folderPath, (err, files) => {
    if (err) {
      logger.error(`Failed to read directory ${folderPath}: ${err.message}`);
      return res.status(500).json({ error: "Failed to read directory." });
    }

    logger.info(`Retrieved file names for folder ${folderPath}`);
    res.send({ files: files });
  });
});

app.post("/testScada", (req, res) => {
  console.log(req.body);

  res.status(200).send("ZAEBISI")
})

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}`);
  res.status(500).send("Something went wrong!");
});

//Maintenance PART
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "./uploads";
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

function getIPv4Address() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "No IPv4 address found";
}

// Function to generate timestamp with format 'YYYY-MM-DD-HH.mm'
function generateTimestamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}-${hours}.${minutes}`;
}
const upload = multer({ storage: storage });

//global vars
let jsonString;

// EJS template
const templatePath = __dirname + `/templates/template.ejs`; // Path to your EJS template
const baseServerIp = `${getIPv4Address()}:${port}`;

// Serve static files from the 'uploads' directory
app.use("/uploads", express.static("./uploads"));

app.get("/", (req, res) => {
  console.log("Accessed welcome '/' route");
  res.status(200).send("<h1>API MAINTENANCE is up and running.</h1>");
});

app.post("/uploadPhoto", upload.single("image"), (req, res) => {
  console.log("/uploadPhoto");
  if (!req.file) {
    return res.status(400).send("No file uploaded.");
  }
  // Construct the file path
  const fileName = req.file.filename;

  // Send the file path as a response
  res.status(200).json({ path: fileName });
});

app.post("/testSurvey", (req, res) => {
  if (req.headers["content-encoding"] === "gzip") {
    let buffer = [];
    req.on("data", (chunk) => {
      buffer.push(chunk);
    });

    req.on("end", () => {
      buffer = Buffer.concat(buffer);
      zlib.gunzip(buffer, (err, decoded) => {
        if (err) {
          console.error("Error decompressing:", err);
          return res.status(500).send("Error decompressing");
        }

        let jsonString;
        try {
          jsonString = decoded.toString();
        } catch (parseErr) {
          console.error("Error parsing decompressed data:", parseErr);
          return res.status(500).send("Error parsing decompressed data");
        }

        let jsonData;
        try {
          jsonData = JSON.parse(jsonString);
        } catch (jsonParseErr) {
          console.error("Error parsing JSON string:", jsonParseErr);
          return res.status(500).send("Error parsing JSON string");
        }

        // Generate timestamp in format 'YYYY-MM-HH'
        const timestamp = generateTimestamp();

        ejs.renderFile(
          templatePath,
          { data: jsonData, serverIp: baseServerIp, timestamp: timestamp },
          (err, html) => {
            if (err) {
              console.error("Error rendering EJS template:", err);
              return res.status(500).send("Error rendering EJS template");
            }


            // Generate PDF from HTML
            const pdfFilename = `Sesizare-${timestamp}.pdf`;

            const options = { format: "A4" };
            const outputPath = path.join(__dirname, "RegistruVerificari", pdfFilename);

            pdf.create(html, options).toFile(outputPath, (err, result) => {
              if (err) {
                console.error("Error creating PDF:", err);
                return res.status(500).send("Error creating PDF");
              }
              
              console.log("PDF created successfully at", outputPath);

              const adminEmail = "oxaniimariuss@gmail.com";
              const subject = `Sesizare registru verificări - ${timestamp}`;
              const text = `Sesizare registru verificări pe data de ${timestamp}`;
              const pdfPath = outputPath;

              // Send email to admin
              sendEmail(adminEmail, subject, text, pdfPath);
              console.log(path.join(__dirname, 'output\\Sesizare-2024-08-04-00.38.pdf'));
              

              // Respond with the path of the saved PDF
              res.status(200).send("PDF created successfully");
            });
          }
        );
      });
    });
  } else {
    res.status(400).send("Content-Encoding must be gzip");
  }
});


const server = app.listen(process.env.PORT || 3000, () => {
  logger.info(`Server started on port ${process.env.PORT || 3000}`);
});

// Handle unexpected server shutdown
const handleShutdown = (signal) => {
  logger.info(`Received ${signal}, shutting down gracefully...`);
  server.close(() => {
    logger.info("Server closed.");
    process.exit(0);
  });
};

// Capture termination signals
process.on("SIGINT", () => handleShutdown("SIGINT"));
process.on("SIGTERM", () => handleShutdown("SIGTERM"));

// Capture unhandled exceptions
process.on("uncaughtException", (err) => {
  logger.error(`Uncaught Exception: ${err.message}`);
  process.exit(1); // Exit process after logging
});

// Capture unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
});
