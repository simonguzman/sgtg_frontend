import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';
import { UserDetailsFacadeService } from './services/user-details-facade.service';
import { DocumentTypePipe } from '../../pipes/document-type.pipe';
import { CONTRACT_TYPE_LABELS } from '../../enum/contract-type.enum';

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

  protected readonly contractTypeLabel = computed(() => {
    const contractType = this.facade.user()?.contractType;
    return contractType ? CONTRACT_TYPE_LABELS[contractType] : '';
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    this.facade.loadUser(id);
  }
}
