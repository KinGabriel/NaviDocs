FROM node:18-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --production
COPY . .
ENV PORT=${PORT:-5007}
EXPOSE ${PORT}
CMD ["node", "index.js"]
