import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { AlunoService } from '../shared/services/aluno.service';
import { Aluno } from '../shared/models/aluno.model';

@Component({
  selector: 'app-aluno-dialog',
  imports: [FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data ? 'Editar' : 'Novo' }} Aluno</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Nome</mat-label>
        <input matInput [(ngModel)]="aluno.nome" required>
      </mat-form-field>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Email</mat-label>
        <input matInput [(ngModel)]="aluno.email" required type="email">
      </mat-form-field>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Matricula</mat-label>
        <input matInput [(ngModel)]="aluno.matricula" required>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-raised-button color="primary" (click)="salvar()">Salvar</button>
    </mat-dialog-actions>
  `,
  styles: [`.full-width { width: 100%; }`]
})
export class AlunoDialogComponent {
  aluno: Aluno;

  constructor(
    private ref: MatDialogRef<AlunoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Aluno | null,
    private service: AlunoService
  ) {
    this.aluno = data ? { ...data } : { nome: '', email: '', matricula: '' };
  }

  salvar() {
    const op = this.aluno.id
      ? this.service.atualizar(this.aluno.id, this.aluno)
      : this.service.criar(this.aluno);
    op.subscribe(() => this.ref.close(true));
  }
}
