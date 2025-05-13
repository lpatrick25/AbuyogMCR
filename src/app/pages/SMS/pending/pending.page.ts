import { Component, OnInit, OnDestroy } from '@angular/core';
import { interval, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AndroidPermissions } from '@awesome-cordova-plugins/android-permissions/ngx';
import { AlertController, ToastController } from '@ionic/angular';
import { ModalController } from '@ionic/angular';
import { environment } from 'src/environments/environment';
import { SmsService } from 'src/app/services/sms.service';
import { AuthService } from 'src/app/services/auth.service';
import { ConnectivityService } from 'src/app/services/connectivity.service';
import { ApiUrlModalComponent } from '../../modals/api-url-modal/api-url-modal.component';
import { SettingsModalComponent } from '../../modals/settings-modal/settings-modal.component';
import { Router } from '@angular/router';
import { LicenseKeyModalComponent } from '../../modals/license-key-modal/license-key-modal.component';

@Component({
  selector: 'app-pending',
  templateUrl: './pending.page.html',
  styleUrls: ['./pending.page.scss'],
  standalone: false,
})
export class PendingPage implements OnInit, OnDestroy {
  pendingSmsRequests: any[] = [];
  loading = false;
  networkStatus: boolean = true;
  private intervalSubscription?: Subscription;
  private isProcessing = false;
  defaultApiUrl = environment.apiUrl;
  defaultLicenseKey = environment.licenseKey;

  constructor(
    private smsService: SmsService,
    private androidPermissions: AndroidPermissions,
    private alertController: AlertController,
    private toastCtrl: ToastController,
    private authService: AuthService,
    private modalController: ModalController,
    private connectivityService: ConnectivityService,
    private router: Router
  ) {}

  async checkConnection() {
    this.networkStatus = await this.connectivityService.checkNetworkStatus();
    if (this.networkStatus) {
      this.startFetchingPendingMessages();
    } else {
      this.showToast('No internet connection. Please try again.', 'danger');
    }
  }

  requestPermissions() {
    const permissions = [
      this.androidPermissions.PERMISSION.SEND_SMS,
      this.androidPermissions.PERMISSION.READ_SMS,
      this.androidPermissions.PERMISSION.RECEIVE_SMS,
    ];

    permissions.forEach((permission) => {
      this.androidPermissions.checkPermission(permission).then((result) => {
        if (!result.hasPermission) {
          this.androidPermissions
            .requestPermission(permission)
            .then((requestResult) => {
              if (!requestResult.hasPermission) {
                this.showPermissionAlert();
              }
            });
        }
      });
    });
  }

  async ngOnInit() {
    this.requestPermissions();

    this.networkStatus = await this.connectivityService.checkNetworkStatus();

    this.connectivityService.startNetworkListener((isConnected) => {
      this.networkStatus = isConnected;
      if (isConnected && !this.intervalSubscription) {
        this.startFetchingPendingMessages();
      } else if (!isConnected && this.intervalSubscription) {
        this.stopFetchingPendingMessages();
      }
    });

    if (this.networkStatus) {
      this.startFetchingPendingMessages();
    }
  }

  startFetchingPendingMessages() {
    if (this.intervalSubscription) return;

    this.loading = true;
    this.intervalSubscription = interval(15000)
      .pipe(switchMap(() => this.smsService.getPendingSmsRequests()))
      .subscribe({
        next: async (data) => {
          this.pendingSmsRequests = data.filter(
            (sms) => sms.status === 'pending'
          );
          this.loading = false;

          if (this.pendingSmsRequests.length > 0 && !this.isProcessing) {
            await this.processPendingSmsQueue();
          }
        },
        error: (err) => {
          this.loading = false;
          this.showToast('Failed to fetch messages.', 'danger');
          console.error('Fetch error:', err);
        },
      });
  }

  stopFetchingPendingMessages() {
    if (this.intervalSubscription) {
      this.intervalSubscription.unsubscribe();
      this.intervalSubscription = undefined;
    }
  }

  async processPendingSmsQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      await this.smsService.processPendingSmsQueue();
    } catch (error) {
      console.error('Error processing SMS queue:', error);
      this.showToast('Error processing messages.', 'danger');
    } finally {
      this.isProcessing = false;
    }
  }

  ngOnDestroy() {
    this.stopFetchingPendingMessages();
  }

  sentMessages() {
    this.router.navigate(['/sent']);
  }

  async presentSettingsModal() {
    const modal = await this.modalController.create({
      component: SettingsModalComponent,
      cssClass: 'settings-modal',
    });

    modal.onDidDismiss().then((result) => {
      const action = result.data?.action;
      if (action === 'setApiUrl') {
        this.presentApiUrlDialog();
      } else if (action === 'setLicenseKey') {
        this.presentLicenseKeyDialog();
      } else if (action === 'logout') {
        this.authService.logout();
      }
    });

    await modal.present();
  }

  async presentApiUrlDialog() {
    const storedUrl = localStorage.getItem('customApiUrl') || '';
    const modal = await this.modalController.create({
      component: ApiUrlModalComponent,
      cssClass: 'api-url-modal',
      componentProps: {
        apiUrl: storedUrl || this.defaultApiUrl,
      },
    });

    modal.onDidDismiss().then((result) => {
      const data = result.data;
      if (data?.apiUrl?.trim()) {
        localStorage.setItem('customApiUrl', data.apiUrl.trim());
        this.showToast('API URL updated successfully.', 'success');
      } else {
        // localStorage.removeItem('customApiUrl');
        this.showToast('Using default API URL.', 'success');
      }
    });

    await modal.present();
  }

  async presentLicenseKeyDialog(): Promise<void> {
    const storedKey = localStorage.getItem('customLicenseKey') || '';
    const modal = await this.modalController.create({
      component: LicenseKeyModalComponent,
      cssClass: 'api-url-modal',
      componentProps: {
        licenseKey: storedKey || this.defaultLicenseKey,
      },
    });

    modal.onDidDismiss().then((result) => {
      const data = result.data;
      if (data?.licenseKey?.trim()) {
        const sanitizedKey = this.sanitizeLicenseKey(data.licenseKey);

        if (this.isValidLicenseKey(sanitizedKey)) {
          localStorage.setItem('customLicenseKey', sanitizedKey);
          this.showToast('License key updated successfully.', 'success');
        } else {
          this.showToast('Invalid license key format.', 'danger');
        }
      } else {
        this.showToast('Using default license key.', 'success');
      }
    });

    await modal.present();
  }

  sanitizeLicenseKey(input: string): string {
    return input.trim().replace(/\s+/g, '');
  }

  isValidLicenseKey(key: string): boolean {
    // Basic length check (Scanbot keys are long, usually >500 chars)
    // You can also add more logic if Scanbot provides a regex or pattern
    return typeof key === 'string' && key.length > 400;
  }

  async showPermissionAlert() {
    const alert = await this.alertController.create({
      header: 'Permission Required',
      message: 'Please enable SMS permissions in your device settings.',
      buttons: ['OK'],
    });

    await alert.present();
  }

  private async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
    });
    await toast.present();
  }
}
