import { execSync } from 'child_process';

try {
  if (process.platform === 'win32') {
    execSync('powershell -Command "Get-NetTCPConnection -LocalPort 5000, 3000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"', { stdio: 'ignore' });
  } else {
    execSync('fuser -k 5000/tcp 3000/tcp || true', { stdio: 'ignore' });
  }
  console.log('✅ Ports 5000 and 3000 are ready.');
} catch {
  console.log('✅ Ports are ready.');
}
