import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import {
  AlertController,
  ModalController,
  NavController,
  ToastController,
} from '@ionic/angular';
import { ConnectivityService } from 'src/app/services/connectivity.service';
import { AuthService } from 'src/app/services/auth.service';
import { ForgotPasswordModalComponent } from '../modals/forgot-password-modal/forgot-password-modal.component';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false,
})
export class LoginPage implements OnInit {
  userName = '';
  password = '';
  loading = false;
  networkStatus: boolean = false;
  private defaultApiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private connectivityService: ConnectivityService,
    private authService: AuthService,
    private alertController: AlertController,
    private modalController: ModalController
  ) {}

  ngOnInit() {
    this.checkConnection();

    this.connectivityService.startNetworkListener((isConnected) => {
      this.networkStatus = isConnected;
    });

    // this.authService.isLoggedIn().then((isLoggedIn) => {
    //   if (isLoggedIn) {
    //     this.navCtrl.navigateRoot('/home');
    //   }
    // });
  }

  async checkConnection() {
    this.networkStatus = await this.connectivityService.checkNetworkStatus();
  }

  async login() {
    if (!this.networkStatus) {
      this.showToast('No internet connection.', 'warning');
      return;
    }

    if (!this.userName || !this.password) {
      this.showToast('Please enter userName and password.', 'warning');
      return;
    }

    this.loading = true;

    const headers = new HttpHeaders({
      Accept: 'application/json',
    });

    const storedUrl = localStorage.getItem('customApiUrl');

    this.http
      .post<any>(
        storedUrl && storedUrl.trim() !== ''
          ? storedUrl + '/login/record-keeper'
          : this.defaultApiUrl + '/login/record-keeper',
        {
          userName: this.userName,
          password: this.password,
        },
        { headers }
      )
      .subscribe({
        next: async (res) => {
          this.loading = false;
          if (res?.success) {
            console.log(res.user);
            this.navCtrl.navigateRoot('/home');
            this.showToast('Login successful.', 'success');
            localStorage.setItem('user', JSON.stringify(res.user));
          } else {
            this.showToast('Invalid response from server.', 'danger');
          }
        },
        error: async (err) => {
          this.loading = false;
          console.error('Login Error:', err);
          this.showToast(
            'Login failed. Please check your credentials.',
            'danger'
          );
        },
      });
  }

  async forgotPassword() {
    const modal = await this.modalController.create({
      component: ForgotPasswordModalComponent,
      cssClass: 'forgot-password-modal',
      componentProps: {
        networkStatus: this.networkStatus,
      },
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
