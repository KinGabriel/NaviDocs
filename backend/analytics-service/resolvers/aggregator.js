
import { adminDashboardResolver } from './adminDashboardResolver.js';
import { docControllerResolvers } from './docControllerDashboardResolvers.js';
import { deptHeadDashboardResolver } from './deptHeadDashboardResolver.js';
import { facultyDashboardResolver } from './facultyDashboardResolver.js';

export const resolvers = {
  Query: {
    ...adminDashboardResolver.Query,
    ...docControllerResolvers.Query,
    ...deptHeadDashboardResolver.Query,
    ...facultyDashboardResolver.Query
  },
  ...(docControllerResolvers.DocumentItem && { DocumentItem: docControllerResolvers.DocumentItem })
};
