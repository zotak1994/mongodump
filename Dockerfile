# Use official lightweight Node.js image
FROM node:18-alpine

# Set environment timezone to IST
ENV TZ=Asia/Kolkata

# Install required packages
RUN apk add --no-cache \
    mongodb-tools \
    tzdata

# Set system timezone to Asia/Kolkata
RUN cp /usr/share/zoneinfo/Asia/Kolkata /etc/localtime && \
    echo "Asia/Kolkata" > /etc/timezone

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install 

# Copy application code
COPY . .

# Create necessary directories
#RUN mkdir -p /app/dump /app/mongo

# Expose volume (optional, if users want to persist data)
#VOLUME ["/app/mongo"]

# Start the script
CMD ["node", "backup.js"]
