import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, NavigationExtras } from '@angular/router';
import {
  DocumentData,
  OCRConfiguration,
  PageData,
  ScanbotBinarizationFilter,
  ScanbotSDK,
} from 'capacitor-plugin-scanbot-sdk';
import {
  DocumentScanningFlow,
  startDocumentScanner,
} from 'capacitor-plugin-scanbot-sdk/ui_v2';
import { Capacitor } from '@capacitor/core';
import { ActionSheetController, NavController } from '@ionic/angular';
import { RecordsService } from 'src/app/services/records.service';
import { CommonUtils } from 'src/app/utils/common-utils';
import { FileUtils } from 'src/app/utils/file-utils';
import { ImageUtils } from 'src/app/utils/image-utils';

interface PageDataResult {
  page: PageData;
  pagePreviewWebViewPath: string;
}

interface FormSubmission {
  [key: string]: any;
}

@Component({
  selector: 'app-form-result',
  templateUrl: './form-result.page.html',
  styleUrls: ['./form-result.page.scss'],
  standalone: false,
})
export class FormResultPage implements OnInit {
  formSubmission?: FormSubmission;
  document?: DocumentData;
  pageImagePreviews: PageDataResult[] = [];
  loading = false;

  private navController = inject(NavController);
  private utils = inject(CommonUtils);
  private fileUtils = inject(FileUtils);
  private actionSheetCtrl = inject(ActionSheetController);
  private imageUtils = inject(ImageUtils);
  private activatedRoute = inject(ActivatedRoute);
  private recordService = inject(RecordsService);
  private router = inject(Router);

  async ngOnInit() {
    this.activatedRoute.paramMap.subscribe(async (params) => {
      const documentID = params.get('documentID');
      if (!documentID) {
        await this.utils.showErrorAlert('Invalid document ID');
        await this.navController.navigateRoot('/record');
        return;
      }

      const navigation = this.router.getCurrentNavigation();
      this.formSubmission = navigation?.extras?.state?.['submission'] as
        | FormSubmission
        | undefined;
      await this.loadDocument(documentID);
    });
  }

  /**
   * Updates the current document and refreshes page previews.
   * @param updatedDocument The updated document data.
   */
  private updateCurrentDocument(updatedDocument: DocumentData): void {
    this.document = updatedDocument;
    this.pageImagePreviews = updatedDocument.pages.map((page) => ({
      page,
      pagePreviewWebViewPath: Capacitor.convertFileSrc(
        (page.documentImagePreviewURI || page.originalImageURI) +
          '?' +
          Date.now()
      ),
    }));
  }

  /**
   * Navigates to the page result page for the selected page.
   * @param page The selected page data.
   */
  async onPageSelect(page: PageData): Promise<void> {
    if (!this.document?.uuid) {
      await this.utils.showErrorAlert('Document UUID is missing');
      return;
    }
    await this.navController.navigateForward([
      '/page-result',
      this.document.uuid,
      page.uuid,
    ]);
  }

  /**
   * Loads a document by ID from ScanbotSDK.
   * @param id The document ID.
   */
  private async loadDocument(id: string): Promise<void> {
    this.loading = true;
    try {
      const documentResult = await ScanbotSDK.Document.loadDocument({
        documentID: id,
      });
      this.updateCurrentDocument(documentResult);
    } catch (error: any) {
      await this.utils.showErrorAlert(
        `Failed to load document: ${error.message}`
      );
    } finally {
      this.loading = false;
    }
  }

  /**
   * Continues scanning by resuming the document scanner.
   */
  async onContinueScanning(): Promise<void> {
    if (!this.document?.uuid) {
      await this.utils.showErrorAlert('Document UUID is missing');
      return;
    }
    this.loading = true;
    try {
      const configuration = new DocumentScanningFlow();
      configuration.documentUuid = this.document.uuid;
      configuration.cleanScanningSession = false;
      await startDocumentScanner(configuration);
      await this.loadDocument(this.document.uuid);
    } catch (error: any) {
      await this.utils.showErrorAlert(
        `Failed to continue scanning: ${error.message}`
      );
    } finally {
      this.loading = false;
    }
  }

  /**
   * Adds a new page to the document from the image library.
   */
  async onAddPage(): Promise<void> {
    if (!this.document?.uuid) {
      await this.utils.showErrorAlert('Document UUID is missing');
      return;
    }
    this.loading = true;
    try {
      const imageFileUri = await this.imageUtils.selectImageFromLibrary();
      if (!imageFileUri) {
        return;
      }
      const documentResult = await ScanbotSDK.Document.addPage({
        documentID: this.document.uuid,
        imageFileUri,
        documentDetection: true,
      });
      this.updateCurrentDocument(documentResult);
    } catch (error: any) {
      await this.utils.showErrorAlert(`Failed to add page: ${error.message}`);
    } finally {
      this.loading = false;
    }
  }

  /**
   * Exports the document as TIFF and PDF and submits it.
   */
  async onExport(): Promise<void> {
    if (!this.document?.uuid) {
      await this.utils.showErrorAlert('Document UUID is missing');
      return;
    }
    this.loading = true;
    const tiffFileUris: string[] = [];
    const errors: string[] = [];

    try {
      const documentResult = await ScanbotSDK.Document.loadDocument({
        documentID: this.document.uuid,
      });

      // Ensure exactly two pages (front and back)
      if (documentResult.pages.length < 2) {
        await this.utils.showErrorAlert(
          'Document must have at least two pages (front and back)'
        );
        return;
      }
      if (documentResult.pages.length > 2) {
        await this.utils.showErrorAlert(
          'Document has more than two pages. Please provide only front and back'
        );
        return;
      }

      // Process front and back pages
      const pagesToProcess = [
        { page: documentResult.pages[0], label: 'front' },
        { page: documentResult.pages[1], label: 'back' },
      ];

      for (const { page, label } of pagesToProcess) {
        if (!page.documentImageURI) {
          errors.push(
            `${label.charAt(0).toUpperCase() + label.slice(1)} page (${
              page.uuid
            }): No document image URI`
          );
          continue;
        }
        try {
          const tiffResult = await ScanbotSDK.writeTIFF({
            imageFileUris: [page.documentImageURI],
            options: {
              binarizationFilter: undefined,
              dpi: 300,
              compression: 'ADOBE_DEFLATE',
            },
          });
          if (tiffResult.status === 'OK' && tiffResult.tiffFileUri) {
            tiffFileUris.push(tiffResult.tiffFileUri);
          } else {
            throw new Error('TIFF generation failed');
          }
        } catch (err: any) {
          console.error(
            `Error creating TIFF for ${label} page ${page.uuid}:`,
            err
          );
          errors.push(
            `${label.charAt(0).toUpperCase() + label.slice(1)} page (${
              page.uuid
            }): ${err.message}`
          );
        }
      }

      if (errors.length > 0) {
        await this.utils.showErrorAlert(
          `Failed to process pages:\n${errors.join('\n')}`
        );
        return;
      }

      if (tiffFileUris.length !== 2) {
        await this.utils.showErrorAlert(
          'Failed to generate exactly two TIFF files (front and back)'
        );
        return;
      }

      await this.recordService.submitDocument(
        this.formSubmission,
        tiffFileUris
      );

      await this.utils.showInfoAlert('Document uploaded successfully!');
      await this.navController.navigateRoot('/home');
    } catch (error: any) {
      console.error('Export error:', error);
      await this.utils.showErrorAlert(
        `Failed to export document: ${error.message}`
      );
    } finally {
      this.loading = false;
    }
  }
}
