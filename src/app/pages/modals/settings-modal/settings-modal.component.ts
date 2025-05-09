import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalController, AlertController, IonicModule } from '@ionic/angular';
import { Router } from '@angular/router'; // Import Router
import { IonContent, IonIcon } from '@ionic/angular/standalone';

@Component({
  selector: 'app-settings-modal',
  templateUrl: './settings-modal.component.html',
  styleUrls: ['./settings-modal.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
})
export class SettingsModalComponent {
  constructor(
    private modalCtrl: ModalController,
    private alertCtrl: AlertController,
    private router: Router // Inject Router
  ) { }

  // Check if the current route is /pending or /sent
  get showSetApiUrl(): boolean {
    return this.router.url.includes('/pending') || this.router.url.includes('/sent');
  }

  // Check if the current route is /form
  get showSetLicenseKey(): boolean {
    return this.router.url.includes('/document-form');
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }

  onSetApiUrl() {
    this.modalCtrl.dismiss({ action: 'setApiUrl' });
  }

  onSetLicenseKey() {
    this.modalCtrl.dismiss({ action: 'setLicenseKey' });
  }

  async onLogout() {
    const alert = await this.alertCtrl.create({
      header: 'Confirm Logout',
      message: 'Are you sure you want to log out?',
      buttons: [
        {
          text: 'Logout',
          role: 'destructive',
          handler: () => this.modalCtrl.dismiss({ action: 'logout' }),
        },
        { text: 'Cancel', role: 'cancel' },
      ],
    });
    await alert.present();
  }
}
