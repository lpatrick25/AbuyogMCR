import { Component, OnInit } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
// @ts-ignore
import UTIF from 'utif';
import { RecordsService } from 'src/app/services/records.service';
import { ViewRecordsModalComponent } from '../../modals/view-records-modal/view-records-modal.component';
import { SettingsModalComponent } from '../../modals/settings-modal/settings-modal.component';
import { AuthService } from 'src/app/services/auth.service';

interface Document {
  id?: number;
  first_name: string;
  middle_name?: string;
  last_name: string;
  suffix?: string;
  document_type: string;
  image_url: string;
  pdf_url?: string;
  processedTiffUrl?: string;
  pdfUrl?: string;
}

@Component({
  selector: 'app-records',
  templateUrl: './records.page.html',
  styleUrls: ['./records.page.scss'],
  standalone: false,
})
export class RecordsPage implements OnInit {
  documents: Document[] = [];
  filteredDocuments: Document[] = [];
  searchText: string = '';
  isLoading: boolean = false;
  isLoadingMore: boolean = false;
  currentPage: number = 1;
  lastPage: number = 1;
  private tiffCache: Map<string, string> = new Map();

  constructor(
    private recordsService: RecordsService,
    private modalController: ModalController,
    private toastCtrl: ToastController,
    private authService: AuthService
  ) { }

  /**
   * Initializes the component and loads initial documents.
   */
  async ngOnInit(): Promise<void> {
    this.isLoading = true;
    await this.loadDocuments();
    this.isLoading = false;
  }

  /**
   * Loads documents for the current page.
   */
  private async loadDocuments(): Promise<void> {
    try {
      if (await this.authService.isTokenExpired()) {
        await this.showToast('Session expired. Please log in again.', 'danger');
        await this.authService.logout();
        return;
      }

      const response = await this.recordsService.getDocumentsByPage(this.currentPage);
      const newDocuments = (response.data?.data ?? []) as Document[];
      this.documents = [...this.documents, ...newDocuments];
      this.filteredDocuments = [...this.documents];
      this.lastPage = response.data?.last_page ?? 1;

      // Process TIFF images
      for (const doc of newDocuments) {
        if (this.isTiff(doc.image_url)) {
          doc.processedTiffUrl = await this.convertTiffToBase64(doc.image_url);
        }
        if (doc.pdf_url) {
          doc.pdfUrl = doc.pdf_url;
        }
      }
    } catch (error: any) {
      console.error('Failed to load documents:', error);
      this.documents = [];
      this.filteredDocuments = [];
      await this.showToast('Failed to load documents', 'danger');
    }
  }

  /**
   * Checks if a URL is a TIFF file.
   * @param url The file URL.
   */
  isTiff(url: string): boolean {
    return url?.toLowerCase().endsWith('.tif') || url?.toLowerCase().endsWith('.tiff');
  }

  /**
   * Converts a TIFF URL to base64, using cache if available.
   * @param tiffUrl The TIFF file URL.
   */
  async convertTiffToBase64(tiffUrl: string): Promise<string> {
    if (this.tiffCache.has(tiffUrl)) {
      return this.tiffCache.get(tiffUrl)!;
    }

    try {
      const response = await fetch(tiffUrl);
      const arrayBuffer = await response.arrayBuffer();
      const ifds = UTIF.decode(arrayBuffer);

      if (!ifds || ifds.length === 0) {
        throw new Error('No images found in TIFF');
      }

      UTIF.decodeImage(arrayBuffer, ifds[0]);
      const firstImage = ifds[0];
      if (!firstImage || !firstImage.width || !firstImage.height || firstImage.width <= 0 || firstImage.height <= 0) {
        throw new Error(`Invalid image dimensions: width=${firstImage?.width}, height=${firstImage?.height}`);
      }

      const rgba = UTIF.toRGBA8(firstImage);
      const canvas = document.createElement('canvas');
      canvas.width = firstImage.width;
      canvas.height = firstImage.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      const imgData = ctx.createImageData(canvas.width, canvas.height);
      imgData.data.set(rgba);
      ctx.putImageData(imgData, 0, 0);

      const base64 = canvas.toDataURL();
      this.tiffCache.set(tiffUrl, base64);
      return base64;
    } catch (error: any) {
      console.error('Failed to convert TIFF:', error);
      const fallback = 'https://picsum.photos/1200/800?r=' + Math.random();
      this.tiffCache.set(tiffUrl, fallback);
      return fallback;
    }
  }

  /**
   * Formats text by replacing underscores and capitalizing words.
   * @param input The input string.
   */
  formatText(input: string): string {
    if (!input) return '';
    return input.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  }

  /**
   * Constructs the full name from document fields.
   * @param doc The document object.
   */
  getFullName(doc: Document): string {
    const { first_name, middle_name, last_name, suffix } = doc;
    return `${first_name} ${middle_name ?? ''} ${last_name} ${suffix ?? ''}`.trim();
  }

  /**
   * Opens a modal to view document details.
   * @param doc The document to view.
   */
  async openDocumentModal(doc: Document): Promise<void> {
    const isTiffFile = this.isTiff(doc.image_url);
    const modal = await this.modalController.create({
      component: ViewRecordsModalComponent,
      componentProps: { document: doc, isTiffFile },
    });
    await modal.present();
  }

  /**
   * Filters documents based on search text.
   */
  filterDocuments(): void {
    const searchTextLower = this.searchText.toLowerCase();
    this.filteredDocuments = this.documents.filter((doc) => {
      const fullName = this.getFullName(doc).toLowerCase();
      const documentType = doc.document_type.toLowerCase();
      return fullName.includes(searchTextLower) || documentType.includes(searchTextLower);
    });
  }

  /**
   * Loads more documents for infinite scroll.
   * @param event The infinite scroll event.
   */
  async loadMoreDocuments(event: any): Promise<void> {
    if (this.isLoadingMore || this.currentPage >= this.lastPage) {
      event.target.disabled = true;
      event.target.complete();
      return;
    }

    this.isLoadingMore = true;
    try {
      this.currentPage++;
      await this.loadDocuments();
    } catch (error: any) {
      console.error('Failed to load more documents:', error);
      await this.showToast('Failed to load more documents', 'danger');
    } finally {
      this.isLoadingMore = false;
      event.target.complete();
    }
  }

  /**
   * Opens the settings modal for logout or license key actions.
   */
  async presentSettingsModal(): Promise<void> {
    const modal = await this.modalController.create({
      component: SettingsModalComponent,
      cssClass: 'settings-modal',
    });

    modal.onDidDismiss().then((result) => {
      const action = result.data?.action;
      if (action === 'setLicenseKey') {
        // Implement license key modal if needed
      } else if (action === 'logout') {
        this.authService.logout();
      }
    });

    await modal.present();
  }

  /**
   * Displays a toast notification.
   * @param message The message to display.
   * @param color The toast color (primary, success, warning, danger).
   */
  private async showToast(message: string, color: string = 'primary'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
    });
    await toast.present();
  }
}
