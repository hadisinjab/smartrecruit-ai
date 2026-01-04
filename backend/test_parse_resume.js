import fs from 'fs';
import { parseResume } from './utils/parseResume.js';

async function test() {
  try {
    const filePath = process.argv[2];
    if (!filePath) {
      console.log('Usage: node test_parse_resume.js <path-to-resume.pdf>');
      process.exit(1);
    }

    console.log('Reading file:', filePath);
    const buffer = fs.readFileSync(filePath);
    const fileType = filePath.endsWith('.pdf') ? 'pdf' : 'docx';

    console.log('Parsing resume...\n');
    const startTime = Date.now();
    const result = await parseResume(buffer, fileType);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('='.repeat(50));
    console.log('PARSING RESULTS');
    console.log('='.repeat(50));
    console.log(JSON.stringify(result, null, 2));
    console.log('='.repeat(50));
    console.log(`Total time: ${duration}s`);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

test();

