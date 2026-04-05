# Use a formal Node.js lts image
FROM node:20-slim

# Install system dependencies (ffmpeg and yt-dlp requirements)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp directly
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy server source code
COPY . .

# Ensure the server listens on the correct port
ENV PORT=5000
EXPOSE 5000

# Start the server
CMD ["node", "index.js"]
