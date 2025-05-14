import { Component, OnInit } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
// @ts-ignore
import UTIF from 'utif';
import { RecordsService } from 'src/app/services/records.service';
import { ViewRecordsModalComponent } from '../../modals/view-records-modal/view-records-modal.component';
import { SettingsModalComponent } from '../../modals/settings-modal/settings-modal.component';
import { AuthService } from 'src/app/services/auth.service';
import { ApiUrlModalComponent } from '../../modals/api-url-modal/api-url-modal.component';
import { environment } from 'src/environments/environment';
import { LicenseKeyModalComponent } from '../../modals/license-key-modal/license-key-modal.component';

interface Document {
  id?: number;
  first_name: string;
  middle_name?: string;
  last_name: string;
  suffix?: string;
  document_type: string;
  image_url: string;
  front_url: string;
  back_url: string;
  processedTiffUrl?: string;
  processedFontUrl?: string;
  processedBackUrl?: string;
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
  defaultApiUrl = environment.apiUrl;
  defaultLicenseKey = environment.licenseKey;

  constructor(
    private recordsService: RecordsService,
    private modalController: ModalController,
    private toastCtrl: ToastController,
    private authService: AuthService
  ) {}

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
      const response = await this.recordsService.getDocumentsByPage(
        this.currentPage
      );
      let newDocuments = (response.data?.data ?? []) as Document[];

      // Sanitize URLs to fix duplicate "localhost" issue
      newDocuments = newDocuments.map((doc) => ({
        ...doc,
        image_url: this.sanitizeUrl(doc.image_url),
        front_url: this.sanitizeUrl(doc.front_url),
        back_url: this.sanitizeUrl(doc.back_url),
      }));

      this.documents = [...this.documents, ...newDocuments];
      this.filteredDocuments = [...this.documents];
      this.lastPage = response.data?.last_page ?? 1;

      // Process TIFF images
      for (const doc of newDocuments) {
        if (this.isTiff(doc.image_url)) {
          doc.processedTiffUrl = await this.convertTiffToBase64(doc.image_url);
        }
        if (this.isTiff(doc.front_url)) {
          doc.processedFontUrl = await this.convertTiffToBase64(doc.front_url);
        }
        if (this.isTiff(doc.back_url)) {
          doc.processedBackUrl = await this.convertTiffToBase64(doc.back_url);
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
   * Sanitizes a URL to remove duplicate "localhost" segments.
   * @param url The input URL.
   * @returns The sanitized URL.
   */
  private sanitizeUrl(url: string): string {
    if (!url) return url;
    // Replace multiple "localhost" segments with a single one
    const baseUrl = 'https://localhost/';
    const correctedUrl = url.replace(
      /https:\/\/localhost\/localhost\//g,
      baseUrl
    );
    console.log('Based URL' + baseUrl);
    console.log('Corrected URL' + correctedUrl);
    return correctedUrl;
  }

  /**
   * Checks if a URL is a TIFF file.
   * @param url The file URL.
   */
  isTiff(url: string): boolean {
    return (
      url?.toLowerCase().endsWith('.tif') ||
      url?.toLowerCase().endsWith('.tiff')
    );
  }

  /**
   * Converts a TIFF URL to base64, using cache if available.
   * @param tiffUrl The TIFF file URL.
   */
  async convertTiffToBase64(tiffUrl: string): Promise<string> {
    if (!tiffUrl) {
      console.warn('No TIFF URL provided');
      return this.getFallbackImage();
    }

    if (this.tiffCache.has(tiffUrl)) {
      return this.tiffCache.get(tiffUrl)!;
    }

    try {
      const response = await fetch(tiffUrl);
      if (!response.ok) {
        throw new Error(
          `HTTP error ${response.status}: ${response.statusText}`
        );
      }

      const arrayBuffer = await response.arrayBuffer();
      const ifds = UTIF.decode(arrayBuffer);

      if (!ifds || ifds.length === 0) {
        throw new Error('No images found in TIFF');
      }

      const firstImage = ifds[0];
      UTIF.decodeImage(arrayBuffer, firstImage);

      if (
        !firstImage ||
        !Number.isFinite(firstImage.width) ||
        !Number.isFinite(firstImage.height) ||
        firstImage.width <= 0 ||
        firstImage.height <= 0
      ) {
        throw new Error(
          `Invalid image dimensions: width=${
            firstImage?.width ?? 'undefined'
          }, height=${firstImage?.height ?? 'undefined'}`
        );
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

      const base64 = canvas.toDataURL('image/png');
      this.tiffCache.set(tiffUrl, base64);
      return base64;
    } catch (error: any) {
      console.error(`Failed to convert TIFF at ${tiffUrl}:`, error.message);
      const fallback = this.getFallbackImage();
      // Only cache fallback if the error is not transient (e.g., network issue)
      if (!error.message.includes('HTTP error')) {
        this.tiffCache.set(tiffUrl, fallback);
      }
      return fallback;
    }
  }

  /**
   * Returns a fallback image URL.
   */
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
