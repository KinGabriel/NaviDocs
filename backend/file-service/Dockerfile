FROM node:18-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --production
COPY . .
# Use PORT from env file; ensure uploads folder exists and expose for documentation
RUN mkdir -p /app/uploads
VOLUME ["/app/uploads"]
ENV PORT=${PORT:-5004}
EXPOSE ${PORT}
CMD ["node", "index.js"]
