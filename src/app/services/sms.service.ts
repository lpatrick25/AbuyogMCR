import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Capacitor } from '@capacitor/core';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from './auth.service';
import { Storage } from '@capacitor/storage';

declare var sms: any;

@Injectable({
  providedIn: 'root',
})
export class SmsService {
  private delay = 5000;
  private bulkDelay = 10000;
  private maxRetries = 3;

  constructor(
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private authService: AuthService
  ) { }

  private defaultApiUrl = environment.apiUrl;

  get apiUrl(): string {
    const storedUrl = localStorage.getItem('customApiUrl');
    return storedUrl && storedUrl.trim() !== '' ? storedUrl : this.defaultApiUrl;
  }

  getPendingSmsRequests(): Observable<any[]> {
    // const token = this.authService.getToken();
    const headers = new HttpHeaders({
      Accept: 'application/json',
      // Authorization: `Bearer ${token}`,
    });

    return this.http
      .get<any[]>(`${this.apiUrl}/sms-requests`, { headers })
      .pipe(
        catchError((error) => {
          console.error('Error fetching pending SMS:', error);
          return throwError(error);
        })
      );
  }

  async processPendingSmsQueue() {
    console.log('Processing pending SMS queue...');

    try {
      const smsRequests = await this.getPendingSmsRequests().toPromise();

      // Check if smsRequests is undefined or empty
      if (!smsRequests || smsRequests.length === 0) {
        console.log('No pending SMS to send.');
        return;
      }

      const pendingSms = smsRequests.filter((sms) => sms.status === 'pending');

      if (pendingSms.length === 0) {
        console.log('No pending SMS to send.');
        return;
      }

      console.log(`Found ${pendingSms.length} pending SMS requests.`);

      for (const smsRequest of pendingSms) {
        const alreadySent = await this.isMessageSent(smsRequest.id);
        if (alreadySent) {
          console.log(`SMS ${smsRequest.id} already sent, skipping.`);
          await this.updateSmsStatus(smsRequest.id, 'sent');
          continue;
        }

        try {
          await this.sendSms(smsRequest.phone_number, smsRequest.message, smsRequest.id);
        } catch (error) {
          console.error(`Failed to send SMS ${smsRequest.id}:`, error);
          await this.updateSmsStatus(smsRequest.id, 'failed');
        }
      }
    } catch (error) {
      console.error('Error processing SMS queue:', error);
    }
  }

  async sendBulkSms(smsRequests: any[]) {
    console.log('Sending bulk SMS...');

    const smsChunks = this.chunkMessages(smsRequests, 10);

    for (let i = 0; i < smsChunks.length; i++) {
      const chunk = smsChunks[i];
      console.log(`Sending batch ${i + 1}...`);

      await this.delayExecution(this.bulkDelay);

      for (const smsRequest of chunk) {
        const alreadySent = await this.isMessageSent(smsRequest.id);
        if (alreadySent) {
          console.log(`SMS ${smsRequest.id} already sent, skipping.`);
          await this.updateSmsStatus(smsRequest.id, 'sent');
          continue;
        }

        try {
          await this.sendSms(smsRequest.phone_number, smsRequest.message, smsRequest.id);
        } catch (error) {
          console.error(`Failed to send SMS ${smsRequest.id}:`, error);
          await this.updateSmsStatus(smsRequest.id, 'failed');
        }
      }
    }
  }

  async sendSms(phoneNumber: string, message: string, id: number, retryCount = 0): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      try {
        await new Promise<void>((resolve, reject) => {
          sms.send(
            phoneNumber,
            message,
            { android: { intent: '' } },
            (msg: string) => {
              console.log('SMS sent:', msg);
              resolve();
            },
            (err: any) => {
              console.error('SMS failed:', err);
              reject(err);
            }
          );
        });

        await this.storeSentMessage(id, phoneNumber, message, 'sent');
        await this.updateSmsStatus(id, 'sent');

        this.snackBar.open('SMS sent successfully!', 'Close', {
          duration: 3000,
          panelClass: ['snackbar-success'],
        });
      } catch (error) {
        if (retryCount < this.maxRetries) {
          console.log(`Retrying SMS ${id} (${retryCount + 1}/${this.maxRetries})...`);
          await this.delayExecution(2000);
          return this.sendSms(phoneNumber, message, id, retryCount + 1);
        }

        this.snackBar.open('SMS failed to send after retries.', 'Close', {
          duration: 3000,
          panelClass: ['snackbar-error'],
        });
        throw error;
      }
    } else {
      console.warn('SMS sending is only available on a native platform.');
      this.snackBar.open('SMS sending is not available on this platform.', 'Close', {
        duration: 3000,
        panelClass: ['snackbar-warning'],
      });
    }
  }

  async storeSentMessage(id: number, phoneNumber: string, message: string, status: string) {
    const sms = {
      id,
      phoneNumber,
      message,
      status,
      sentAt: new Date().toISOString(),
    };

    const storedMessages = await this.getSentMessages();
    storedMessages.push(sms);

    await Storage.set({
      key: 'sentMessages',
      value: JSON.stringify(storedMessages),
    });
  }

  async getSentMessages(): Promise<any[]> {
    const result = await Storage.get({ key: 'sentMessages' });
    return result.value ? JSON.parse(result.value) : [];
  }

  async isMessageSent(id: number): Promise<boolean> {
    const sentMessages = await this.getSentMessages();
    return sentMessages.some((msg) => msg.id === id && msg.status === 'sent');
  }

  async deleteSentMessage(id: number): Promise<void> {
    const sentMessages = await this.getSentMessages();
    const updatedMessages = sentMessages.filter((msg) => msg.id !== id);
    await Storage.set({
      key: 'sentMessages',
      value: JSON.stringify(updatedMessages),
    });
  }

  async deleteSentMessagesByPhoneNumber(phoneNumber: string): Promise<void> {
    const sentMessages = await this.getSentMessages();
    const updatedMessages = sentMessages.filter((msg) => msg.phoneNumber !== phoneNumber);
    await Storage.set({
      key: 'sentMessages',
      value: JSON.stringify(updatedMessages),
    });
  }

  async loadSentMessages() {
    const sentMessages = await this.getSentMessages();
    console.log('Sent Messages:', sentMessages);
  }

  groupMessagesByPhoneNumber(messages: any[]): any {
    return messages.reduce((groupedMessages, message) => {
      const phoneNumber = message.phoneNumber;
      if (!groupedMessages[phoneNumber]) {
        groupedMessages[phoneNumber] = [];
      }
      groupedMessages[phoneNumber].push(message);
      return groupedMessages;
    }, {});
  }

  async updateSmsStatus(id: number, status: 'sent' | 'failed') {
    // const token = this.authService.getToken();
    const headers = new HttpHeaders({
      Accept: 'application/json',
      // Authorization: `Bearer ${token}`,
    });

    try {
      await this.http
        .put(`${this.apiUrl}/sms-requests/${id}`, { status }, { headers })
        .toPromise();
      console.log(`Updated SMS ${id} status to ${status}`);
    } catch (error) {
      console.error(`Failed to update SMS ${id} status:`, error);
    }
  }

  delayExecution(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  chunkMessages(messages: any[], chunkSize: number): any[][] {
    const chunks = [];
    for (let i = 0; i < messages.length; i += chunkSize) {
      chunks.push(messages.slice(i, i + chunkSize));
    }
    return chunks;
  }
}
