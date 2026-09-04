import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import router from './routes';
import { startMockService } from './services/mockService';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const MOCK_MODE = process.env.MOCK_MODE === 'true' || true; // Enable by default as requested

app.use(cors());
app.use(express.json());

app.use('/api', router);

if (MOCK_MODE) {
  startMockService();
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  if (MOCK_MODE) {
    console.log('MOCK_MODE is enabled');
  }
});
