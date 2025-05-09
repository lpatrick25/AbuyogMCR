import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { FormResultPageRoutingModule } from './form-result-routing.module';

import { FormResultPage } from './form-result.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    FormResultPageRoutingModule
  ],
  declarations: [FormResultPage]
})
export class FormResultPageModule {}
