FROM node:18-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --production
COPY . .
# Allow build/run-time PORT to be provided; default to 5008
ENV PORT=${PORT:-8008}
EXPOSE ${PORT}
CMD ["node", "index.js"]
