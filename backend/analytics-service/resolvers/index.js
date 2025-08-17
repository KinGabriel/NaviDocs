import { userResolvers } from './userResolver.js';

export const resolvers = {
  Query: {
    ...userResolvers.Query
  }
};
