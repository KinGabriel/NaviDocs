FROM node:18-bullseye-slim
RUN apt-get update && apt-get install -y \
		ca-certificates \
		fonts-liberation \
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
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
COPY package.json package-lock.json* ./
RUN npm ci --production --silent
COPY . .
RUN mkdir -p /app/uploads
VOLUME ["/app/uploads"]
ENV PORT=${PORT:-8004}
EXPOSE ${PORT}

CMD ["node", "index.js"]
