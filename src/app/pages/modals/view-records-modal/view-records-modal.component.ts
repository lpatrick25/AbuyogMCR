import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular';

@Component({
  selector: 'app-view-records-modal',
  templateUrl: './view-records-modal.component.html',
  styleUrls: ['./view-records-modal.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
})
export class ViewRecordsModalComponent implements OnInit {
  @Input() document: any;
  @Input() isPdfImage: boolean = false;

  constructor(private modalController: ModalController) {}

  ngOnInit() {
    // Validate processed URLs
    if (this.isPdfImage && !this.document.processedPdfUrl) {
      console.warn('Processed TIFF URL missing for image_url');
      this.document.processedPdfUrl = this.getFallbackImage();
    }
  }

  dismiss() {
    this.modalController.dismiss();
  }

  isTiff(url: string): boolean {
    return (
      url?.toLowerCase().endsWith('.tif') ||
      url?.toLowerCase().endsWith('.tiff')
    );
  }

  getFallbackImage(): string {
    return 'https://picsum.photos/1200/800?r=' + Math.random();
  }
}
