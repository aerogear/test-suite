import {
  NetworkStatus,
  NetworkStatusChangeCallback
} from "offix-client-boost";

export class ToggleNetworkStatus implements NetworkStatus {
  private callback: NetworkStatusChangeCallback = null;
  private online = true;

  public onStatusChangeListener(callback: NetworkStatusChangeCallback): void {
    this.callback = callback;
  }

  public async isOffline(): Promise<boolean> {
    return !this.online;
  }

  public setOnline(online: boolean): void {
    this.online = online;

    if (this.callback !== null) {
      this.callback.onStatusChange({ online });
    }
  }
}
