import chalk from "chalk";

function info(message: string, ...optionalParams: any[]) {
  console.log(`${chalk.blue("I:")} ${message}`, ...optionalParams);
}

function success(message: string, ...optionalParams: any[]) {
  console.log(`${chalk.green("S:")} ${message}`, ...optionalParams);
}

function warning(message: string, ...optionalParams: any[]) {
  console.warn(`${chalk.yellow("W:")} ${message}`, ...optionalParams);
}

function error(message: string, ...optionalParams: any[]) {
  console.warn(`${chalk.red("E:")} ${message}`, ...optionalParams);
}

export const log = {
  info,
  success,
  warning,
  error
};
