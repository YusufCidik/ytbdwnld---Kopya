import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { execSync, spawn } from 'child_process';
import os from 'os';

// Path to local binaries if they exist (for portable bundling)
const isPkg = process.pkg !== undefined;
const localBinPath = process.env.BIN_PATH || path.join(process.cwd(), 'bin');
const localYtDlp = path.join(localBinPath, 'yt-dlp.exe');
const localFfmpeg = path.join(localBinPath, 'ffmpeg.exe');

const getYtDlpCommand = () => fs.existsSync(localYtDlp) ? localYtDlp : 'yt-dlp';
const getFfmpegCommand = () => fs.existsSync(localFfmpeg) ? localFfmpeg : 'ffmpeg';

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors()); // Allow all origins for web deployment
app.use(express.json());

// Check if FFmpeg is available
let ffmpegAvailable = false;
try {
  execSync(`"${getFfmpegCommand()}" -version`, { stdio: 'ignore' });
  ffmpegAvailable = true;
  console.log(`FFmpeg detected (${fs.existsSync(localFfmpeg) ? 'Local' : 'System'}), high-quality (1080p/4K) merging enabled.`);
} catch (e) {
  ffmpegAvailable = false;
  console.warn('FFmpeg NOT detected. Downloads will be limited to 720p or lower.');
}

// In-memory store for download tasks progress
const tasks = new Map();

app.get('/api/status', (req, res) => {
  res.json({ ffmpeg: ffmpegAvailable });
});

// SSE endpoint for progress updates
app.get('/api/progress/:taskId', (req, res) => {
  const { taskId } = req.params;
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  console.log(`SSE connection opened for task: ${taskId}`);

  const interval = setInterval(() => {
    const progressData = tasks.get(taskId);
    if (progressData) {
      res.write(`data: ${JSON.stringify(progressData)}\n\n`);
      
      // If completed or failed, remove from map and close connection
      if (progressData.status === 'completed' || progressData.status === 'error') {
        clearInterval(interval);
        res.end();
        // Delay task removal slightly to ensure client gets the last message
        setTimeout(() => tasks.delete(taskId), 5000);
      }
    }
  }, 1000);

  req.on('close', () => {
    clearInterval(interval);
    console.log(`SSE connection closed for task: ${taskId}`);
  });
});

// Get video metadata
app.get('/api/info', (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  const ytDlp = spawn(getYtDlpCommand(), [
    '--dump-json',
    '--flat-playlist',
    url
  ]);

  let output = '';
  ytDlp.stdout.on('data', (data) => {
    output += data.toString();
  });

  ytDlp.on('close', (code) => {
    if (code !== 0) {
      return res.status(500).json({ error: 'Failed to fetch video info' });
    }
    try {
      const info = JSON.parse(output);
      res.json(info);
    } catch (e) {
      res.status(500).json({ error: 'Failed to parse video info' });
    }
  });
});

// Download video/audio
app.get('/api/download', async (req, res) => {
  const { url, format, quality, taskId } = req.query;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  // Initialize task in map if taskId is provided
  if (taskId) {
    tasks.set(taskId, { progress: 0, status: 'downloading', message: 'Başlatılıyor...', speed: '', eta: '' });
  }

  const isHighQuality = (quality === '1080p' || quality === '4K');
  const tempDir = os.tmpdir();
  const tempFilename = `ytbpro_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const finalExt = format === 'mp3' ? 'mp3' : 'mp4';
  const tempFilePath = path.join(tempDir, `${tempFilename}.${finalExt}`);

  console.log(`Starting download for: ${url} (Quality: ${quality}, Format: ${format}, Task: ${taskId})`);

  let args = [];
  
  if (format === 'mp3') {
    args.push('-x', '--audio-format', 'mp3', '--audio-quality', '0', '-o', tempFilePath, url);
  } else {
    let formatStr = 'bestvideo+bestaudio/best';
    
    if (!ffmpegAvailable && isHighQuality) {
      console.warn(`Requested ${quality} but FFmpeg is missing. Falling back to best available single file.`);
      formatStr = 'best';
    } else {
      if (quality === '4K') {
        formatStr = 'bestvideo[height<=2160]+bestaudio/best';
      } else if (quality === '1080p') {
        formatStr = 'bestvideo[height<=1080]+bestaudio/best';
      } else if (quality === '720p') {
        formatStr = 'bestvideo[height<=720]+bestaudio/best';
      }
    }

    args.push('-f', formatStr);
    
    if (ffmpegAvailable) {
      args.push('--merge-output-format', 'mp4');
      // Force AAC audio for MP4 compatibility in Windows (avoids Opus issues)
      args.push('--postprocessor-args', 'merger:-c:a aac');
    }
    
    // Add --newline for easier progress parsing
    args.push('--newline');
    
    args.push('-o', tempFilePath);
    args.push(url);
  }

  const ytDlp = spawn(getYtDlpCommand(), args);

  // Parse progress from stdout (yt-dlp default stream for progress)
  ytDlp.stdout.on('data', (data) => {
    const msg = data.toString();
    console.log(`yt-dlp stdout: ${msg}`); // Keep for server-side debugging
    
    if (taskId) {
      // Regex for progress: [download]  12.0% of 100.00MiB at 10.00MiB/s ETA 00:05
      // With --newline, each line is clean
      const progressMatch = msg.match(/\[download\]\s+(\d+\.\d+)%\s+of\s+\S+\s+at\s+(\S+)\s+ETA\s+(\S+)/);
      if (progressMatch) {
        tasks.set(taskId, {
          progress: parseFloat(progressMatch[1]),
          status: 'downloading',
          message: 'Video İndiriliyor...',
          speed: progressMatch[2],
          eta: progressMatch[3]
        });
      }

      if (msg.includes('[Merger]')) {
        tasks.set(taskId, { progress: 100, status: 'merging', message: 'Ses ve Görüntü Birleştiriliyor (4K/1080p)...', speed: '', eta: '' });
      }
    }
  });

  let errorOutput = '';
  ytDlp.stderr.on('data', (data) => {
    const msg = data.toString();
    console.log(`yt-dlp stderr: ${msg}`);

    if (msg.includes('ERROR:')) {
      errorOutput += msg;
      console.error(`yt-dlp error: ${msg}`);
      if (taskId) tasks.set(taskId, { status: 'error', message: 'İndirme hatası oluştu' });
    }
  });

  ytDlp.on('close', (code) => {
    if (code !== 0) {
      console.error(`yt-dlp exited with code ${code}. Error: ${errorOutput}`);
      if (taskId) tasks.set(taskId, { status: 'error', message: 'İndirme tamamlanamadı' });
      if (!res.headersSent) {
        return res.status(500).json({ error: 'Download failed', details: errorOutput });
      }
      return;
    }

    if (taskId) tasks.set(taskId, { progress: 100, status: 'completed', message: 'Hazır! İndirme başlıyor...' });

    // Check if file exists (it might have a slightly different name if yt-dlp added an extension)
    let actualFilePath = tempFilePath;
    if (!fs.existsSync(actualFilePath)) {
      const files = fs.readdirSync(tempDir);
      const found = files.find(f => f.startsWith(tempFilename));
      if (found) {
        actualFilePath = path.join(tempDir, found);
      } else {
        if (!res.headersSent) return res.status(500).json({ error: 'File not found after download' });
        return;
      }
    }

    const stats = fs.statSync(actualFilePath);
    const downloadName = `YTB_PRO_${quality || 'video'}_${Date.now()}${path.extname(actualFilePath)}`;

    res.setHeader('Content-Type', format === 'mp3' ? 'audio/mpeg' : 'video/mp4');
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);

    const fileStream = fs.createReadStream(actualFilePath);
    fileStream.pipe(res);

    fileStream.on('end', () => {
      try {
        fs.unlinkSync(actualFilePath);
        console.log(`Cleaned up temp file: ${actualFilePath}`);
      } catch (e) {
        console.error(`Failed to cleanup temp file: ${e.message}`);
      }
    });

    fileStream.on('error', (err) => {
      console.error(`Stream error: ${err.message}`);
    });
  });

  req.on('close', () => {
    if (ytDlp.exitCode === null) {
      ytDlp.kill();
      setTimeout(() => {
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      }, 10000);
    }
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Binary Status: yt-dlp(${getYtDlpCommand()}), ffmpeg(${getFfmpegCommand()})`);
});
