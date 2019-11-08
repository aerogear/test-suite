import { log } from "../../common/util/log";
export async function stackTrace(cut) {
    // a trick to make the stacktrace better
    await Promise.resolve();
    // retrieve the stack using the error object
    const o = { stack: undefined };
    Error.captureStackTrace(o, cut);
    const stack = o.stack;
    // remove the first line because it is just "Error:"
    const lines = stack.split("\n");
    lines.shift();
    return lines.join("\n");
}
/**
 * This method will execute your async function, and if your function
 * will throw an exception, this method will add his stacktrace to
 * the exception stacktrace in order to make it more verbose
 */
export async function trace(call) {
    const stack = await stackTrace(trace);
    try {
        return await call();
    }
    catch (e) {
        if (e instanceof Error) {
            e.stack = `${e.stack}\n  From:\n${stack}`;
        }
        else {
            log.warning("can't trace exception that are not of type Error: ", e);
        }
        throw e;
    }
}
