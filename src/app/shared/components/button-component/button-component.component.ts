import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-button-component',
  imports: [ButtonModule],
  templateUrl: './button-component.component.html',
  styleUrl: './button-component.component.css'
})
export class ButtonComponent {
  @Input() label?: string;
  @Input() icon?: string;
  @Input() type: 'button' | 'submit' = 'button';
  @Input() disabled = false;
  /** primary y secondary en toda la aplicación; danger (rojo) para alertas y light (blanco) sobre fondos de color */
  @Input() variant: 'primary' | 'secondary' | 'danger' | 'light' = 'primary';
  /** Nombre accesible; necesario en los botones que solo tienen icono */
  @Input() ariaLabel?: string;

  @Output() onClick = new EventEmitter<void>();

  get buttonClass() : string {
    const base = 'custom-btn';
    const variantClass = `btn-${this.variant}`;
    const iconClass = (this.icon && !this.label) ? 'btn-icon' : '';
    return `${base} ${variantClass} ${iconClass}`
  }

  onButtonClick() {
    if(!this.disabled){
      this.onClick.emit();
    }
  }
 }
