# syntax=docker/dockerfile:1

############################
# 1) Build (Angular)      #
############################
FROM node:20-bookworm AS build

WORKDIR /app

# Copiamos primero manifests para cachear npm install
COPY package*.json ./

RUN npm ci

# Copiar el resto del código
COPY . .

# Build de producción
RUN npm run build

############################
# 2) Runtime (Nginx)      #
############################
FROM nginx:1.27-alpine AS runtime

# Limpieza y copia del build
RUN rm -rf /usr/share/nginx/html/*
COPY --from=build /app/dist/ /usr/share/nginx/html/

# Config SPA routing
COPY ./nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

