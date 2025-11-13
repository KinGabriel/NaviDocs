
import { adminDashboardResolver } from './adminDashboardResolver.js';
import { docControllerResolvers } from './docControllerDashboardResolvers.js';
import { deptHeadDashboardResolver } from './deptHeadDashboardResolver.js';
import { facultyDashboardResolver } from './facultyDashboardResolver.js';
import { deanSecDashboardResolver } from './deanSecDashboardResolver.js';

export const resolvers = {
  Query: {
    ...adminDashboardResolver.Query,
    ...docControllerResolvers.Query,
    ...deptHeadDashboardResolver.Query,
    ...facultyDashboardResolver.Query,
    ...deanSecDashboardResolver.Query
  },
  ...(docControllerResolvers.DocumentItem && { DocumentItem: docControllerResolvers.DocumentItem })
};
