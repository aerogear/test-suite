import axios from "axios";
import { device } from "./device";

/**
 * Change network profile for the device in BrowserStack
 */
export async function setNetwork(profile: string): Promise<void> {
  const buff = Buffer.from(
    `${process.env.BROWSERSTACK_USER}:${process.env.BROWSERSTACK_KEY}`
  );
  await axios.put(
    `https://api-cloud.browserstack.com/app-automate/sessions/${device.browser.sessionId}/update_network.json`,
    { networkProfile: profile },
    { headers: { Authorization: `Basic ${buff.toString("base64")}` } }
  );
}
