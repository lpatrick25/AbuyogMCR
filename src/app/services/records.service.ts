import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { Capacitor } from '@capacitor/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class RecordsService {

  defaultApiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  login(userName: string, password: string): Observable<any> {
    const headers = new HttpHeaders({
      'Accept': 'application/json',
    });

    return this.http.post(`${this.defaultApiUrl}/login`, {
      email: userName,
      password: password,
    }, { headers });
  }

  getAllDocuments() {
    return this.http.get<any[]>(`${this.defaultApiUrl}/documents`).toPromise();
  }

  getDocument(id: string) {
    return this.http.get(`${this.defaultApiUrl}/documents/${id}`).toPromise();
  }

  async getDocumentsByPage(page: number) {
    const params = { page: page.toString() };

    try {
      const response = await this.http.get<any>(`${this.defaultApiUrl}/documents`, { params }).toPromise();
      return response; // <-- Return the WHOLE response, not just data
    } catch (error) {
      console.error('Failed to fetch documents:', error);
      return {
        data: [],
        last_page: 1,
        current_page: page
      };
    }
  }

  async submitDocument(formSubmission: any, tiffFileUri: string, pdfFileUri: string): Promise<any> {
    try {
      const formData = new FormData();

      formData.append('formData', JSON.stringify(formSubmission));

      // Fetch TIFF file as a blob
      const tiffBlob = await this.fetchFileBlob(tiffFileUri);
      formData.append('tiffFile', tiffBlob, 'document.tiff');

      // Fetch PDF file as a blob
      const pdfBlob = await this.fetchFileBlob(pdfFileUri);
      formData.append('pdfFile', pdfBlob, 'document.pdf');

      // Send the form with both files
      return await lastValueFrom(
        this.http.post(`${this.defaultApiUrl}/documents/submit`, formData)
      );
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
