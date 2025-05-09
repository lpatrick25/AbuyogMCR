import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { FormResultPage } from './form-result.page';

const routes: Routes = [
  {
    path: '',
    component: FormResultPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class FormResultPageRoutingModule {}
