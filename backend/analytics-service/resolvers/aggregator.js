
import { userResolvers } from './userResolver.js';
import { templateResolvers } from './templateResolver.js';

export const resolvers = {
  Query: {
    ...userResolvers.Query,
    ...templateResolvers.Query
  },
  ...(templateResolvers.Template && { Template: templateResolvers.Template })
};
