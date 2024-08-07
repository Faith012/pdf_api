// logger.js
const winston = require('winston');
const path = require('path');
const fs = require('fs');
const { format, transports } = winston;
const DailyRotateFile = require('winston-daily-rotate-file');
const schedule = require('node-schedule');
const archiver = require('archiver');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'Logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Logger configuration
const logger = winston.createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level}]: ${message}`;
    })
  ),
  transports: [
    new DailyRotateFile({
      filename: path.join(logsDir, 'log_%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxFiles: '7d', // Keep logs for up to 7 days
      format: format.combine(
        format.timestamp(),
        format.printf(({ timestamp, level, message }) => {
          return `${timestamp} [${level}]: ${message}`;
        })
      ),
    }),
    new transports.Console()
  ],
});

module.exports = logger;

// Schedule a job to zip old logs weekly
schedule.scheduleJob('0 0 * * 0', () => { // Runs every Sunday at midnight
  const today = new Date();
  const archiveDateString = today.toISOString().split('T')[0]; // YYYY-MM-DD
  const cutoffDate = new Date();
  cutoffDate.setDate(today.getDate() - 7); // 7 days ago

  const archive = archiver('zip', {
    zlib: { level: 9 }
  });

  const output = fs.createWriteStream(path.join(logsDir, `archive_${archiveDateString}.zip`));
  archive.pipe(output);

  fs.readdir(logsDir, (err, files) => {
    if (err) {
      console.error(`Failed to read directory ${logsDir}: ${err.message}`);
      return;
    }

    files.forEach(file => {
      const fileDateMatch = file.match(/log_(\d{4}-\d{2}-\d{2})\.log/);
      if (fileDateMatch) {
        const fileDate = new Date(fileDateMatch[1]);
        if (fileDate < cutoffDate) {
          archive.file(path.join(logsDir, file), { name: file });
        }
      }
    });

    archive.finalize();
  });
});
