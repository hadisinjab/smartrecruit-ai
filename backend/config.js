import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// تحميل متغيرات البيئة بشكل ذكي من backend/.env أو الجذر/.env
const backendEnvPath = path.resolve(__dirname, '.env');
const rootEnvPath = path.resolve(process.cwd(), '.env');
const chosenEnv =
  fs.existsSync(backendEnvPath) ? backendEnvPath :
  (fs.existsSync(rootEnvPath) ? rootEnvPath : null);

if (chosenEnv) {
  dotenv.config({ path: chosenEnv });
} else {
  dotenv.config(); // محاولة افتراضية
}
