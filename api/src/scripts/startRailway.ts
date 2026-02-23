import { spawn } from 'node:child_process';

const runCommand = (command: string, args: string[]): Promise<void> =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      env: process.env,
    });

    child.on('error', reject);

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(' ')} exited with code ${code ?? 'unknown'}.`));
    });
  });

const bootstrap = async (): Promise<void> => {
  const persistenceDriver = process.env.PERSISTENCE_DRIVER ?? 'in-memory';

  if (persistenceDriver === 'postgres') {
    await runCommand('node', ['dist/scripts/migrate.js']);
  }

  await runCommand('node', ['dist/server.js']);
};

bootstrap().catch((error) => {
  console.error('Railway bootstrap failed:', error);
  process.exit(1);
});
