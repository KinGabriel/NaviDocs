import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
const PORT = process.env.PORT || 3000;
// const API_SERVICE_URL = process.env.API_SERVICE_URL || 'http://localhost:5000';

// Proxy endpoints
app.use('/api', createProxyMiddleware({
  target: '',
  changeOrigin: true,
}));

app.use('/api', createProxyMiddleware({
  target: '',
  changeOrigin: true,
}));
app.listen(PORT, () => console.log('API Gateway running on port ' + PORT));