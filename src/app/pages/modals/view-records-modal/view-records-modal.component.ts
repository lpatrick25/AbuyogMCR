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
  @Input() document: any; // Document details passed as input
  @Input() isTiffFile: boolean = false; // Default value to false if not provided
  public pdfUrl: string = '';
  public pdfLoaded: boolean = true;

  constructor(private modalController: ModalController) { }

  ngOnInit() {
    if (this.isTiffFile) {
      // If the document is a TIFF, show the TIFF image
      // this.loadTiff(this.document.image_url);
    }
  }

  dismiss() {
    this.modalController.dismiss();
  }

  isTiff(url: string): boolean {
    return url?.toLowerCase().endsWith('.tif') || url?.toLowerCase().endsWith('.tiff');
  }

}
