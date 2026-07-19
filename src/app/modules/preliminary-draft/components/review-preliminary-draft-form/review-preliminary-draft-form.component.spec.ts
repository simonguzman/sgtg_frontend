/* tslint:disable:no-unused-variable */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { ReviewPreliminaryDraftFormComponent } from './review-preliminary-draft-form.component';
import { stateList } from '../../../../core/enums/state.enum';
import { PreliminaryDraft } from '../../interfaces/preliminary-draft.interface';
import { Modality } from '../../../proposal/interfaces/proposal.interface';
import { IdentificationType, UserState } from '../../../users/interfaces/user.interface';
import { UserRoleType } from '../../../../core/models/user-role';
import { UserService } from '../../../users/services/user.service';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';
import { DocumentType } from '../../../../core/interfaces/file-document.interface';

describe('ReviewPreliminaryDraftFormComponent', () => {
  let component: ReviewPreliminaryDraftFormComponent;
  let fixture: ComponentFixture<ReviewPreliminaryDraftFormComponent>;

  // Mocks
  let userServiceMock: any;
  let notificationServiceMock: any;

  const createMockDraft = (state = stateList.EN_REVISION): PreliminaryDraft => ({
    preliminaryDraftId: 'draft-123',
    proposalId: 'prop-456',
    state: state,
    createdData: new Date('2026-05-10'),
    evaluations: [],
    documents: [
      {
        id: 'doc-1',
        name: 'archivo.pdf',
        url: '',
        uploadDate: '2026-05-14T10:00:00',
        type: DocumentType.ANTEPROYECTO
      }
    ],
    proposalData: {
      id: 'prop-456',
      title: 'Proyecto de Prueba',
      description: 'Prueba',
      modality: Modality.TI,
      authors: ['autor-1'],
      director: {
        id: 'dir-1',
        idType: IdentificationType.CC,
        idNumber: 1,
        firstName: 'Dir',
        lastName: 'Uno',
        secondLastName: 'Dos',
        codeNumber: 1,
        roles: [UserRoleType.DOCENTE],
        email: '',
        password: '',
        state: UserState.active
      },
      state: stateList.EN_REVISION,
      createdAt: new Date(),
      documents: [],
      evaluations: []
    }
  });

  beforeEach(async () => {
    userServiceMock = {
      getAuthorsNames: jest.fn().mockReturnValue('Estudiante Prueba'),
      getUserFullName: jest.fn().mockReturnValue('Director Prueba')
    };

    notificationServiceMock = {
      show: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [ReviewPreliminaryDraftFormComponent, ReactiveFormsModule],
      providers: [
        { provide: UserService, useValue: userServiceMock },
        { provide: NotificationService, useValue: notificationServiceMock },
        FormBuilder
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ReviewPreliminaryDraftFormComponent);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('preliminaryDraft', createMockDraft());
    fixture.detectChanges();
  });

  it('debería crear el componente', () => {
    expect(component).toBeTruthy();
  });

  describe('Lógica de Lectura y Getters', () => {
    it('debería calcular isReadOnly como verdadero cuando el estado es APROBADO', () => {
      fixture.componentRef.setInput('preliminaryDraft', createMockDraft(stateList.APROBADO));
      fixture.detectChanges();

      expect(component.isReadOnly).toBe(true);
    });

    it('debería obtener el nombre del director correctamente', () => {
      const name = component.getDirectorName();
      expect(userServiceMock.getUserFullName).toHaveBeenCalledWith('dir-1');
      expect(name).toBe('Director Prueba');
    });

    it('debería retornar "No disponible" si no hay documentos para la fecha', () => {
      fixture.componentRef.setInput('preliminaryDraft', {
        ...createMockDraft(),
        documents: []
      });
      fixture.detectChanges();

      expect(component.documentUploadDate).toBe('No disponible');
    });

    it('debería formatear la fecha de carga correctamente', () => {
      expect(component.documentUploadDate).toContain('14/5/2026');
    });
  });

  describe('Manejo de Archivos', () => {
    it('debería actualizar el signal y cerrar el modal al cargar archivo', () => {
      const mockFile = new File([''], 'test.pdf');
      component.handleFileUploaded({ fileName: 'test.pdf', file: mockFile });

      expect(component.uploadedSignedFile()).toEqual({ fileName: 'test.pdf', file: mockFile });
      expect(component.isUploadModalOpen()).toBe(false);
    });
  });

  describe('Validación y Envío', () => {
    it('debería mostrar error si el formulario es inválido al hacer submit', () => {
      component.evaluationForm.patchValue({ result: '', comments: '' });
      component.submit();

      expect(notificationServiceMock.show).toHaveBeenCalledWith(expect.objectContaining({
        type: NotificationType.ERROR,
        title: 'Formulario incompleto'
      }));
    });

    it('debería mostrar mensaje específico si falta el archivo', () => {
      component.evaluationForm.patchValue({ result: 'Aprobado', comments: 'Ok' });
      component.uploadedSignedFile.set(null);

      component.submit();

      expect(notificationServiceMock.show).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Debe adjuntar el Formato B firmado para guardar la evaluación.'
      }));
    });

    it('debería emitir onSaveEvaluation cuando el formulario y archivo son válidos', () => {
      const emitSpy = jest.spyOn(component.onSaveEvaluation, 'emit');
      const mockFile = new File([''], 'firmado.pdf');

      component.evaluationForm.patchValue({
        result: stateList.APROBADO,
        comments: 'Todo excelente'
      });
      component.uploadedSignedFile.set({ fileName: 'firmado.pdf', file: mockFile });

      component.submit();

      expect(emitSpy).toHaveBeenCalledWith({
        formValues: expect.objectContaining({ result: stateList.APROBADO }),
        file: mockFile,
        annotatedFile: undefined
      });
    });
  });

  describe('isFieldInvalid', () => {
    it('debería retornar true si el campo es inválido y ha sido tocado', () => {
      const control = component.evaluationForm.get('result');
      control?.markAsTouched();
      control?.setValue('');

      expect(component.isFieldInvalid('result')).toBe(true);
    });
  });
});
