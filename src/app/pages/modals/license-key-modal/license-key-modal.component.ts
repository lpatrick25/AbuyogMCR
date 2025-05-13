import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-license-key-modal',
  templateUrl: './license-key-modal.component.html',
  styleUrls: ['./license-key-modal.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
})
export class LicenseKeyModalComponent {
  @Input() licenseKey: string = '';

  errorMessage: string = '';
  successMessage: string = '';
  valid: boolean = false;

  constructor(private modalController: ModalController) { }

  ngOnInit() {
    this.validateKey(this.licenseKey);
  }

  dismiss() {
    this.modalController.dismiss();
  }

  sanitize(input: string): string {
    return input.trim().replace(/\s+/g, '');
  }

  validateKey(value: string | null | undefined): void {
    const cleaned = this.sanitize(value ?? '');
    this.licenseKey = cleaned;

    if (cleaned.length < 400) {
      this.valid = false;
      this.errorMessage = 'License key must be at least 400 characters.';
      this.successMessage = '';
    } else {
      this.valid = true;
      this.errorMessage = '';
      this.successMessage = 'License key looks valid!';
    }
  }

  save() {
    this.validateKey(this.licenseKey);
    if (!this.valid) return;
    this.modalController.dismiss({ licenseKey: this.licenseKey });
  }
}
