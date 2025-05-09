import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Network } from '@capacitor/network';
import type { PluginListenerHandle } from '@capacitor/core';

@Injectable({
  providedIn: 'root',
})
export class ConnectivityService {
  constructor(private http: HttpClient) {}

  // Check the current network status
  async checkNetworkStatus(): Promise<boolean> {
    const status = await Network.getStatus();
    return status.connected;
  }

  // Listen for changes in network status and return the listener handle
  startNetworkListener(callback: (status: boolean) => void): Promise<PluginListenerHandle> {
    return Network.addListener('networkStatusChange', (status) => {
      callback(status.connected);
    });
  }

  // Try to ping a server
  async pingServer(url: string): Promise<boolean> {
    try {
      await this.http.get(url, { responseType: 'text' }).toPromise();
      return true;
    } catch {
      return false;
    }
  }
}
