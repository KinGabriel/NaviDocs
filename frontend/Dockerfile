FROM node:22-alpine AS build  
WORKDIR /app

# Build arguments (provided at docker build time)
ARG VITE_API_URL
ARG TIPTAP_REGISTRY_TOKEN


ENV VITE_API_URL=${VITE_API_URL}
ENV TIPTAP_REGISTRY_TOKEN=${TIPTAP_REGISTRY_TOKEN}

# Copy package files + .npmrc (for Tiptap Pro auth)
COPY package.json package-lock.json* .npmrc ./

# Install deps
RUN npm ci

# Copy rest of the source
COPY . .

RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
