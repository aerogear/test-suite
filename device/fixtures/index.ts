import * as helpers from "tslib";
import { modules } from "./modules";

// expose all typescript helpers globally
for (const key in helpers) {
  // eslint-disable-next-line no-prototype-builtins
  if (helpers.hasOwnProperty(key)) {
    window[key] = helpers[key];
  }
}

// set _this globally to avoid typescript issue "_this is not defined"
// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
// @ts-ignore
window._this = null;

// initialize the universe where everyone can store everything
// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
// @ts-ignore
window.universe = {};

// expose modules globally
// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
// @ts-ignore
window.modules = modules;
