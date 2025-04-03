#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Get the project root directory
const projectRoot = path.resolve(__dirname, '..');

// PID file path
const pidFile = path.join(projectRoot, '.server.pid');

/**
 * Kill any existing Node.js processes
 */
function killExistingProcesses() {
  try {
    // Check if PID file exists
    if (fs.existsSync(pidFile)) {
      const pid = fs.readFileSync(pidFile, 'utf8');
      try {
        // Try to kill the process
        execSync(`kill -9 ${pid} 2>/dev/null || true`);
        console.log(`Killed existing server process (PID: ${pid})`);
      } catch (err) {
        // Process might not exist anymore
        console.log('No existing server process found');
      }
      // Remove the PID file
      fs.unlinkSync(pidFile);
    }
    
    // Kill any other Node.js processes that might be using our port
    try {
      execSync('pkill -f "node src/index.js" || true');
      console.log('Killed any other Node.js processes');
    } catch (err) {
      // No processes to kill
    }
  } catch (err) {
    console.error('Error killing processes:', err.message);
  }
}

/**
 * Start the server
 */
function startServer() {
  try {
    // Kill any existing processes
    killExistingProcesses();
    
    // Start the server
    console.log('Starting server...');
    const child = execSync('npm run dev', { stdio: 'inherit' });
    
    // Get the PID of the new process
    const pid = child.pid;
    
    // Save the PID to a file
    fs.writeFileSync(pidFile, pid.toString());
    
    console.log(`Server started with PID: ${pid}`);
  } catch (err) {
    console.error('Error starting server:', err.message);
  }
}

/**
 * Stop the server
 */
function stopServer() {
  try {
    // Kill any existing processes
    killExistingProcesses();
    console.log('Server stopped');
  } catch (err) {
    console.error('Error stopping server:', err.message);
  }
}

/**
 * Restart the server
 */
function restartServer() {
  stopServer();
  startServer();
}

// Parse command line arguments
const command = process.argv[2] || 'start';

// Execute the appropriate command
switch (command) {
  case 'start':
    startServer();
    break;
  case 'stop':
    stopServer();
    break;
  case 'restart':
    restartServer();
    break;
  default:
    console.log('Unknown command. Use: start, stop, or restart');
} 