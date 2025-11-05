import { v4 as uuid } from 'uuid';
export default class User {
  constructor(userID, organizationID, organization, fName, lName, email, username, password, isAdmin = false) {
    this.userID = userID;
    this.organizationID = organizationID;
    this.organization = organization;
    this.fName = fName;
    this.lName = lName;
    this.email = email
    this.username = username;
    this.password = password;
    this.isAdmin = isAdmin;
    this.status = 'active';
  }

  updateUser(data) {
    for (let key in data) {
      if (this.hasOwnProperty(key)) {
        this[key] = data[key];
      }
    }
    this.updatedAt = new Date();
  }
}