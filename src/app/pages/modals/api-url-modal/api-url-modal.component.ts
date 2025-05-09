import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular';

@Component({
  selector: 'app-api-url-modal',
  templateUrl: './api-url-modal.component.html',
  styleUrls: ['./api-url-modal.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
})
export class ApiUrlModalComponent {
  @Input() apiUrl: string = '';

  constructor(private modalCtrl: ModalController) {}

  dismiss() {
    this.modalCtrl.dismiss();
  }

  save() {
    this.modalCtrl.dismiss({ apiUrl: this.apiUrl });
  }
}
