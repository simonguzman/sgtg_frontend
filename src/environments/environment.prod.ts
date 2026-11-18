/** Configuración de producción. `apiUrl` es relativa: Nginx la redirige al backend (nginx.conf). */
export const environment = {
  production: true,
  apiUrl: '/api/v1/sgtg'
};
