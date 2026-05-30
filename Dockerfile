# syntax=docker/dockerfile:1

############################
# 1) Build (Angular)       #
############################
FROM node:20-bookworm AS build

WORKDIR /app

# Copiamos primero manifests para cachear npm install
COPY package*.json ./

RUN npm ci

# Copiar el resto del código
COPY . .

# Build de producción (esto crea la carpeta que usaremos abajo)
RUN npm run build

############################
# 2) Runtime (Nginx)       #
############################
FROM nginx:1.27-alpine AS runtime

# Limpieza previa
RUN rm -rf /usr/share/nginx/html/*

# Aquí traemos la carpeta generada en la fase 1 (build)
COPY --from=build /app/dist/sgtg-prueba/browser/ /usr/share/nginx/html/

# Copia de la configuración de enrutado y proxy inverso
COPY ./nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
