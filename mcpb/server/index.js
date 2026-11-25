'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

function isExecutable(filePath) {
  if (!filePath) return false;
  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) return false;
    if (process.platform !== 'win32') {
      fs.accessSync(filePath, fs.constants.X_OK);
    }
    return true;
  } catch {
    return false;
  }
}

function findKqBinary() {
  const isWin = process.platform === 'win32';
  const exeName = isWin ? 'kq.exe' : 'kq';
  const candidates = [];

  if (process.env.KQ_BIN) {
    candidates.push(process.env.KQ_BIN);
  }

  const pathEnv = process.env.PATH || '';
  for (const dir of pathEnv.split(path.delimiter)) {
    if (dir) candidates.push(path.join(dir, exeName));
  }

  const home = os.homedir();
  if (home) {
    candidates.push(path.join(home, '.local', 'bin', exeName));
    candidates.push(path.join(home, '.cargo', 'bin', exeName));
  }

  if (isWin && process.env.USERPROFILE) {
    candidates.push(path.join(process.env.USERPROFILE, '.local', 'bin', exeName));
    candidates.push(path.join(process.env.USERPROFILE, '.cargo', 'bin', exeName));
  }

  if (!isWin) {
    candidates.push('/opt/homebrew/bin/kq');
    candidates.push('/usr/local/bin/kq');
    candidates.push('/usr/bin/kq');
  }

  for (const candidate of candidates) {
    if (isExecutable(candidate)) {
      return candidate;
    }
  }
  return null;
}

const kqBin = findKqBinary();
if (!kqBin) {
  const installCmd =
    process.platform === 'win32'
      ? 'powershell -ExecutionPolicy ByPass -c "irm https://raw.githubusercontent.com/kolto-labs/kotor-mcp/main/scripts/install.ps1 | iex"'
      : 'curl -LsSf https://raw.githubusercontent.com/kolto-labs/kotor-mcp/main/scripts/install.sh | sh';
  process.stderr.write(
    `kotor-mcp: could not find the \`kq\` binary on PATH or in ~/.local/bin.\n` +
      `Install kq 0.5.0+ and retry:\n  ${installCmd}\n`
  );
  process.exit(1);
}

const child = spawn(kqBin, ['mcp', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: process.env
});

child.on('error', (err) => {
  process.stderr.write(`kotor-mcp: failed to launch ${kqBin}: ${err.message}\n`);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
