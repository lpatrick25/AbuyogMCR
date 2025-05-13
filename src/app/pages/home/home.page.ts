import { Component, OnDestroy, OnInit } from '@angular/core';
import { AndroidPermissions } from '@awesome-cordova-plugins/android-permissions/ngx';
import {
  AlertController,
  ModalController,
  NavController,
  ToastController,
} from '@ionic/angular';
import { ConnectivityService } from 'src/app/services/connectivity.service';
import { ApiUrlModalComponent } from '../modals/api-url-modal/api-url-modal.component';
import { environment } from 'src/environments/environment';
import { SettingsModalComponent } from '../modals/settings-modal/settings-modal.component';
import { AuthService } from 'src/app/services/auth.service';
import { DocumentsModalComponent } from '../modals/documents-modal/documents-modal.component';
import { StatusBar } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import { LicenseKeyModalComponent } from '../modals/license-key-modal/license-key-modal.component';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit {
  networkStatus: boolean = true;
  defaultApiUrl = environment.apiUrl;
  defaultLicenseKey = environment.licenseKey;

  constructor(
    private navCtrl: NavController,
    private connectivityService: ConnectivityService,
    private androidPermissions: AndroidPermissions,
    private alertController: AlertController,
    private modalController: ModalController,
    private toastCtrl: ToastController,
    private authService: AuthService
  ) {
    if (Capacitor.isNativePlatform()) {
      this.initializeApp();
    }
  }

  async initializeApp() {
    try {
      await StatusBar.setOverlaysWebView({ overlay: false });
      await StatusBar.setBackgroundColor({ color: '#660000' });
    } catch (error) {
      console.error('StatusBar initialization failed:', error);
      // Fallback to default color
      await StatusBar.setBackgroundColor({ color: '#000000' }).catch(() => {});
    }
  }

  async ngOnInit() {
    this.requestPermissions();

    this.networkStatus = await this.connectivityService.checkNetworkStatus();

    this.connectivityService.startNetworkListener((isConnected) => {
      this.networkStatus = isConnected;
    });
  }

  async checkConnection() {
    this.networkStatus = await this.connectivityService.checkNetworkStatus();
    if (!this.networkStatus) {
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

  async presentDocuments() {
    const modal = await this.modalController.create({
      component: DocumentsModalComponent,
      cssClass: 'documents-modal',
    });

    modal.onDidDismiss().then((result) => {
      const action = result.data?.action;
      if (action === 'setApiUrl') {
        this.presentApiUrlDialog();
      } else if (action === 'logout') {
        this.authService.logout();
      }
    });

    await modal.present();
  }

  navigateTo(route: string) {
    this.navCtrl.navigateForward(`/${route}`);
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
