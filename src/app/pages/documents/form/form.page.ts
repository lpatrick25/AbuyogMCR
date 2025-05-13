import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  ModalController,
  NavController,
  ToastController,
} from '@ionic/angular';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import {
  ScanbotSDK,
  ScanbotSdkConfiguration,
} from 'capacitor-plugin-scanbot-sdk';
import {
  DocumentScanningFlow,
  PageSnapFunnelAnimation,
  startDocumentScanner,
} from 'capacitor-plugin-scanbot-sdk/ui_v2';
import { AuthService } from 'src/app/services/auth.service';
import { SettingsModalComponent } from '../../modals/settings-modal/settings-modal.component';
import { LicenseKeyModalComponent } from '../../modals/license-key-modal/license-key-modal.component';
import { environment } from 'src/environments/environment';

interface DocumentSubmission {
  documentType: string;
  documentTitle: string;
  firstName: string;
  middleName: string;
  lastName: string;
  suffix: string;
  dob: string;
  placeOfBirth: string;
  fatherName: string;
  motherName: string;
  registryNumber: string;
  documentUuid: string;
}

@Component({
  selector: 'app-form',
  templateUrl: './form.page.html',
  styleUrls: ['./form.page.scss'],
  standalone: false,
})
export class FormPage implements OnInit {
  form: FormGroup;
  documentType: string = '';
  documentTitle: string = '';
  loading: boolean = false;
  formSubmitted: boolean = false;
  hasSubmitted: boolean = false;
  defaultApiUrl = environment.apiUrl;
  defaultLicenseKey = environment.licenseKey;

  static readonly FILE_ENCRYPTION_ENABLED: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private modalController: ModalController,
    private http: HttpClient
  ) {
    this.form = this.fb.group({
      firstName: ['', Validators.required],
      middleName: [''],
      lastName: ['', Validators.required],
      suffix: [''],
      dob: ['', Validators.required],
      placeOfBirth: ['', Validators.required],
      fatherName: [''],
      motherName: [''],
      registryNumber: ['', Validators.required],
    });
  }

  async ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      this.documentType = params.get('type') || '';
      this.documentTitle = decodeURIComponent(params.get('title') || '');
      if (this.documentType === 'marriage') {
        this.form.get('fatherName')?.disable();
        this.form.get('motherName')?.disable();
      }
    });
    await this.initScanbotSdk();
  }

  /**
   * Submits the form data and scans a document, sending both to the backend.
   */
  async submitForm(): Promise<void> {
    this.formSubmitted = true;
    if (this.form.invalid) {
      await this.showToast('Please fill in all required fields.', 'warning');
      return;
    }

    if (this.hasSubmitted) {
      await this.showToast('Form already submitted.', 'warning');
      return;
    }

    this.loading = true;
    try {
      // const configuration = new DocumentScanningFlow();
      // configuration.outputSettings.pagesScanLimit = 1;
      // configuration.screens.review.enabled = false;
      // configuration.screens.camera.cameraConfiguration.autoSnappingEnabled = true;
      // configuration.screens.camera.captureFeedback.snapFeedbackMode = new PageSnapFunnelAnimation({});
      // // configuration.screens.camera.captureFeedback.snapFeedbackMode =
      // //   new PageSnapFunnelAnimation({}); // or use PageSnapCheckMarkAnimation({})
      // configuration.screens.camera.bottomBar.autoSnappingModeButton.visible = false;
      // configuration.screens.camera.bottomBar.manualSnappingModeButton.visible = false;
      // configuration.screens.camera.bottomBar.importButton.title.visible = true;
      // configuration.screens.camera.bottomBar.torchOnButton.title.visible = true;
      // configuration.screens.camera.bottomBar.torchOffButton.title.visible = true;
      // configuration.palette.sbColorPrimary = '#800000';
      // configuration.palette.sbColorOnPrimary = '#ffffff';
      // configuration.screens.camera.userGuidance.statesTitles.tooDark = 'Need more lighting to detect a document';
      // configuration.screens.camera.userGuidance.statesTitles.tooSmall = 'Document too small';
      // configuration.screens.camera.userGuidance.statesTitles.noDocumentFound = 'Could not detect a document';

      // const documentResult = await startDocumentScanner(configuration);
      // if (documentResult.status !== 'OK') {
      //   throw new Error('Document scanning cancelled or failed');
      // }
      /**
       * Create the document configuration object and
       * start the document scanner with the configuration
       */
      const configuration = new DocumentScanningFlow();
      // Enable the multiple page behavior
      configuration.outputSettings.pagesScanLimit = 0;

      // Enable/Disable Auto Snapping behavior
      configuration.screens.camera.cameraConfiguration.autoSnappingEnabled =
        true;

      // Hide/Reveal the auto snapping enable/disable button
      configuration.screens.camera.bottomBar.autoSnappingModeButton.visible =
        true;
      configuration.screens.camera.bottomBar.manualSnappingModeButton.visible =
        true;

      // Set colors
      configuration.palette.sbColorPrimary = '#800000';
      configuration.palette.sbColorOnPrimary = '#ffffff';

      // Configure the hint texts for different scenarios
      configuration.screens.camera.userGuidance.statesTitles.tooDark =
        'Need more lighting to detect a document';
      configuration.screens.camera.userGuidance.statesTitles.tooSmall =
        'Document too small';
      configuration.screens.camera.userGuidance.statesTitles.noDocumentFound =
        'Could not detect a document';

      // Enable/Disable the review screen.
      configuration.screens.review.enabled = true;

      // Configure bottom bar (further properties like title, icon and  background can also be set for these buttons)
      configuration.screens.review.bottomBar.addButton.visible = true;
      configuration.screens.review.bottomBar.retakeButton.visible = true;
      configuration.screens.review.bottomBar.cropButton.visible = true;
      configuration.screens.review.bottomBar.rotateButton.visible = true;
      configuration.screens.review.bottomBar.deleteButton.visible = true;

      // Configure `more` popup on review screen
      configuration.screens.review.morePopup.reorderPages.icon.visible = true;
      configuration.screens.review.morePopup.deleteAll.icon.visible = true;
      configuration.screens.review.morePopup.deleteAll.title.text =
        'Delete all pages';

      // Configure reorder pages screen
      configuration.screens.reorderPages.topBarTitle.text = 'Reorder Pages';
      configuration.screens.reorderPages.guidance.title.text = 'Reorder Pages';

      // Configure cropping screen
      configuration.screens.cropping.topBarTitle.text = 'Cropping Screen';
      configuration.screens.cropping.bottomBar.resetButton.visible = true;
      configuration.screens.cropping.bottomBar.rotateButton.visible = true;
      configuration.screens.cropping.bottomBar.detectButton.visible = true;

      const documentResult = await startDocumentScanner(configuration);
      /**
       * Handle the result if result status is OK
       */
      if (documentResult.status === 'OK') {
        this.router.navigate(['/document-result', documentResult.uuid]);
      }

      const submission: DocumentSubmission = {
        documentType: this.documentType,
        documentTitle: this.documentTitle,
        ...this.form.value,
        documentUuid: documentResult.uuid,
      };

      this.hasSubmitted = true;
      // await this.showToast('Document submitted successfully!', 'success');
      await this.router.navigate(['/form-result', documentResult.uuid], {
        state: { submission },
      });
    } catch (error: any) {
      console.error('Form submission error:', error);
      await this.showToast(
        `Failed to submit document: ${error.message || 'Unknown error'}`,
        'danger'
      );
    } finally {
      this.loading = false;
    }
  }

  /**
   * Initializes the Scanbot SDK with the provided configuration.
   */
  private async initScanbotSdk(): Promise<void> {
    const config: ScanbotSdkConfiguration = {
      licenseKey: this.defaultLicenseKey,
      loggingEnabled: true,
      storageImageFormat: 'JPG',
      storageImageQuality: 80,
      documentDetectorMode: 'ML_BASED',
      fileEncryptionMode: FormPage.FILE_ENCRYPTION_ENABLED
        ? 'AES256'
        : undefined,
      fileEncryptionPassword: FormPage.FILE_ENCRYPTION_ENABLED
        ? 'SomeSecretPa$$w0rdForFileEncryption'
        : undefined,
    };

    try {
      const result = await ScanbotSDK.initializeSDK(config);
      console.log('Scanbot SDK initialized:', result);
    } catch (error: any) {
      console.error('Scanbot SDK initialization failed:', error);
      await this.showToast('Failed to initialize scanner', 'danger');
    }
  }

  /**
   * Opens the settings modal for license key or logout actions.
   */
  async presentSettingsModal(): Promise<void> {
    const modal = await this.modalController.create({
      component: SettingsModalComponent,
      cssClass: 'settings-modal',
    });

    modal.onDidDismiss().then((result) => {
      const action = result.data?.action;
      if (action === 'setLicenseKey') {
        this.presentLicenseKeyDialog();
      } else if (action === 'logout') {
        this.authService.logout();
      }
    });

    await modal.present();
  }

  /**
   * Opens the license key modal to update the Scanbot SDK license key.
   */
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
   * Navigates back to the home page.
   */
  cancel(): void {
    this.navCtrl.navigateBack('/home');
  }

  /**
   * Displays a toast notification with the specified message and color.
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
