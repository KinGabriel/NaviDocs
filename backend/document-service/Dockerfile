FROM node:18-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --production
COPY . .
# Allow build/run-time PORT to be provided; default to 5003
ENV PORT=${PORT:-5003}
EXPOSE ${PORT}
CMD ["node", "index.js"]
