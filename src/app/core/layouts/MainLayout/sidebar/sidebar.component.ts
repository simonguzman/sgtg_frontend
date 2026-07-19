import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MenuModule } from 'primeng/menu';
import { UserRoleType } from '../../../enums/user-role-type.enum';
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
      icon: 'inbox', // Ícono actualizado a Material Symbols
      roles: [UserRoleType.ESTUDIANTE, UserRoleType.DOCENTE, UserRoleType.DIRECTOR, UserRoleType.CODIRECTOR, UserRoleType.ASESOR, UserRoleType.ADMINISTRADOR, UserRoleType.COMITE, UserRoleType.JEFE_DEP, UserRoleType.CONSEJO, UserRoleType.DECANATURA, UserRoleType.JURADO, UserRoleType.EVALUADOR]
    },
    {
      label: 'Usuarios',
      routerLink: '/users',
      icon: 'group', // Ícono actualizado
      roles: [UserRoleType.ADMINISTRADOR]
    },
    {
      label: 'Propuesta',
      routerLink: '/proposal',
      icon: 'article', // Ícono actualizado
      roles: [UserRoleType.ESTUDIANTE, UserRoleType.DIRECTOR, UserRoleType.CODIRECTOR, UserRoleType.ASESOR, UserRoleType.JEFE_DEP, UserRoleType.ADMINISTRADOR, UserRoleType.COMITE]
    },
    {
      label: 'Anteproyecto',
      routerLink: '/preliminary-draft',
      icon: 'note_alt', // Ícono actualizado
      roles: [UserRoleType.ESTUDIANTE, UserRoleType.DIRECTOR, UserRoleType.CODIRECTOR, UserRoleType.ASESOR, UserRoleType.JEFE_DEP, UserRoleType.EVALUADOR, UserRoleType.ADMINISTRADOR, UserRoleType.CONSEJO]
    },
    {
      label: 'Trabajo de grado',
      routerLink: '/thesis-work',
      icon: 'school', // Ícono actualizado
      roles: [UserRoleType.ESTUDIANTE, UserRoleType.DIRECTOR, UserRoleType.CODIRECTOR, UserRoleType.ASESOR, UserRoleType.DECANATURA, UserRoleType.JURADO, UserRoleType.ADMINISTRADOR, UserRoleType.CONSEJO]
    },
    {
      label: 'Estadísticas',
      routerLink: '/statistics',
      icon: 'bar_chart', // Ícono actualizado
      roles: [UserRoleType.ADMINISTRADOR, UserRoleType.CONSEJO]
    },
    {
      label: 'Historial',
      routerLink: '/history',
      icon: 'history', // Ícono actualizado
      roles: [UserRoleType.ESTUDIANTE, UserRoleType.DOCENTE, UserRoleType.DIRECTOR, UserRoleType.CODIRECTOR, UserRoleType.ASESOR, UserRoleType.ADMINISTRADOR, UserRoleType.COMITE, UserRoleType.JEFE_DEP, UserRoleType.CONSEJO, UserRoleType.DECANATURA, UserRoleType.JURADO, UserRoleType.EVALUADOR]
    }
  ];

  public menuItems = computed(() => {
    return this.allMenuItems.filter(item =>
      this.authService.hasAnyRole(item.roles)
    );
  });
}
