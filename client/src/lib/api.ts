import axios from 'axios';
import { getTelemetryHeaders } from '@/lib/telemetry';

const api = axios.create({
  baseURL: '/api', // Proxy handles the rest
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  Object.assign(config.headers, getTelemetryHeaders());
  return config;
});

export default api;
