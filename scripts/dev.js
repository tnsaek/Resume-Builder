import { spawn } from 'node:child_process';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const processes = [
  { name: 'server', args: ['--prefix', 'server', 'run', 'dev'] },
  { name: 'client', args: ['--prefix', 'client', 'run', 'dev'] }
];

const children = processes.map(({ name, args }) => {
  const child = spawn(npmCommand, args, {
    stdio: 'inherit',
    shell: false
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      console.log(`[${name}] stopped by ${signal}`);
      return;
    }

    if (code !== 0) {
      console.error(`[${name}] exited with code ${code}`);
      stopAll();
      process.exit(code);
    }
  });

  return child;
});

const stopAll = () => {
  for (const child of children) {
    if (!child.killed) child.kill();
  }
};

process.on('SIGINT', () => {
  stopAll();
  process.exit(0);
});

process.on('SIGTERM', () => {
  stopAll();
  process.exit(0);
});
