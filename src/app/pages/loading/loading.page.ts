import { Component, OnInit, OnDestroy } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import type { PluginListenerHandle } from '@capacitor/core';
import { ConnectivityService } from 'src/app/services/connectivity.service';
import { AuthService } from 'src/app/services/auth.service';
import { ApiUrlModalComponent } from '../modals/api-url-modal/api-url-modal.component';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-loading',
  templateUrl: './loading.page.html',
  styleUrls: ['./loading.page.scss'],
  standalone: false,
})
export class LoadingPage implements OnInit, OnDestroy {
  networkStatus: boolean = false;
  loadingMessage: string = 'Checking network connectivity...';
  private networkSubscription?: PluginListenerHandle;
  public hasProceeded: boolean = false;
  defaultApiUrl = environment.apiUrl;

  constructor(
    private connectivityService: ConnectivityService,
    private toastCtrl: ToastController,
    private router: Router,
    private authService: AuthService,
    private modalController: ModalController
  ) {}

  ngOnInit() {
    this.checkConnection();

    this.connectivityService
      .startNetworkListener((status) => {
        this.networkStatus = status;
        if (status && !this.hasProceeded) {
          this.checkConnection();
        }
      })
      .then((listener) => {
        this.networkSubscription = listener;
      });
  }

  ngOnDestroy() {
    this.networkSubscription?.remove();
  }

  async checkConnection() {
    this.networkStatus = await this.connectivityService.checkNetworkStatus();

    const storedUrl = localStorage.getItem('customApiUrl');

    if (this.networkStatus) {
      this.loadingMessage = 'Connected. Checking server...';
      const isServerUp = await this.connectivityService.pingServer(
        storedUrl && storedUrl.trim() !== '' ? storedUrl + '/ping' : this.defaultApiUrl + '/ping'
      );

      if (isServerUp) {
        const isLoggedIn = await this.authService.isLoggedIn();
        this.hasProceeded = true;
        this.router.navigate([isLoggedIn ? '/home' : '/login']);
      } else {
        this.presentApiUrlDialog();
        this.showToast('Cannot reach the server.', 'danger');
      }
    } else {
      this.loadingMessage = 'No internet connection.';
      this.showToast('You are offline.', 'danger');
    }
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
      this.checkConnection();
    });

    await modal.present();
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
