import {
    ChildEntity,
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    TableInheritance
} from "typeorm";


@Entity()
@TableInheritance({ column: { type: "varchar", name: "type" } })
export class User {

    @PrimaryGeneratedColumn()
    id!: number;

    @CreateDateColumn()
    createdAt!: Date;

    @CreateDateColumn()
    updatedAt!: Date;

}

@ChildEntity("registered")
export class RegisteredUser extends User {

    @Column({unique: true})
    username!: string;
    
    @Column({default: null, nullable: true, unique: true})
    googleId!: string;

}

@ChildEntity("guest")
export class Guest extends User {

    @Column({unique: true})
    token!: string;

    @Column()
    ipAddress!: string;

    @Column()
    userAgent!: string;

    @CreateDateColumn()
    createdAt!: Date;

    @CreateDateColumn()
    updatedAt!: Date;

}