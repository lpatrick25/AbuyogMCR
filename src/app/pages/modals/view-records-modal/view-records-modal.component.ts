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
  @Input() isTiffImage: boolean = false;
  @Input() isTiffFront: boolean = false;
  @Input() isTiffBack: boolean = false;

  constructor(private modalController: ModalController) {}

  ngOnInit() {
    // Validate processed URLs
    if (this.isTiffImage && !this.document.processedTiffUrl) {
      console.warn('Processed TIFF URL missing for image_url');
      this.document.processedTiffUrl = this.getFallbackImage();
    }
    if (this.isTiffFront && !this.document.processedFrontUrl) {
      console.warn('Processed TIFF URL missing for front_url');
      this.document.processedFrontUrl = this.getFallbackImage();
    }
    if (this.isTiffBack && !this.document.processedBackUrl) {
      console.warn('Processed TIFF URL missing for back_url');
      this.document.processedBackUrl = this.getFallbackImage();
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
