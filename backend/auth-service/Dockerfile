FROM node:18-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --production
COPY . .
# Allow build/run-time PORT to be provided; default to 5006
ENV PORT=${PORT:-5006}
# EXPOSE declares the container port; use the ARG so it reflects the configured PORT
EXPOSE ${PORT}
CMD ["node", "index.js"]
