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

  async submitDocument(
    formSubmission: any,
    tiffFileUris: string[]
  ): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('formData', JSON.stringify(formSubmission));

      // Ensure exactly two TIFF files (front and back)
      if (tiffFileUris.length !== 2) {
        throw new Error(
          `Expected exactly two TIFF files (front and back), got ${tiffFileUris.length}`
        );
      }

      // Fetch blobs for both files concurrently
      const [frontBlob, backBlob] = await Promise.all(
        tiffFileUris.map((uri) => this.fetchFileBlob(uri))
      );

      // Append front and back files to FormData
      formData.append('front', frontBlob, 'front.tiff');
      formData.append('back', backBlob, 'back.tiff');

      // Safely retrieve user from localStorage
      const userString = localStorage.getItem('user');
      const user = userString ? JSON.parse(userString) : null;
      const user_Id = user?.id || '';
      formData.append('user_Id', user_Id);

      const storedUrl = localStorage.getItem('customApiUrl');
      const apiUrl =
        storedUrl && storedUrl.trim() !== ''
          ? storedUrl + '/documents/submit'
          : this.defaultApiUrl + '/documents/submit';

      return await lastValueFrom(this.http.post(apiUrl, formData));
    } catch (error: any) {
      console.error('Error during file upload:', error);
      throw error;
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
