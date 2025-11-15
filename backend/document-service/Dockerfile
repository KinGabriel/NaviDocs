FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY . .

# Document-service listens on 8003
ARG PORT=8003
ENV PORT=$PORT

EXPOSE $PORT

CMD ["node", "index.js"]
