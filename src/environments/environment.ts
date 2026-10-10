export const environment = {
  production: false,
  // Ruta relativa: en desarrollo la redirige al backend (localhost:8080) el proxy de
  // `ng serve` (proxy.conf.json), así el navegador no hace peticiones de otro origen
  apiUrl: '/api/v1/sgtg'
};
