import { Component } from '@angular/core';

@Component({
  selector: 'app-auth-header',
  // ← CommonModule eliminado: el template no tiene NINGÚN binding — ni
  // interpolación, ni directivas, ni pipes. Es HTML puro (logo + título
  // estático). Import completamente sin uso.
  imports: [],
  templateUrl: './auth-header.component.html',
  styleUrls: ['./auth-header.component.css']
})
export class AuthHeaderComponent {}
