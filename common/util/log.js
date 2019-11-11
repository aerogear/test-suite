const chalk = require('chalk');

const prefix = {
  info: chalk.blue("I:"),
  success: chalk.green("S:"),
  warning: chalk.yellow("W:"),
  error: chalk.red("E:")
};

/**
 * @param {string} prefix 
 * @param {string} message 
 * @returns {string}
 */
function format(prefix, message) {
  return `      ${prefix} ${message}`;
}

/**
 * @param {string} message 
 * @param  {...unknown} optionalParams 
 */
function info(message, ...optionalParams) {
  console.log(format(prefix.info, message), ...optionalParams);
}

/**
 * @param {string} message 
 * @param  {...unknown} optionalParams 
 */
function success(message, ...optionalParams) {
  console.log(format(prefix.success, message), ...optionalParams);
}

/**
 * @param {string} message 
 * @param  {...unknown} optionalParams 
 */
function warning(message, ...optionalParams) {
  console.warn(format(prefix.warning, message), ...optionalParams);
}

/**
 * @param {string} message 
 * @param  {...unknown} optionalParams 
 */
function error(message, ...optionalParams) {
  console.warn(format(prefix.error, message), ...optionalParams);
}

module.exports = {
  log: { info, success, warning, error, }
};
