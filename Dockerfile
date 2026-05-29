############################
# 2) Runtime (Nginx)      #
############################
FROM nginx:1.27-alpine AS runtime

# Limpieza previa
RUN rm -rf /usr/share/nginx/html/*

# IMPORTANTE: Ajusta 'Sistema-de-gesti-n-de-trabajos-de-grado' por el nombre real de tu proyecto
COPY --from=build /app/dist/Sistema-de-gesti-n-de-trabajos-de-grado/browser/ /usr/share/nginx/html/

# Copia de la configuración de enrutado y proxy inverso
COPY ./nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
