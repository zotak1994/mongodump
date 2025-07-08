const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const cron = require('node-cron');
require('dotenv').config();

const dumpDir = path.join(__dirname, 'dump');
const archiveDir = path.join(__dirname, 'mongo');

// Ensure directory exists
function ensureDirExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
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

// Run MongoDB dump
function runDump(dumpPath) {
    console.log('🛠️ Starting MongoDB dump...');
    return new Promise((resolve, reject) => {
        const dump = spawn('mongodump', [`--uri=${process.env.MONGODB_URI}`, `--out=${dumpPath}`]);

        dump.stdout?.on('data', data => console.log(`mongodump stdout: ${data}`));
        dump.stderr?.on('data', data => console.error(`mongodump stderr: ${data}`));

        dump.on('close', code => code === 0 ? resolve() : reject(new Error(`mongodump failed with code ${code}`)));
    });
}

// Compress dumped data into ZIP
function compressDump(sourceDir, archivePath) {
    console.log('📦 Compressing MongoDB dump...');
    ensureDirExists(path.dirname(archivePath));

    return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(archivePath);
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

// Upload ZIP to S3
async function uploadToS3(archivePath, timestamp) {
    console.log('☁️ Uploading backup to S3...');

    const s3 = new S3Client({
        region: process.env.REGION,
        credentials: {
            accessKeyId: process.env.ACCESS_KEY_ID,
            secretAccessKey: process.env.SECRET_ACCESS_KEY,
        },
    });

    const fileStream = fs.createReadStream(archivePath);
    const uploadParams = {
        Bucket: process.env.BUCKET_NAME,
        Key: `mongodump/backup-${timestamp}.zip`,
        Body: fileStream,
    };

    await s3.send(new PutObjectCommand(uploadParams));
    console.log('✅ Upload complete!');
}

// Cleanup files
function cleanup(paths) {
    console.log('🧹 Cleaning up temporary files...');
    try {
        fs.rmSync(dumpDir, { recursive: true, force: true });
        fs.rmSync(paths.archivePath, { force: true });
    } catch (err) {
        console.error('Cleanup failed:', err);
    }
}

// Master backup task
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
        cleanup(paths);
    }
}

// Run immediately
performBackup();

// Schedule at 2 AM daily
cron.schedule('0 2 * * *', performBackup);
