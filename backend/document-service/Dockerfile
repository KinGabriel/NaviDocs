FROM node:18-bullseye-slim

RUN apt-get update && apt-get install -y \
	ca-certificates \
	fonts-liberation \
	fonts-dejavu-core \
	libatk1.0-0 \
	libatk-bridge2.0-0 \
	libcups2 \
	libx11-xcb1 \
	libxcomposite1 \
	libxdamage1 \
	libxrandr2 \
	libgbm1 \
	libasound2 \
	libnss3 \
	libgtk-3-0 \
	wget \
	chromium \
	--no-install-recommends && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --silent

COPY . .

# Document-service listens on 8003
ARG PORT=8003
ENV PORT=$PORT

EXPOSE $PORT

CMD ["node", "index.js"]
