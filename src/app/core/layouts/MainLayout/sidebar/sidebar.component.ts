import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MenuModule } from 'primeng/menu';
import { UserRoleType, UserRole } from '../../../models/user-role';
import { AuthService } from '../../../services/auth/auth.service';

interface MenuItem {
  label: string;
  icon: string;
  routerLink: string;
  roles: UserRoleType[]; // Roles permitidos para este item
}

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule, RouterModule, MenuModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
})
export class SidebarComponent {
  private authService = inject(AuthService);
  private allMenuItems: MenuItem[] = [
    {
      label: 'Bandeja de entrada',
      routerLink: '/notifications',
      icon: 'pi pi-check-circle',
      roles: [UserRoleType.ESTUDIANTE, UserRoleType.DOCENTE, UserRoleType.DIRECTOR, UserRoleType.CODIRECTOR, UserRoleType.ASESOR, UserRoleType.ADMINISTRADOR, UserRoleType.COMITE, UserRoleType.JEFE_DEP, UserRoleType.CONSEJO, UserRoleType.DECANATURA, UserRoleType.JURADO, UserRoleType.EVALUADOR]
    },
    {
      label: 'Usuarios',
      routerLink: '/users',
      icon: 'pi pi-check-circle',
      roles: [UserRoleType.ADMINISTRADOR]
    },
    {
      label: 'Propuesta',
      routerLink: '/proposal',
      icon: 'pi pi-check-circle',
      roles: [UserRoleType.ESTUDIANTE, UserRoleType.DIRECTOR, UserRoleType.CODIRECTOR, UserRoleType.ASESOR, UserRoleType.JEFE_DEP, UserRoleType.ADMINISTRADOR, UserRoleType.COMITE]
    },
    {
      label: 'Anteproyecto',
      routerLink: '/preliminary-draft',
      icon: 'pi pi-check-circle',
      roles: [UserRoleType.ESTUDIANTE, UserRoleType.DIRECTOR, UserRoleType.CODIRECTOR, UserRoleType.ASESOR, UserRoleType.JEFE_DEP, UserRoleType.EVALUADOR, UserRoleType.ADMINISTRADOR, UserRoleType.CONSEJO]
    },
    {
      label: 'Trabajo de grado',
      routerLink: '/thesis-work',
      icon: 'pi pi-check-circle',
      roles: [UserRoleType.ESTUDIANTE, UserRoleType.DIRECTOR, UserRoleType.CODIRECTOR, UserRoleType.ASESOR, UserRoleType.DECANATURA, UserRoleType.JURADO, UserRoleType.ADMINISTRADOR, UserRoleType.CONSEJO]
    },
    {
      label: 'Estadísticas',
      routerLink: '/statistics',
      icon: 'pi pi-check-circle',
      roles: [UserRoleType.ADMINISTRADOR, UserRoleType.CONSEJO]
    }
  ];

  public menuItems = computed(() => {
    return this.allMenuItems.filter(item =>
      this.authService.hasAnyRole(item.roles)
    );
  });
 }
