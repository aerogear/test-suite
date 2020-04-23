import { NetworkStatus, NetworkStatusChangeCallback } from "offix-client-boost";

export class ToggleNetworkStatus implements NetworkStatus {
  private callbacks: NetworkStatusChangeCallback[] = [];
  private online = true;

  addListener(callback) {
    this.callbacks.push(callback);
  }
  public removeListener(callback: any) {
    const index = this.callbacks.indexOf(callback);
    if (index >= 0) {
      this.callbacks.splice(index, 1);
    }
  }

  public async isOffline(): Promise<boolean> {
    return !this.online;
  }

  public setOnline(online: boolean): void {
    this.online = online;
    for (const callback of this.callbacks) {
      callback({ online });
    }
  }
}
