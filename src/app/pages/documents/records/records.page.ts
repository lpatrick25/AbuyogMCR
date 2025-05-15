import { Component, OnInit } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
import { RecordsService } from 'src/app/services/records.service';
import { ViewRecordsModalComponent } from '../../modals/view-records-modal/view-records-modal.component';
import { SettingsModalComponent } from '../../modals/settings-modal/settings-modal.component';
import { AuthService } from 'src/app/services/auth.service';
import { ApiUrlModalComponent } from '../../modals/api-url-modal/api-url-modal.component';
import { environment } from 'src/environments/environment';
import { LicenseKeyModalComponent } from '../../modals/license-key-modal/license-key-modal.component';
// import * as pdfjsLib from 'pdfjs-dist';

// Set the worker source for pdf.js
// pdfjsLib.GlobalWorkerOptions.workerSrc = 'assets/pdf.worker.min.mjs';

interface Document {
  id?: number;
  first_name: string;
  middle_name?: string;
  last_name: string;
  suffix?: string;
  document_type: string;
  pdf_url: string;
  processedPdfUrl?: string;
  thumbnailUrl?: string; // Add thumbnail URL to store the generated thumbnail
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
  defaultApiUrl = environment.apiUrl;
  defaultLicenseKey = environment.licenseKey;

  constructor(
    private recordsService: RecordsService,
    private modalController: ModalController,
    private toastCtrl: ToastController,
    private authService: AuthService
  ) {}

  async ngOnInit(): Promise<void> {
    this.isLoading = true;
    await this.loadDocuments();
    this.isLoading = false;
  }

  private async loadDocuments(): Promise<void> {
    try {
      const response = await this.recordsService.getDocumentsByPage(
        this.currentPage
      );
      let newDocuments = (response.data?.data ?? []) as Document[];

      // Sanitize URLs to fix duplicate "localhost" issue
      newDocuments = newDocuments.map((doc) => ({
        ...doc,
        pdf_url: this.sanitizeUrl(doc.pdf_url),
      }));

      this.documents = [...this.documents, ...newDocuments];
      this.filteredDocuments = [...this.documents];
      this.lastPage = response.data?.last_page ?? 1;

      // Process PDFs to generate thumbnails
      for (const doc of newDocuments) {
        if (this.isPdf(doc.pdf_url)) {
          try {
            // const thumbnailUrl = await this.generatePdfThumbnail(doc.pdf_url);
            doc.thumbnailUrl = this.getFallbackImage();
          } catch (error) {
            console.error(
              `Failed to generate thumbnail for ${doc.pdf_url}:`,
              error
            );
            doc.thumbnailUrl = this.getFallbackImage();
          }
        } else {
          doc.thumbnailUrl = this.getFallbackImage();
        }
      }

      // Update filtered documents to reflect thumbnail URLs
      this.filteredDocuments = [...this.documents];
    } catch (error: any) {
      console.error('Failed to load documents:', error);
      this.documents = [];
      this.filteredDocuments = [];
      await this.showToast('Failed to load documents', 'danger');
    }
  }

  /**
   * Generates a thumbnail from the first page of a PDF.
   * @param pdfUrl The URL of the PDF file.
   * @returns A data URL representing the thumbnail image, or null if failed.
   */
  // private async generatePdfThumbnail(pdfUrl: string): Promise<string | null> {
  //   try {
  //     // Load the PDF document
  //     const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
  //     const page = await pdf.getPage(1); // Get the first page

  //     // Set the viewport for rendering (scale to create a thumbnail)
  //     const scale = 0.5; // Adjust scale for thumbnail size
  //     const viewport = page.getViewport({ scale });

  //     // Create a canvas to render the page
  //     const canvas = document.createElement('canvas');
  //     const context = canvas.getContext('2d');
  //     if (!context) {
  //       throw new Error('Failed to get canvas context');
  //     }

  //     canvas.height = viewport.height;
  //     canvas.width = viewport.width;

  //     // Render the PDF page to the canvas
  //     await page.render({
  //       canvasContext: context,
  //       viewport: viewport,
  //     }).promise;

  //     // Convert the canvas to a data URL (thumbnail image)
  //     const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8); // Use JPEG with 80% quality

  //     // Clean up
  //     pdf.destroy();
  //     canvas.remove();

  //     return thumbnailUrl;
  //   } catch (error) {
  //     console.error('Error generating PDF thumbnail:', error);
  //     return null;
  //   }
  // }

  private sanitizeUrl(url: string): string {
    if (!url) return url;

    const localServer = 'https://192.168.100.123';
    if (url.startsWith('localhost/')) {
      return `${localServer}/${url.replace('localhost/', '')}`;
    }
    if (url.startsWith('/storage')) {
      return `${localServer}${url}`;
    }

    return url;
  }

  isPdf(url: string): boolean {
    return url?.toLowerCase().endsWith('.pdf');
  }

  private getFallbackImage(): string {
    return 'https://picsum.photos/1200/800?r=' + Math.random();
  }

  /**
   * Formats text by replacing underscores and capitalizing words.
   * @param input The input string.
   */
  formatText(input: string): string {
    if (!input) return '';
    return input
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  /**
   * Constructs the full name from document fields.
   * @param doc The document object.
   */
  getFullName(doc: Document): string {
    const { first_name, middle_name, last_name, suffix } = doc;
    return `${first_name} ${middle_name ?? ''} ${last_name} ${
      suffix ?? ''
    }`.trim();
  }

  /**
   * Opens a modal to view document details.
   * @param doc The document to view.
   */
  async openDocumentModal(doc: Document): Promise<void> {
    const isPdfImage = this.isPdf(doc.pdf_url);
    const modal = await this.modalController.create({
      component: ViewRecordsModalComponent,
      componentProps: {
        document: doc,
        isPdfImage,
      },
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
      return (
        fullName.includes(searchTextLower) ||
        documentType.includes(searchTextLower)
      );
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
  async presentSettingsModal() {
    const modal = await this.modalController.create({
      component: SettingsModalComponent,
      cssClass: 'settings-modal',
    });

    modal.onDidDismiss().then((result) => {
      const action = result.data?.action;
      if (action === 'setApiUrl') {
        this.presentApiUrlDialog();
      } else if (action === 'setLicenseKey') {
        this.presentLicenseKeyDialog();
      } else if (action === 'logout') {
        this.authService.logout();
      }
    });

    await modal.present();
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
    });

    await modal.present();
  }

  async presentLicenseKeyDialog(): Promise<void> {
    const storedKey = localStorage.getItem('customLicenseKey') || '';
    const modal = await this.modalController.create({
      component: LicenseKeyModalComponent,
      cssClass: 'api-url-modal',
      componentProps: {
        licenseKey: storedKey || this.defaultLicenseKey,
      },
    });

    modal.onDidDismiss().then((result) => {
      const data = result.data;
      if (data?.licenseKey?.trim()) {
        const sanitizedKey = this.sanitizeLicenseKey(data.licenseKey);

        if (this.isValidLicenseKey(sanitizedKey)) {
          localStorage.setItem('customLicenseKey', sanitizedKey);
          this.showToast('License key updated successfully.', 'success');
        } else {
          this.showToast('Invalid license key format.', 'danger');
        }
      } else {
        this.showToast('Using default license key.', 'success');
      }
    });

    await modal.present();
  }

  sanitizeLicenseKey(input: string): string {
    return input.trim().replace(/\s+/g, '');
  }

  isValidLicenseKey(key: string): boolean {
    // Basic length check (Scanbot keys are long, usually >500 chars)
    // You can also add more logic if Scanbot provides a regex or pattern
    return typeof key === 'string' && key.length > 400;
  }

  /**
   * Displays a toast notification.
   * @param message The message to display.
   * @param color The toast color (primary, success, warning, danger).
   */
  private async showToast(
    message: string,
    color: string = 'primary'
  ): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
    });
    await toast.present();
  }
}
