# Use official lightweight Node.js image
FROM node:22-alpine

# Install required packages
RUN apk add --no-cache mongodb-tools 

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install 

# Copy application code
COPY . .

# Start the script
CMD ["node", "backup.js"]
