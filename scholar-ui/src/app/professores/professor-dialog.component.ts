import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ProfessorService } from '../shared/services/professor.service';
import { Professor } from '../shared/models/professor.model';

@Component({
  selector: 'app-professor-dialog',
  imports: [FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data ? 'Editar' : 'Novo' }} Professor</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Nome</mat-label>
        <input matInput [(ngModel)]="professor.nome" required>
      </mat-form-field>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Email</mat-label>
        <input matInput [(ngModel)]="professor.email" required type="email">
      </mat-form-field>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Titulacao</mat-label>
        <input matInput [(ngModel)]="professor.titulacao" required>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button (click)="salvar()" [disabled]="!professor.nome || !professor.email || !professor.titulacao">Salvar</button>
    </mat-dialog-actions>
  `
})
export class ProfessorDialogComponent {
  professor: Professor;

  constructor(
    private ref: MatDialogRef<ProfessorDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Professor | null,
    private service: ProfessorService,
    private snack: MatSnackBar
  ) {
    this.professor = data ? { ...data } : { nome: '', email: '', titulacao: '' };
  }

  salvar() {
    const op = this.professor.id
      ? this.service.atualizar(this.professor.id, this.professor)
      : this.service.criar(this.professor);
    op.subscribe({
      next: () => {
        this.snack.open(this.professor.id ? 'Professor atualizado' : 'Professor cadastrado', '', { duration: 2000 });
        this.ref.close(true);
      },
      error: () => this.snack.open('Erro ao salvar', '', { duration: 3000 })
    });
  }
}
