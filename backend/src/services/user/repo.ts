import { User } from "../../database/User";

export interface UserRepo {
  saveUser(user: User): Promise<void>;
  findUserByName(name: string): Promise<User | null>;
}
