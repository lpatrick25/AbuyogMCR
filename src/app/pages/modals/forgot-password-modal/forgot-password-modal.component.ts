import { Component, Input } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { IonicModule, ModalController, ToastController } from '@ionic/angular';
import { IonHeader } from "@ionic/angular/standalone";
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-forgot-password-modal',
  templateUrl: './forgot-password-modal.component.html',
  styleUrls: ['./forgot-password-modal.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
})
export class ForgotPasswordModalComponent {
  @Input() networkStatus: boolean = false;
  email: string = '';
  loading: boolean = false;

  constructor(
    private http: HttpClient,
    private modalController: ModalController,
    private toastCtrl: ToastController
  ) {}

  async submit() {
    if (!this.email) {
      this.showToast('Please enter an email address.', 'warning');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) {
      this.showToast('Please enter a valid email address.', 'warning');
      return;
    }
    if (!this.networkStatus) {
      this.showToast('No internet connection.', 'warning');
      return;
    }

    this.loading = true;
    try {
      const headers = new HttpHeaders({
        Accept: 'application/json',
        'Content-Type': 'application/json',
      });
      const response = await this.http
        .post<any>(
          'https://bfp.unitech.host/api/password/email',
          { email: this.email },
          { headers }
        )
        .toPromise();
      this.loading = false;
      if (response?.status === 'success') {
        this.showToast('Password reset link sent.', 'success');
        await this.modalController.dismiss({ success: true }); // Auto-close on success
      } else {
        this.showToast('Failed to send reset link.', 'danger');
      }
    } catch (error: any) {
      this.loading = false;
      console.error('Password reset error:', error);
      const errorMessage =
        error?.error?.message || 'Failed to send reset link. Please try again.';
      this.showToast(errorMessage, 'danger');
    }
  }

  async cancel() {
    await this.modalController.dismiss();
  }

  async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
    });
    await toast.present();
  }
}
