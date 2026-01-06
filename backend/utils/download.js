
import fs from 'fs';
import path from 'path';
// import fetch from 'node-fetch'; // Native fetch in Node 18+
import { pipeline } from 'stream';
import { promisify } from 'util';

const streamPipeline = promisify(pipeline);

/**
 * Download a file from a URL to a temporary path.
 * @param {string} url - The URL to download from
 * @param {string} extension - File extension (e.g., '.pdf', '.wav')
 * @returns {Promise<string>} Path to the downloaded temp file
 */
export async function downloadFile(url, extension = '') {
  if (!url) throw new Error('URL is required for download');
  
  // Basic validation for extension or extract from URL
  if (!extension) {
    extension = path.extname(url.split('?')[0]) || '.tmp';
  }
  if (!extension.startsWith('.')) extension = '.' + extension;

  const tempPath = path.resolve(`temp_dl_${Date.now()}_${Math.random().toString(36).substr(2, 5)}${extension}`);
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }
    
    await streamPipeline(response.body, fs.createWriteStream(tempPath));
    return tempPath;
  } catch (error) {
    // Cleanup if partial file exists
    if (fs.existsSync(tempPath)) {
      try { fs.unlinkSync(tempPath); } catch (e) {}
    }
    throw error;
  }
}
