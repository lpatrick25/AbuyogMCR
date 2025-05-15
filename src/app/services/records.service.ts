import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { Capacitor } from '@capacitor/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class RecordsService {
  defaultApiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getAllDocuments() {
    const storedUrl = localStorage.getItem('customApiUrl');
    return this.http
      .get<any[]>(
        storedUrl && storedUrl.trim() !== ''
          ? storedUrl + '/documents'
          : this.defaultApiUrl + '/documents'
      )
      .toPromise();
  }

  getDocument(id: string) {
    const storedUrl = localStorage.getItem('customApiUrl');
    return this.http
      .get(
        storedUrl && storedUrl.trim() !== ''
          ? storedUrl + '/documents'
          : this.defaultApiUrl + '/documents'
      )
      .toPromise();
  }

  async getDocumentsByPage(page: number) {
    const params = { page: page.toString() };
    const storedUrl = localStorage.getItem('customApiUrl');

    try {
      const response = await this.http
        .get<any>(
          storedUrl && storedUrl.trim() !== ''
            ? storedUrl + '/documents'
            : this.defaultApiUrl + '/documents',
          { params }
        )
        .toPromise();
      return response; // <-- Return the WHOLE response, not just data
    } catch (error) {
      console.error('Failed to fetch documents:', error);
      return {
        data: [],
        last_page: 1,
        current_page: page,
      };
    }
  }

  async submitDocument(formSubmission: any, pdfFileUri: string): Promise<any> {
    try {
      const formData = new FormData();

      // Serialize form submission
      const submissionData = JSON.stringify(formSubmission);
      formData.append('formData', submissionData);

      // Get the PDF blob
      const pdfBlob = await this.fetchFileBlob(pdfFileUri);

      // Extract filename safely from formSubmission
      const documentType = formSubmission?.documentType || 'uploaded_document';

      formData.append('pdf_file', pdfBlob, `${documentType}.pdf`);

      // Retrieve user info safely
      const userString = localStorage.getItem('user');
      const user = userString ? JSON.parse(userString) : null;
      const user_Id = user?.id ?? '';
      formData.append('user_Id', user_Id);

      // Build API URL
      const storedUrl = localStorage.getItem('customApiUrl');
      const baseUrl = storedUrl?.trim() || this.defaultApiUrl;
      const apiUrl = `${baseUrl}/documents/submit`;

      // Perform HTTP POST
      return await lastValueFrom(this.http.post(apiUrl, formData));
    } catch (error: any) {
      console.error('Error during document submission:', error);
      throw new Error(`Submission failed: ${error.message}`);
    }
  }

  private async fetchFileBlob(fileUri: string): Promise<Blob> {
    const safeUri = Capacitor.convertFileSrc(fileUri);
    const response = await fetch(safeUri);

    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }

    return response.blob();
  }
}
