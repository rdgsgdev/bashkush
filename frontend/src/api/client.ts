import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export const api = axios.create({
  baseURL: `${baseURL}/api`,
  timeout: 15000,
});

// En dev, avertir si l'URL backend n'est pas configurée.
if (!import.meta.env.VITE_API_URL && import.meta.env.DEV) {
  // eslint-disable-next-line no-console
  console.warn(
    '⚠️ VITE_API_URL non défini — utilisation de http://localhost:4000. Copiez .env.example en .env si besoin.',
  );
}
