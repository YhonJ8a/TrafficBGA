import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn
} from "typeorm";

@Entity()
export class PuntosCriticos {
    @PrimaryGeneratedColumn("uuid")
    id?: string;

    @Column({ type: "varchar", length: 255 })
    title?: string;

    @Column({ type: "text" })
    description?: string;

    @Column({ type: "decimal", precision: 10, scale: 8 })
    latitude?: number;

    @Column({ type: "decimal", precision: 11, scale: 8 })
    longitude?: number;

    // Información específica de datos.gov.co
    @Column({ type: "varchar", length: 255, nullable: true })
    departamento?: string;

    @Column({ type: "varchar", length: 255, nullable: true })
    municipio?: string;

    @Column({ type: "varchar", length: 255, nullable: true })
    clase?: string; // Clase de sector crítico

    @Column({ type: "varchar", length: 255, nullable: true })
    codigo?: string; // Código del sector

    @Column({ type: "int", default: 0 })
    numeroAccidentes?: number; // Total de accidentes registrados

    @Column({ type: "int", default: 0 })
    muertos?: number;

    @Column({ type: "int", default: 0 })
    heridos?: number;

    @Column({ type: "varchar", length: 50, nullable: true })
    ano?: string; // Año de los datos

    @Column({ type: "text", nullable: true })
    direccion?: string;

    @Column({ type: "varchar", length: 100, nullable: true })
    zona?: string; // Urbana/Rural

    // Nivel de peligrosidad calculado
    @Column({
        type: "enum",
        enum: ["bajo", "medio", "alto", "muy_alto"],
        default: "medio"
    })
    nivelPeligrosidad?: string;

    @Column({ type: "int", default: 30 })
    size?: number; // Tamaño del marcador en el mapa

    @Column({ type: "varchar", length: 100, default: "PuntoCritico" })
    iconName?: string;

    @Column({ type: "int", default: 9 })
    hideAfterZoom?: number;

    // Campos de auditoría
    @Column({ type: "boolean", default: true })
    activo?: boolean;

    @Column({ type: "boolean", default: true })
    visible?: boolean;

    @CreateDateColumn({ type: "datetime" })
    fechaCreacion?: Date;

    @UpdateDateColumn({ type: "datetime" })
    fechaActualizacion?: Date;

    @Column({ type: "datetime", nullable: true })
    fechaUltimaActualizacionDatos?: Date;

    @Column({ type: "varchar", length: 255, nullable: true })
    fuenteDatos?: string;
}