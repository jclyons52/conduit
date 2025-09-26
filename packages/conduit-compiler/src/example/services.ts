import { UserService } from './services/user-service';
import { INoodlerService } from './services/noodler-service';
export type Deps = {
  userService: UserService;
  noodler: INoodlerService;
};
