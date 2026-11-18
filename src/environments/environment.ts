/**
 * Configuración de desarrollo. `apiUrl` es relativa: el proxy de `ng serve` (proxy.conf.json) la redirige al
 * backend en localhost:8080, así el navegador no hace peticiones a otro origen.
 */
export const environment = {
  production: false,
  apiUrl: '/api/v1/sgtg'
};
