import { device } from "./device";
import { slowdown, sleep } from "./timing";
import { RETRIES } from "./config";
import { log } from "../../common/util/log";

/**
 * On Safari when a button or link is inside a shadowRoot click on the
 * parent element will not trigger the button action. For this reason
 * we have to perform the click in pure JS.
 * Reference: https://appiumpro.com/editions/44
 */
export async function shadowClick(
  element: WebdriverIOAsync.Element,
  selector: string
): Promise<void> {
  await device.execute(
    (element, selector) => {
      element.shadowRoot.querySelector(selector).click();
    },
    element,
    selector
  );
}

/**
 * Retry the closure for RETRIES times.
 *
 * @param closure the method that should be retried if it throw an error
 * @param interval number of ms to wait before retry
 */
export async function retry<T>(
  closure: () => Promise<T>,
  interval = 0
): Promise<T> {
  let i = 1;
  let success = false;
  let result;

  while (!success) {
    try {
      result = await closure();
    } catch (e) {
      if (i < RETRIES) {
        i++;
        log.warning("retry after error: ", e);
        await sleep(interval);
        continue;
      } else {
        throw e;
      }
    }
    success = true;
  }
  return result;
}

export async function interact(
  element: WebdriverIOAsync.Element,
  interaction: (element: WebdriverIOAsync.Element) => Promise<void>
): Promise<void> {
  await element.waitForDisplayed();
  await element.scrollIntoView();
  await slowdown();
  await interaction(element);
}
