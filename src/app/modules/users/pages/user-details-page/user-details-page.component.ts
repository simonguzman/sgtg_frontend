import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';
import { UserDetailsFacadeService } from './services/user-details-facade.service';
import { DocumentTypePipe } from '../../pipes/document-type.pipe';

@Component({
  selector: 'app-user-details-page',
  standalone: true,
  imports: [CommonModule, ButtonComponent, DocumentTypePipe],
  providers: [UserDetailsFacadeService],
  templateUrl: './user-details-page.component.html',
  styleUrls: ['./user-details-page.component.css']
})
export class UserDetailsPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  public readonly facade = inject(UserDetailsFacadeService);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    this.facade.loadUser(id);
  }
}
