import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'loading',
    pathMatch: 'full'
  },
  {
    path: 'loading',
    loadChildren: () => import('./pages/loading/loading.module').then( m => m.LoadingPageModule)
  },
  {
    path: 'login',
    loadChildren: () => import('./pages/login/login.module').then( m => m.LoginPageModule)
  },
  {
    path: 'pending',
    loadChildren: () => import('./pages/SMS/pending/pending.module').then( m => m.PendingPageModule)
  },
  {
    path: 'sent',
    loadChildren: () => import('./pages/SMS/sent/sent.module').then( m => m.SentPageModule)
  },
  {
    path: 'home',
    loadChildren: () => import('./pages/home/home.module').then( m => m.HomePageModule)
  },
  {
    path: 'records',
    loadChildren: () => import('./pages/documents/records/records.module').then( m => m.RecordsPageModule)
  },
  {
    path: 'document-form/:type/:title',
    loadChildren: () => import('./pages/documents/form/form.module').then( m => m.FormPageModule)
  },
  {
    path: 'form-result/:documentID',
    loadChildren: () => import('./pages/documents/form-result/form-result.module').then( m => m.FormResultPageModule)
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
