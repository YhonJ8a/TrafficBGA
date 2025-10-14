import { Entity, PrimaryGeneratedColumn, Column, OneToMany, BaseEntity } from 'typeorm';
import { Reporte } from './Reporte.js';

@Entity('tipos')
export class Tipo extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', unique: true })
    nombre!: string;

    @OneToMany(() => Reporte, (reporte) => reporte.tipo)
    reportes!: Reporte[];
}