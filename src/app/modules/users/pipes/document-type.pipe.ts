import { Pipe, PipeTransform } from '@angular/core';
import { IdentificationType } from '../enum/identification-type.enum';

/** Muestra el nombre completo del tipo de documento de identidad a partir de su código o nombre. */
@Pipe({
  name: 'documentType',
  standalone: true
})
export class DocumentTypePipe implements PipeTransform {
  transform(type?: string | IdentificationType): string {
    if (!type) return 'No especificado';

    const normalized = type.toLowerCase();

    if (normalized.includes('passport') || normalized.includes('pasaporte')) {
      return IdentificationType.PASAPORTE;
    }
    if (normalized.includes('cc') || normalized.includes('ciudadania') || normalized.includes('ciudadanía')) {
      return IdentificationType.CC;
    }
    if (normalized.includes('ce') || normalized.includes('extranjeria') || normalized.includes('extranjería')) {
      return IdentificationType.CE;
    }

    return type.charAt(0).toUpperCase() + type.slice(1);
  }
}
