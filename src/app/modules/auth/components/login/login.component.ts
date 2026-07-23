import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';
import { LoginFacadeService } from './services/login-facade.service';

@Component({
  selector: 'app-login',
  // CommonModule eliminado: Angular 17+ no lo requiere para @if/@for
  imports: [ReactiveFormsModule, ButtonComponent],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  protected readonly facade = inject(LoginFacadeService);

  // nonNullable.group elimina la necesidad del operador ! y de la
  // inicialización diferida en ngOnInit — el formulario existe desde
  // el momento en que se construye el componente.
  readonly loginForm = this.fb.nonNullable.group({
    email:    ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  // Signal en lugar de propiedad mutable simple,
  // siguiendo el patrón del resto del proyecto.
  readonly isLoading = signal(false);

  ngOnInit(): void {
    this.facade.checkAlreadyAuthenticated();
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.facade.login(
      this.loginForm.getRawValue(),
      () => this.isLoading.set(true),
      () => this.isLoading.set(false)
    );
  }
}
