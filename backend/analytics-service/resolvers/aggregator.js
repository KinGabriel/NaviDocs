
import { adminDashboardResolver } from './adminDashboardResolver.js';
import { docControllerResolvers } from './docControllerDashboardResolvers.js';

export const resolvers = {
  Query: {
    ...adminDashboardResolver.Query,
    ...docControllerResolvers.Query
  },
  ...(docControllerResolvers.DocumentItem && { DocumentItem: docControllerResolvers.DocumentItem })
};
