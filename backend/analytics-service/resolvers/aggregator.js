
import { adminDashboardResolver } from './adminDashboardResolver.js';
import { docControllerResolvers } from './docControllerDashboardResolvers.js';
import { deptHeadDashboardResolver } from './deptHeadDashboardResolver.js';

export const resolvers = {
  Query: {
    ...adminDashboardResolver.Query,
    ...docControllerResolvers.Query,
    ...deptHeadDashboardResolver.Query
  },
  ...(docControllerResolvers.DocumentItem && { DocumentItem: docControllerResolvers.DocumentItem })
};
