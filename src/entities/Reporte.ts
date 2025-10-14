import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Tipo } from './Tipo.js';

@Entity('Reportes')
export class Reporte {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column()
    ubicacion: string;

    @Column()
    descripcion: string;

    @ManyToOne(() => Tipo, (tipo) => tipo.reportes, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'tipo_id' })
    tipo: Tipo;

    @CreateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
    fechaCreacion: Date;
}