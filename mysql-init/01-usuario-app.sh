#!/bin/bash
# Usuario de la aplicación en producción (docker-compose.prod.yml). Lo ejecuta la imagen de MySQL una sola vez,
# al crear la base vacía. Puede leer y escribir datos, pero no cambiar el esquema (CREATE, ALTER, DROP,
# TRIGGER): eso lo hace el paso de migración con el usuario administrador. Solo se conecta por TLS.
# La auditoría además tiene triggers que rechazan UPDATE y DELETE (los crea la migración).
set -euo pipefail

if [[ ! "${SGTG_DB_PASSWORD}" =~ ^[A-Za-z0-9]{24,}$ ]]; then
    echo "SGTG_DB_PASSWORD debe tener al menos 24 letras o dígitos (ej. openssl rand -hex 24)" >&2
    exit 1
fi

mysql --protocol=socket -uroot -p"${MYSQL_ROOT_PASSWORD}" <<SQL
CREATE USER IF NOT EXISTS 'sgtg_app'@'%' IDENTIFIED BY '${SGTG_DB_PASSWORD}' REQUIRE SSL;
GRANT SELECT, INSERT, UPDATE, DELETE ON sgtg.* TO 'sgtg_app'@'%';
FLUSH PRIVILEGES;
SQL
