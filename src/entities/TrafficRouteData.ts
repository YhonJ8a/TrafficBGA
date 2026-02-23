import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
} from "typeorm";

@Entity()
export class TrafficRouteData {

    @PrimaryGeneratedColumn()
    id?: number;

    @Column({ type: "varchar", length: 50 })
    routeName?: string;

    @Column("float")
    originLat?: number;

    @Column("float")
    originLng?: number;

    @Column("float")
    destLat?: number;

    @Column("float")
    destLng?: number;

    @Column("int")
    durationNormal?: number;

    @Column("int")
    durationTraffic?: number;

    @Column({ type: "varchar", length: 20, nullable: true })
    durationNormalText?: string;

    @Column({ type: "varchar", length: 20, nullable: true })
    durationTrafficText?: string;

    @Column("float")
    avgSpeed?: number;

    @Column("float")
    congestionIndex?: number;

    @CreateDateColumn()
    timestamp?: Date;

    @Column("datetime")
    departureTime?: string;

    @Column("int", { nullable: true })
    distanceMeters?: number;

    @Column({ type: "varchar", length: 20, nullable: true })
    distanceMetersText?: string;
}