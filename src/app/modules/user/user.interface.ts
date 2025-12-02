export interface IUser {
  id?: string;
  name: string;
  email: string;
  password: string;
  bio?: string;
  profileImage?: string;
  profileImageFileName?: string;
  interests?: string[];
  visitedCountries?: string[];
}
