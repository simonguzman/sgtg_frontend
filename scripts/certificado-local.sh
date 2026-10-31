#!/usr/bin/env bash
# Certificado autofirmado para probar docker-compose.prod.yml en el propio equipo (https://localhost).
# El navegador lo marca como no confiable: solo sirve para pruebas. En producción se usa el certificado del
# dominio (ver docs/despliegue-produccion.md).
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p certificados acme
MSYS_NO_PATHCONV=1 docker run --rm -v "$(pwd)/certificados:/certificados" alpine/openssl \
    req -x509 -newkey rsa:2048 -nodes -days 30 -subj "/CN=localhost" \
    -addext "subjectAltName=DNS:localhost,IP:127.0.0.1" \
    -keyout /certificados/privkey.pem -out /certificados/fullchain.pem
echo "Certificado de prueba en ./certificados (vence en 30 días)"
