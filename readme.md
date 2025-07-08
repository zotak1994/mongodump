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

### 1️⃣ Clone the Repo

```bash
git clone https://github.com/your-org/mongo-backup.git
cd mongo-backup
