// import { Injectable } from '@angular/core';
// import {
//   HttpEvent, HttpHandler, HttpInterceptor, HttpRequest
// } from '@angular/common/http';
// import { Observable, from } from 'rxjs';
// import { switchMap } from 'rxjs/operators';
// import { AuthService } from '../services/auth.service';

// @Injectable()
// export class AuthInterceptor implements HttpInterceptor {

//   constructor(private authService: AuthService) {}

//   intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
//     return from(this.authService.getToken()).pipe(
//       switchMap(token => {
//         if (token) {
//           const cloned = req.clone({
//             setHeaders: {
//               Authorization: `Bearer ${token}`
//             }
//           });
//           return next.handle(cloned);
//         } else {
//           return next.handle(req);
//         }
//       })
//     );
//   }
// }
