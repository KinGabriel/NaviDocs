FROM node:18-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci --only=production --silent; else npm install --only=production --silent; fi
COPY . .
ENV PORT=${PORT-8000}
EXPOSE ${PORT}
CMD ["node", "server.js"]
