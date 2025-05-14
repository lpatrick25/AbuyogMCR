import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { HttpClientModule } from '@angular/common/http';

import { AndroidPermissions } from '@awesome-cordova-plugins/android-permissions/ngx';
import { SMS } from '@awesome-cordova-plugins/sms/ngx';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
// import { AuthInterceptor } from './interceptors/auth.interceptor';
// import { SettingsModalComponent } from './settings-modal/settings-modal.component';
import { Diagnostic } from '@awesome-cordova-plugins/diagnostic/ngx';

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, IonicModule.forRoot(), AppRoutingModule, HttpClientModule, MatSnackBarModule],
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    AndroidPermissions,
    SMS,
    Diagnostic,
    // {
    //   provide: HTTP_INTERCEPTORS,
    //   useClass: AuthInterceptor,
    //   multi: true
    // }
  ],
  bootstrap: [AppComponent],
})
export class AppModule { }
