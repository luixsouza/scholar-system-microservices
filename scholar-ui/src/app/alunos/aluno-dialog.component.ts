import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
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
      <button mat-flat-button (click)="salvar()" [disabled]="!aluno.nome || !aluno.email || !aluno.matricula">Salvar</button>
    </mat-dialog-actions>
  `
})
export class AlunoDialogComponent {
  aluno: Aluno;

  constructor(
    private ref: MatDialogRef<AlunoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Aluno | null,
    private service: AlunoService,
    private snack: MatSnackBar
  ) {
    this.aluno = data ? { ...data } : { nome: '', email: '', matricula: '' };
  }

  salvar() {
    const op = this.aluno.id
      ? this.service.atualizar(this.aluno.id, this.aluno)
      : this.service.criar(this.aluno);
    op.subscribe({
      next: () => {
        this.snack.open(this.aluno.id ? 'Aluno atualizado' : 'Aluno cadastrado', '', { duration: 2000 });
        this.ref.close(true);
      },
      error: () => this.snack.open('Erro ao salvar', '', { duration: 3000 })
    });
  }
}
