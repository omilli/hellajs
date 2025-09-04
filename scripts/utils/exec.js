/**
 * Command execution utilities for HellaJS build scripts
 */
import { spawn } from "node:child_process";

/**
 * Execute a command with timeout and proper error handling
 * @param {string} command - Command to execute
 * @param {Array} args - Command arguments
 * @param {Object} options - Execution options
 * @returns {Promise} Promise that resolves with command output
 */
export function execCommand(command, args = [], options = {}) {
	return new Promise((resolve, reject) => {
		const { 
			timeout = 120000, // 2 minutes default
			stdio = ["pipe", "pipe", "pipe"],
			...spawnOptions 
		} = options;
		
		const child = spawn(command, args, {
			stdio,
			...spawnOptions,
		});
		
		let stdout = "",
			stderr = "",
			timer;
			
		if (timeout) {
			timer = setTimeout(() => {
				child.kill("SIGKILL");
				reject(
					new Error(
						`Command timed out after ${timeout}ms: ${command} ${args.join(" ")}`,
					),
				);
			}, timeout);
		}
		
		child.stdout?.on("data", (data) => {
			stdout += data;
		});
		
		child.stderr?.on("data", (data) => {
			stderr += data;
		});
		
		child.on("close", (code) => {
			if (timer) clearTimeout(timer);
			if (code === 0) {
				resolve({ stdout, stderr, code });
			} else {
				reject(
					new Error(
						`Command failed with code ${code}: ${command} ${args.join(" ")}\nStdout: ${stdout}\nStderr: ${stderr}`,
					),
				);
			}
		});
		
		child.on("error", (error) => {
			if (timer) clearTimeout(timer);
			reject(error);
		});
	});
}

/**
 * Execute a command with inherited stdio (for scripts that need terminal interaction)
 * @param {string} command - Command to execute
 * @param {Array} args - Command arguments  
 * @param {Object} options - Execution options
 * @returns {Promise} Promise that resolves with exit code
 */
export function execCommandInherited(command, args = [], options = {}) {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			stdio: "inherit",
			...options,
		});

		child.on("close", (code) => {
			if (code === 0) {
				resolve({ code });
			} else {
				reject(new Error(`Command failed with exit code ${code}`));
			}
		});

		child.on("error", (error) => {
			reject(error);
		});
	});
}