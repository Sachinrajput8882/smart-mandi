const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('===========================================================');
console.log('🌾 Starting Smart Mandi Queue Management System...');
console.log('===========================================================');

const backendDir = path.join(__dirname, 'backend');
const frontendDir = path.join(__dirname, 'frontend');

const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

// Verify backend dependencies
if (!fs.existsSync(path.join(backendDir, 'node_modules'))) {
  console.log('📦 Installing backend dependencies...');
  execSync(`${npmCmd} install`, { cwd: backendDir, stdio: 'inherit' });
}

// Verify frontend dependencies
if (!fs.existsSync(path.join(frontendDir, 'node_modules'))) {
  console.log('📦 Installing frontend dependencies...');
  execSync(`${npmCmd} install`, { cwd: frontendDir, stdio: 'inherit' });
}

// 1. Launch Backend (Express)
const backend = spawn('node', ['src/server.js'], {
  cwd: backendDir,
  stdio: 'inherit',
  shell: isWindows
});

// 2. Launch Frontend (Vite)
const frontend = spawn(npmCmd, ['run', 'dev', '--', '--host'], {
  cwd: frontendDir,
  stdio: 'inherit',
  shell: isWindows
});

backend.on('error', (err) => console.error('Backend process error:', err));
frontend.on('error', (err) => console.error('Frontend process error:', err));

const killProcess = (proc) => {
  if (!proc || !proc.pid) return;
  if (isWindows) {
    try {
      execSync(`taskkill /pid ${proc.pid} /T /F`, { stdio: 'ignore' });
    } catch (_) {}
  } else {
    proc.kill('SIGINT');
  }
};

process.on('SIGINT', () => {
  console.log('\nShutting down Smart Mandi servers...');
  killProcess(backend);
  killProcess(frontend);
  process.exit(0);
});

process.on('SIGTERM', () => {
  killProcess(backend);
  killProcess(frontend);
  process.exit(0);
});
