# 🛡️ MongoDB Backup to S3 (Dockerized)

A lightweight Docker container that performs scheduled MongoDB backups, compresses them, and uploads them to AWS S3.

Built for portability and ease-of-use — just provide your environment variables and you're ready to go!

---

## 📦 Features

- ✅ Uses `mongodump` to back up MongoDB
- ✅ Compresses backups into `.zip`
- ✅ Uploads to AWS S3
- ✅ Schedules backups using `cron`
- ✅ Runs in Indian Standard Time (IST)
- ✅ Fully Dockerized — no setup needed on host machine

---

## 🚀 Quick Start

### 1️⃣ Set Environment Variables

Create a `.env` file with the following variables:

```env
MONGODB_URI=...
ACCESS_KEY_ID=...
SECRET_ACCESS_KEY=...
BUCKET_NAME=bt-mmp-prod
REGION=ap-south-1
CRON_EXPRESSION=* * * * *
```

### 2️⃣ Run with Docker

```bash
docker run -d --env-file .env zotak007/mongo-backup
```
