import axios from "axios";
import { BROWSERSTACK_KEY, BROWSERSTACK_USER } from "./config";

const browserStackApi = "https://api-cloud.browserstack.com";
const automateApi = `${browserStackApi}/app-automate`;

export interface AutomationSession {
  browser_url: string;
}

export async function getAutomationSession(
  id: string
): Promise<AutomationSession> {
  interface Data {
    automation_session: AutomationSession;
  }

  const response = await axios.get<Data>(`${automateApi}/sessions/${id}.json`, {
    auth: {
      username: BROWSERSTACK_USER,
      password: BROWSERSTACK_KEY
    }
  });

  return response.data.automation_session;
}
