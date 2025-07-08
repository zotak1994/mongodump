const { spawn } = require('child_process');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const archiver = require('archiver');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const cron = require('node-cron');
require('dotenv').config();

const dumpDir = path.join(__dirname, 'dump');
const archiveDir = path.join(__dirname, 'mongo');

// Ensure directory exists (async)
async function ensureDirExists(dirPath) {
    try {
        await fs.mkdir(dirPath, { recursive: true });
    } catch (err) {
        if (err.code !== 'EEXIST') throw err;
    }
}

// Generate paths using current timestamp
function generatePaths() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return {
        timestamp,
        archivePath: path.join(archiveDir, `backup-${timestamp}.zip`),
    };
}

// Run MongoDB dump (async)
async function runDump(dumpPath) {
    console.log('🛠️ Starting MongoDB dump...');
    await ensureDirExists(dumpPath);
    return new Promise((resolve, reject) => {
        const dump = spawn('mongodump', [`--uri=${process.env.MONGODB_URI}`, `--out=${dumpPath}`]);
        dump.on('close', code => code === 0 ? resolve() : reject(new Error(`mongodump failed with code ${code}`)));
    });
}

// Compress dumped data into ZIP (async)
async function compressDump(sourceDir, archivePath) {
    console.log('📦 Compressing MongoDB dump...');
    await ensureDirExists(path.dirname(archivePath));
    return new Promise((resolve, reject) => {
        const output = fsSync.createWriteStream(archivePath);
        const archive = archiver('zip', { zlib: { level: 9 } });
        output.on('close', () => {
            console.log(`📁 Archive created: ${archive.pointer()} bytes`);
            resolve();
        });
        archive.on('error', reject);
        archive.pipe(output);
        archive.directory(sourceDir, false);
        archive.finalize();
    });
}

// Upload ZIP to S3 (async)
async function uploadToS3(archivePath, timestamp) {
    console.log('☁️ Uploading backup to S3...');
    const s3 = new S3Client({
        region: process.env.REGION,
        credentials: {
            accessKeyId: process.env.ACCESS_KEY_ID,
            secretAccessKey: process.env.SECRET_ACCESS_KEY,
        },
    });
    const fileStream = fsSync.createReadStream(archivePath);
    const uploadParams = {
        Bucket: process.env.BUCKET_NAME,
        Key: `mongodump/backup-${timestamp}.zip`,
        Body: fileStream,
    };
    await s3.send(new PutObjectCommand(uploadParams));
    console.log(`☁️ Backup uploaded to S3: ${uploadParams.Key}`);
    console.log('✅ Upload complete!');
}

// Cleanup files (async)
async function cleanup(paths) {
    console.log('🧹 Cleaning up temporary files...');
    try {
        await fs.rm(dumpDir, { recursive: true, force: true });
        await fs.rm(paths.archivePath, { force: true });
    } catch (err) {
        console.error('Cleanup failed:', err);
    }
}

// Master backup task (async)
async function performBackup() {
    const paths = generatePaths();
    try {
        await runDump(dumpDir);
        await compressDump(dumpDir, paths.archivePath);
        await uploadToS3(paths.archivePath, paths.timestamp);
        console.log('✅ Backup and upload complete!');
    } catch (err) {
        console.error(`❌ Error during backup at ${new Date().toISOString()}:`, err);
    } finally {
        await cleanup(paths);
    }
}

console.log('🔔 MongoDB backup script initialized.');

// Schedule at 2 AM daily in a specific timezone (e.g., Asia/Kolkata)
cron.schedule(process.env.CRON_EXPRESSION || '0 2 * * *', performBackup, {
    timezone: process.env.TIMEZONE || 'Asia/Kolkata'
});
