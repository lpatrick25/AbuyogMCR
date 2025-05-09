// truncate.pipe.ts
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'truncate',
  standalone: false, // or remove this line in standard Angular setup
})
export class TruncatePipe implements PipeTransform {
  transform(value: string, limit: number): string {
    if (!value) return '';
    return value.length > limit ? value.substring(0, limit) + '...' : value;
  }
}
