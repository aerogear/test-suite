import { device } from "./device";
import { slowdown } from "./timing";

/**
 * On Safari when a button or link is inside a shadowRoot click on the
 * parent element will not trigger the button action. For this reason
 * we have to perform the click in pure JS.
 * Reference: https://appiumpro.com/editions/44
 */
export async function shadowClick(
  element: WebdriverIOAsync.Element,
  selector: string
) {
  await device.execute(
    (element, selector) => {
      element.shadowRoot.querySelector(selector).click();
    },
    element,
    selector
  );
}

export async function interact(
  element: WebdriverIOAsync.Element,
  interaction: (element: WebdriverIOAsync.Element) => Promise<void>
) {
  await element.waitForDisplayed();
  await element.scrollIntoView();
  await slowdown();
  await interaction(element);
}
