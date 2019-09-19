/**
 * Read and return the {name} environment variable or
 * if undefined return {fallback} and if also {fallback}
 * is undefined throw an Error
 *
 * @param {string} name of the env var to return
 * @param {string} fallback value to use if the env var is undefined
 * @throws {Error} when env var and fallback is undefined
 */
function getEnv(name: string, fallback?: string) {
  const value = process.env[name];
  if (value === undefined) {
    if (fallback === undefined) {
      throw new Error(`\'${name}\' environment variable is not defined`);
    } else {
      return fallback;
    }
  }
  return value;
}

export const BROWSERSTACK_USER = getEnv("BROWSERSTACK_USER");
export const BROWSERSTACK_KEY = getEnv("BROWSERSTACK_KEY");
export const BROWSERSTACK_APP = getEnv("BROWSERSTACK_APP");
export const MOBILE_PLATFORM = getEnv("MOBILE_PLATFORM", "android");
