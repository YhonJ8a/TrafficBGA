import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Tipo } from './Tipo.js';

@Entity('Reportes')
export class Reporte {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar' })
    name!: string;

    @Column({ type: 'varchar' })
    ubicacion!: string;

    @Column({ type: 'text' })
    descripcion!: string;

    @ManyToOne(() => Tipo, (tipo) => tipo.reportes, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'tipo_id' })
    tipo!: Tipo | null;

    @CreateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
    fechaCreacion!: Date;
}