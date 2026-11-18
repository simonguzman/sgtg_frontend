import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NotificationContainerComponent } from "./shared/components/notifications/components/notification-container/notification-container.component";

/** Componente raíz: el contenedor de las rutas y de los avisos emergentes. */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NotificationContainerComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {}
