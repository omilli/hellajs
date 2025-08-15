import { logger } from "./common.js";

/**
 * Create a validation result object
 */
export function createValidationResult(errors = [], warnings = []) {
  return { errors, warnings };
}

/**
 * Add an error to the validation results
 */
export function addError(result, message) {
  result.errors.push(message);
  logger.error(message);
  return result;
}

/**
 * Add a warning to the validation results
 */
export function addWarning(result, message) {
  result.warnings.push(message);
  logger.warn(message);
  return result;
}

/**
 * Create a result object for tracking operations
 */
export function createResult(errors = [], previewOperations = []) {
  return { errors, previewOperations };
}

/**
 * Add an operation to the preview list
 */
export function addPreviewOperation(result, type, description, details = {}) {
  result.previewOperations.push({
    type,
    description,
    details
  });
  return result;
}

/**
 * Create a test result object
 */
export function createTestResult(passed = 0, failed = 0, errors = []) {
  return { passed, failed, errors };
}