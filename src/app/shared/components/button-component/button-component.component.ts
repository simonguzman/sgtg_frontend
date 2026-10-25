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
  @Input() disabled: boolean = false;
  @Input() variant: 'primary' | 'secondary' = 'primary';
  /** Nombre accesible; necesario en los botones que solo tienen icono */
  @Input() ariaLabel?: string;

  @Output() onClick = new EventEmitter<void>();

  get buttonClass() : string {
    const base = 'custom-btn';
    const variantClass = this.variant === 'primary' ? 'btn-primary' : 'btn-secondary';
    const iconClass = (this.icon && !this.label) ? 'btn-icon' : '';
    return `${base} ${variantClass} ${iconClass}`
  }

  onButtonClick() {
    if(!this.disabled){
      this.onClick.emit();
    }
  }
 }
