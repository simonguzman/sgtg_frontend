import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UserService } from '../../services/user.service';
import { IdentificationType, User } from '../../interfaces/user.interface';
import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';
import { AuthService } from '../../../../core/services/auth/auth.service';

@Component({
  selector: 'app-user-details-page',
  imports: [CommonModule, ButtonComponent],
  templateUrl: './user-details-page.component.html',
  styleUrls: ['./user-details-page.component.css']
})
export class UserDetailsPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);

  user = signal<User | undefined>(undefined);
  isLoading = signal(true);
  isMyProfile = signal(false);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      this.isMyProfile.set(false);
      this.userService.getUserByIdMock(id).subscribe(data => {
        this.user.set(data);
        this.isLoading.set(false);
      });
    } else {
      this.isMyProfile.set(true);
      const currentUser = this.authService.currentUser();

      if (currentUser) {
        this.user.set(currentUser);
      }
      this.isLoading.set(false);
    }
  }

  goBack() {
    if (this.isMyProfile()) {
      this.router.navigate(['/notifications']);
    } else {
      this.router.navigate(['/users']);
    }
  }

  getDocumentTypeLabel(type?: string | IdentificationType): string{
    if (!type) return 'No especificado';

    const normalized = type.toLowerCase();

    // Si viene como "passport" o "pasaporte", devolvemos el valor estandarizado
    if (normalized.includes('passport') || normalized.includes('pasaporte')) {
      return IdentificationType.PASAPORTE;
    }

    // Si viene como "cc" o cualquier variación de "ciudadanía"
    if (normalized.includes('cc') || normalized.includes('ciudadania') || normalized.includes('ciudadanía')) {
      return IdentificationType.CC;
    }

    // Si viene como "ce" o cualquier variación de "extranjería"
    if (normalized.includes('ce') || normalized.includes('extranjeria') || normalized.includes('extranjería')) {
      return IdentificationType.CE;
    }

    // Si no coincide con nada, devolvemos el valor original con la primera letra en mayúscula
    return type.charAt(0).toUpperCase() + type.slice(1);
  }

}
