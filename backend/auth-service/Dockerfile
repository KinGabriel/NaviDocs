FROM node:18-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev
COPY . .
ARG PORT=8006
ENV PORT=$PORT
EXPOSE $PORT

CMD ["node", "index.js"]
