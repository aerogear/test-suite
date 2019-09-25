import { device } from "./device";

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

export async function asyncFind<T>(
  array: T[],
  predicate: (value: T) => Promise<boolean>
): Promise<T | null> {
  for (const value of array) {
    if (await predicate(value)) {
      return value;
    }
  }
  return null;
}
