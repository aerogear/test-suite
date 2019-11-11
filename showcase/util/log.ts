import chalk from "chalk";

const prefix = {
  info: chalk.blue("I:"),
  success: chalk.green("S:"),
  warning: chalk.yellow("W:"),
  error: chalk.red("E:")
};

function format(prefix: string, message: string): string {
  return `      ${prefix} ${message}`;
}

function info(message: string, ...optionalParams: unknown[]): void {
  console.log(format(prefix.info, message), ...optionalParams);
}

function success(message: string, ...optionalParams: unknown[]): void {
  console.log(format(prefix.success, message), ...optionalParams);
}

function warning(message: string, ...optionalParams: unknown[]): void {
  console.warn(format(prefix.warning, message), ...optionalParams);
}

function error(message: string, ...optionalParams: unknown[]): void {
  console.warn(format(prefix.error, message), ...optionalParams);
}

export const log = {
  info,
  success,
  warning,
  error
};
