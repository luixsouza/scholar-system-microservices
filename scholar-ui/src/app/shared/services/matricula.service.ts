import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Matricula } from '../models/matricula.model';

@Injectable({ providedIn: 'root' })
export class MatriculaService {
  private readonly url = 'http://localhost:8080/api/matriculas';

  constructor(private http: HttpClient) {}

  listar(): Observable<Matricula[]> {
    return this.http.get<Matricula[]>(this.url);
  }

  buscarPorId(id: number): Observable<Matricula> {
    return this.http.get<Matricula>(`${this.url}/${id}`);
  }

  criar(matricula: Matricula): Observable<Matricula> {
    return this.http.post<Matricula>(this.url, matricula);
  }

  excluir(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
