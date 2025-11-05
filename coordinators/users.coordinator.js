import UsersModel from '../models/users.model.js';
import f from '../classes/user.class.js';
import bcrypt from 'bcryptjs';
import { v4 as UUID } from 'uuid';

export default class UsersCoordinator {

    static createUser = async (organizationID, user) => {
        try {
            const salt = await bcrypt.genSalt(10);

            // Generate a unique username and password
            const username = `${user.fName.slice(0, 1).toLowerCase()}${user.lName.toLowerCase()}${UUID().slice(0, 3)}`;
            const password = `${user.fName.slice(0, 1).toLowerCase()}${user.lName.slice(0, 5).toLowerCase()}${UUID().slice(0, 3)}`;

            // Hash the generated password
            const hashedPassword = await bcrypt.hash(password, salt);

            // Get organization
            const organization = await UsersModel.findOrganizationByID(organizationID);
            // Create a new user instance
            const newUser = new User(
                organization,
                user.fName,
                user.lName,
                user.email,
                username,   // Use generated username
                hashedPassword
            );
            newUser.organizationID = organizationID;
            newUser.status = 'active';

            // console.log(newUser);
            // Save the user to the database
            const result = await UsersModel.addUser(newUser);
            if (result.acknowledged) {
                return {
                    username,
                    password
                };
            }
        } catch (error) {
            throw new Error('Error creating user: ' + error.message);
        }
    };

    static findUserByUsername = async (organizationID, username) => {
        try {
            const user = await UsersModel.getUser(organizationID, username.toLowerCase());
            return user;
        } catch (error) {
            throw new Error('Error finding user by username: ' + error.message);
        }
    };

    static getUsers = async (organizationID) => {
        try {
            const users = await UsersModel.getUsers(organizationID);
            return users;
        } catch (error) {
            throw new Error('Error getting users: ' + error.message);
        }
    };

    static updateUser = async (organizationID, username, update) => {
        try {
            update.username = update.username.toLowerCase();
            const user = await UsersModel.findUserByUsername(organizationID, username.toLowerCase());
            const updatedUser = new User(
                user.organization,
                user.fName,
                user.lName,
                user.email,
                user.username,
                user.password
            );
            updatedUser.organizationID = organizationID;
            updatedUser.status = user.status;
            // Preserve the existing password if not being updated
            if (update.password) {
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(update.password, salt);
                update.password = hashedPassword;
            } else {
                update.password = user.password; // Keep the existing password if not updating
            }
            updatedUser.updateUser(update);
            const result = await UsersModel.updateUser(organizationID, username, updatedUser);
            return result;
        } catch (error) {
            throw new Error('Error updating user: ' + error.message);
        }
    };

    static deleteUser = async (organizationID, username) => {
        try {
            const result = await UsersModel.deleteUser(organizationID, username);
            return result;
        } catch (error) {
            throw new Error('Error deleting user: ' + error.message);
        }
    };
}