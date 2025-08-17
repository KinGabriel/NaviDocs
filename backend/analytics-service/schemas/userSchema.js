import gql from 'graphql-tag';

export const userType = gql`
  type Role {
    name: String
    school: String
    department: String
  }

  type User {
    _id: ID
    email: String
    firstname: String
    lastname: String
    profile_picture: String
    role: Role
    createdAt: String
    updatedAt: String
  }

  type AdminDashboard {
    total: Int
    dean: Int
    deptHead: Int
    faculty: Int
    recentUsers: [User]
  }

   type Query {
    adminDashboard: AdminDashboard
  }
    
`;